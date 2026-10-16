// Lists translation keys used in the code that are missing from the English or Hindi dictionaries.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const root = new URL('../src/', import.meta.url).pathname;
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
const get = (o, k) => k.split('.').reduce((a, p) => (a && typeof a === 'object' ? a[p] : undefined), o);
const en = load('en');
const hi = load('hi');
const missingEn = [...used].filter((k) => typeof get(en, k) !== 'string').sort();
const missingHi = [...used].filter((k) => typeof get(en, k) === 'string' && typeof get(hi, k) !== 'string').sort();
console.log(`keys used: ${used.size}`);
console.log(`missing in en (${missingEn.length}):\n  ${missingEn.join('\n  ')}`);
console.log(`missing in hi (${missingHi.length}):\n  ${missingHi.join('\n  ')}`);
process.exit(missingEn.length || missingHi.length ? 1 : 0);
