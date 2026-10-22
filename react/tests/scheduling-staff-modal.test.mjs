import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTypescript, hookRuntime } from './helpers/hook-runtime.mjs';

const root = new URL('../src/app/ComplementaryModules/Scheduling/', import.meta.url);
const load = (file, resolve = () => ({})) => loadTypescript(new URL(file, root).pathname, resolve);
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'Fragment' };
const stub = new Proxy({}, { get: (_, key) => key });
const named = (node, name) => node.type === name || node.type?.name === name;
const nodes = n => !n || typeof n !== 'object' ? [] : Array.isArray(n) ? n.flatMap(nodes) : [n, ...nodes(n.props?.children)];
const { getSchedulingCopy } = load('translations/schedulingCopy.ts', () => load('translations/schedulingWorkspaceCopy.ts'));
const setup = load('translations/schedulingSetupCopy.ts');
const operations = load('translations/schedulingOperationsCopy.ts');
const labels = load('translations/staffEditorCopy.ts');
const validation = load('utils/setupValidation.ts');
const copy = getSchedulingCopy('es-MX');
const text = labels.getStaffEditorCopy('es-MX');

function staffHarness(staff, members = [{ id: 9, name: 'Zoe' }, { id: 3, name: 'Ana' }]) {
  const runtime = hookRuntime(), writes = [];
  const { StaffEditor } = load('components/StaffEditor.tsx', id => {
    if (id === 'react') return { ...runtime.hooks, useId: () => 'name-hint' };
    if (id === 'react/jsx-runtime') return jsx;
    if (id.endsWith('/schedulingApi')) return { schedulingApi: { saveStaff: async (body, id) => writes.push({ body, id }) } };
    if (id.endsWith('/useSchedulingQuery')) return { useSchedulingQuery: () => ({ data: [{ id: 12, name: 'Consulta' }], reload() {} }) };
    if (id.endsWith('/schedulingSetupCopy')) return setup;
    if (id.endsWith('/schedulingOperationsCopy')) return operations;
    if (id.endsWith('/staffEditorCopy')) return labels;
    if (id.endsWith('/setupValidation')) return validation;
    if (id.endsWith('/schedulingIdentity')) return { schedulingEmoji: { team: '👥' } };
    return stub;
  });
  runtime.render(() => StaffEditor({ staff, members, copy, locale: 'es-MX', onClose() {}, onSaved() {} }));
  return { runtime, writes };
}

const next = async runtime => { runtime.result.props.navigation.onContinue(); await runtime.flush(); };
const back = async runtime => { runtime.result.props.navigation.onBack(); await runtime.flush(); };
const chooseEmployee = async runtime => { nodes(runtime.result).find(n => n.type === 'select' && n.props.value === '').props.onChange({ target: { value: '3' } }); await runtime.flush(); };

test('wizard retains identity, version, split hours, exceptions and service choices through Back and final save', async () => {
  const staff = { id: 7, userId: 3, publicName: 'Consulta Ana', timezone: 'America/Bogota', active: false, version: 8,
    days: [{ dayOfWeek: 1, startTime: '09:00:00', endTime: '12:00:00' }], bufferMinutes: 17,
    unavailableDates: ['2027-01-08'], serviceIds: [12, 99] };
  const { runtime, writes } = staffHarness(staff);
  assert.equal(runtime.result.props.title, text.editStaff);
  assert.equal(runtime.result.props.modalType, 'wizard');
  assert.equal(nodes(runtime.result).find(n => n.type === 'select' && n.props.value === 3).props.disabled, true);
  nodes(runtime.result).find(n => n.type === 'input' && n.props.value === staff.publicName).props.onChange({ target: { value: 'Atención Ana' } });
  await runtime.flush(); await next(runtime);
  const split = [...staff.days, { dayOfWeek: 1, startTime: '13:00', endTime: '17:00' }];
  nodes(runtime.result).find(n => n.type === 'WeeklyHours').props.onChange(split); await runtime.flush();
  await back(runtime);
  assert.equal(nodes(runtime.result).find(n => n.type === 'input' && n.props.required).props.value, 'Atención Ana');
  await next(runtime); await next(runtime); await next(runtime);
  assert.equal(runtime.result.props.navigation.onContinue, undefined); assert.equal(writes.length, 0);
  assert.deepEqual(nodes(runtime.result).find(n => n.type === 'StaffWeeklySummary').props.days, split);
  assert.deepEqual(nodes(runtime.result).find(n => n.type === 'StaffServiceSummary').props.staff.serviceIds, [12,99]);
  await runtime.result.props.onSave();
  const { id, ...expected } = staff;
  assert.deepEqual(writes, [{ id, body: { ...expected, publicName: 'Atención Ana', days: split } }]);
  assert.deepEqual(staff.days, [{ dayOfWeek: 1, startTime: '09:00:00', endTime: '12:00:00' }]);
  assert.equal(runtime.result.props.footerSummary, '1 días disponibles · 2 intervalos');
});

test('new staff validates identity, fills editable public name and cannot save before the review step', async () => {
  const { runtime, writes } = staffHarness();
  const select = nodes(runtime.result).find(n => n.type === 'select' && n.props.value === '');
  assert.equal(select.props.required, true);
  assert.deepEqual(nodes(select).filter(n => n.type === 'option' && n.props.value).map(n => n.props.children), ['Ana', 'Zoe']);
  assert.throws(() => runtime.result.props.navigation.onContinue(), /scheduling_setup_required/);
  await assert.rejects(runtime.result.props.onSave(), /scheduling_setup_required/);
  await chooseEmployee(runtime);
  assert.equal(nodes(runtime.result).find(n => n.type === 'input' && n.props.required).props.value, 'Ana');
  await next(runtime); await next(runtime); await next(runtime); assert.equal(writes.length, 0);
  await runtime.result.props.onSave();
  assert.equal(writes[0].body.userId, 3); assert.equal(writes[0].id, undefined);
  assert.equal(writes[0].body.days.length, 5); assert.deepEqual(writes[0].body.serviceIds, []);
});

test('invalid weekly hours gate progress, while no hours and no services retain their existing semantics', async () => {
  const { runtime, writes } = staffHarness(); await chooseEmployee(runtime); await next(runtime);
  const hours = () => nodes(runtime.result).find(n => n.type === 'WeeklyHours');
  hours().props.onChange([{ dayOfWeek: 1, startTime: '17:00', endTime: '09:00' }]); await runtime.flush();
  assert.throws(() => runtime.result.props.navigation.onContinue(), /scheduling_hours_invalid/); assert.equal(writes.length, 0);
  hours().props.onChange([]); await runtime.flush(); await next(runtime); await next(runtime);
  await runtime.result.props.onSave(); assert.equal(writes.length, 1);
  assert.deepEqual(writes[0].body.days, []); assert.deepEqual(writes[0].body.serviceIds, []);
});

test('compact weekly controls edit and remove the chosen split window without changing other days', () => {
  const { WeeklyHours } = load('components/WeeklyHours.tsx', id => id === 'react/jsx-runtime' ? jsx : id.endsWith('/schedulingOperationsCopy') ? operations : id.endsWith('/staffEditorCopy') ? labels : stub);
  const days = [{ dayOfWeek: 2, startTime: '10:00', endTime: '11:00' }, { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }, { dayOfWeek: 1, startTime: '13:00', endTime: '17:00' }];
  let changed;
  const view = WeeklyHours({ days, onChange: value => changed = value, copy, locale: 'es-MX', compact: true });
  nodes(view).find(n => n.type === 'input' && n.props['aria-label'] === 'Inicio · lunes · 2').props.onChange({ target: { value: '14:00' } });
  assert.deepEqual(changed, [days[0], days[1], { ...days[2], startTime: '14:00' }]);
  nodes(view).find(n => n.type === 'ActionButton' && n.props['aria-label'] === 'Quitar · lunes · 1').props.onClick();
  assert.deepEqual(changed, [days[0], days[2]]);
  const sunday = nodes(view).find(n => n.type === 'section' && n.props['aria-label'] === 'domingo');
  nodes(sunday).find(n => n.type === 'input').props.onChange({ target: { checked: true } });
  assert.deepEqual(changed.at(-1), { dayOfWeek: 7, startTime: '09:00', endTime: '17:00' });
  assert.equal(days.length, 3);
});

function frameHarness(onSave, hasChanges = true, footerLayout = 'split') {
  const runtime = hookRuntime(); let closed = 0, saved = 0, revision = 1;
  class ApiClientError extends Error {}
  const { EditorFrame } = load('components/SchedulingPrimitives.tsx', id => {
    if (id === 'react') return { ...runtime.hooks, useId: () => 'staff-form' };
    if (id === 'react/jsx-runtime') return jsx;
    if (id.endsWith('/ui/utils')) return { cn: (...args) => args.join(' ') };
    if (id.endsWith('/IndiceFilterBar')) return { getIndiceFilterControlClassName: () => '' };
    if (id.endsWith('/context')) return { useLanguage: () => ({ currentLanguage: { code: 'es-MX' } }) };
    if (id.endsWith('/authSessionStore')) return { getAuthorizationRevision: () => revision };
    if (id.endsWith('/apiClient')) return { ApiClientError };
    if (id.endsWith('/schedulingSetupCopy')) return setup;
    if (id.endsWith('/schedulingOperationsCopy')) return operations;
    if (id.endsWith('/setupValidation')) return validation;
    if (id.endsWith('/schedulingIdentity')) return { schedulingEmoji: {}, schedulingTone: 'coral' };
    return stub;
  });
  runtime.render(() => EditorFrame({ title: 'Staff', description: 'Availability', copy, onSave, hasChanges, footerLayout, footerSummary: '5 días', discardDescription: text.discardDescription, discardLabel: text.discardLabel, onClose: () => closed++, onSaved: () => saved++, children: { type: 'input', props: { value: 'Retained draft' } } }));
  return { runtime, closed: () => closed, saved: () => saved, changeActor() { revision++; } };
}
const submit = runtime => nodes(runtime.result).find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });

test('save blocks immediate duplicate submissions and dismissal, retains errors and permits one explicit retry', async () => {
  let writes = 0, reject;
  const h = frameHarness(() => { writes++; return writes === 1 ? new Promise((_, fail) => reject = fail) : Promise.resolve(); });
  const first = submit(h.runtime), duplicate = submit(h.runtime);
  assert.equal(writes, 1);
  h.runtime.result.props.onOpenChange(false); await h.runtime.flush();
  assert.equal(h.runtime.result.props.busy, true); assert.equal(h.closed(), 0);
  assert.equal(h.runtime.result.props.modalType, 'standard-form');
  reject(new Error('Synthetic failure')); await first; await duplicate; await h.runtime.flush();
  assert.equal(h.runtime.result.props.busy, false); assert.equal(h.saved(), 0);
  assert.equal(nodes(h.runtime.result).find(n => named(n, 'Feedback')).props.children, copy.error);
  assert.equal(nodes(h.runtime.result).find(n => n.type === 'input').props.value, 'Retained draft');
  assert.ok(h.runtime.result.props.footerLeading);
  assert.equal(nodes(h.runtime.result.props.footer).filter(n => named(n, 'ActionButton')).length, 1);
  await submit(h.runtime); await h.runtime.flush(); assert.equal(writes, 2); assert.equal(h.saved(), 1);
});

test('discard confirmation replaces the form and keep editing restores the retained input', async () => {
  const h = frameHarness(() => assert.fail('Discard cannot save'));
  h.runtime.result.props.onOpenChange(false); await h.runtime.flush();
  assert.equal(h.runtime.result.props.modalType, 'confirmation'); assert.equal(nodes(h.runtime.result).some(n => n.type === 'form'), false);
  assert.equal(h.runtime.result.props.description, text.discardDescription);
  assert.equal(nodes(h.runtime.result.props.footer).find(n => n.props?.children === text.discardLabel).props['data-modal-destructive'], true);
  h.runtime.result.props.onOpenChange(false); await h.runtime.flush();
  assert.equal(h.runtime.result.props.modalType, 'standard-form'); assert.equal(h.closed(), 0);
  h.runtime.result.props.onOpenChange(false); await h.runtime.flush();
  nodes(h.runtime.result.props.footer).find(n => n.props?.children === copy.keepEditing).props.onClick(); await h.runtime.flush();
  assert.equal(h.closed(), 0); assert.equal(h.runtime.result.props.modalType, 'standard-form');
  assert.equal(nodes(h.runtime.result).find(n => n.type === 'input').props.value, 'Retained draft');
  h.changeActor(); await submit(h.runtime); await h.runtime.flush();
  assert.equal(nodes(h.runtime.result).find(n => named(n, 'Feedback')).props.children, operations.getSchedulingOperationsCopy('es-MX').conflict);
});

test('other Scheduling editors retain their two-action footer and unchanged close behavior', () => {
  const h = frameHarness(() => Promise.resolve(), false, 'actions');
  assert.equal(h.runtime.result.props.footerLeading, undefined);
  assert.equal(nodes(h.runtime.result.props.footer).filter(n => named(n, 'ActionButton')).length, 2);
  h.runtime.result.props.onOpenChange(false); assert.equal(h.closed(), 1);
});

test('staff modal labels cover all supported locales and the default explicitly falls back to en-CA', () => {
  const keys = Object.keys(labels.getStaffEditorCopy('en-CA')).sort();
  for (const locale of ['en-CA','en-US','es-MX','es-CO','fr-CA','pt-BR','ko-CA','zh-CA']) {
    assert.deepEqual(Object.keys(labels.getStaffEditorCopy(locale)).sort(), keys);
    assert.ok(Object.values(labels.getStaffEditorCopy(locale)).every(value => value.trim()));
  }
  assert.equal(labels.getStaffEditorCopy('unknown'), labels.getStaffEditorCopy('en-CA'));
});
