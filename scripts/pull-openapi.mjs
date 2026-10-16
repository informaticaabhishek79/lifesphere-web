#!/usr/bin/env node
/** Copies the API's OpenAPI document into this repo (openapi.json), then regenerate types with `npm run api:types`.
 *  Source: a running API (default http://localhost:4000) or a file path: `npm run api:pull -- ../lifesphere-api/openapi.json`. */
import { readFileSync, writeFileSync } from 'node:fs';
const arg = process.argv[2];
let json;
if (arg && !/^https?:/.test(arg)) json = readFileSync(arg, 'utf8');
else {
  const base = (arg ?? process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
  const r = await fetch(`${base}/docs/openapi.json`);
  if (!r.ok) { console.error(`Could not fetch ${base}/docs/openapi.json (${r.status}). Is the API running in development?`); process.exit(1); }
  json = await r.text();
}
JSON.parse(json);
writeFileSync(new URL('../openapi.json', import.meta.url), json.endsWith('\n') ? json : json + '\n');
console.log('openapi.json updated. Now run: npm run api:types');
