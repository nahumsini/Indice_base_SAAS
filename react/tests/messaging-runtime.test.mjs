import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeMessages, requestIdentity, pollDelay } from '../src/app/Messaging/messageState.ts';

test('overlapping polling pages and send acknowledgements merge in server order', () => {
  const rows = mergeMessages([{ id: 12, body: 'Own reply' }, { id: 8, body: 'First' }], [{ id: 10, body: 'Concurrent incoming' }, { id: 12, body: 'Own reply' }]);
  assert.deepEqual(rows.map(row => row.id), [8, 10, 12]);
});
test('network retries reuse a key and editing the payload produces a new request', () => {
  const first = requestIdentity(null, 'original', () => 'key1');
  assert.equal(requestIdentity(first, 'original', () => 'unexpected'), first);
  assert.deepEqual(requestIdentity(first, 'edited', () => 'key2'), { fingerprint: 'edited', key: 'key2' });
});
test('polling backs off on failure and hidden tabs', () => {
  assert.equal(pollDelay(0, true), 3000);
  assert.equal(pollDelay(2, true), 12000);
  assert.equal(pollDelay(100, true), 30000);
  assert.equal(pollDelay(0, false), 30000);
});
