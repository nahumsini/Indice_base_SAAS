import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

const root = 'src/app/BasicModules/Sales/';
const load = (path, require = () => ({})) => loadTypescript(resolve(root + path), require);
const status = load('Prospectos/utils/prospectosStatus.ts');
const formatters = load('Prospectos/utils/prospectosFormatters.ts', () => status);
const model = load('Prospectos/kanban/kanbanModel.ts', () => formatters);
const { getKanbanCopy } = load('Prospectos/kanban/kanbanCopy.ts');
const { defaultOpportunityFlowStages: stages } = load('types/opportunities.ts');
const { esMX: copy } = load('Prospectos/translations/prospectosTranslations.ts');
const flow = load('Prospectos/utils/prospectosFlow.ts');
const now = new Date('2026-10-18T18:00:00Z'); // Toronto 14:00
const base = { id: '1', opportunityName: 'Seguimiento de servicios médicos para empresas', company: 'Clínica de prueba', contactPerson: 'Contacto de prueba', phone: '', email: '', stage: 'New', owner: 'Usuario Demo', status: 'Active', nextAction: 'Call', nextActionDate: '', probability: '10%', temperature: 'Warm', estimatedValue: '100', currency: 'MXN' };
const timing = (patch, stage = stages[0], instant = now) => model.getKanbanTiming({ ...base, ...patch }, stage, instant, 'America/Toronto');

test('urgency uses the saved instant and company timezone, including date-only and explicit midnight', () => {
  assert.equal(timing({ nextActionDate: '2026-10-18 13:00', nextActionScheduledAt: '2026-10-18T17:00:00Z' }).state, 'overdue');
  assert.equal(timing({ nextActionDate: '2026-10-18 15:00', nextActionScheduledAt: '2026-10-18T19:00:00Z' }).state, 'today');
  assert.equal(timing({ nextActionDate: '2026-10-18' }).state, 'unscheduled');
  assert.equal(timing({ nextActionDate: '2026-10-19 00:00', nextActionScheduledAt: '2026-10-19T04:00:00Z' }).unscheduled, false);
  assert.equal(timing({ nextActionDate: '2026-10-18 23:30' }, stages[0], new Date('2026-10-19T02:00:00Z')).state, 'today');
  // The persisted UTC instant disambiguates repeated clocks during DST fallback.
  assert.equal(timing({ nextActionDate: '2026-11-01 01:30', nextActionScheduledAt: '2026-11-01T06:30:00Z' }, stages[0], new Date('2026-11-01T05:45:00Z')).state, 'today');
});

test('custom terminal stages and paused records do not appear as overdue or unscheduled work', () => {
  for (const type of ['WON', 'LOST']) {
    const result = timing({ nextActionDate: '2020-01-01 10:00' }, { key: 'Custom', type });
    assert.equal(result.state, 'closed');
    assert.equal(model.matchesKanbanAttention(result, 'overdue'), false);
    assert.equal(model.matchesKanbanAttention(result, 'unscheduled'), false);
  }
  assert.equal(timing({ status: 'On hold' }).state, 'paused');
  assert.equal(timing({ status: 'On hold' }).unscheduled, false);
});

test('30 records retain stable ordering and filtering without changing source records', () => {
  const records = Array.from({ length: 30 }, (_, index) => ({ ...base, id: String(index + 1), nextActionDate: index < 10 ? '2026-10-17 12:00' : index < 20 ? '2026-10-18 16:00' : '' }));
  const original = JSON.stringify(records);
  const timings = new Map(records.map(record => [record.id, timing(record)]));
  const sorted = model.sortKanbanOpportunities([...records].reverse(), 'next_action', timings);
  assert.deepEqual(sorted.map(record => record.id), records.map(record => record.id));
  assert.equal(sorted.filter(record => model.matchesKanbanAttention(timings.get(record.id), 'overdue')).length, 10);
  assert.equal(sorted.filter(record => model.matchesKanbanAttention(timings.get(record.id), 'unscheduled')).length, 10);
  assert.equal(JSON.stringify(records), original);
});

test('amount sort groups currencies; chronology keeps missing dates last', () => {
  const records = [{ ...base, id: '1', currency: 'USD', estimatedValue: '10', createdAt: '2026-10-01T12:00:00' },
    { ...base, id: '2', currency: 'MXN', estimatedValue: '1000', createdAt: '2026-10-02T12:00:00' },
    { ...base, id: '3', currency: 'MXN', estimatedValue: '2K' }];
  assert.deepEqual(model.sortKanbanOpportunities(records, 'amount', new Map()).map(record => record.id), ['3', '2', '1']);
  assert.deepEqual(model.sortKanbanOpportunities(records, 'newest', new Map()).map(record => record.id), ['2', '1', '3']);
  assert.deepEqual(model.sortKanbanOpportunities(records, 'oldest', new Map()).map(record => record.id), ['1', '2', '3']);
});

test('stale stage IDs and unknown remembered sort/filter values fall back safely', () => {
  assert.deepEqual(model.validateKanbanWorkspace({ sort: 'broken', attention: 'broken', attentionStage: 'deleted', mobileStage: 'deleted' }, stages), { sort: 'next_action', attention: 'all', attentionStage: '', mobileStage: 'New' });
});

const jsx = (type, props) => ({ type, props });
const nodes = tree => {
  const result = [];
  const visit = node => { if (!node || typeof node !== 'object') return; result.push(node); [node.props?.children].flat(Infinity).forEach(visit); };
  visit(tree); return result;
};
const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : !node || typeof node !== 'object' ? '' : [node.props?.children].flat(Infinity).map(text).join('');
const symbols = new Proxy({}, { get: (_, name) => name });

test('cards open existing detail/edit/files flows and keyboard stage changes use the same callback', () => {
  const calls = [];
  const { ProspectosKanbanCard } = load('Prospectos/kanban/ProspectosKanbanCard.tsx', id => {
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id.endsWith('/utils')) return { cn: (...classes) => classes.filter(Boolean).join(' ') };
    if (id.endsWith('prospectosFormatters')) return { ...formatters, formatCurrencyAmount: value => '$' + value };
    if (id.endsWith('prospectosFlow')) return flow;
    return symbols;
  });
  const tree = ProspectosKanbanCard({ copy, labels: getKanbanCopy('es-MX'), locale: 'es-MX', opportunity: base, timing: timing({}), stages,
    onOpenHistory: record => calls.push(['detail', record.id]), onEdit: record => calls.push(['edit', record.id]), onNextAction: record => calls.push(['next-action', record.id]), onOpenFiles: record => calls.push(['files', record.id]), onStageChange: (record, stage) => calls.push(['move', record.id, stage]) });
  const all = nodes(tree);
  all.find(node => node.type === 'button' && node.props.title === base.opportunityName).props.onClick();
  all.find(node => node.type === 'DropdownMenuItem' && text(node).includes('Editar')).props.onSelect();
  all.find(node => node.type === 'DropdownMenuItem' && text(node) === copy.quickActions.files(base.opportunityName)).props.onSelect();
  all.find(node => node.type === 'DropdownMenuItem' && text(node) === 'Ganada').props.onSelect();
  all.find(node => node.type === 'button' && node.props['aria-haspopup'] === 'dialog').props.onClick();
  assert.deepEqual(calls, [['detail', '1'], ['edit', '1'], ['files', '1'], ['move', '1', 'Won'], ['next-action', '1']]);
  assert.equal(all.find(node => node.type === 'DropdownMenuItem' && text(node) === 'Nueva').props.disabled, true);
  assert.match(text(tree), /MXN · Estimado/);
  let prevented = false;
  tree.props.onDragStart({ target: { closest: () => ({}) }, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
});

test('column renders all 30 cards and rejects foreign or same-stage drops', () => {
  const calls = []; const runtime = hookRuntime();
  const { ProspectosKanbanColumn } = load('Prospectos/kanban/ProspectosKanbanColumn.tsx', id => {
    if (id === 'react') return { ...runtime.hooks, useId: () => 'stage-heading' };
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id.endsWith('/utils')) return { cn: (...classes) => classes.filter(Boolean).join(' ') };
    if (id.endsWith('prospectosFormatters')) return formatters;
    if (id.endsWith('prospectosFlow')) return flow;
    return symbols;
  });
  const records = Array.from({ length: 30 }, (_, index) => ({ ...base, id: String(index + 1) }));
  runtime.render(() => ProspectosKanbanColumn({ copy, labels: getKanbanCopy('es-MX'), locale: 'es-MX', stage: stages[0], stages, opportunities: records, allOpportunities: [...records, { ...base, id: 'other', stage: 'Contacted' }], totalCount: 30, overdueCount: 0, timings: new Map(records.map(record => [record.id, timing(record)])), mobileActive: true, onStageChange: (record, stage) => calls.push([record.id, stage]), register() {}, remember() {}, onOverdue() {} }));
  assert.equal(nodes(runtime.result).filter(node => node.type === 'ProspectosKanbanCard').length, 30);
  for (const id of ['unknown', '1', 'other']) runtime.result.props.onDrop({ preventDefault() {}, dataTransfer: { getData: () => id } });
  assert.deepEqual(calls, [['other', 'New']]); runtime.unmount();
});

test('scroll position survives remount and is isolated by company, user and flow', async () => {
  const cache = new Map();
  global.window = { sessionStorage: { getItem: key => cache.get(key) || null, setItem: (key, value) => cache.set(key, value) } };
  let session = { company: { id: 1 }, user: { id: 2 } };
  const open = async flowId => {
    const runtime = hookRuntime();
    const { useKanbanPosition } = load('Prospectos/kanban/useKanbanPosition.ts', id => id === 'react' ? runtime.hooks : id.endsWith('/auth') ? { authApi: { getSessionOrNull: async () => session } } : { useAuthorizationRevision: () => 0 });
    runtime.render(() => useKanbanPosition(flowId, true)); await runtime.flush(); return runtime;
  };
  let runtime = await open(1);
  runtime.result.remember('New', { scrollTop: 1200, scrollLeft: 0, clientWidth: 304 }); runtime.unmount();
  runtime = await open(1); const restored = { scrollTop: 0, scrollLeft: 0, clientWidth: 304 };
  runtime.result.register('New', restored); assert.equal(restored.scrollTop, 1200); runtime.unmount();
  for (const [company, user, flowId] of [[9, 2, 1], [1, 9, 1], [1, 2, 2]]) {
    session = { company: { id: company }, user: { id: user } }; runtime = await open(flowId);
    const other = { scrollTop: 0, scrollLeft: 0, clientWidth: 304 }; runtime.result.register('New', other); assert.equal(other.scrollTop, 0); runtime.unmount();
  }
  delete global.window;
});

test('new controls have localized copy in every supported language family', () => {
  for (const language of ['es-MX', 'es-CO', 'en-CA', 'en-US', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    const labels = getKanbanCopy(language);
    for (const value of Object.values(labels)) assert.ok(typeof value === 'function' || (typeof value === 'string' && value.length));
    assert.ok(labels.count(8, 30).includes('30'));
  }
});
