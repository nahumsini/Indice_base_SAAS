import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const targets = process.argv.slice(2);

if (targets.length === 0) {
  throw new Error('Provide at least one source file or directory.');
}

async function collect(path) {
  const metadata = await stat(path);
  if (metadata.isFile()) return sourceExtensions.has(extname(path)) ? [path] : [];
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => collect(resolve(path, entry.name))))).flat();
}

function standardize(source) {
  return source
    .replace(/\bfont-(?:black|extrabold|bold|semibold)\b/g, 'font-medium')
    .replace(/\s+(?:(?:[a-z0-9-]+):)*uppercase\b/g, '')
    .replace(/\s+(?:(?:[a-z0-9-]+):)*tracking-(?:widest|wider|wide|\[[^\]]+\])/g, '');
}

const files = (await Promise.all(targets.map((target) => collect(resolve(target))))).flat();
let changed = 0;

for (const file of files) {
  const source = await readFile(file, 'utf8');
  const standardizedSource = standardize(source);
  if (source === standardizedSource) continue;
  const nextSource = standardizedSource.replace(/\r\n?/g, '\n');
  await writeFile(file, nextSource, 'utf8');
  changed += 1;
}

process.stdout.write(`Standardized ${changed} of ${files.length} source files.\n`);
