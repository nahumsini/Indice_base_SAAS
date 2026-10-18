import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import * as jsx from 'react/jsx-runtime';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';
import { createTypeScriptLoader } from './helpers/loadTypeScript.mjs';

const root = resolve(import.meta.dirname, '../src/app/BasicModules');
const noop = () => {};
const stub = new Proxy({}, { get: (_, name) => name });
function elements(node, type) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => elements(child, type));
  return [...(node.type === type ? [node] : []), ...elements(node.props?.children, type)];
}
const load = createTypeScriptLoader();
const status = load(resolve(root, 'ProcessesTasks/Agenda/utils/agendaTaskStatus.ts'));
const announcementCopy = load(resolve(root, 'HumanResources/Announcements/translations/es-MX.ts')).esMX;
const employeeCopy = load(resolve(root, 'HumanResources/Employees/translations/es-MX.ts')).esMX;

test('empty audit score is blocked in both dialog and mutation; an explicit zero is accepted', async () => {
  const runtime = hookRuntime(), calls = [], errors = [];
  const { useAgendaTaskCompletionAudit } = loadTypescript(resolve(root, 'ProcessesTasks/Agenda/hooks/useAgendaTaskCompletionAudit.ts'), id => {
    if (id === 'react') return runtime.hooks;
    if (id.endsWith('/tasksApi')) return { auditProcessTask: async (...args) => calls.push(args) };
    return status;
  });
  const agendaCopy = { messages: { weightingRange: () => 'Elige una calificación de 0 a 5.' } };
  const render = () => runtime.render(() => useAgendaTaskCompletionAudit({ agendaCopy, loadAgenda: async () => {}, patchTaskInAgenda: noop, setAgendaError: value => errors.push(value), setTaskPendingState: noop }));
  const { TaskAuditDialog } = loadTypescript(resolve(root, 'ProcessesTasks/Tasks/components/TaskAuditDialog.tsx'), id => {
    if (id === 'react/jsx-runtime') return jsx;
    if (id.endsWith('/agendaTaskStatus')) return status;
    return stub;
  });
  const task = { taskId: 42, folio: 'TEST-42', title: 'Fixture', weighting: null };
  render().handleAuditTask(task);
  for (const weighting of ['', '  ', '-1', '6', '1.5', 'NaN']) {
    render().setAuditWeighting(weighting);
    await render().handleConfirmAudit();
    const ui = TaskAuditDialog({ task, weighting, auditNotes: '', copy: { description: () => 'Fixture', weightingHint: () => 'Elige de 0 a 5.', weightingValidation: () => 'Elige una calificación.' }, onConfirm: noop });
    assert.equal(ui.props.footer.props.children[1].props.disabled, true);
    assert.equal(calls.length, 0);
    assert.equal(render().auditTask, task);
    assert.ok(errors.at(-1));
  }
  render().setAuditWeighting('0');
  await render().handleConfirmAudit();
  assert.deepEqual(calls, [[42, 0, '']]);
  assert.equal(render().auditTask, null);
  assert.equal(status.parseAuditWeighting('5'), 5);
});

for (const status of ['draft', 'published', 'scheduled']) {
  test(`announcement ${status} keeps the draft and shows a modal error, blocks concurrent saves, then retries`, async () => {
    const runtime = hookRuntime();
    let reject, calls = 0, closes = 0;
    const payloads = [];
    const { CreateAnnouncementModal } = loadTypescript(resolve(root, 'HumanResources/Announcements/components/CreateAnnouncementModal.tsx'), id => {
      if (id === 'react') return runtime.hooks;
      if (id === 'react/jsx-runtime') return jsx;
      return stub;
    });
    const data = { title: 'Aviso de prueba', type: 'general', audienceType: 'all', unitIds: [], departmentNames: [], employeeIds: [], content: 'Mensaje conservado.', status, scheduledDate: '2030-01-01', scheduledTime: '09:00' };
    const props = { copy: announcementCopy.modal, initialData: data, isOpen: true, onClose: () => closes++, saveErrorFallback: announcementCopy.feedback.saveAnnouncementFailed,
      onSave: async value => { calls++; payloads.push(value); await new Promise((_, fail) => { reject = fail; }); } };
    const render = () => runtime.render(() => CreateAnnouncementModal(props));
    render();
    const button = () => render().props.footer.props.children[status === 'draft' ? 0 : 1];
    button().props.onClick(); button().props.onClick();
    assert.equal(calls, 1);
    assert.equal(render().props.busy, true);
    assert.equal(elements(render(), 'fieldset')[0].props.disabled, true);
    render().props.onOpenChange(false);
    assert.equal(closes, 0);
    reject(status === 'draft' ? null : new Error('No se pudo enviar. Intenta de nuevo.'));
    await runtime.flush();
    const expected = status === 'draft' ? props.saveErrorFallback : 'No se pudo enviar. Intenta de nuevo.';
    assert.deepEqual(elements(render(), 'IndiceModalValidation')[0].props.messages, [expected]);
    assert.equal(elements(render(), 'textarea')[0].props.value, data.content);
    assert.equal(elements(render(), 'input')[0].props.value, data.title);
    props.onSave = async value => { calls++; payloads.push(value); };
    button().props.onClick(); await runtime.flush();
    assert.equal(calls, 2);
    assert.deepEqual(payloads[0], payloads[1]);
    assert.equal(payloads[0].status, status);
    assert.equal(elements(render(), 'IndiceModalValidation')[0].props.messages.length, 0);
  });
}

function employeeHarness({ editing = false, failSave = false, failRefresh = false, failDocuments = false, failSchedule = false } = {}) {
  const runtime = hookRuntime();
  const calls = [], failures = [], successes = [], saved = [], remembered = [];
  let resets = 0;
  const { useEmployeeMutations } = loadTypescript(resolve(root, 'HumanResources/Employees/hooks/useEmployeeMutations.ts'), id => {
    if (id === 'react') return runtime.hooks;
    if (id.endsWith('/api/humanResources')) return { humanResourcesApi: Object.fromEntries(['createHrUser', 'updateHrUser'].map(method => [method, async () => { calls.push(method); if (failSave) throw new Error('No se pudo guardar.'); return { id: 99 }; }])) };
    if (id.endsWith('/LoadingBarOverlay')) return { runWithMinimumDuration: promise => promise };
    if (id.endsWith('employees.documents')) return { syncEmployeeDocuments: async () => { if (failDocuments) throw new Error('offline'); return []; } };
    if (id.endsWith('employees.payloads')) return { buildEmployeeSavePayload: data => data };
    if (id.endsWith('employees.scheduleAssignments')) return { assignHireSchedule: async () => { if (failSchedule) throw new Error('Horario pendiente.'); } };
    if (id.endsWith('employees.utils')) return { normalizeErrorMessage: (error, fallback) => error?.message || fallback };
    return stub;
  });
  const options = { copy: employeeCopy, editingEmployee: editing ? { id: 99 } : null, refreshEmployees: async () => { if (failRefresh) throw new Error('list offline'); },
    rememberCreatedEmployee: employee => remembered.push(employee), replaceEditingEmployeeId: noop, resetEmployeeModal: () => resets++, onEmployeeSaved: id => saved.push(id),
    setFailureToastMessage: value => failures.push(value), setSuccessToastMessage: value => successes.push(value), setLoadingOverlayDescription: noop, setLoadingOverlayTitle: noop };
  const render = () => runtime.render(() => useEmployeeMutations(options));
  return { render, calls, failures, successes, saved, remembered, resets: () => resets };
}

for (const editing of [false, true]) {
  test(`employee ${editing ? 'update' : 'create'} remains saved when refreshing fails and finishes the form once`, async () => {
    const h = employeeHarness({ editing, failRefresh: true });
    await h.render().handleSaveEmployee({});
    assert.deepEqual(h.calls, [editing ? 'updateHrUser' : 'createHrUser']);
    assert.deepEqual(h.saved, [99]);
    assert.equal(h.resets(), 1);
    assert.equal(h.successes.length, 0);
    assert.ok(h.failures.at(-1).includes(employeeCopy.errorMessages.refreshAfterSave));
    assert.equal(h.render().isSubmitting, false);
  });
}

test('failed employee write rejects and preserves the form; no saved notification or close', async () => {
  const h = employeeHarness({ failSave: true });
  await assert.rejects(h.render().handleSaveEmployee({}), /No se pudo guardar/);
  assert.equal(h.resets(), 0);
  assert.equal(h.saved.length, 0);
  assert.equal(h.remembered.length, 0);
});

test('unexpected document failure after a confirmed employee write never asks the form to create again', async () => {
  const h = employeeHarness({ failDocuments: true });
  await h.render().handleSaveEmployee({});
  assert.equal(h.calls.length, 1);
  assert.equal(h.resets(), 1);
  assert.ok(h.failures.at(-1).includes(employeeCopy.errorMessages.followUpAfterSave));
});

test('schedule and list warnings are both retained after employee creation', async () => {
  const h = employeeHarness({ failSchedule: true, failRefresh: true });
  await h.render().handleSaveEmployee({ scheduleOnHire: true });
  assert.ok(h.failures.at(-1).includes('Horario pendiente.'));
  assert.ok(h.failures.at(-1).includes(employeeCopy.errorMessages.refreshAfterSave));
  assert.equal(h.resets(), 1);
});
