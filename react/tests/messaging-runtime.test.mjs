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


import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';
const rules = loadTypescript(new URL('../src/app/Messaging/attachmentRules.ts', import.meta.url).pathname, () => { throw new Error('Unexpected dependency'); });
test('attachment validation explains count, format, size and zero-byte errors', () => {
  assert.equal(rules.attachmentIssue([new File(['x'],'report.pdf',{type:'application/pdf'})],0),null);
  assert.equal(rules.attachmentType(new File(['x'],'report.xlsx',{type:''})),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.equal(rules.attachmentIssue([new File(['x'],'photo.heic',{type:'image/heic'})],0).issue,'format');
  assert.equal(rules.attachmentIssue([new File([],'empty.pdf',{type:'application/pdf'})],0).issue,'empty');
  assert.equal(rules.attachmentIssue([new File([new Uint8Array(8*1024*1024+1)],'big.pdf',{type:'application/pdf'})],0).issue,'size');
  assert.equal(rules.attachmentIssue([new File(['x'],'report.pdf',{type:'application/pdf'})],5).issue,'count');
});
test('failed PUT renews an expired intent with the same identity and retains the draft', async t => {
  const runtime=hookRuntime();
  const {usePhotoDraft}=loadTypescript(new URL('../src/app/Messaging/usePhotoDraft.ts',import.meta.url).pathname,
    name=>name==='react'?runtime.hooks:name==='./attachmentRules'?rules:(()=>{throw new Error(name)})());
  runtime.render(()=>usePhotoDraft());
  runtime.result.add([new File(['%PDF-1.7'],'report.pdf',{type:'application/pdf'})]); await runtime.flush();
  const identities=[]; let calls=0;
  const api={presignPhoto:async(id,file,key)=>{ identities.push(key); return {id:'stable-attachment',uploadUrl:'https://synthetic.invalid/upload',uploadHeaders:{},expiresAt:new Date(calls++===0?Date.now()-1000:Date.now()+900000).toISOString()}; }};
  const original=globalThis.fetch;
  globalThis.fetch=async()=>({ok:calls>1}); t.after(()=>{globalThis.fetch=original;runtime.unmount();});
  await assert.rejects(runtime.result.upload(api,1),{issue:'upload'}); await runtime.flush();
  assert.equal(runtime.result.photos.length,1); assert.equal(runtime.result.photos[0].state,'failed');
  assert.deepEqual(await runtime.result.upload(api,1),['stable-attachment']); await runtime.flush();
  assert.equal(calls,2); assert.equal(identities[0],identities[1]); assert.equal(runtime.result.photos[0].state,'ready');
});
test('completed PUT first reuses its attachment even after expiry to recover a lost send acknowledgement', async t => {
  const runtime=hookRuntime();
  const {usePhotoDraft}=loadTypescript(new URL('../src/app/Messaging/usePhotoDraft.ts',import.meta.url).pathname,
    name=>name==='react'?runtime.hooks:rules);
  runtime.render(()=>usePhotoDraft());
  runtime.result.add([new File(['%PDF-1.7'],'report.pdf',{type:'application/pdf'})]); await runtime.flush();
  let presigns=0, puts=0;
  const api={presignPhoto:async()=>{presigns++;return {id:'stable-attachment',uploadUrl:'https://synthetic.invalid/upload',uploadHeaders:{},expiresAt:new Date(Date.now()-1000).toISOString()};}};
  const original=globalThis.fetch; globalThis.fetch=async()=>{puts++;return {ok:true};};
  t.after(()=>{globalThis.fetch=original;runtime.unmount();});
  await runtime.result.upload(api,1); await runtime.flush();
  await runtime.result.upload(api,1);
  assert.equal(presigns,1);assert.equal(puts,1);
  await runtime.result.upload(api,1,true);
  assert.equal(presigns,2);assert.equal(puts,2);
});
