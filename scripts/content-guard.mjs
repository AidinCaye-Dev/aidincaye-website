// Content guard: run by .github/workflows/content-guard.yml on every pull request.
// It always runs the version of this file on `main`, never the pull request's own copy,
// and it only reads the pull request's files as data.
//
// Pull requests from anyone other than the technical owner (e.g. Aidin's Grok) may only
// change the content listed in ALLOWED, and that content must pass the checks below.
// Anything else (design, code, workflows, security settings) fails the check and cannot be merged.
//
// Usage: node scripts/content-guard.mjs <author> <changes.tsv> <dir with the PR's files>
//   changes.tsv: one "status<TAB>path" line per changed file (GitHub's files API status).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkImage, checkSettings, SOURCE_NAME } from './photos.mjs';

/** People and bots whose pull requests may change anything (still subject to the other checks). */
export const TRUSTED = ['KevinLMcPhail', 'dependabot[bot]'];

export const ALLOWED = [
  /^src\/content\/bio\.md$/,
  /^src\/content\/accolades\.json$/,
  /^src\/content\/numbers\.json$/,
  /^src\/content\/releases\.json$/,
  /^src\/content\/photos\.json$/,
  /^src\/content\/photos\/(hero|portrait)\.(jpg|jpeg|png|webp)$/,
];

const LINKY = /(https?:|www\.|javascript:|data:|mailto:|<|>|\[[^\]]*\]\(|@[a-z0-9-]+\.[a-z]{2,})/i;
const TEXT_MAX = 400;

export function checkBio(text) {
  const errors = [];
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (text.length > 6000) errors.push('bio.md is longer than 6000 characters');
  if (paras.length < 2) errors.push('bio.md needs at least two paragraphs (separated by a blank line)');
  if (paras.length > 12) errors.push('bio.md has more than 12 paragraphs');
  if (LINKY.test(text)) errors.push('bio.md may not contain links, email addresses, HTML or < > characters');
  if (/^\s*#/m.test(text)) errors.push('bio.md may not contain headings');
  return errors;
}

function walkStrings(v, out = []) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => walkStrings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => walkStrings(x, out));
  return out;
}

/** accolades.json / numbers.json / releases.json: a list of flat objects with short plain-text values. */
export function checkJsonList(name, text, { urlKeys = [], urlHosts = [] } = {}) {
  let v;
  try { v = JSON.parse(text); } catch { return [`${name} is not valid JSON`]; }
  if (!Array.isArray(v)) return [`${name} must be a list`];
  if (v.length > 20) return [`${name} has more than 20 entries`];
  const errors = [];
  v.forEach((item, i) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) { errors.push(`${name} entry ${i + 1} is not an object`); return; }
    for (const [k, val] of Object.entries(item)) {
      if (typeof val !== 'string') { errors.push(`${name} entry ${i + 1}: "${k}" must be text`); continue; }
      if (val.length > TEXT_MAX) errors.push(`${name} entry ${i + 1}: "${k}" is too long`);
      if (urlKeys.includes(k)) {
        if (val === '') continue;
        let u;
        try { u = new URL(val); } catch { errors.push(`${name} entry ${i + 1}: "${k}" is not a link`); continue; }
        if (u.protocol !== 'https:' || !urlHosts.some((h) => u.hostname === h || u.hostname.endsWith('.' + h))) {
          errors.push(`${name} entry ${i + 1}: "${k}" must be an https link to ${urlHosts.join(', ')}`);
        }
      } else if (k === 'cover') {
        if (val !== '' && !/^\/img\/releases\/[a-z0-9-]+\.(jpg|png|webp)$/.test(val)) errors.push(`${name} entry ${i + 1}: "cover" must be an existing /img/releases/ image`);
      } else if (LINKY.test(val)) {
        errors.push(`${name} entry ${i + 1}: "${k}" may not contain links, email addresses or HTML`);
      }
    }
  });
  if (!errors.length && walkStrings(v).join('').length > 8000) errors.push(`${name} is too long`);
  return errors;
}

/** Checks one changed file's content. Returns a list of problems. */
export async function checkFile(rel, buf) {
  const text = () => buf.toString('utf8');
  if (rel === 'src/content/bio.md') return checkBio(text());
  if (rel === 'src/content/accolades.json' || rel === 'src/content/numbers.json') return checkJsonList(path.basename(rel), text());
  if (rel === 'src/content/releases.json') {
    return checkJsonList('releases.json', text(), { urlKeys: ['url'], urlHosts: ['open.spotify.com', 'music.apple.com', 'youtube.com', 'soundcloud.com', 'beatport.com'] });
  }
  if (rel === 'src/content/photos.json') return checkSettings(text()).errors;
  const m = path.basename(rel).match(SOURCE_NAME);
  if (rel.startsWith('src/content/photos/') && m) return checkImage(buf, m[1]);
  return [];
}

/**
 * changes: [{ status, path }], readFile(path) -> Buffer.
 * Returns { ok, problems, notes }.
 */
export async function guard(author, changes, readFile) {
  const trusted = TRUSTED.includes(author);
  const problems = [];
  const notes = [];
  for (const { status, path: rel } of changes) {
    const allowed = ALLOWED.some((re) => re.test(rel));
    if (!trusted) {
      if (!allowed) { problems.push(`${rel}: not a content file the caretaker may change (send a change request to Kevin instead)`); continue; }
      const photo = rel.match(/^src\/content\/photos\/(hero|portrait)\./);
      const replaced = photo && status === 'removed' && changes.some((c) => c.status !== 'removed' && c.path !== rel && c.path.startsWith(`src/content/photos/${photo[1]}.`));
      if ((status === 'removed' && !replaced) || status === 'renamed') { problems.push(`${rel}: content files may be replaced, not removed or renamed`); continue; }
    }
    if (allowed && status !== 'removed') {
      for (const p of await checkFile(rel, readFile(rel))) problems.push(`${rel}: ${p}`);
      notes.push(`checked ${rel}`);
    }
  }
  if (!trusted) {
    const photos = changes.filter((c) => /^src\/content\/photos\/(hero|portrait)\./.test(c.path) && c.status !== 'removed');
    for (const kind of ['hero', 'portrait']) {
      if (photos.filter((c) => c.path.includes(`/${kind}.`)).length > 1) problems.push(`only one ${kind} photo per pull request`);
    }
  }
  return { ok: problems.length === 0, problems, notes, trusted };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [author, tsv, dir] = process.argv.slice(2);
  const changes = fs.readFileSync(tsv, 'utf8').split('\n').filter(Boolean).map((l) => {
    const [status, p] = l.split('\t');
    return { status, path: p };
  });
  const res = await guard(author, changes, (rel) => {
    const abs = path.resolve(dir, rel);
    if (!abs.startsWith(path.resolve(dir) + path.sep)) throw new Error(`bad path ${rel}`);
    return fs.readFileSync(abs);
  });
  console.log(`Author: ${author}${res.trusted ? ' (technical owner: any file may change)' : ' (caretaker: content only)'}`);
  res.notes.forEach((n) => console.log(`  ${n}`));
  if (!res.ok) {
    console.log('\nThis pull request cannot be merged:');
    res.problems.forEach((p) => console.log(`  - ${p}`));
    process.exit(1);
  }
  console.log('Content guard passed.');
}
