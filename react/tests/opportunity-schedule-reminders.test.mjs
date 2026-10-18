import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

const base = 'src/app/BasicModules/Sales/';
const load = (file, dependencies = () => ({})) => loadTypescript(resolve(base + file), dependencies);
const schedules = load('utils/opportunitySchedule.ts');
const businessCurrency = loadTypescript(resolve('src/app/BasicModules/shared/businessCurrency.ts'), () => ({}));
const currency = load('utils/salesCurrency.ts', () => businessCurrency);
const adapters = load('adapters/salesApiAdapters.ts', id => id.endsWith('opportunitySchedule') ? schedules
  : id.endsWith('salesCurrency') ? currency : { resolveSalesStorageUrl: x => x });
const status = load('Prospectos/utils/prospectosStatus.ts');
const formatters = load('Prospectos/utils/prospectosFormatters.ts', id => id.endsWith('prospectosStatus') ? status : currency);

test('API reload preserves the exact company clock time and intentional midnight without inventing times', () => {
  const values = [
    ['2026-10-18T10:30:00', '2026-10-18T14:30:00', '2026-10-18 10:30'],
    ['2026-10-19T00:00:00', '2026-10-19T04:00:00', '2026-10-19 00:00'],
    ['2026-10-18T00:00:00', null, '2026-10-18'],
    ['2026-10-18T10:30:00', null, '2026-10-18 10:30'],
    [null, null, ''],
  ];
  for (const [nextActionAt, nextActionScheduledAt, expected] of values) {
    const opportunity = adapters.toFrontendOpportunity({ id: 1, nextActionAt, nextActionScheduledAt });
    assert.equal(opportunity.nextActionDate, expected);
    assert.equal(formatters.formatOpportunitySchedule(...Object.values(formatters.getOpportunitySchedule(opportunity))), expected);
    const patch = adapters.toBackendOpportunityPatch({ nextActionDate: opportunity.nextActionDate }, []);
    assert.deepEqual(patch, { nextActionAt: expected || null });
  }
});

test('clearing is explicit null; unrelated updates leave the schedule alone; time alone is never persisted', () => {
  assert.deepEqual(adapters.toBackendOpportunityPatch({ nextActionDate: '' }, []), { nextActionAt: null });
  assert.deepEqual(adapters.toBackendOpportunityPatch({ notes: 'A note' }, []), { notes: 'A note' });
  assert.equal(formatters.formatOpportunitySchedule('', '11:30'), '');
});

test('agenda uses persisted state after reload, company change and failed save instead of browser schedule drafts', () => {
  const saved = adapters.toFrontendOpportunity({ id: 1, nextActionAt: '2026-10-18T10:30:00', nextActionScheduledAt: '2026-10-18T14:30:00' });
  let opportunities = [saved]; const writes = [];
  global.window = { localStorage: { getItem: () => { throw Error('Unscoped drafts must not be read'); } } };
  const runtime = hookRuntime();
  const { useProspectosAgenda } = load('Prospectos/hooks/useProspectosAgenda.ts', id =>
    id === 'react' ? runtime.hooks : id.endsWith('prospectosFormatters') ? formatters : status);
  runtime.render(() => useProspectosAgenda(opportunities, (...args) => writes.push(args)));
  assert.deepEqual(runtime.result.opportunitySchedules.get(saved.id), { date: '2026-10-18', time: '10:30' });
  runtime.result.handleDraftChange(saved, 'time', '12:00'); runtime.render();
  assert.equal(writes[0][2], '12:00');
  // A rejected mutation cannot falsely show a saved reminder.
  assert.equal(runtime.result.opportunitySchedules.get(saved.id).time, '10:30');
  opportunities = [{ ...saved, nextActionDate: '2026-10-19 09:15' }]; runtime.render();
  assert.deepEqual(runtime.result.opportunitySchedules.get(saved.id), { date: '2026-10-19', time: '09:15' });
  runtime.unmount(); delete global.window;
});

test('table and agenda editor requires a date before a time and explains automatic reminders', () => {
  const jsx = (type, props) => ({ type, props });
  const copy = load('Prospectos/translations/opportunityReminderCopy.ts');
  const { OpportunityScheduleInlineEditor } = load('Prospectos/components/OpportunityScheduleInlineEditor.tsx', id => {
    if (id === 'react') return { useState: value => [value, () => {}] };
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id.endsWith('/input')) return { Input: 'input' };
    if (id.endsWith('/context')) return { useLanguage: () => ({ currentLanguage: { code: 'es-MX' } }) };
    if (id.endsWith('prospectosFormatters')) return formatters;
    return copy;
  });
  const unscheduled = { nextAction: 'Call', nextActionDate: '', status: 'Active' };
  const empty = OpportunityScheduleInlineEditor({ opportunity: unscheduled, onScheduleChange() {} });
  assert.equal(empty.props.children[1].props.disabled, true);
  assert.match(empty.props.children[2].props.children[0], /Completa fecha, hora y responsable/);
  const ready = OpportunityScheduleInlineEditor({ opportunity: { ...unscheduled, nextActionDate: '2026-10-18 11:00', ownerUserCompanyId: 2 }, onScheduleChange() {} });
  assert.equal(ready.props.children[1].props.disabled, false);
  assert.equal(ready.props.children[2].props.children[0], 'Aviso 1 hora antes');
  assert.equal(status.defaultOpportunityColumns.find(column => column.id === 'nextAction').label, 'Siguiente acción');
});

test('the shared editor blocks overlapping edits and retains the confirmed time after a rejected save', async () => {
  const runtime = hookRuntime(); const jsx = (type, props) => ({ type, props });
  const copy = load('Prospectos/translations/opportunityReminderCopy.ts');
  const { OpportunityScheduleInlineEditor } = load('Prospectos/components/OpportunityScheduleInlineEditor.tsx', id => {
    if (id === 'react') return runtime.hooks;
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id.endsWith('/input')) return { Input: 'input' };
    if (id.endsWith('/context')) return { useLanguage: () => ({ currentLanguage: { code: 'es-MX' } }) };
    if (id.endsWith('prospectosFormatters')) return formatters;
    return copy;
  });
  let reject;
  const pending = new Promise((_, fail) => { reject = fail; });
  runtime.render(() => OpportunityScheduleInlineEditor({
    opportunity: { nextAction: 'Call', nextActionDate: '2026-10-18 10:30', ownerUserCompanyId: 2, status: 'Active' },
    onScheduleChange: () => pending,
  }));
  runtime.result.props.children[1].props.onChange({ target: { value: '12:30' } }); await runtime.flush();
  assert.equal(runtime.result.props.children[0].props.disabled, true);
  assert.equal(runtime.result.props.children[1].props.disabled, true);
  reject(Error('server rejected save')); await runtime.flush();
  assert.equal(runtime.result.props.children[1].props.disabled, false);
  assert.equal(runtime.result.props.children[1].props.value, '10:30');
  runtime.unmount();
});
