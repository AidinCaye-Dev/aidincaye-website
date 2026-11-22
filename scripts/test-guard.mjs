// Tests for the content guard and the photo pipeline.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { guard, checkBio, checkJsonList } from './content-guard.mjs';
import { buildPhotos, checkImage, checkSettings } from './photos.mjs';

const img = (w, h, fmt = 'jpeg') => sharp({ create: { width: w, height: h, channels: 3, background: '#bbbbbb' } })[fmt]().toBuffer();
const bio = 'First paragraph about the music.\n\nSecond paragraph with *italics*.\n';
const files = {
  'src/content/bio.md': Buffer.from(bio),
  'src/content/numbers.json': Buffer.from('[{"value":"10M+","label":"streams"}]'),
  'src/content/photos.json': Buffer.from('{"heroPersonX":40,"heroSpaceAbove":10,"portraitPersonX":50}'),
  'src/content/photos/hero.jpg': await img(2400, 1350),
  'src/content/photos/portrait.png': await img(1000, 1400, 'png'),
  'public/css/styles.css': Buffer.from('body{}'),
  '.github/workflows/check.yml': Buffer.from('x'),
};
const read = (p) => files[p];
const ch = (...ps) => ps.map((p) => ({ status: 'modified', path: p }));

// Caretaker: content files pass.
let r = await guard('AidinCaye-Dev', ch('src/content/bio.md', 'src/content/numbers.json', 'src/content/photos.json', 'src/content/photos/hero.jpg', 'src/content/photos/portrait.png'), read);
assert.equal(r.ok, true, r.problems.join('\n'));
// Caretaker: design, code and workflows are refused.
r = await guard('AidinCaye-Dev', ch('public/css/styles.css'), read);
assert.equal(r.ok, false);
r = await guard('AidinCaye-Dev', ch('.github/workflows/check.yml'), read);
assert.equal(r.ok, false);
r = await guard('someone-else', ch('src/content/photos/../../public/css/styles.css'), read);
assert.equal(r.ok, false);
// Caretaker may not delete or rename content.
r = await guard('AidinCaye-Dev', [{ status: 'removed', path: 'src/content/bio.md' }], read);
assert.equal(r.ok, false);
// Swapping a photo for one with another extension: remove the old file and add the new one in the same pull request.
r = await guard('AidinCaye-Dev', [{ status: 'removed', path: 'src/content/photos/portrait.jpg' }, { status: 'added', path: 'src/content/photos/portrait.png' }], read);
assert.equal(r.ok, true, r.problems.join('\n'));
r = await guard('AidinCaye-Dev', [{ status: 'removed', path: 'src/content/photos/portrait.png' }], read);
assert.equal(r.ok, false, 'removing a photo without a replacement is refused');
// Technical owner may change code; content is still checked.
r = await guard('KevinLMcPhail', ch('public/css/styles.css', 'src/content/bio.md'), read);
assert.equal(r.ok, true);
r = await guard('KevinLMcPhail', ch('src/content/bio.md'), () => Buffer.from('one paragraph only <script>'));
assert.equal(r.ok, false);

// Bio rules.
assert.deepEqual(checkBio(bio), []);
assert.ok(checkBio('A\n\nSee https://evil.example').length);
assert.ok(checkBio('A\n\nMail me at x@example.com').length);
assert.ok(checkBio('A\n\n<img src=x onerror=alert(1)>').length);
assert.ok(checkBio('A\n\n[click](https://x.y)').length);
assert.ok(checkBio('Only one paragraph').length);
// JSON lists.
assert.deepEqual(checkJsonList('numbers.json', '[{"value":"7+","label":"countries played"}]'), []);
assert.ok(checkJsonList('numbers.json', '{"value":"7+"}').length);
assert.ok(checkJsonList('numbers.json', '[{"value":7}]').length);
assert.ok(checkJsonList('accolades.json', '[{"title":"<b>x</b>"}]').length);
assert.ok(checkJsonList('releases.json', '[{"url":"https://evil.example/x"}]', { urlKeys: ['url'], urlHosts: ['open.spotify.com'] }).length);
assert.deepEqual(checkJsonList('releases.json', '[{"url":"https://open.spotify.com/album/1"}]', { urlKeys: ['url'], urlHosts: ['open.spotify.com'] }), []);
// The live content passes.
for (const f of ['bio.md', 'accolades.json', 'numbers.json', 'releases.json', 'photos.json']) {
  const res = await guard('AidinCaye-Dev', ch(`src/content/${f}`), (p) => fs.readFileSync(p));
  assert.equal(res.ok, true, `${f}: ${res.problems.join('; ')}`);
}

// Photo settings and images.
assert.deepEqual(checkSettings('{"heroPersonX":50}').errors, []);
assert.ok(checkSettings('{"heroSpaceAbove":90}').errors.length);
assert.ok(checkSettings('{"script":"x"}').errors.length);
assert.ok(checkSettings('nope').errors.length);
assert.deepEqual(await checkImage(await img(2400, 1350), 'hero'), []);
assert.ok((await checkImage(await img(1200, 700), 'hero')).length, 'small hero refused');
assert.ok((await checkImage(await img(2400, 2600), 'hero')).length, 'upright hero refused');
assert.ok((await checkImage(await img(1400, 1000), 'portrait')).length, 'landscape portrait refused');
assert.ok((await checkImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="2000"/>'), 'hero')).length, 'SVG refused');
assert.ok((await checkImage(Buffer.from('not an image'), 'hero')).length);

// Pipeline: builds every size from the sources, then skips when nothing changed.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'photos-'));
fs.mkdirSync(path.join(tmp, 'src/content/photos'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'src/content/photos/hero.jpg'), files['src/content/photos/hero.jpg']);
fs.writeFileSync(path.join(tmp, 'src/content/photos/portrait.png'), files['src/content/photos/portrait.png']);
fs.writeFileSync(path.join(tmp, 'src/content/photos.json'), files['src/content/photos.json']);
assert.match(await buildPhotos(tmp), /rebuilt/);
const size = async (p) => { const m = await sharp(path.join(tmp, p)).metadata(); return `${m.width}x${m.height}`; };
assert.equal(await size('public/img/hero-1600.jpg'), '1600x900');
assert.equal(await size('public/img/hero-m-1036.webp'), '1036x1382');
assert.equal(await size('public/img/og-image.jpg'), '1200x630');
assert.equal(await size('public/images/portrait.jpg'), '900x1350');
assert.equal(await buildPhotos(tmp), 'photos: unchanged');
fs.writeFileSync(path.join(tmp, 'src/content/photos/hero.webp'), await img(2400, 1350, 'webp'));
await assert.rejects(buildPhotos(tmp), /more than one hero/);
fs.rmSync(tmp, { recursive: true, force: true });

console.log('test-guard: all tests passed');
