#!/usr/bin/env node
// Creates .env.local from .env.example (never overwrites an existing file).
// Usage: npm run setup -- --api=http://localhost:4000
const fs = require('node:fs');
const path = require('node:path');
const target = path.join(__dirname, '..', '.env.local');
const example = path.join(__dirname, '..', '.env.example');
const api = process.argv.find((a) => a.startsWith('--api='))?.split('=')[1];
if (fs.existsSync(target) && !api) {
  console.log('.env.local already exists — nothing to do.');
  process.exit(0);
}
let text = fs.readFileSync(fs.existsSync(target) ? target : example, 'utf8');
if (api) text = text.replace(/^API_URL=.*$/m, `API_URL=${api.replace(/\/$/, '')}`);
fs.writeFileSync(target, text);
console.log(`.env.local ready (API_URL=${/^API_URL=(.*)$/m.exec(text)?.[1]})`);
console.log('Next: npm run dev   → http://localhost:3008');
