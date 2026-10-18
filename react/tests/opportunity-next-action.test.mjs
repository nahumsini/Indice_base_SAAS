import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

const root = 'src/app/BasicModules/Sales/';
const load = (file, dependencies = () => ({})) => loadTypescript(resolve(root + file), dependencies);
const types = load('types/opportunities.ts');
const status = load('Prospectos/utils/prospectosStatus.ts');
const formatters = load('Prospectos/utils/prospectosFormatters.ts', () => status);
const model = load('Prospectos/utils/nextActionDraft.ts', name => name.endsWith('prospectosFormatters') ? formatters : types);
const { getNextActionCopy } = load('Prospectos/translations/nextActionCopy.ts');
const base = { id: '1', nextAction: 'Call', nextActionDate: '2026-10-19', ownerUserCompanyId: 2, status: 'Active', stage: 'New', lifecycleStatus: 'OPEN', nextActionTimezone: 'America/Toronto' };

test('next-action patches preserve untouched schedules and cannot overwrite other business fields', () => {
  const initial = model.nextActionDraft(base);
  assert.deepEqual(model.nextActionPatch(initial, initial), {});
  assert.deepEqual(model.nextActionPatch(initial, { ...initial, action: 'Email' }), { nextAction: 'Email' });
  assert.deepEqual(model.nextActionPatch(initial, { ...initial, time: '00:00' }), { nextActionDate: '2026-10-19 00:00' });
  assert.deepEqual(model.nextActionPatch(initial, { action: 'Meeting', date: '', time: '' }), { nextAction: 'Meeting', nextActionDate: '' });
  const timed = model.nextActionDraft({ ...base, nextActionDate: '2026-10-19 09:30' });
  assert.deepEqual(model.nextActionPatch(timed, { ...timed, time: '' }), { nextActionDate: '2026-10-19' });
});

test('optional date/time, valid midnight and leap days are distinct from invalid schedules', () => {
  for (const draft of [model.nextActionDraft(base), { action: 'Email', date: '', time: '' }, { action: 'Call', date: '2028-02-29', time: '00:00' }]) assert.equal(model.validateNextAction(draft), null);
  assert.equal(model.validateNextAction({ action: 'Call', date: '', time: '09:00' }), 'chooseDate');
  for (const date of ['2026-02-29', '2026-04-31', '2026-13-01']) assert.equal(model.validateNextAction({ action: 'Call', date, time: '' }), 'invalidDate');
  for (const time of ['25:00', '09:99', '9:15']) assert.equal(model.validateNextAction({ action: 'Call', date: '2026-10-19', time }), 'invalidTime');
  assert.equal(model.validateNextAction({ action: 'unknown', date: '', time: '' }), 'chooseAction');
});

test('date shortcuts use company calendar days across UTC midnight, month/year boundaries and DST', () => {
  const instant = new Date('2026-01-01T02:30:00Z');
  assert.equal(model.nextActionDay('America/Toronto', 0, instant), '2025-12-31');
  assert.equal(model.nextActionDay('America/Toronto', 1, instant), '2026-01-01');
  assert.equal(model.nextActionDay('Asia/Tokyo', 0, instant), '2026-01-01');
  assert.equal(model.nextActionDay('America/Toronto', 7, new Date('2026-03-07T18:00:00Z')), '2026-03-14');
  assert.equal(model.nextActionDay('', 0, instant), '');
  assert.equal(model.nextActionDay('invalid', 0, instant), '');
});

test('reminder explanation distinguishes incomplete, past, inactive and non-call actions', () => {
  const now = new Date('2026-10-19T13:00:00Z'); // 09:00 in Toronto.
  const draft = { action: 'Call', date: '2026-10-19', time: '10:00' };
  const reminder = (record = base, value = draft) => model.callReminderState(record, value, 'America/Toronto', now);
  assert.equal(reminder(), 'callReminder');
  assert.equal(reminder(base, { ...draft, time: '08:00' }), 'callPast');
  assert.equal(reminder(base, { ...draft, time: '' }), 'callIncomplete');
  assert.equal(reminder({ ...base, ownerUserCompanyId: null }), 'callIncomplete');
  assert.equal(reminder({ ...base, status: 'On hold' }), 'callInactive');
  assert.equal(reminder({ ...base, lifecycleStatus: 'WON', stage: 'Custom won stage' }), 'callInactive');
  assert.equal(reminder(base, { ...draft, action: 'Email' }), null);
});

class ApiClientError extends Error { constructor(message, status) { super(message); this.status = status; } }
function setup(save, opportunity = base) {
  const runtime = hookRuntime(); let closed = 0;
  const { useNextActionDraft } = load('Prospectos/hooks/useNextActionDraft.ts', name => name === 'react' ? runtime.hooks : name.endsWith('/apiClient') ? { ApiClientError } : model);
  runtime.render(() => useNextActionDraft(opportunity, save, () => closed++, 'Retry safely'));
  return { runtime, closed: () => closed };
}

test('failed save retains draft, blocks overlapping saves/edits/close, and retries without false success', async () => {
  let reject; let resolveSave; const writes = [];
  const { runtime, closed } = setup((id, patch) => { writes.push({ id, patch }); return new Promise((resolve, fail) => { reject = fail; resolveSave = resolve; }); });
  runtime.result.update({ action: 'Email', time: '09:00' }); await runtime.flush();
  const first = runtime.result.save(); const duplicate = runtime.result.save();
  runtime.result.close(); runtime.result.update({ action: 'Meeting' }); await runtime.flush();
  assert.equal(runtime.result.saving, true); assert.equal(closed(), 0);
  assert.equal(runtime.result.draft.action, 'Email'); assert.equal(writes.length, 1);
  reject(new Error('network failed')); await first; await duplicate; await runtime.flush();
  assert.equal(runtime.result.saving, false); assert.equal(closed(), 0);
  assert.equal(runtime.result.error, 'Retry safely'); assert.equal(runtime.result.draft.time, '09:00');
  const retry = runtime.result.save(); await runtime.flush(); resolveSave({ ...base, nextAction: 'Email', nextActionDate: '2026-10-19 09:00' }); await retry; await runtime.flush();
  assert.equal(closed(), 1);
  assert.deepEqual(writes, Array(2).fill({ id: '1', patch: { nextAction: 'Email', nextActionDate: '2026-10-19 09:00' } }));
  runtime.unmount();
});

test('cancel writes nothing, reopening starts from confirmed data, unchanged and invalid drafts never submit', async () => {
  const writes = []; let session = setup((...args) => { writes.push(args); return Promise.resolve(); });
  await session.runtime.result.save();
  session.runtime.result.update({ action: 'Email' }); await session.runtime.flush();
  session.runtime.result.close(); assert.equal(session.closed(), 1); assert.equal(writes.length, 0);
  session.runtime.unmount(); session = setup((...args) => { writes.push(args); return Promise.resolve(); });
  assert.equal(session.runtime.result.draft.action, 'Call');
  session.runtime.result.update({ time: '30:00' }); await session.runtime.flush(); await session.runtime.result.save();
  assert.equal(writes.length, 0); session.runtime.unmount();
});

test('server schedule validation is shown, while unrelated server details stay out of the form', async () => {
  for (const status of [400, 500]) {
    const { runtime, closed } = setup(async () => { throw new ApiClientError('Choose another DST time', status); });
    runtime.result.update({ time: '01:30' }); await runtime.flush(); await runtime.result.save(); await runtime.flush();
    assert.equal(runtime.result.error, status === 400 ? 'Choose another DST time' : 'Retry safely');
    assert.equal(closed(), 0); runtime.unmount();
  }
});

test('late completion after leaving the workspace does not close another modal', async () => {
  let finish;
  const { runtime, closed } = setup(() => new Promise(resolve => { finish = resolve; }));
  runtime.result.update({ action: 'Email' }); await runtime.flush();
  const saving = runtime.result.save(); runtime.unmount(); finish(); await saving;
  assert.equal(closed(), 0);
});

test('all eight locales have complete next-action form copy', () => {
  for (const locale of ['en-US', 'en-CA', 'es-MX', 'es-CO', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    const copy = getNextActionCopy(locale);
    for (const key of Object.keys(getNextActionCopy('en-US'))) assert.ok(copy[key]?.trim(), locale + ':' + key);
  }
});

test('the standard modal routes submit once and restores trigger focus only after real unmount', () => {
  const runtime = hookRuntime(); const effects = []; const frames = []; let focused = 0; let submits = 0;
  global.document = { activeElement: { isConnected: true, focus() { focused++; } } };
  global.window = { requestAnimationFrame: callback => frames.push(callback) };
  const jsx = (type, props) => ({ type, props });
  const symbols = new Proxy({}, { get: (_, name) => name });
  const { esMX: copy } = load('Prospectos/translations/prospectosTranslations.ts');
  const reminderCopy = load('Prospectos/translations/opportunityReminderCopy.ts');
  const { OpportunityNextActionModal } = load('Prospectos/modals/OpportunityNextActionModal.tsx', name => {
    if (name === 'react') return { ...runtime.hooks, useId: () => 'next-action-form', useEffect: callback => effects.push(callback) };
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name.endsWith('/context')) return { useLanguage: () => ({ currentLanguage: { code: 'es-MX' } }) };
    if (name.endsWith('nextActionCopy')) return { getNextActionCopy };
    if (name.endsWith('opportunityReminderCopy')) return reminderCopy;
    if (name.endsWith('useNextActionDraft')) return { useNextActionDraft: () => ({ draft: { action: 'Email', date: '2026-10-19', time: '' }, save() { submits++; }, dirty: false, update() {} }) };
    if (name.endsWith('nextActionDraft')) return model;
    if (name.endsWith('/opportunities')) return types;
    if (name.endsWith('salesModalStyles')) return { getSalesModalActionClassNames: () => ({}) };
    if (name.endsWith('formFeedbackCopy')) return { getFormFeedbackCopy: () => ({ saving: 'Guardando' }) };
    if (name.endsWith('/utils')) return { cn: (...classes) => classes.filter(Boolean).join(' ') };
    return symbols;
  });
  runtime.render(() => OpportunityNextActionModal({ opportunity: { ...base, nextAction: 'Email' }, businessTimezone: 'America/Toronto', copy }));
  const all = [];
  const visit = node => { if (!node || typeof node !== 'object') return; all.push(node); [node.props?.children].flat(Infinity).forEach(visit); };
  visit(runtime.result);
  assert.equal(runtime.result.props.modalType, 'standard-form');
  const radios = all.filter(node => node.type === 'input' && node.props.type === 'radio');
  assert.equal(radios.length, 8);
  assert.equal(radios.find(node => node.props.autoFocus).props.value, 'Email');
  assert.equal(radios.filter(node => node.props.autoFocus).length, 1);
  let prevented = false;
  all.find(node => node.type === 'form').props.onSubmit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true); assert.equal(submits, 1);
  // React StrictMode replays effect cleanup/setup while the dialog is still open.
  const cleanup = effects[0](); cleanup(); const finalCleanup = effects[0]();
  frames.splice(0).forEach(callback => callback()); assert.equal(focused, 0);
  finalCleanup(); frames.splice(0).forEach(callback => callback()); assert.equal(focused, 1);
  delete global.document; delete global.window;
});
