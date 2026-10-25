import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import * as jsx from 'react/jsx-runtime';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

const noop = () => {};
function harness(onSave) {
  const runtime = hookRuntime();
  let closes = 0;
  const data = { firstName: 'Fixture', lastName: 'Only', email: 'fixture@example.invalid', businessId: '', scheduleLocationRule: 'none', scheduleLocationId: '' };
  const copy = { steps: [{ id: 1, label: 'Fixture step' }], buttons: { continue: 'Continuar', next: 'Siguiente', createEmployee: 'Crear colaborador', save: 'Guardar' } };
  const formState = { formData: data, formRef: { current: null }, handleClose: () => closes++, handleLocationChange: noop, saveLocalDraft: noop,
    setFormData: noop, setStatusFeedback: noop, setTouchedFields: noop, statusFeedback: '', syncFormDataFromDom: () => data, touchedFields: {}, updateField: noop };
  const docState = { documentErrors: {}, handleDocumentSelection: noop, handleToggleDocumentRemoval: noop, resetDocumentErrors: noop };
  const options = { allPositionOptions: [], businessBelongingHelper: '', businessBelongingHelperTone: 'default', countryOptions: [], departmentOptions: [], filteredBusinessOptions: [], modalBusinessOptions: [], modalUnitOptions: [], positionOptions: [], scheduleLocationOptions: [], selectedUnitIsCorporateOffice: false, unitOptionsWithBelonging: [] };
  const stub = new Proxy({}, { get: (_, key) => key });
  const file = resolve(import.meta.dirname, '../src/app/BasicModules/HumanResources/Employees/components/CreateEmployeeModal/CreateEmployeeModal.tsx');
  const { CreateEmployeeModal } = loadTypescript(file, id => {
    if (id === 'react') return runtime.hooks;
    if (id === 'react/jsx-runtime') return jsx;
    if (id.endsWith('/shared/context')) return { useLanguage: () => ({ currentLanguage: { code: 'es-MX' } }) };
    if (id.endsWith('useEmployeesTranslations')) return { useEmployeesTranslations: () => ({ modal: copy, errorMessages: { save: 'No se pudo guardar.' } }) };
    if (id.endsWith('useEmployeeCustomJobOptions')) return { useEmployeeCustomJobOptions: () => ({ addCustomJobOption: noop, customJobOptions: [], persistCurrentJobOptions: noop }) };
    if (id.endsWith('useEmployeeModalFormState')) return { useEmployeeModalFormState: () => formState };
    if (id.endsWith('useEmployeeModalDocuments')) return { useEmployeeModalDocuments: () => docState };
    if (id.endsWith('useEmployeeModalOptions')) return { useEmployeeModalOptions: () => options };
    if (id.endsWith('useEmployeeMexicoPayrollProfile')) return { useEmployeeMexicoPayrollProfile: () => ({ dirty: false, valid: () => true, saveRequest: () => undefined }) };
    if (id.endsWith('mexicoPayrollProfileCopy')) return { mexicoPayrollProfileCopy: () => ({}) };
    if (id.endsWith('/model')) return { modalStepIcons: [] };
    if (id.endsWith('/validation')) return { getEmployeeModalStepFields: () => ({ 1: [] }), validateEmployeeFormData: () => ({}) };
    if (id.endsWith('formFeedbackCopy')) return { getFormFeedbackCopy: () => ({ saving: 'Guardando…' }) };
    if (id.endsWith('employees.utils')) return { normalizeErrorMessage: (error, fallback) => error?.message || fallback };
    return stub;
  });
  const props = { isOpen: true, onClose: noop, onSave, unitOptions: [], businessOptions: [] };
  const render = () => runtime.render(() => CreateEmployeeModal(props));
  const submit = () => render().props.onSubmit({ preventDefault() {} });
  render();
  return { runtime, props, data, render, submit, closes: () => closes };
}

test('HR save blocks double submit and close, keeps draft on failure, and permits explicit retry', async () => {
  let reject, calls = 0;
  const ui = harness(async () => { calls++; await new Promise((_, fail) => { reject = fail; }); });
  const before = structuredClone(ui.data);
  ui.submit();
  ui.submit();
  assert.equal(calls, 1);
  assert.equal(ui.render().props.busy, true);
  ui.render().props.onClose();
  assert.equal(ui.closes(), 0);
  reject(new Error('Sin conexión. Intenta de nuevo.'));
  await ui.runtime.flush();
  assert.equal(ui.render().props.busy, false);
  assert.equal(ui.render().props.submitError, 'Sin conexión. Intenta de nuevo.');
  assert.deepEqual(ui.data, before);
  assert.equal(ui.closes(), 0);
  ui.props.onSave = async () => { calls++; };
  ui.submit();
  await ui.runtime.flush();
  assert.equal(calls, 2);
  assert.equal(ui.closes(), 1);
});
