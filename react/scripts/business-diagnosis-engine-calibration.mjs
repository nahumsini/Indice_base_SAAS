import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { build } from 'esbuild';

const rootDir = process.cwd();
const entryPoint = resolve(rootDir, 'scripts/business-diagnosis-engine-calibration.ts');
const outFile = resolve(rootDir, 'node_modules/.cache/indice/business-diagnosis-engine-calibration.mjs');

await mkdir(dirname(outFile), { recursive: true });

await build({
  bundle: true,
  entryPoints: [entryPoint],
  format: 'esm',
  outfile: outFile,
  platform: 'node',
  target: 'node20',
});

await import(`${pathToFileURL(outFile).href}?run=${Date.now()}`);
