// `npm run check:launch`: lists anything still missing before the domain goes live. Not part of `npm test`,
// so pull requests can be merged while details are still being gathered. Public values only; secrets live in Cloudflare.
import { readFile } from 'node:fs/promises';
const read = async (f) => JSON.parse(await readFile(new URL(`../src/content/${f}`, import.meta.url), 'utf8'));
const [site, legal, links] = await Promise.all([read('site.json'), read('legal.json'), read('links.json')]);
const missing = [];
if (!legal.responsibleParty) missing.push('legal.json: responsibleParty (registered company name)');
if (!legal.registrationNumber) missing.push('legal.json: registrationNumber');
if (!legal.contactEmail) missing.push('legal.json: contactEmail (for privacy requests)');
if (!site.turnstileSiteKey) missing.push('site.json: turnstileSiteKey (public Turnstile site key for aidincaye.com and www)');
for (const k of ['instagram', 'spotify', 'appleMusic', 'youtube']) if (!links[k]) missing.push(`links.json: ${k}`);
if (missing.length) { console.log('Not ready to launch yet:\n- ' + missing.join('\n- ')); process.exit(1); }
console.log('Launch content check passed.');
