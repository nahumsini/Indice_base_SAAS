import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import { buildSync } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = resolve(import.meta.dirname, '..');
const employeeRoot = './src/app/BasicModules/HumanResources/Employees';
const compiled = buildSync({
  stdin: { contents: `
    export { createDefaultColumns, columnsStorageKey } from '${employeeRoot}/constants/employees.constants';
    export { getInitialColumns, saveEmployeesColumns, getEmployeeSortValue, compareEmployeeSortValues } from '${employeeRoot}/utils/employees.utils';
    export { mapEmployee } from '${employeeRoot}/utils/employees.adapters';
    export { employeesTranslations } from '${employeeRoot}/translations';
    export { EmployeesTableCellContent } from '${employeeRoot}/components/EmployeesTableCells';
  `, resolveDir: root },
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false,
  jsx: 'automatic',
});
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(createRequire(root + '/package.json'), module, module.exports);
const { createDefaultColumns, columnsStorageKey, getInitialColumns, saveEmployeesColumns,
  getEmployeeSortValue, compareEmployeeSortValues, mapEmployee, employeesTranslations, EmployeesTableCellContent } = module.exports;

test('payroll column renders the saved treatment independently of salary or employment status', () => {
  const copy = employeesTranslations['es-MX'];
  for (const [value, expected] of [
    ['fiscal_payroll', 'Nómina fiscal'], ['operational_payroll', 'Nómina operativa'],
    ['no_payroll', 'Sin nómina'], ['accounts_payable', 'Sin nómina'],
  ]) {
    const employee = mapEmployee({ id: 1, name: 'Fixture', status: 'active', salary: 500, payroll_treatment: value }, '—', '—');
    const cell = renderToStaticMarkup(createElement(EmployeesTableCellContent, { columnId: 'payrollTreatment', employee, copy }));
    assert.match(cell, new RegExp(expected));
    assert.equal(cell.includes(value), false, 'never expose canonical status codes as labels');
  }
});

test('existing preferences acquire the optional column without resetting order, and selection survives reload', () => {
  const originalWindow = globalThis.window;
  const store = new Map([[columnsStorageKey, JSON.stringify([
    { id: 'unit', visible: true }, { id: 'employee', visible: true }, { id: 'salary', visible: false },
  ])]]);
  globalThis.window = { localStorage: {
    getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key),
  } };
  try {
    const defaults = createDefaultColumns(employeesTranslations['es-MX']);
    const restored = getInitialColumns(defaults);
    assert.deepEqual(restored.slice(0, 3).map(column => column.id), ['unit', 'employee', 'salary']);
    const treatment = restored.find(column => column.id === 'payrollTreatment');
    assert.equal(treatment.visible, false);
    assert.equal(treatment.label, 'Tipo de nómina');
    assert.equal(restored.find(column => column.id === 'salary').visible, false);
    saveEmployeesColumns(restored.map(column => column.id === 'payrollTreatment' ? { ...column, visible: true } : column));
    const reloaded = getInitialColumns(defaults);
    assert.equal(reloaded.find(column => column.id === 'payrollTreatment').visible, true);
    assert.deepEqual(reloaded.map(column => column.id), restored.map(column => column.id));
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test('sorting groups fiscal, operational and no-payroll employees in both directions', () => {
  const employees = ['no_payroll', 'fiscal_payroll', 'operational_payroll'].map((payroll_treatment, id) => mapEmployee({ id, name: 'Fixture', payroll_treatment }, '—', '—'));
  const sort = direction => [...employees].sort((left, right) => compareEmployeeSortValues(
    getEmployeeSortValue(left, 'payrollTreatment'), getEmployeeSortValue(right, 'payrollTreatment'), direction,
  )).map(employee => employee.payrollTreatment);
  assert.deepEqual(sort('asc'), ['fiscal_payroll', 'operational_payroll', 'no_payroll']);
  assert.deepEqual(sort('desc'), ['no_payroll', 'operational_payroll', 'fiscal_payroll']);
});

test('every supported locale provides the column, its description and all three distinct labels', () => {
  for (const copy of Object.values(employeesTranslations)) {
    assert.ok(copy.columns.payrollTreatment);
    assert.ok(copy.columnDescriptions.payrollTreatment);
    assert.equal(new Set(['fiscal_payroll', 'operational_payroll', 'no_payroll'].map(value => copy.payrollTreatmentLabels[value])).size, 3);
  }
});
