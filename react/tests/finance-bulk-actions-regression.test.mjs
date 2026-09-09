import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { resolve } from 'node:path';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

const shared = resolve('src/app/BasicModules/shared');
const copy = loadTypescript(resolve(shared, 'financeBulkActions.copy.ts'), () => ({}));
function nodes(tree) { return Array.isArray(tree) ? tree.flatMap(nodes) : React.isValidElement(tree) ? [tree, ...nodes(tree.props.children), ...nodes(tree.props.footer)] : []; }
function text(tree) { return Array.isArray(tree) ? tree.map(text).join('') : React.isValidElement(tree) ? text(tree.props.children) : typeof tree === 'string' ? tree : ''; }
function setup(overrides = {}) {
  const runtime = hookRuntime(), calls = []; let clears = 0;
  const { FinanceBulkActions } = loadTypescript(resolve(shared, 'FinanceBulkActions.tsx'), id => {
    if (id === 'react') return runtime.hooks; if (id === 'react/jsx-runtime') return jsx;
    if (id.endsWith('financeBulkActions.copy')) return copy;
    return new Proxy({}, { get: (_, key) => key });
  });
  const props = { count: 2, locale: 'es-MX', actions: [{ action: 'PROVIDER', options: [{ value: '1', label: 'Uno' }, { value: '2', label: 'Dos' }] }, { action: 'DELETE' }],
    onApply: async (...args) => calls.push(args), onClear: () => { clears++; }, formatError: error => error.message, ...overrides };
  const render = () => runtime.render(() => FinanceBulkActions(props));
  const open = action => nodes(render()).find(node => node.type === 'OperationalBulkActionsBar').props.actions.find(item => item.id === action).onClick();
  const applyButton = () => nodes(render()).find(node => node.type === 'Button' && text(node) === 'Aplicar a la selección');
  return { render, open, applyButton, calls, runtime, clears: () => clears };
}

test('provider selection requires an explicit choice, supports search, then submits the whole selection once', async () => {
  const view = setup(); view.open('PROVIDER'); assert.equal(view.applyButton().props.disabled, true);
  nodes(view.render()).find(node => node.type === 'input').props.onChange({ target: { value: 'Dos' } });
  assert.equal(nodes(view.render()).filter(node => node.type === 'option' && text(node) === 'Uno').length, 0);
  nodes(view.render()).find(node => node.type === 'select').props.onChange({ target: { value: '2' } });
  assert.equal(view.applyButton().props.disabled, false); view.applyButton().props.onClick(); await view.runtime.flush();
  assert.deepEqual(view.calls, [['PROVIDER', '2', '']]); assert.equal(view.clears(), 1);
});

test('delete requires a reason and cancel sends no mutation', async () => {
  const view = setup(); view.open('DELETE'); assert.equal(view.applyButton().props.disabled, true);
  nodes(view.render()).find(node => node.type === 'textarea').props.onChange({ target: { value: 'Duplicado confirmado' } });
  assert.equal(view.applyButton().props.disabled, false);
  nodes(view.render()).find(node => node.type === 'Button' && text(node) === 'Cancelar').props.onClick();
  assert.equal(view.calls.length, 0); assert.equal(view.clears(), 0);
});

test('a failed bulk request retains selection and user input; double clicks cannot send duplicate requests', async () => {
  let reject; const view = setup({ onApply: () => new Promise((_, fail) => { reject = fail; }) });
  view.open('DELETE'); nodes(view.render()).find(node => node.type === 'textarea').props.onChange({ target: { value: 'Duplicado confirmado' } });
  const button = view.applyButton(); button.props.onClick(); button.props.onClick(); assert.equal(view.applyButton().props.disabled, true);
  reject(Error('El corte está cerrado')); await view.runtime.flush();
  assert.equal(view.clears(), 0); assert.equal(nodes(view.render()).find(node => node.type === 'textarea').props.value, 'Duplicado confirmado');
  assert.ok(nodes(view.render()).some(node => node.type === 'IndiceModalValidation' && node.props.messages.includes('El corte está cerrado')));
});

test('protected actions stay discoverable and explain why they cannot apply', () => {
  const view = setup({ actions: [{ action: 'PAYMENT_ACCOUNT', blockedReason: 'La cuenta pertenece al fondo' }] });
  view.open('PAYMENT_ACCOUNT'); assert.equal(view.applyButton().props.disabled, true);
  assert.ok(nodes(view.render()).some(node => node.type === 'IndiceModalValidation' && node.props.messages.includes('La cuenta pertenece al fondo')));
});

test('more than 200 selected records cannot be submitted; financial totals never mix native currencies', () => {
  const view = setup({ count: 201 }); view.open('DELETE'); assert.equal(view.applyButton().props.disabled, true);
  const { sumNativeAmounts } = loadTypescript(resolve(shared, 'FinanceSelectionTotals.tsx'), id => id === 'react/jsx-runtime' ? jsx : copy);
  assert.deepEqual(sumNativeAmounts([{ amount: 0.1, currency: 'MXN' }, { amount: 0.2, currency: 'MXN' }, { amount: 15, currency: 'USD' }], 'MXN'),
    [{ currency: 'MXN', amount: 0.3 }, { currency: 'USD', amount: 15 }]);
  assert.deepEqual(sumNativeAmounts([], 'CAD'), [{ currency: 'CAD', amount: 0 }]);
});

test('all supported locales expose localized actions and protection explanations', () => {
  for (const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR']) {
    const values = copy.getFinanceBulkCopy(locale); assert.ok(values.PROVIDER && values.custody && values.selectedTotal);
  }
});
