import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { initialDraft, splitRecipients, validRecipients } from '../src/app/ComplementaryModules/Email/mailboxModel.ts';
const account = { id: 'account', email: 'me@example.com', version: 7 };
const message = { id: 'message', version: 3, subject: 'Hello', bodyText: 'Body', fromAddress: 'sender@example.com', replyTo: ['replies@example.com'], to: ['me@example.com', 'team@example.com'], cc: ['cc@example.com', 'me@example.com'], bcc: ['private@example.com'] };
test('reply follows Reply-To and reply-all excludes the owner and never inherits BCC', () => {
  const reply = initialDraft(account, message, 'reply');
  assert.deepEqual(reply.to, ['replies@example.com']);assert.deepEqual(reply.bcc, []);assert.equal(reply.replyToMessageId, 'message');
  const all = initialDraft(account, message, 'all');assert.deepEqual(all.to, ['replies@example.com', 'team@example.com']);assert.deepEqual(all.cc, ['cc@example.com']);assert.deepEqual(all.bcc, []);
});
test('editing retains optimistic version while forwarding creates a separate draft without thread authority', () => {
  const edit = initialDraft(account, message, 'edit');assert.equal(edit.version, 3);assert.equal(edit.accountVersion, 7);assert.equal(edit.bodyText, 'Body');
  const forward = initialDraft(account, message, 'forward');assert.equal(forward.version, 0);assert.equal(forward.replyToMessageId, null);assert.deepEqual(forward.to, []);assert.match(forward.bodyText, /Body/);
});
test('recipient validation accepts separators but rejects duplicates, injection and over-limit audiences', () => {
  assert.deepEqual(splitRecipients('one@example.com; two@example.com, \nthird@example.com'), ['one@example.com', 'two@example.com', 'third@example.com']);
  assert.equal(validRecipients(['one@example.com'], ['ONE@example.com']), false);
  assert.equal(validRecipients(['one@example.com\r\nBcc: victim@example.com']), false);
  assert.equal(validRecipients(Array.from({ length: 21 }, (_, i) => `user${i}@example.com`)), false);
});
test('live mailbox uses persistent APIs; confirmation and uncertain-result recovery never trigger an automatic send', () => {
  const root = new URL('../src/app/ComplementaryModules/Email/', import.meta.url);
  const composer = readFileSync(new URL('MailComposer.tsx', root), 'utf8');
  const workspace = readFileSync(new URL('LiveMailboxWorkspace.tsx', root), 'utf8');
  assert.match(composer, /saved \? onDone\(saved\) : onClose\(\)/);
  assert.match(composer, /setView\('review'\)/);assert.match(composer, /mailboxApi\.send\(account\.id, saved, account\.version\)/);
  assert.match(composer, /if \(!saved \|\| busy \|\| uncertain\) return/);assert.match(composer, /mailboxApi\.get\(account\.id, id\.current\)/);
  assert.doesNotMatch(composer, /localStorage|sessionStorage|dangerouslySetInnerHTML/);
  assert.match(workspace, /scope\.current === captured/);assert.match(workspace, /AbortController/);
  assert.match(workspace, /state: filters/);assert.doesNotMatch(workspace, /previewMessages/);
});
