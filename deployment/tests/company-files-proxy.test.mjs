import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('both storage proxies admit the company library 100 MiB contract without raising API/MCP limits', () => {
  for (const name of ['nginx.conf', 'nginx.host.conf']) {
    const source = readFileSync(new URL('../docker/web/' + name, import.meta.url), 'utf8');
    const storage = source.match(/location \/storage\/\s*\{([^}]+)\}/)?.[1];
    assert.ok(storage, name);
    const size = storage.match(/client_max_body_size\s+(\d+)m;/)?.[1];
    assert.equal(Number(size), 100, name + ' must accept the documented maximum signed PUT');
    assert.match(source, /client_max_body_size 25m;/, 'General API limit stays bounded');
    assert.match(source, /client_max_body_size 14m;/, 'MCP file intake keeps its separate bound');
  }
});
