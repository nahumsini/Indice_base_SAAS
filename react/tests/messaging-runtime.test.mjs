import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeMessages, requestIdentity, pollDelay, messageReceipt } from '../src/app/Messaging/messageState.ts';

test('double check requires every other participant to have read this message', () => {
  const message = { id: 40, senderUserId: 1 };
  const participants = [{userId:1,lastReadMessageId:90},{userId:2,lastReadMessageId:40},{userId:3,lastReadMessageId:39}];
  assert.deepEqual(messageReceipt(message,participants), { read:1,total:2,allRead:false });
  participants[2].lastReadMessageId = 40;
  assert.deepEqual(messageReceipt(message,participants), { read:2,total:2,allRead:true });
  assert.equal(messageReceipt(message,[]).allRead,false);
});

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
