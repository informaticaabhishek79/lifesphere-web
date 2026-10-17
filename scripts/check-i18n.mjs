// Checks the translations:
//  1. every key used in code exists in English;
//  2. every language has every English key (missing keys fall back to English, so this is a coverage report);
//  3. no language has keys English doesn't (typos);
//  4. {placeholders} match English exactly.
// Exit code 1 when 1, 3 or 4 fail, or when Hindi (the launch language) is missing anything.
// Use --strict to also fail on any missing translation in any language.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../src/', import.meta.url).pathname;
const strict = process.argv.includes('--strict');
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(f)) files.push(p);
  }
})(root);

const used = new Set();
for (const f of files) {
  const s = readFileSync(f, 'utf8');
  for (const m of s.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) used.add(m[1]);
}

function load(lang) {
  const src = readFileSync(join(root, 'i18n', `${lang}.ts`), 'utf8')
    .replace(/^import .*$/gm, '')
    .replace(/^type .*$/gm, '')
    .replace(/export const \w+(: [^=]+)? =/, 'module.exports =')
    .replace(/export type .*$/gm, '');
  const m = { exports: {} };
  new Function('module', 'exports', src)(m, m.exports);
  return m.exports;
}
function flatten(o, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}
const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

const en = flatten(load('en'));
const enKeys = Object.keys(en);
let fail = false;

const missingEn = [...used].filter((k) => typeof en[k] !== 'string').sort();
console.log(`keys used in code: ${used.size}; English keys: ${enKeys.length}`);
if (missingEn.length) {
  fail = true;
  console.log(`missing in en (${missingEn.length}):\n  ${missingEn.join('\n  ')}`);
}

const langs = readdirSync(join(root, 'i18n'))
  .filter((f) => /^[a-z]{2}\.ts$/.test(f) && f !== 'en.ts')
  .map((f) => f.slice(0, 2))
  .sort();
for (const lang of langs) {
  const d = flatten(load(lang));
  const missing = enKeys.filter((k) => typeof d[k] !== 'string');
  const extra = Object.keys(d).filter((k) => !(k in en));
  const badVars = Object.keys(d).filter((k) => k in en && vars(d[k]) !== vars(en[k]));
  const pct = Math.round(((enKeys.length - missing.length) / enKeys.length) * 100);
  console.log(`${lang}: ${pct}% translated (${missing.length} missing, ${extra.length} unknown, ${badVars.length} placeholder mismatches)`);
  if (extra.length) console.log(`  unknown keys:\n    ${extra.join('\n    ')}`);
  if (badVars.length) console.log(`  placeholder mismatches:\n    ${badVars.map((k) => `${k}: "${d[k]}" vs "${en[k]}"`).join('\n    ')}`);
  if ((lang === 'hi' || strict) && missing.length) console.log(`  missing:\n    ${missing.join('\n    ')}`);
  if (extra.length || badVars.length || ((lang === 'hi' || strict) && missing.length)) fail = true;
}
process.exit(fail ? 1 : 0);
