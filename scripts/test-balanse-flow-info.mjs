import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { INFO } from '../src/lib/balanse-flow/info.ts';

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = await walk('src');
const titles = new Set();

for (const file of files) {
  const code = await readFile(file, 'utf8');
  if (!code.includes('CardInfoButton')) continue;
  for (const match of code.matchAll(/<CardInfoButton\s+title="([^"]+)"/g)) titles.add(match[1]);
  for (const match of code.matchAll(/(?<![-\w])label="([^"]+)"/g)) titles.add(match[1]);
}

const missing = [...titles].filter((title) => !INFO[title]);
assert.deepEqual(missing, [], `card titles missing from INFO: ${missing.join(', ')}`);
console.log(`balanse-flow info map: ${titles.size} titles covered`);
