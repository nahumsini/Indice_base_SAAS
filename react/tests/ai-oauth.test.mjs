import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTypescript } from './helpers/hook-runtime.mjs';

class ApiClientError extends Error {
  constructor(message, status, code, payload) {
    super(message); Object.assign(this, { status, code, payload });
  }
}
const load = apiClient => loadTypescript(new URL('../src/app/api/aiOAuth.ts', import.meta.url).pathname,
  () => ({ apiClient, ApiClientError })).aiOAuthApi;

test('OAuth errors expose an actionable explanation while preserving status and machine code', async () => {
  const api = load(async () => { throw new ApiClientError('Request failed', 400, undefined,
    { error: 'invalid_scope', error_description: 'private request details' }); });
  await assert.rejects(api.context('?scope=tasks.read'), error => {
    assert.equal(error.status, 400); assert.equal(error.code, 'invalid_scope');
    assert.match(error.message, /permisos no válidos/);
    assert.doesNotMatch(error.message, /Request failed|private request details/); return true;
  });
});

test('authentication and connection-capacity failures keep their status for the native page', async () => {
  for (const [status, code] of [[401, 'access_denied'], [409, 'connection_limit_reached']]) {
    const api = load(async () => { throw new ApiClientError('', status, undefined, { error: code }); });
    await assert.rejects(api.context(''), error => error.status === status && error.code === code);
  }
});

test('unknown server failures and network failures never expose raw provider or request details', async () => {
  for (const failure of [new ApiClientError('raw server detail', 500, undefined,
    { error: 'unknown', error_description: 'private detail' }),
    new ApiClientError('', 500, undefined, { error: 'constructor' }), new TypeError('Failed to fetch')]) {
    await assert.rejects(load(async () => { throw failure; }).context(''), error => {
      assert.match(error.message, /Vuelve a comprobar/);
      assert.doesNotMatch(error.message, /private|raw server|Failed to fetch/); return true;
    });
  }
});

test('context and decision preserve the exact request without changing scopes or granting consent automatically', async () => {
  const calls = [], api = load(async (...args) => { calls.push(args); return { clientName: 'Synthetic' }; });
  const query = new URLSearchParams({ response_type: 'code', client_id: 'synthetic-client',
    redirect_uri: 'https://chatgpt.com/callback', scope: 'openid email tasks.read', state: 'synthetic-state',
    code_challenge: 'synthetic-challenge', code_challenge_method: 'S256', resource: 'https://example.com/mcp' });
  await api.context('?' + query); assert.equal(calls.length, 1);
  assert.equal(calls[0][0], '/api/v1/ai/oauth/consent?' + query);
  assert.equal(calls[0][1], undefined);
  await api.decide(query, false);
  assert.equal(calls[1][0], '/api/v1/ai/oauth/consent'); assert.equal(calls[1][1].method, 'POST');
  assert.deepEqual(JSON.parse(calls[1][1].body), { approved: false, ...Object.fromEntries(query) });
});
