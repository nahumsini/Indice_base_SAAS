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
let memoryOptions;
let activeHooks;
let requests = [];
let respond;
let mountEffects;
let sessionRole = 'admin';
class ApiClientError extends Error {
  constructor(status, payload) { super('API error'); this.status = status; this.payload = payload; }
}

// Exercise the real component event handlers and API adapter without mounting unrelated
// workspaces or contacting a database. Tests can explicitly run the initial effects
// with a mocked authenticated session and empty reference catalogs.
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
  useCallback: callback => callback, useRef: initial => activeHooks.useRef(initial), useMemo: callback => callback(),
  useEffect: callback => { mountEffects?.push(callback); } };
const ui = new Proxy({}, { get: (_, name) => name });
function load(file) {
  const path = [file, `${file}.ts`, `${file}.tsx`, resolve(file, 'index.ts'), resolve(file, 'index.tsx')]
    .find(value => existsSync(value) && /\.tsx?$/.test(value));
  if (!path) throw new Error(`Missing module: ${file}`);
  const normalizedPath = path.replaceAll('\\', '/');
  if (normalizedPath.endsWith('/lib/apiClient.ts')) return { ApiClientError, apiClient: async (url, options) => {
    const request = { url, method: options.method, body: JSON.parse(options.body) };
    requests.push(request);
    return respond(request);
  } };
  if (normalizedPath.endsWith('/hooks/usePettyCashTranslations.ts')) return {
    usePettyCashTranslations: () => load(resolve(root, 'translations/index.ts')).getPettyCashTranslations('es-MX'),
  };
  if (normalizedPath.endsWith('/Expenses/services/index.ts')) return {
    ...load(resolve(dirname(path), 'finance-api.errors.ts')),
    providersService: { getProviderRecords: async () => [] },
    paymentAccountsService: { getPaymentAccounts: async () => [] },
    accountingAccountsService: { getAccountingAccounts: async () => [] },
  };
  if (normalizedPath.endsWith('/AccountingAccounts/accountingAccounts.mock.ts')) return { mockAccounts: [] };
  if (normalizedPath.endsWith('/data/providerRecords.mock.ts')) return { mockProviderRecords: [] };
  if (normalizedPath.endsWith('/PaymentAccounts/paymentAccounts.mock.ts')) return { mockPaymentAccounts: [] };
  if (normalizedPath.endsWith('/shared/context/index.ts')) return { useLanguage: () => ({ currentLanguage: { code: 'es-MX' } }) };
  if (normalizedPath.endsWith('/shared/BusinessCurrencyContext.tsx')) return { usePreferredBusinessCurrency: () => ({ preferredCurrency: 'USD' }) };
  if (normalizedPath.endsWith('/shared/kpiMonetaryApi.ts')) return { useKpiMonetaryAggregate: () => ({}) };
  if (normalizedPath.endsWith('/shared/operational/index.ts')) return { ...ui, OperationalKpiArea: 'OperationalKpiArea', getOperationalKpiCurrencyCopy: () => ({}) };
  if (normalizedPath.endsWith('/hooks/useWorkspaceNavigationMemory.ts')) return { useWorkspaceNavigationMemory: options => { memoryOptions = options; } };
  if (normalizedPath.endsWith('/hooks/useTablePagination.ts')) return { useTablePagination: ({ rows }) => ({ paginatedRows: rows, restorePagination: () => {}, onPageChange: () => {} }) };
  if (normalizedPath.endsWith('/components/PettyCashShared.tsx')) return new Proxy({
    usePettyCashTableSort: rows => ({ sortedRows: rows, sortKey: 'date', sortDirection: 'desc', restoreSort: () => {} }),
  }, { get: (target, name) => target[name] ?? name });
  // Shared modal/view primitives are boundaries; the existing operation modal itself is exercised below.
  if (normalizedPath.includes('/components/') && !normalizedPath.endsWith('/PettyCashReconciliationWorkspace.tsx')) return ui;
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} }; cache.set(path, module);
  const code = ts.transpileModule(readFileSync(path, 'utf8').replaceAll('import.meta.env', '({DEV:false})'), {
    fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const require = id => {
    if (id === 'react') return hooks;
    if (id === 'lucide-react') return ui;
    if (id.endsWith('.css')) return {};
    if (id === '../../../api/auth') return { authApi: {
      getSessionOrNull: async () => sessionRole ? { user: { role: sessionRole } } : null,
    } };
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
  props.onSettlementLinesChange = update => { props.settlementLines = update(props.settlementLines); };
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
  async function mount(role = 'admin') {
    sessionRole = role;
    mountEffects = [];
    try {
      render();
      const effects = mountEffects;
      mountEffects = undefined;
      effects.forEach(effect => effect());
      await new Promise(resolve => setImmediate(resolve));
    } finally {
      mountEffects = undefined;
    }
  }
  return { props, render, open, mount };
}

const authorizationButtons = tree => nodes(tree).filter(node =>
  (node.type === 'button' || node.type?.name === 'SettlementLineActionButton')
  && /^(Autorizar|Validar para estado de cuenta)/.test(node.props['aria-label'] ?? node.props.label ?? ''));

test('admin can authorize an unattached captured receipt in desktop and mobile, then close the cut', async () => {
  for (const fundType of ['INTERNAL_COMPANY', 'EXTERNAL_MANAGED']) {
    for (const useMobile of [false, true]) {
      const captured = line({ status: 'DRAFT', attachmentCount: 0, accountingAccountId: '11' });
      const ws = workspace({ funds: [fund({ fundType })], settlementLines: [captured] });
      assert.equal(authorizationButtons(ws.render()).length, 0, 'wait for authenticated permissions');
      await ws.mount('admin');
      const buttons = authorizationButtons(ws.render());
      assert.equal(buttons.length, 2, 'desktop and mobile must both expose authorization');
      assert.equal(ws.open().render().props.canSave, false, 'capture alone does not authorize the receipt');
      const finalizedStatus = fundType === 'EXTERNAL_MANAGED' ? 'VALIDATED' : 'EXPENSE_CREATED';
      respond = () => ({ fund: ws.props.funds[0], statement: statement({ status: 'SETTLED' }),
        settlementLine: { ...captured, status: finalizedStatus } });
      const action = buttons.find(node => useMobile ? node.type === 'button' : node.type?.name === 'SettlementLineActionButton');
      action.props.onClick();
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(requests.length, 1);
      assert.equal(requests[0].url, '/api/v1/finance/petty-cash/funds/5/settlement-lines/80/create-expense');
      assert.equal(ws.props.settlementLines[0].status, finalizedStatus);
      assert.equal(ws.props.settlementLines[0].attachmentCount, 0);
      assert.equal(authorizationButtons(ws.render()).length, 0, 'completed authorization cannot be repeated');
      assert.equal(ws.open().render().props.canSave, true, 'no attachment is required after authorization');
    }
  }
});

test('captured receipt authorization remains unavailable to ordinary or missing sessions', async () => {
  for (const role of ['employee', null]) {
    const ws = workspace({ settlementLines: [line({ status: 'DRAFT', attachmentCount: 0 })] });
    await ws.mount(role);
    assert.equal(authorizationButtons(ws.render()).length, 0);
    assert.equal(ws.open().render().props.canSave, false);
    assert.equal(requests.length, 0);
  }
});

test('authorization failure retains the captured receipt, shows the error, and keeps closure blocked', async () => {
  const ws = workspace({ settlementLines: [line({ status: 'DRAFT', attachmentCount: 0 })] });
  await ws.mount('admin');
  respond = () => { throw new ApiClientError(403, { message: 'Forbidden' }); };
  const action = authorizationButtons(ws.render())[0];
  assert.ok(action, 'an administrator can request authorization');
  action.props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(ws.props.settlementLines[0].status, 'DRAFT');
  assert.match(text(ws.render()), /No tienes permisos/);
  assert.equal(authorizationButtons(ws.render()).length, 2, 'failed requests remain retryable');
  assert.equal(ws.open().render().props.canSave, false);
});

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

test('negative balances can carry, forgive or charge payroll but never close cleanly', async () => {
  for (const balance of [-1764.28, -0.01]) {
    for (const choice of ['CARRY_FORWARD', 'FORGIVE_SHORTAGE', 'CHARGE_EMPLOYEE']) {
      const ws = workspace({ statements: [statement({ declaredClosingBalanceAmount: balance })] });
      const dialog = ws.open();
      assert.equal(dialog.render().props.canSave, true);
      const action = field(dialog.render(), 'Accion de cierre');
      assert.ok(nodes(action).find(node => node.type === 'option' && node.props.value === 'CLOSE_CLEAN').props.disabled);
      action.props.onChange({ target: { value: 'CLOSE_CLEAN' } });
      assert.equal(dialog.render().props.canSave, false);
      await dialog.render().props.onSave();
      assert.equal(requests.length, 0);
      action.props.onChange({ target: { value: choice } });
      assert.equal(dialog.render().props.canSave, true);
      if (choice !== 'CARRY_FORWARD') {
        assert.equal(field(dialog.render(), 'Diferencia a resolver').props.readOnly, true);
        assert.equal(field(dialog.render(), 'Diferencia a resolver').props.value, String(Math.abs(balance)));
      }
      respond = () => ({ fund: fund(), statement: statement({ status: 'CLOSED' }) });
      await dialog.render().props.onSave();
      assert.equal(requests[0].body.action, choice);
      assert.equal(requests[0].body.expectedClosingBalance, balance);
      assert.equal(requests[0].body.shortageAmount, choice === 'CARRY_FORWARD' ? undefined : Math.abs(balance));
    }
  }
});

test('pending receipt statuses block closure, including zero-valued receipts and filtered-out rows', () => {
  for (const status of ['DRAFT', 'RECEIPT_ATTACHED', 'VALIDATED']) {
    const ws = workspace({ settlementLines: [line({ status, totalAmount: 0 })] });
    const search = nodes(ws.render()).find(node => node.type === 'input' && node.props.type === 'search');
    search.props.onChange({ target: { value: 'no matching receipt' } });
    const dialog = ws.open();
    assert.equal(dialog.render().props.canSave, false, status);
    assert.match(text(dialog.render()), /Autoriza o rechaza los registros pendientes/);
  }
});

test('external funds close after validation without creating expenses; rejected/reversed receipts do not block', () => {
  for (const fundType of ['INTERNAL_COMPANY', 'EXTERNAL_MANAGED']) {
    const lines = [line({ status: fundType === 'EXTERNAL_MANAGED' ? 'VALIDATED' : 'EXPENSE_CREATED', attachmentCount: 0 }),
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
  assert.deepEqual(requests[0].body, { action: 'CLOSE_CLEAN', closeDate: '2026-09-08', expectedClosingBalance: 0 });

  const withBalance = workspace({ statements: [statement({ declaredClosingBalanceAmount: 250 })] }).open();
  field(withBalance.render(), 'Accion de cierre').props.onChange({ target: { value: 'RETURN_TO_SOURCE' } });
  assert.equal(withBalance.render().props.canSave, true);
  field(withBalance.render(), 'Accion de cierre').props.onChange({ target: { value: 'FORGIVE_SURPLUS' } });
  assert.equal(withBalance.render().props.canSave, true);
  assert.equal(field(withBalance.render(), 'Diferencia a resolver').props.value, '250');
  for (const action of ['CHARGE_EMPLOYEE', 'FORGIVE_SHORTAGE']) {
    field(withBalance.render(), 'Accion de cierre').props.onChange({ target: { value: action } });
    assert.equal(withBalance.render().props.canSave, false);
  }
  const noResponsible = workspace({ funds: [fund({ responsibleUserId: undefined })],
    statements: [statement({ declaredClosingBalanceAmount: -250 })] }).open();
  field(noResponsible.render(), 'Accion de cierre').props.onChange({ target: { value: 'CHARGE_EMPLOYEE' } });
  assert.equal(noResponsible.render().props.canSave, false);

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


test('closing refreshes all affected successor balances using the backend response', async () => {
  const next = statement({ id: '52', periodKey: '2026-09', declaredClosingBalanceAmount: -1938.29 });
  const later = statement({ id: '53', periodKey: '2026-10', declaredClosingBalanceAmount: -1948.29 });
  const ws = workspace({ statements: [statement({ declaredClosingBalanceAmount: -1764.28 }), next, later] });
  const dialog = ws.open();
  field(dialog.render(), 'Accion de cierre').props.onChange({ target: { value: 'FORGIVE_SHORTAGE' } });
  respond = () => ({ fund: fund({ currentBalanceAmount: -184.01 }),
    statement: statement({ status: 'FORGIVEN_SHORTAGE' }),
    updatedStatements: [{ ...next, declaredClosingBalanceAmount: -174.01 }, { ...later, declaredClosingBalanceAmount: -184.01 }] });
  await dialog.render().props.onSave();
  assert.equal(ws.props.statements.find(item => item.id === '52').declaredClosingBalanceAmount, -174.01);
  assert.equal(ws.props.statements.find(item => item.id === '53').declaredClosingBalanceAmount, -184.01);
  assert.equal(ws.props.statements.length, 3);
});


test('Saldos selection exposes four actions, filtered and selected totals, and sends one versioned batch', async () => {
  const ws = workspace({ settlementLines: [line({ id: '80', version: 3, status: 'DRAFT', totalAmount: 100 }), line({ id: '81', version: 7, status: 'DRAFT', totalAmount: 250 })] });
  nodes(ws.render()).find(node => node.type === 'input' && node.props['aria-label'] === 'Seleccionar filas visibles').props.onChange({ target: { checked: true } });
  const bar = nodes(ws.render()).find(node => node.type?.name === 'FinanceBulkActions');
  assert.equal(bar.props.count, 2);
  assert.deepEqual(bar.props.actions.map(item => item.action), ['DELETE', 'PROVIDER', 'PAYMENT_ACCOUNT', 'ACCOUNTING_ACCOUNT']);
  assert.match(bar.props.actions.find(item => item.action === 'PAYMENT_ACCOUNT').blockedReason, /pertenece al fondo/);
  const totals = nodes(ws.render()).find(node => node.type?.name === 'FinanceSelectionTotals');
  assert.equal(totals.props.rows.length, 2); assert.equal(totals.props.selected.length, 2);
  respond = () => ({ fund: fund(), statement: statement(), settlementLines: ws.props.settlementLines.map(item => ({ ...item, providerId: 9, version: item.version + 1 })) });
  await bar.props.onApply('PROVIDER', '9', '');
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].body, { statementId: 51, action: 'PROVIDER', targetId: 9, reason: '', rows: [{ id: 80, expectedVersion: 3 }, { id: 81, expectedVersion: 7 }] });
  assert.ok(ws.props.settlementLines.every(item => item.providerId === '9'));
});

test('Saldos memory restores the selected cut, filters and view; stale fund IDs are discarded', () => {
  const august = statement(); const september = statement({ id: '52', periodKey: '2026-09' });
  const ws = workspace({ statements: [september, august], settlementLines: [line({ version: 0 })] });
  ws.render();
  const restored = { ...memoryOptions.state, selectedFundId: '5', selectedStatementId: '51', searchTerm: 'Comprobante', receiptStatusFilter: 'EXPENSE_CREATED', evidenceFilter: 'with' };
  memoryOptions.onRestore(restored);
  assert.equal(field(ws.render(), 'Corte').props.value, '51');
  assert.equal(memoryOptions.state.searchTerm, 'Comprobante');
  assert.equal(memoryOptions.state.receiptStatusFilter, 'EXPENSE_CREATED');
  assert.ok(!('selectedIds' in memoryOptions.state));
  memoryOptions.onRestore({ ...restored, selectedFundId: '9999', selectedStatementId: '9999', receiptStatusFilter: 'INVALID', evidenceFilter: 'INVALID' });
  ws.render(); assert.equal(memoryOptions.state.selectedFundId, '5'); assert.equal(memoryOptions.state.selectedStatementId, '52');
  assert.equal(memoryOptions.state.receiptStatusFilter, 'all'); assert.equal(memoryOptions.state.evidenceFilter, 'all');
});
