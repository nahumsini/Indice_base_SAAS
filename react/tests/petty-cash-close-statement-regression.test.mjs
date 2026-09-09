import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../src/app/BasicModules/PettyCash');
const cache = new Map();
let activeHooks;
let requests = [];
let respond;
class ApiClientError extends Error {
  constructor(status, payload) { super('API error'); this.status = status; this.payload = payload; }
}

// Exercise the real component event handlers and API adapter without mounting unrelated
// workspaces or contacting a database. Effects (session/catalog fetches) are not run.
function component(Component) {
  const state = [];
  return {
    render(props) {
      let cursor = 0;
      const previous = activeHooks;
      activeHooks = {
        useState(initial) {
          const index = cursor++;
          if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
          return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
        },
        useRef(initial) {
          const index = cursor++;
          if (!(index in state)) state[index] = { current: initial };
          return state[index];
        },
      };
      try { return Component(props); } finally { activeHooks = previous; }
    },
  };
}
const hooks = { ...React, useState: initial => activeHooks.useState(initial),
  useRef: initial => activeHooks.useRef(initial), useMemo: callback => callback(), useEffect: () => {} };
const ui = new Proxy({}, { get: (_, name) => name });
function load(file) {
  const path = [file, `${file}.ts`, `${file}.tsx`, resolve(file, 'index.ts'), resolve(file, 'index.tsx')]
    .find(value => existsSync(value) && /\.tsx?$/.test(value));
  if (!path) throw new Error(`Missing module: ${file}`);
  if (path.endsWith('/lib/apiClient.ts')) return { ApiClientError, apiClient: async (url, options) => {
    const request = { url, method: options.method, body: JSON.parse(options.body) };
    requests.push(request);
    return respond(request);
  } };
  if (path.endsWith('/hooks/usePettyCashTranslations.ts')) return {
    usePettyCashTranslations: () => load(resolve(root, 'translations/index.ts')).getPettyCashTranslations('es-MX'),
  };
  if (path.endsWith('/Expenses/services/index.ts')) return load(resolve(dirname(path), 'finance-api.errors.ts'));
  if (path.endsWith('/AccountingAccounts/accountingAccounts.mock.ts')) return { mockAccounts: [] };
  if (path.endsWith('/data/providerRecords.mock.ts')) return { mockProviderRecords: [] };
  if (path.endsWith('/PaymentAccounts/paymentAccounts.mock.ts')) return { mockPaymentAccounts: [] };
  if (path.endsWith('/shared/context/index.ts')) return { useLanguage: () => ({ currentLanguage: { code: 'es-MX' } }) };
  if (path.endsWith('/shared/BusinessCurrencyContext.tsx')) return { usePreferredBusinessCurrency: () => ({ preferredCurrency: 'USD' }) };
  if (path.endsWith('/shared/kpiMonetaryApi.ts')) return { useKpiMonetaryAggregate: () => ({}) };
  if (path.endsWith('/shared/operational/index.ts')) return { ...ui, OperationalKpiArea: 'OperationalKpiArea', getOperationalKpiCurrencyCopy: () => ({}) };
  if (path.endsWith('/hooks/useTablePagination.ts')) return { useTablePagination: ({ rows }) => ({ paginatedRows: rows }) };
  if (path.endsWith('/components/PettyCashShared.tsx')) return new Proxy({
    usePettyCashTableSort: rows => ({ sortedRows: rows, sortKey: 'date', sortDirection: 'desc' }),
  }, { get: (target, name) => target[name] ?? name });
  // Shared modal/view primitives are boundaries; the existing operation modal itself is exercised below.
  if (path.includes('/components/') && !path.endsWith('/PettyCashReconciliationWorkspace.tsx')) return ui;
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} }; cache.set(path, module);
  const code = ts.transpileModule(readFileSync(path, 'utf8').replaceAll('import.meta.env', '({DEV:false})'), {
    fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const require = id => {
    if (id === 'react') return hooks;
    if (id === 'lucide-react') return ui;
    if (id.endsWith('.css')) return {};
    if (id === '../../../api/auth') return { authApi: {} };
    return id.startsWith('.') ? load(resolve(dirname(path), id)) : createRequire(path)(id);
  };
  new Function('require', 'module', 'exports', code)(require, module, module.exports);
  return module.exports;
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!React.isValidElement(tree)) return [];
  return [tree, ...nodes(tree.props.children)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (React.isValidElement(tree)) return text(tree.props.children);
  return typeof tree === 'string' || typeof tree === 'number' ? String(tree) : '';
}
const button = tree => nodes(tree).find(node => node.type === 'button' && text(node) === 'Cerrar corte');
const field = (tree, label) => nodes(tree).find(node => node.type === 'PettyCashField' && node.props.label === label).props.children;
const modal = tree => nodes(tree).find(node => node.type?.name === 'CloseStatementModal');
const fund = overrides => ({ id: '5', companyId: '1', name: 'Caja de prueba', responsibleName: 'Responsable',
  currencyCode: 'MXN', currentBalanceAmount: 2000, fundType: 'INTERNAL_COMPANY', status: 'OPEN',
  unitId: '1', unitName: 'Unidad', businessId: '2', businessName: 'Negocio', responsibleUserId: '3',
  createdByUserId: '3', createdByName: 'Responsable', fundingMethods: [], spendingMethods: [], ...overrides });
const statement = overrides => ({ id: '51', companyId: '1', pettyCashFundId: '5', folio: 'CUT-51',
  periodKey: '2026-08', periodStart: '2026-08-01', periodEnd: '2026-08-31', cutOffDate: '2026-08-31',
  currencyCode: 'MXN', status: 'CUT_PENDING', declaredClosingBalanceAmount: 0, estimatedUsageAmount: 100,
  verifiedExpenseAmount: 100, returnedAmount: 0, shortageAmount: 0, ...overrides });
const line = overrides => ({ id: '80', pettyCashFundId: '5', pettyCashStatementId: '51', status: 'EXPENSE_CREATED',
  currencyCode: 'MXN', description: 'Comprobante', totalAmount: 100, expenseDate: '2026-08-31', attachmentCount: 1, ...overrides });
const { PettyCashReconciliationWorkspace } = load(resolve(root, 'components/PettyCashReconciliationWorkspace.tsx'));
function workspace(overrides = {}) {
  requests = [];
  const props = { funds: [fund()], statements: [statement()], settlementLines: [], movements: [],
    onMovementsChange: () => {}, onSettlementLinesChange: () => {}, ...overrides };
  props.onFundsChange = update => { props.funds = update(props.funds); };
  props.onStatementsChange = update => { props.statements = update(props.statements); };
  const renderer = component(PettyCashReconciliationWorkspace);
  const render = () => renderer.render(props);
  function open() {
    const trigger = button(render());
    assert.ok(trigger && !trigger.props.disabled);
    trigger.props.onClick();
    const element = modal(render());
    assert.ok(element);
    const modalRenderer = component(element.type);
    const renderModal = () => modalRenderer.render(modal(render()).props);
    return { render: renderModal, props: () => modal(render()).props };
  }
  return { props, render, open };
}

test('the button opens exactly the selected month and fund, retaining its native currency', async () => {
  const august = statement({ declaredClosingBalanceAmount: 250 });
  const september = statement({ id: '52', folio: 'CUT-52', periodKey: '2026-09' });
  const other = statement({ id: '91', pettyCashFundId: '9' });
  const ws = workspace({ funds: [fund(), fund({ id: '9' })], statements: [september, august, other] });
  field(ws.render(), 'Corte').props.onChange({ target: { value: august.id } });
  const dialog = ws.open();
  assert.match(dialog.render().props.subtitle, /2026-08.*CUT-51.*Caja de prueba.*MXN/);
  assert.equal(field(dialog.render(), 'Accion de cierre').props.value, 'CARRY_FORWARD');
  respond = () => ({ fund: ws.props.funds[0], statement: { ...august, status: 'TRANSFERRED_TO_NEXT_CUT' }, nextStatement: september });
  await dialog.render().props.onSave();
  assert.equal(requests[0].url, '/api/v1/finance/petty-cash/funds/5/statements/51/close');
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].body.action, 'CARRY_FORWARD');
  assert.equal(ws.props.statements.length, 3, 'existing next month is updated, never duplicated');
  assert.equal(ws.props.statements.find(item => item.id === '91'), other);
  assert.equal(ws.props.funds[1].id, '9');
  assert.equal(modal(ws.render()), undefined);
  assert.equal(button(ws.render()), undefined, 'the finalized month cannot be closed again');
});

test('a successful carry-forward inserts a missing next month only once and uses server balances', async () => {
  const ws = workspace({ statements: [statement({ declaredClosingBalanceAmount: 250 })] });
  const dialog = ws.open();
  let resolveRequest;
  respond = () => new Promise(resolve => { resolveRequest = resolve; });
  const submit = dialog.render().props.onSave;
  const first = submit();
  await submit();
  assert.equal(requests.length, 1, 'rapid duplicate submissions do not create another request');
  assert.equal(dialog.render().props.busy, true);
  assert.equal(nodes(dialog.render()).find(node => node.type === 'fieldset').props.disabled, true);
  dialog.props().onClose();
  assert.ok(modal(ws.render()), 'closing the modal while saving is blocked');
  resolveRequest({ fund: fund({ currentBalanceAmount: 123.45 }),
    statement: statement({ status: 'TRANSFERRED_TO_NEXT_CUT' }), nextStatement: statement({ id: '52', periodKey: '2026-09', status: 'OPEN' }) });
  await first;
  assert.equal(ws.props.statements.length, 2);
  assert.equal(ws.props.funds[0].currentBalanceAmount, 123.45);
});

test('negative balances cannot be closed as zero and do not issue requests', async () => {
  for (const balance of [-1764.28, -0.01]) {
    const dialog = workspace({ statements: [statement({ declaredClosingBalanceAmount: balance })] }).open();
    assert.equal(dialog.render().props.canSave, false);
    assert.match(text(dialog.render()), /saldo negativo/);
    const action = field(dialog.render(), 'Accion de cierre');
    assert.ok(nodes(action).find(node => node.type === 'option' && node.props.value === 'CLOSE_CLEAN').props.disabled);
    await dialog.render().props.onSave();
    assert.equal(requests.length, 0);
  }
});

test('pending receipt statuses block closure, including zero-valued receipts and filtered-out rows', () => {
  for (const status of ['DRAFT', 'RECEIPT_ATTACHED', 'VALIDATED']) {
    const ws = workspace({ settlementLines: [line({ status, totalAmount: 0 })] });
    const search = nodes(ws.render()).find(node => node.type === 'input' && node.props.type === 'search');
    search.props.onChange({ target: { value: 'no matching receipt' } });
    const dialog = ws.open();
    assert.equal(dialog.render().props.canSave, false, status);
    assert.match(text(dialog.render()), /Convierte los comprobantes pendientes/);
  }
});

test('external funds close after validation without creating expenses; rejected/reversed receipts do not block', () => {
  for (const fundType of ['INTERNAL_COMPANY', 'EXTERNAL_MANAGED']) {
    const lines = [line({ status: fundType === 'EXTERNAL_MANAGED' ? 'VALIDATED' : 'EXPENSE_CREATED' }),
      line({ id: '81', status: 'REJECTED' }), line({ id: '82', status: 'REVERSED' }),
      line({ id: '83', pettyCashStatementId: '52', status: 'DRAFT' }),
      line({ id: '84', pettyCashFundId: '9', status: 'DRAFT' })];
    const dialog = workspace({ funds: [fund({ fundType })], settlementLines: lines }).open();
    assert.equal(dialog.render().props.canSave, true);
  }
  const dialog = workspace({ funds: [fund({ fundType: 'EXTERNAL_MANAGED' })], settlementLines: [line({ status: 'RECEIPT_ATTACHED' })] }).open();
  assert.equal(dialog.render().props.canSave, false);
  assert.match(text(dialog.render()), /Valida los comprobantes pendientes/);
});

test('closed statements never offer another close; unsaved funds cannot submit', () => {
  for (const status of ['CLOSED', 'TRANSFERRED_TO_NEXT_CUT', 'FORGIVEN_SHORTAGE', 'CHARGED_TO_EMPLOYEE']) {
    assert.equal(button(workspace({ statements: [statement({ status })] }).render()), undefined);
  }
  assert.equal(button(workspace({ statements: [] }).render()), undefined);
  assert.equal(button(workspace({ statements: [statement({ id: 'local-statement' })] }).render()).props.disabled, true);
});

test('zero closes cleanly, while balance disposal and shortage choices validate before submission', async () => {
  const ws = workspace();
  const dialog = ws.open();
  assert.equal(field(dialog.render(), 'Accion de cierre').props.value, 'CLOSE_CLEAN');
  field(dialog.render(), 'Fecha de cierre').props.onChange({ target: { value: '' } });
  assert.equal(dialog.render().props.canSave, false);
  field(dialog.render(), 'Fecha de cierre').props.onChange({ target: { value: '2026-09-08' } });
  respond = () => ({ fund: fund(), statement: statement({ status: 'CLOSED' }) });
  await dialog.render().props.onSave();
  assert.deepEqual(requests[0].body, { action: 'CLOSE_CLEAN', closeDate: '2026-09-08' });

  const withBalance = workspace({ statements: [statement({ declaredClosingBalanceAmount: 250 })] }).open();
  field(withBalance.render(), 'Accion de cierre').props.onChange({ target: { value: 'RETURN_TO_SOURCE' } });
  assert.equal(withBalance.render().props.canSave, true);
  for (const action of ['CHARGE_EMPLOYEE', 'FORGIVE_SHORTAGE']) {
    field(withBalance.render(), 'Accion de cierre').props.onChange({ target: { value: action } });
    for (const amount of ['0', '-1', '251']) {
      field(withBalance.render(), 'Monto faltante *').props.onChange({ target: { value: amount } });
      assert.equal(withBalance.render().props.canSave, false);
    }
    field(withBalance.render(), 'Monto faltante *').props.onChange({ target: { value: '100' } });
    assert.equal(withBalance.render().props.canSave, true);
  }
});

test('failed close keeps the modal and its fields, exposes the error inside it, and permits retry', async () => {
  const ws = workspace();
  const dialog = ws.open();
  field(dialog.render(), 'Referencia').props.onChange({ target: { value: '  August reviewed  ' } });
  const operation = component(dialog.render().type);
  respond = () => { throw new ApiClientError(403, { message: 'Forbidden' }); };
  await button(operation.render(dialog.render().props).props.footer).props.onClick();
  const frame = operation.render(dialog.render().props);
  const validation = nodes(frame).find(node => node.type === 'IndiceModalValidation');
  assert.match(validation.props.messages.join(' '), /No tienes permisos/);
  assert.equal(field(dialog.render(), 'Referencia').props.value, '  August reviewed  ');
  assert.equal(ws.props.statements[0].status, 'CUT_PENDING');
  assert.equal(ws.props.funds[0].currentBalanceAmount, 2000);
  respond = () => ({ fund: fund(), statement: statement({ status: 'CLOSED' }) });
  await button(frame.props.footer).props.onClick();
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(requests[1].body.reference, 'August reviewed');
  assert.equal(modal(ws.render()), undefined);
});

test('leaving edited closing details requires confirmation and never closes the financial statement', () => {
  const ws = workspace();
  let dialog = ws.open();
  dialog.render().props.onClose();
  assert.equal(modal(ws.render()), undefined, 'an untouched modal can be dismissed directly');
  dialog = ws.open();
  field(dialog.render(), 'Referencia').props.onChange({ target: { value: 'Draft closing note' } });
  dialog.render().props.onClose();
  let confirmation = nodes(dialog.render()).find(node => node.type === 'IndiceConfirmationDialog');
  assert.equal(confirmation.props.open, true);
  confirmation.props.onCancel();
  assert.equal(field(dialog.render(), 'Referencia').props.value, 'Draft closing note');
  dialog.render().props.onClose();
  confirmation = nodes(dialog.render()).find(node => node.type === 'IndiceConfirmationDialog');
  confirmation.props.onConfirm();
  assert.equal(modal(ws.render()), undefined);
  assert.equal(ws.props.statements[0].status, 'CUT_PENDING');
  assert.equal(requests.length, 0);
});
