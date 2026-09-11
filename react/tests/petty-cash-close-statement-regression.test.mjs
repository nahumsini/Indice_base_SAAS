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
let paymentAccountCatalog = [];
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
  if (path.endsWith('/lib/apiClient.ts')) return { ApiClientError, apiClient: async (url, options) => {
    const request = { url, method: options.method, body: JSON.parse(options.body) };
    requests.push(request);
    return respond(request);
  } };
  if (path.endsWith('/hooks/usePettyCashTranslations.ts')) return {
    usePettyCashTranslations: () => load(resolve(root, 'translations/index.ts')).getPettyCashTranslations('es-MX'),
  };
  if (path.endsWith('/Expenses/services/index.ts')) return {
    ...load(resolve(dirname(path), 'finance-api.errors.ts')),
    providersService: { getProviderRecords: async () => [] },
    paymentAccountsService: { getPaymentAccounts: async () => paymentAccountCatalog },
    accountingAccountsService: { getAccountingAccounts: async () => [] },
  };
  if (path.endsWith('/AccountingAccounts/accountingAccounts.mock.ts')) return { mockAccounts: [] };
  if (path.endsWith('/data/providerRecords.mock.ts')) return { mockProviderRecords: [] };
  if (path.endsWith('/PaymentAccounts/paymentAccounts.mock.ts')) return { mockPaymentAccounts: [] };
  if (path.endsWith('/shared/context/index.ts')) return { useLanguage: () => ({ currentLanguage: { code: 'es-MX' } }) };
  if (path.endsWith('/shared/BusinessCurrencyContext.tsx')) return { usePreferredBusinessCurrency: () => ({ preferredCurrency: 'USD' }) };
  if (path.endsWith('/shared/kpiMonetaryApi.ts')) return { useKpiMonetaryAggregate: () => ({}) };
  if (path.endsWith('/shared/operational/index.ts')) return { ...ui, OperationalKpiArea: 'OperationalKpiArea', getOperationalKpiCurrencyCopy: () => ({}) };
  if (path.endsWith('/hooks/useWorkspaceNavigationMemory.ts')) return { useWorkspaceNavigationMemory: options => { memoryOptions = options; } };
  if (path.endsWith('/hooks/useTablePagination.ts')) return { useTablePagination: ({ rows }) => ({ paginatedRows: rows, restorePagination: () => {}, onPageChange: () => {} }) };
  if (path.endsWith('/components/PettyCashShared.tsx')) return new Proxy({
    usePettyCashTableSort: rows => ({ sortedRows: rows, sortKey: 'date', sortDirection: 'desc', restoreSort: () => {} }),
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
  assert.equal(withBalance.render().props.canSave, false, 'a return requires an explicit valid destination');
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

test('returning a balance selects its destination per closing operation', async () => {
  paymentAccountCatalog = [
    { id: '70', name: 'Custodia', currency: 'MXN', isActive: true, type: 'cash' },
    { id: '80', name: 'Banco MXN', currency: 'MXN', isActive: true, type: 'bank' },
    { id: '90', name: 'Banco USD', currency: 'USD', isActive: true, type: 'bank' },
  ];
  try {
    const internalWorkspace = workspace({
      funds: [fund({ paymentAccountId: '70', fundingSourcePaymentAccountId: undefined })],
      statements: [statement({ declaredClosingBalanceAmount: 250 })],
    });
    await internalWorkspace.mount();
    const internal = internalWorkspace.open();
    field(internal.render(), 'Accion de cierre').props.onChange({ target: { value: 'RETURN_TO_SOURCE' } });
    const internalDestination = field(internal.render(), 'Destino de la devolución *');
    assert.deepEqual(nodes(internalDestination).filter(node => node.type === 'option').map(node => node.props.value), ['80']);
    assert.equal(internalDestination.props.value, '80');
    assert.equal(internal.render().props.canSave, true);
    respond = () => ({ fund: internalWorkspace.props.funds[0], statement: statement({ status: 'CLOSED' }) });
    await internal.render().props.onSave();
    assert.equal(requests[0].body.destinationPaymentAccountId, 80);
    assert.equal(requests[0].body.externalDestinationName, undefined);

    const externalWorkspace = workspace({
      funds: [fund({ fundType: 'EXTERNAL_MANAGED', paymentAccountId: '70', externalOwnerName: '' })],
      statements: [statement({ declaredClosingBalanceAmount: 125 })],
    });
    await externalWorkspace.mount();
    const external = externalWorkspace.open();
    field(external.render(), 'Accion de cierre').props.onChange({ target: { value: 'RETURN_TO_SOURCE' } });
    const externalDestination = field(external.render(), 'Destino de la devolución *');
    assert.ok(nodes(externalDestination).some(node => node.type === 'option' && node.props.value === 'EXTERNAL_MEDIA'));
    externalDestination.props.onChange({ target: { value: 'EXTERNAL_MEDIA' } });
    assert.equal(external.render().props.canSave, false);
    field(external.render(), 'Destino externo *').props.onChange({ target: { value: 'Cliente custodio' } });
    assert.equal(external.render().props.canSave, true);
    respond = () => ({ fund: externalWorkspace.props.funds[0], statement: statement({ status: 'CLOSED' }) });
    await external.render().props.onSave();
    assert.equal(requests[0].body.destinationPaymentAccountId, undefined);
    assert.equal(requests[0].body.externalDestinationName, 'Cliente custodio');
  } finally {
    paymentAccountCatalog = [];
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

test('fund API round-trips all assets, excludes draft keys and sends an explicit empty list to clear them', async () => {
  const { pettyCashService } = load(resolve(root, 'services/petty-cash.service.ts'));
  const assets = [
    { type: 'REAL_ESTATE', name: 'Casa', reference: 'REF-1', draftId: 'local-1' },
    { type: 'VEHICLE', name: 'Auto', reference: null, draftId: 'local-2' },
  ];
  requests = []; respond = request => ({ ...request.body, id: 5, companyId: 1 });
  const created = await pettyCashService.createFund(fund({ managedAssets: assets }));
  const expected = assets.map(({ draftId, ...asset }) => asset);
  assert.deepEqual(created.managedAssets, expected);
  assert.deepEqual(requests[0].body.managedAssets, expected);
  assert.equal(requests[0].body.managedAssetName, 'Casa');
  const cleared = await pettyCashService.updateFund({ ...created, managedAssets: [] });
  assert.deepEqual(cleared.managedAssets, []);
  assert.equal(requests[1].body.managedAssetName, null);
  assert.deepEqual(requests[1].body.managedAssets, []);
});

test('statement PDF prints every historical asset across pages without inheriting current assets', () => {
  const { buildPettyCashStatementPdf } = load(resolve(root, 'utils/pettyCashStatementPdf.ts'));
  const copy = load(resolve(root, 'translations/index.ts')).getPettyCashTranslations('es-MX');
  const assets = Array.from({ length: 50 }, (_, index) => ({ type: 'REAL_ESTATE', name: `HistoricalAsset${index + 1}`, reference: `REF-${index + 1}` }));
  const context = { copy, locale: copy.locale, movements: [], settlementLines: [],
    fund: fund({ managedAssetName: 'CurrentAssetNeverPrinted' }),
    statement: statement({ openingBalanceAmount: 0, assignedAmount: 0, additionalDepositAmount: 0,
      attachmentCount: 0, responsibleName: 'Responsable', fundTypeSnapshot: 'EXTERNAL_MANAGED', managedAssetsSnapshot: assets }),
  };
  const pdf = buildPettyCashStatementPdf(context);
  assert.ok(pdf.getNumberOfPages() > 1);
  const output = pdf.output();
  for (const asset of assets) assert.ok(output.includes(asset.name), `Missing historical asset ${asset.name}`);
  assert.ok(!output.includes('CurrentAssetNeverPrinted'));
  const empty = buildPettyCashStatementPdf({ ...context, statement: { ...context.statement, managedAssetsSnapshot: [] } }).output();
  assert.ok(!empty.includes('HistoricalAsset') && !empty.includes('CurrentAssetNeverPrinted'));
});

test('statement preview and PDF use one restrained standard-document definition without losing financial detail', () => {
  const { buildPettyCashStatementDocument } = load(resolve(root, 'utils/pettyCashStatementPdf.ts'));
  const copy = load(resolve(root, 'translations/index.ts')).getPettyCashTranslations('es-MX');
  const generatedAt = new Date('2026-09-11T19:22:00Z');
  const definition = buildPettyCashStatementDocument({
    copy,
    generatedAt,
    locale: copy.locale,
    movements: [],
    originText: 'Saldo del corte anterior CUT-50',
    settlementLines: [],
    fund: fund({ currentBalanceAmount: 625, budgetLineName: 'Mantenimiento' }),
    statement: statement({ openingBalanceAmount: 1000, assignedAmount: 800, additionalDepositAmount: 200,
      declaredClosingBalanceAmount: 625, estimatedUsageAmount: 375, verifiedExpenseAmount: 300,
      attachmentCount: 0, responsibleName: 'Responsable', fundTypeSnapshot: 'INTERNAL_COMPANY' }),
  });
  assert.deepEqual(definition.accentColor, [20, 117, 20]);
  assert.deepEqual(definition.contract, {
    category: 'transaction-document', modifiers: ['confidential', 'internal', 'multi-currency', 'approval-required'],
    orientation: 'portrait', pageSize: 'a4', version: '1.0',
  });
  assert.equal(definition.generatedAt, generatedAt);
  assert.ok(definition.sections.some(section => section.fields?.some(field => field.value === 'Saldo del corte anterior CUT-50')));
  assert.ok(definition.tables[0].rows.some(row => row[0] === 'Saldo actual del fondo' && row[1] === '$625.00'));
  assert.equal(definition.tables.at(-1).emptyMessage, 'Este corte no tiene gastos registrados.');
});

test('statement PDF identifies the selected external destination of a returned balance', () => {
  const { buildPettyCashStatementPdf } = load(resolve(root, 'utils/pettyCashStatementPdf.ts'));
  const copy = load(resolve(root, 'translations/index.ts')).getPettyCashTranslations('es-MX');
  const returned = {
    id: '901', pettyCashFundId: '5', pettyCashStatementId: '51', type: 'RETURN_TO_SOURCE',
    amount: 125, currencyCode: 'MXN', movementDate: '2026-09-10', externalSourceName: 'Cliente custodio',
    statementDescription: 'Devolución del saldo', reference: 'Cierre',
  };
  const output = buildPettyCashStatementPdf({
    copy, locale: copy.locale, movements: [returned], settlementLines: [],
    fund: fund({ fundType: 'EXTERNAL_MANAGED', externalOwnerName: 'Cliente' }),
    statement: statement({ openingBalanceAmount: 125, assignedAmount: 0, additionalDepositAmount: 0,
      attachmentCount: 0, responsibleName: 'Responsable', fundTypeSnapshot: 'EXTERNAL_MANAGED' }),
  }).output();
  assert.ok(output.includes('Cliente custodio'));
});

test('deposit modal and its real submit handler use account transfers or explicit external means without a method selector', async () => {
  const copy = load(resolve(root, 'translations/index.ts')).getPettyCashTranslations('es-MX');
  paymentAccountCatalog = [
    { id: '70', name: 'Custodia', currency: 'MXN', isActive: true, type: 'cash' },
    { id: '80', name: 'Banco', currency: 'MXN', isActive: true, type: 'bank' },
    { id: '90', name: 'Inactiva', currency: 'MXN', isActive: false, type: 'bank' },
    { id: '100', name: 'USD', currency: 'USD', isActive: true, type: 'bank' },
  ];
  try {
    for (const [fundType, source] of [['INTERNAL_COMPANY', '80'], ['EXTERNAL_MANAGED', '80'], ['EXTERNAL_MANAGED', undefined]]) {
      const current = fund({ fundType, paymentAccountId: '70', fundingSourcePaymentAccountId: source,
        fundingSourceName: source ? 'Banco' : 'Aportación externa', externalOwnerName: 'Cliente', fundingMethods: [] });
      const ws = workspace({ funds: [current] }); await ws.mount();
      nodes(ws.render()).find(node => node.type === 'PettyCashHeaderBanner').props.onSecondaryAction();
      const element = () => nodes(ws.render()).find(node => node.type?.name === 'DepositModal');
      const renderer = component(element().type); const render = () => renderer.render(element().props);
      const origin = () => field(render(), copy.reconciliation.depositModal.sourceAccount);
      const choices = nodes(origin()).filter(node => node.type === 'option').map(node => node.props.value);
      assert.ok(choices.includes('80') && !choices.includes('70') && !choices.includes('90') && !choices.includes('100'));
      assert.equal(choices.includes('EXTERNAL_MEDIA'), fundType === 'EXTERNAL_MANAGED');
      assert.equal(origin().props.value, source ?? '80');
      assert.ok(!nodes(render()).some(node => node.type === 'PettyCashField' && node.props.label === copy.reconciliation.depositModal.method));
      field(render(), copy.reconciliation.depositModal.amount).props.onChange({ target: { value: '125' } });
      field(render(), copy.reconciliation.depositModal.statementDescription).props.onChange({ target: { value: 'Aportación de prueba' } });
      assert.equal(render().props.canSave, true);
      if (fundType === 'EXTERNAL_MANAGED' && source) {
        origin().props.onChange({ target: { value: 'EXTERNAL_MEDIA' } });
        field(render(), copy.reconciliation.depositModal.externalSourceName).props.onChange({ target: { value: 'Externo guardado en borrador' } });
        origin().props.onChange({ target: { value: '80' } });
        assert.equal(render().props.canSave, true);
      }
      if (fundType === 'EXTERNAL_MANAGED' && !source) {
        origin().props.onChange({ target: { value: 'EXTERNAL_MEDIA' } });
        assert.equal(render().props.canSave, true);
      }
      respond = request => ({ fund: current, statement: statement(), movement: { ...request.body, id: 900, pettyCashFundId: 5 } });
      await render().props.onSave();
      assert.equal(requests.length, 1);
      assert.equal(requests[0].body.fromPaymentAccountId, source ? 80 : null);
      assert.equal(requests[0].body.toPaymentAccountId, 70);
      assert.equal(requests[0].body.externalSourceName, source ? null : 'Aportación externa');
      assert.equal(requests[0].body.fundingMethod, source ? 'INTERNAL_TRANSFER' : 'EXTERNAL_MEDIA');
    }
  } finally { paymentAccountCatalog = []; }
});
