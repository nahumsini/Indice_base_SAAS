import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';
import { resolveConfig } from 'vite';

const root = resolve(import.meta.dirname, '..');
const configFile = resolve(root, 'vite.config.ts');
const config = (overrides = {}, command = 'serve') => resolveConfig({ root, configFile, ...overrides }, command);

test('app servers on different ports do not share optimized dependencies with each other or unconfigured fixtures', async () => {
  const app = await config({ server: { port: 5175 } });
  const fixture = await config({ server: { port: 5228 } });
  const standalone = await resolveConfig({ root, configFile: false }, 'serve');
  assert.notEqual(app.cacheDir, fixture.cacheDir);
  assert.notEqual(app.cacheDir, standalone.cacheDir);
  assert.equal(app.server.strictPort, true);
  assert.equal(fixture.server.strictPort, true);
});

test('explicit fixture caches remain isolated and development modes cannot overwrite each other', async () => {
  const cacheDir = resolve(root, 'node_modules/.cache/payroll-fixture');
  assert.equal((await config({ cacheDir })).cacheDir, cacheDir);
  const development = await config({ mode: 'development' });
  const testMode = await config({ mode: 'test' });
  assert.notEqual(development.cacheDir, testMode.cacheDir);
});

test('both development and production resolve one React runtime, keeping production chunk ownership', async () => {
  for (const command of ['serve', 'build']) {
    const resolved = await config({}, command);
    assert.ok(resolved.resolve.dedupe.includes('react'));
    assert.ok(resolved.resolve.dedupe.includes('react-dom'));
    const manualChunks = resolved.build.rollupOptions.output.manualChunks;
    assert.equal(manualChunks(resolve(root, 'node_modules/react/index.js')), 'vendor-react');
    assert.equal(manualChunks(resolve(root, 'node_modules/react-dom/client.js')), 'vendor-react');
  }
});
