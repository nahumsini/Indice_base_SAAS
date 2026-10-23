import assert from 'node:assert/strict';
import test from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { loadTypescript, hookRuntime } from './helpers/hook-runtime.mjs';
const root = new URL('../src/app/ComplementaryModules/Email/', import.meta.url);
const load = (file, require) => loadTypescript(new URL(file, root).pathname, require);
class ApiClientError extends Error { constructor(message, status, code) { super(message); this.status = status; this.code = code; } }
const rules = load('mailAttachmentUpload.ts', () => ({ ApiClientError }));
const language = { useLanguage: () => ({ currentLanguage: { code: 'es-MX' } }) };
const editorCopy=loadTypescript(new URL('../src/app/components/mail-editor/mailEditorCopy.ts',import.meta.url).pathname,()=>language);
const copy = load('attachmentCopy.ts', () => language);
const completion = load('completionCopy.ts', () => language);
const jpeg = new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70]);
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const nodes = n => n == null || typeof n !== 'object' ? [] : Array.isArray(n) ? n.flatMap(nodes) : [n, ...nodes(n.props?.children)];
const strings = n => typeof n === 'string' ? n : Array.isArray(n) ? n.map(strings).join(' ') : n?.props ? strings(n.props.children) : '';
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'Fragment' };
const stub = new Proxy({}, { get: (_, key) => key });
async function settle(runtime) { for (let i = 0; i < 35; i++) { await setImmediate(); await runtime.flush(); if (!runtime.result.props['aria-busy']) return; } assert.fail('attachment operation did not finish'); }
function harness(api, prepare = async () => ({ id: 'draft', version: 4, state: 'DRAFT' })) {
  const runtime = hookRuntime(), saved = [], busy = [];
  const { MailAttachments } = load('MailAttachments.tsx', id => {
    if (id === 'react') return runtime.hooks; if(id.endsWith('/mailEditorCopy'))return editorCopy; if (id === 'react/jsx-runtime') return jsx;
    if (id.endsWith('/mailboxApi')) return { mailboxApi: { attachments: async () => [], downloadUrl: () => '/synthetic-download', ...api } };
    if (id.endsWith('/mailDailyCopy')) return load('mailDailyCopy.ts', () => language);
    if (id.endsWith('/completionCopy')) return completion;
    if (id.endsWith('/attachmentCopy')) return copy;
    if (id.endsWith('/mailAttachmentUpload')) return rules;
    return stub;
  });
  runtime.render(() => MailAttachments({ account: 'account', messageId: 'draft', version: 0, accountVersion: 2, onPrepare: prepare, onSaved: m => saved.push(m), onBusy: b => busy.push(b) }));
  const select = file => nodes(runtime.result).find(n => n.type === 'input').props.onChange({ target: { files: [file], value: 'selected' } });
  return { runtime, saved, busy, select };
}

test('JPEG named PNG is attached with the correct MIME and extension, preserving bytes and original file', async () => {
  const original = new File([jpeg], 'captura.PNG', { type: 'image/png', lastModified: 42 });
  const file = await rules.prepareMailAttachment(original);
  assert.equal(file.name, 'captura.jpg'); assert.equal(file.type, 'image/jpeg'); assert.equal(file.lastModified, 42);
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), jpeg);
  assert.equal(original.name, 'captura.PNG'); assert.equal(original.type, 'image/png');
  const reverse = await rules.prepareMailAttachment(new File([png], 'foto.jpeg', { type: 'image/jpeg' }));
  assert.equal(reverse.name, 'foto.png'); assert.equal(reverse.type, 'image/png');
  const pdf = await rules.prepareMailAttachment(new File(['%PDF-test'], 'documento.pdf'));
  assert.equal(pdf.type, 'application/pdf');
});
test('unsupported extensions, fake images, empty and oversized files stay blocked before draft or upload', async () => {
  for (const [file, key] of [
    [new File([jpeg], 'script.exe', { type: 'image/jpeg' }), 'fileFormat'],
    [new File(['fake image'], 'foto.png', { type: 'image/png' }), 'fileContent'],
    [new File([], 'empty.txt'), 'fileSize'],
    [new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.txt'), 'fileSize'],
  ]) {
    await assert.rejects(rules.prepareMailAttachment(file), e => e.key === key);
    let prepared = 0; const h = harness({ upload: () => assert.fail('must not upload') }, async () => { prepared++; });
    h.select(file); await settle(h.runtime); assert.equal(prepared, 0);
    assert.ok(strings(h.runtime.result).includes(copy.useMailAttachmentCopy()[key])); h.runtime.unmount();
  }
});
test('upload completes normalization, private PUT and registration with authoritative draft versions', async t => {
  const previousFetch = globalThis.fetch; t.after(() => { globalThis.fetch = previousFetch; });
  const calls = []; globalThis.fetch = async (url, input) => { calls.push(['put', url, input]); return { ok: true }; };
  const result = { id: 'draft', version: 5, hasAttachments: true };
  const h = harness({
    upload: async (...args) => { calls.push(['upload', ...args]); return { id: 'attachment', url: 'https://storage.invalid/synthetic', headers: { 'Content-Type': 'image/jpeg', 'Content-Length': '10' } }; },
    register: async (...args) => { calls.push(['register', ...args]); return result; },
  });
  h.select(new File([jpeg], 'foto.png', { type: 'image/png' })); await settle(h.runtime);
  assert.equal(calls[0][3].filename, 'foto.jpg'); assert.equal(calls[0][3].contentType, 'image/jpeg'); assert.equal(calls[0][3].version, 4);
  assert.equal(calls[1][2].body.type, 'image/jpeg'); assert.equal(calls[1][2].credentials, 'omit'); assert.equal(calls[1][2].headers['Content-Length'], undefined);
  assert.deepEqual(calls[2], ['register', 'account', 'draft', 'attachment', 4, 2]);
  assert.deepEqual(h.saved, [result]); assert.deepEqual(h.busy, [true, false]); h.runtime.unmount();
});
test('a failed PUT retains the same upload for retry and never registers a failed transfer', async t => {
  const previousFetch = globalThis.fetch; t.after(() => { globalThis.fetch = previousFetch; });
  let attempts = 0, presigns = 0, registered = 0;
  globalThis.fetch = async () => { if (++attempts === 1) throw new Error('network'); return { ok: true }; };
  const h = harness({ upload: async () => { presigns++; return { id: 'file', url: 'https://storage.invalid/synthetic', headers: {} }; }, register: async () => { registered++; return { id: 'draft', version: 5 }; } });
  h.select(new File(['hola'], 'nota.txt')); await settle(h.runtime);
  assert.equal(registered, 0); assert.match(strings(h.runtime.result), /no terminó de subir/);
  nodes(h.runtime.result).find(n => n.type === 'Button' && strings(n).includes('Reintentar')).props.onClick(); await settle(h.runtime);
  assert.equal(presigns, 1); assert.equal(attempts, 2); assert.equal(registered, 1); assert.equal(h.saved.length, 1); h.runtime.unmount();
});
test('lost registration response is reconciled without uploading or registering a duplicate', async t => {
  const previousFetch = globalThis.fetch; t.after(() => { globalThis.fetch = previousFetch; });
  let uploads = 0, registers = 0;
  globalThis.fetch = async () => { uploads++; return { ok: true }; };
  const result = { id: 'draft', version: 5, state: 'DRAFT' };
  const h = harness({
    upload: async () => ({ id: 'file', url: 'https://storage.invalid/synthetic', headers: {} }),
    register: async () => { registers++; throw new Error('response lost'); },
    attachments: async () => [{ id: 'file', filename: 'nota.txt', sizeBytes: 4 }], get: async () => result,
  });
  h.select(new File(['hola'], 'nota.txt')); await settle(h.runtime);
  nodes(h.runtime.result).find(n => n.type === 'Button' && strings(n).includes('Reintentar')).props.onClick(); await settle(h.runtime);
  assert.equal(uploads, 1); assert.equal(registers, 1); assert.deepEqual(h.saved, [result]); h.runtime.unmount();
});
test('server rejections show safe actionable messages and retain the backend content policy', () => {
  assert.equal(rules.attachmentErrorKey(new ApiClientError('private detail', 422, 'email_attachment_blocked')), 'fileContent');
  assert.equal(rules.attachmentErrorKey(new ApiClientError('quota detail', 413, 'STORAGE_QUOTA_EXCEEDED')), 'fileQuota');
  assert.equal(rules.attachmentErrorKey(new ApiClientError('changed', 409)), 'fileConflict');
  assert.equal(rules.attachmentErrorKey(new Error('secret raw provider error')), 'fileUnknown');
});
