// Lists dist/ files with sha1, size and base64 for uploading through the Vercel API.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = 'dist';
const files = [];
const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else files.push(p); } };
walk(root);
const out = files.map(p => {
  const buf = readFileSync(p);
  return { file: relative(root, p).split('\').join('/'), sha: createHash('sha1').update(buf).digest('hex'), size: buf.length, base64: buf.toString('base64') };
});
writeFileSync('dist-manifest.json', JSON.stringify(out));
console.log(out.map(f => `${f.file} ${f.size}`).join('\n'));
