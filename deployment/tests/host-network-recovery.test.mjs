import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// All commands run against disposable fake containers/configuration, never Docker
// or a real datasource. Keep fake environment/credentials synthetic.
const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const names = ['indice-apptest-minio-1', 'indice-apptest-backend-1', 'indice-apptest-web-1'];
const originalConfig = '# retained previous configuration\n';
const mock = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const command = path.basename(process.argv[1]);
const args = process.argv.slice(2);
const statePath = process.env.MOCK_STATE;
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const failure = process.env.MOCK_FAILURE;
const save = () => fs.writeFileSync(statePath, JSON.stringify(state));
if (command === 'sleep') process.exit(0);
if (command === 'curl') {
 const url = args.at(-1);
 if ((failure === 'minio-health' && url.includes('/minio/')) ||
     (failure === 'backend-health' && url.includes(':8182/')) ||
     (failure === 'web-health' && url.includes(':8180/'))) process.exit(22);
 process.exit(0);
}
if (args[0] === 'image') process.exit(0);
if (args[0] === 'volume') { console.log('synthetic-volume'); process.exit(0); }
if (args[0] === 'inspect' || (args[0] === 'container' && args[1] === 'inspect')) {
 const container = state.containers[args.at(-1)];
 if (!container) process.exit(1);
 if (args.includes('--format')) {
  const format = args[args.indexOf('--format') + 1];
  if (format.includes('.Mounts')) console.log(format.includes('default.conf') ? container.config || '' : 'synthetic-volume');
  else console.log(container.running + ' false 0');
 }
 process.exit(0);
}
if (args[0] === 'rename') {
 if (!state.containers[args[1]] || state.containers[args[2]]) process.exit(1);
 state.containers[args[2]] = state.containers[args[1]];
 delete state.containers[args[1]];
} else if (args[0] === 'stop' || args[0] === 'start') {
 if (!state.containers[args[1]]) process.exit(1);
 state.containers[args[1]].running = args[0] === 'start';
} else if (args[0] === 'rm') {
 delete state.containers[args.at(-1)];
} else if (args[0] === 'run') {
 const name = args[args.indexOf('--name') + 1];
 if (failure === 'backend-run' && name.includes('backend')) process.exit(42);
 if (failure === 'signal' && name.includes('backend')) {
  process.kill(process.ppid, 'SIGTERM'); process.exit(0);
 }
 state.containers[name] = {generation: 'new', running: true};
} else if (args[0] !== 'exec' && args[0] !== 'cp') process.exit(99);
save();
`;

function exercise(failure = '', overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'indice-host-recovery-'));
  const bin = join(root, 'bin');
  const runtime = join(root, 'runtime');
  const temp = join(root, 'temporary');
  for (const directory of [bin, runtime, temp, join(root, 'deployment/docker/web'), join(root, 'deployment/scripts')]) {
    mkdirSync(directory, { recursive: true });
  }
  for (const executable of ['docker', 'curl', 'sleep']) {
    writeFileSync(join(bin, executable), mock);
    chmodSync(join(bin, executable), 0o700);
  }
  const config = join(runtime, 'nginx-host.conf');
  writeFileSync(config, originalConfig);
  writeFileSync(join(root, 'deployment/docker/web/nginx.host.conf'),
    'server { listen 8080; location /api { proxy_pass http://127.0.0.1:8082; } }\n');
  writeFileSync(join(root, 'deployment/scripts/smoke-test.sh'), '#!/bin/sh\nexit 0\n');
  chmodSync(join(root, 'deployment/scripts/smoke-test.sh'), 0o700);
  const statePath = join(root, 'state.json');
  const containers = Object.fromEntries(names.map(name => [name, {generation: 'old', running: true, config}]));
  if (failure === 'shared-config') containers['indice-erp-web-1'] = {generation: 'production', running: true, config};
  writeFileSync(statePath, JSON.stringify({containers}));
  const envFile = join(root, 'synthetic.env');
  writeFileSync(envFile, [
    'SPRING_DATASOURCE_URL=jdbc:mysql://isolated.invalid/indice_test_db',
    'SPRING_DATASOURCE_USERNAME=synthetic-test', 'SPRING_DATASOURCE_PASSWORD=synthetic-test-only',
    'PUBLIC_URL=https://apptest.indiceapp.com', 'WEB_HOST_PORT=8180', 'BACKEND_HOST_PORT=8182',
    'MINIO_API_HOST_PORT=8900', 'MINIO_CONTAINER=indice-apptest-minio-1',
    'BACKEND_CONTAINER=indice-apptest-backend-1', 'WEB_CONTAINER=indice-apptest-web-1',
    'MCP_CONTAINER=indice-apptest-mcp-1', 'WEB_IMAGE=test-web:immutable',
    'BACKEND_IMAGE=test-backend:immutable', `WEB_NGINX_HOST_CONFIG=${config}`
  ].join('\n') + '\n');
  const subject = join(root, 'deployment/scripts/up-host-network.sh');
  if (process.env.HOST_DEPLOY_TEST_REVISION) {
    writeFileSync(subject, execFileSync('git', ['show', `${process.env.HOST_DEPLOY_TEST_REVISION}:deployment/scripts/up-host-network.sh`], {cwd: repository}));
  } else {
    copyFileSync(join(repository, 'deployment/scripts/up-host-network.sh'), subject);
  }
  try {
    const outcome = spawnSync('bash', [subject], {
      // Never inherit protected target secrets or deployment overrides: preflight
      // may itself run with a real environment, but this rehearsal is synthetic.
      env: {PATH: `${bin}:${process.env.PATH}`, TMPDIR: temp, LANG: 'C', LC_ALL: 'C',
        APP_DIR: root, DEPLOY_ENV_FILE: envFile, MOCK_STATE: statePath, MOCK_FAILURE: failure, ...overrides},
      encoding: 'utf8', timeout: 10000
    });
    return {status: outcome.status, stderr: outcome.stderr, stdout: outcome.stdout,
      containers: JSON.parse(readFileSync(statePath)).containers,
      config: readFileSync(config, 'utf8'), temporaryFiles: readdirSync(temp),
      runtimeFiles: readdirSync(runtime)};
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
}

for (const [failure, status] of [['minio-health', 22], ['backend-run', 42], ['backend-health', 22], ['web-health', 22], ['signal', 143]]) {
  test(`failed ${failure} restores the prior containers/config and preserves exit status`, () => {
    const result = exercise(failure);
    assert.equal(result.status, status, result.stderr);
    for (const name of names) {
      assert.equal(result.containers[name]?.generation, 'old', name);
      assert.equal(result.containers[name]?.running, true, name);
    }
    assert.deepEqual(Object.keys(result.containers).sort(), [...names].sort());
    assert.equal(result.config, originalConfig);
    assert.deepEqual(result.temporaryFiles, [], 'temporary secret/config files must be removed');
    assert.deepEqual(result.runtimeFiles, ['nginx-host.conf']);
  });
}

test('successful deployment retains rollback containers and removes temporary secret files', () => {
  const result = exercise();
  assert.equal(result.status, 0, result.stderr);
  for (const name of names) {
    assert.equal(result.containers[name]?.generation, 'new');
    assert.equal(result.containers[`${name}-rollback`]?.generation, 'old');
    assert.equal(result.containers[`${name}-rollback`]?.running, false);
  }
  assert.deepEqual(result.temporaryFiles, []);
  assert.match(result.config, /listen 8180/);
});

test('dry-run never changes containers or Nginx configuration', () => {
  const result = exercise('', {DEPLOY_DRY_RUN: 'true'});
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(Object.keys(result.containers).sort(), [...names].sort());
  assert.equal(result.config, originalConfig);
  assert.deepEqual(result.temporaryFiles, []);
});

test('a shared production/APPTEST Nginx mount blocks activation before any mutation', () => {
  const result = exercise('shared-config');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must not share WEB_NGINX_HOST_CONFIG/);
  for (const name of names) assert.equal(result.containers[name]?.generation, 'old');
  assert.equal(result.containers['indice-erp-web-1'].generation, 'production');
  assert.equal(result.config, originalConfig);
  assert.deepEqual(result.temporaryFiles, []);
});
