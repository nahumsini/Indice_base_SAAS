import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';
import { hookRuntime } from './helpers/hook-runtime.mjs';

const root = resolve(import.meta.dirname, '../src/app/BasicModules/PettyCash');
const modulePath = resolve(root, 'components/PettyCashFundsWorkspace.tsx');
const cache = new Map();
const ui = new Proxy({}, { get: (_, name) => name });
let activeRuntime;
let locale = 'es-MX';
const hooks = { ...React, ...Object.fromEntries(['useState', 'useRef', 'useEffect', 'useMemo', 'useCallback']
  .map(key => [key, (...args) => activeRuntime.hooks[key](...args)])) };
function load(file) {
  const path = [file, `${file}.ts`, `${file}.tsx`, resolve(file, 'index.ts'), resolve(file, 'index.tsx')]
    .find(candidate => existsSync(candidate) && /\.tsx?$/.test(candidate));
  assert.ok(path, `Missing dependency: ${file}`);
  if (path.endsWith('/hooks/usePettyCashTranslations.ts')) return {
    usePettyCashTranslations: () => load(resolve(root, 'translations/index.ts')).getPettyCashTranslations(locale),
  };
  if (path.endsWith('/shared/context/index.ts')) return { useLanguage: () => ({ currentLanguage: { code: locale } }) };
  if (path.endsWith('/PaymentAccounts/paymentAccounts.mock.ts')) return { mockPaymentAccounts: [] };
  if (path.endsWith('/data/categories.data.ts')) return { getCategoryById: () => undefined };
  if (path.endsWith('/Expenses/services/index.ts')) return { toFinanceApiErrorMessage: error => error.message };
  if (path.includes('/services/') || path.includes('/hooks/') || path.includes('/learningMode/')
      || path.includes('/shared/operational/') || path.endsWith('/shared/kpiMonetaryApi.ts')) return ui;
  if (path.includes('/components/') && path !== modulePath && !path.endsWith('/ManagedAssetsEditor.tsx')) return ui;
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} }; cache.set(path, module);
  // Expose the existing private modal only to this harness; exercise its real hooks and events.
  const source = readFileSync(path, 'utf8') + (path === modulePath ? '\nexport { CreateFundModal };' : '');
  const code = ts.transpileModule(source.replaceAll('import.meta.env', '({DEV:false})'), {
    fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const require = id => id === 'react' ? hooks : id === 'lucide-react' ? ui
    : id.startsWith('.') ? load(resolve(dirname(path), id)) : createRequire(path)(id);
  new Function('require', 'module', 'exports', code)(require, module, module.exports);
  return module.exports;
}
const { CreateFundModal } = load(modulePath);
const { getPettyCashTranslations } = load(resolve(root, 'translations/index.ts'));
const { getFundWizardCopy } = load(resolve(root, 'utils/fundWizard.copy.ts'));
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!React.isValidElement(tree)) return [];
  if (typeof tree.type === 'function' && tree.type.name === 'ManagedAssetsEditor') return nodes(tree.type(tree.props));
  return [tree, ...nodes(tree.props.children), ...nodes(tree.props.footer), ...nodes(tree.props.footerLeading)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (React.isValidElement(tree)) return text(tree.props.children);
  return typeof tree === 'string' || typeof tree === 'number' ? String(tree) : '';
}
const account = (id, currency = 'MXN', type = 'cash') => ({ id, name: `Cuenta ${id}`, currency, type, isActive: true });
const budget = (id = 'b1', currencyCode = 'MXN') => ({ id, budgetId: 'b0', name: `Presupuesto ${id}`, currencyCode, availableAmount: 1000, plannedAmount: 1000 });
async function modal(overrides = {}) {
  locale = overrides.locale ?? 'es-MX';
  const saves = []; let closed = 0;
  const props = {
    budgetLines: [budget()], businessOptions: [{ value: 'b', label: 'Negocio', unitId: 'u' }],
    unitOptions: [{ value: 'u', label: 'Unidad' }], userOptions: [{ value: 'r', label: 'Responsable' }],
    currentUserId: 'r', isLoadingReferenceData: false,
    paymentAccounts: [account('cash'), account('bank', 'MXN', 'bank'), account('usd', 'USD')],
    onCancelTypeChange: async () => {}, onClose: () => { closed++; }, onSave: async draft => { saves.push(structuredClone(draft)); }, ...overrides,
  };
  const runtime = hookRuntime();
  const render = () => { activeRuntime = runtime; return runtime.render(() => CreateFundModal(props)); };
  const flush = async () => { activeRuntime = runtime; return runtime.flush(); };
  render(); await flush();
  const copy = getPettyCashTranslations(locale), wizard = getFundWizardCopy(locale);
  const find = (type, predicate = () => true) => nodes(runtime.result).find(node => node.type === type && predicate(node));
  const button = label => find('button', node => text(node) === label);
  const field = (label, index = 0) => {
    const node = nodes(runtime.result).filter(node => node.type === 'PettyCashField' && node.props.label.replace(/\s*\*$/, '') === label.replace(/\s*\*$/, ''))[index];
    assert.ok(node, `Field not visible: ${label}`);
    return nodes(node.props.children).find(child => child.type === 'input' || child.type === 'select' || child.type === 'textarea');
  };
  const click = async label => { const b = button(label); assert.ok(b, `Button not visible: ${label}`); assert.ok(!b.props.disabled); await b.props.onClick(); await flush(); };
  const change = async (label, value, index = 0) => {
    const control = field(label, index); assert.ok(!control.props.disabled);
    find('form').props.onChangeCapture(); control.props.onChange({ target: { value } }); await flush();
  };
  return { props, copy, wizard, saves, closed: () => closed, tree: () => runtime.result, find, button, field, click, change, flush, render,
    step: () => find('IndiceModalWizardStepper')?.props.activeStepId,
    errors: () => nodes(runtime.result).filter(node => node.type === 'IndiceModalValidation').flatMap(node => node.props.messages),
    next: () => click(wizard.next), back: () => click(wizard.back),
  };
}
async function internalReview(m) {
  await m.next(); await m.change(m.copy.funds.modal.name, 'Fondo de prueba'); await m.next();
  assert.equal(m.step(), 'review');
}

test('internal creation gates each step, retains Back edits, reviews native amounts and saves only at the end', async () => {
  const m = await modal();
  assert.equal(m.tree().props.modalType, 'wizard');
  assert.equal(m.find('IndiceModalWizardStepper').props.steps.length, 3);
  assert.equal(m.button(m.copy.funds.modal.submit), undefined);
  await m.next(); await m.next();
  assert.equal(m.step(), 'details'); assert.ok(m.errors().some(message => message.includes('Nombre')));
  await m.change(m.copy.funds.modal.name, 'Fondo de prueba');
  await m.change(m.copy.funds.modal.limit, '357.25');
  await m.next(); await m.back();
  assert.equal(m.field(m.copy.funds.modal.limit).props.value, '357.25');
  await m.next();
  assert.equal(m.step(), 'review'); assert.equal(m.saves.length, 0);
  assert.ok(m.tree().props.footerSummary.includes(m.copy.funds.modal.limit.replace(/\s*\*$/, '')));
  const summaries = nodes(m.tree()).filter(node => node.type === 'IndiceModalSummary').flatMap(node => node.props.items);
  assert.ok(summaries.some(item => text(item.value).includes('MXN') && text(item.value).includes('357.25')));
  assert.ok(summaries.some(item => item.label === m.wizard.initialBalance && text(item.value).includes('0.00')));
  await m.click(m.copy.funds.modal.submit);
  assert.equal(m.saves.length, 1); assert.equal(m.saves[0].limitAmount, '357.25');
  assert.equal(m.saves[0].fundType, 'INTERNAL_COMPANY'); assert.equal(m.saves[0].budgetLineId, 'b1');
});

test('external creation adds owner review and requires valid recipient and asset identity', async () => {
  const m = await modal();
  const typeButton = nodes(m.tree()).find(node => node.type === 'button' && text(node).includes(m.copy.funds.modal.externalFundDescription));
  typeButton.props.onClick(); await m.flush();
  assert.equal(m.find('IndiceModalWizardStepper').props.steps.length, 4);
  await m.next(); await m.change(m.copy.funds.modal.name, 'Fondo externo'); await m.next();
  assert.equal(m.step(), 'identity'); await m.next();
  assert.equal(m.step(), 'identity'); assert.ok(m.errors().includes(m.wizard.invalidEmail));
  await m.change(m.copy.funds.modal.ownerName, 'Cliente');
  await m.change(m.copy.funds.modal.recipientEmail, 'cliente@example.test');
  await m.click('Agregar activo');
  await m.change(m.copy.funds.modal.assetType, 'REAL_ESTATE'); await m.next();
  assert.equal(m.step(), 'identity');
  await m.change(m.copy.funds.modal.assetName, 'Propiedad'); await m.next();
  assert.equal(m.step(), 'review');
  assert.ok(nodes(m.tree()).some(node => node.type === 'IndiceModalSummary' && node.props.title === m.copy.funds.modal.fundingTitle));
  m.props.budgetLines = [budget('refreshed-budget')]; m.render(); await m.flush();
  assert.equal(m.find('PettyCashField', node => node.props.label === m.copy.funds.modal.sourceAccount), undefined);
  assert.ok(!text(m.tree()).includes(m.copy.funds.modal.fundingMethods));
  await m.click(m.copy.funds.modal.submit);
  assert.equal(m.saves[0].budgetLineId, ''); assert.equal(m.saves[0].fundingSourcePaymentAccountId, '');
  assert.equal(m.saves[0].externalOwnerName, 'Cliente'); assert.equal(m.saves[0].managedAssets[0].name, 'Propiedad');
});

test('currency changes require compatible accounts without changing the reviewed limit or budget', async () => {
  const m = await modal({ budgetLines: [budget(), budget('usd-budget', 'USD')],
    paymentAccounts: [account('cash'), account('bank', 'MXN', 'bank'), account('usd', 'USD'), account('usd-bank', 'USD', 'bank')] });
  await m.next(); await m.change(m.copy.funds.modal.name, 'USD fund');
  await m.change(m.copy.funds.modal.budgetLine, 'usd-budget'); await m.change(m.copy.funds.modal.limit, '725.50');
  assert.equal(m.step(), 'details');
  const choices = nodes(m.field(m.copy.funds.modal.fundAccount)).filter(node => node.type === 'option').map(node => node.props.value);
  assert.ok(!choices.includes('cash')); assert.ok(choices.includes('usd'));
  await m.change(m.copy.funds.modal.fundAccount, 'usd'); await m.next();
  assert.equal(m.step(), 'review'); await m.back(); assert.equal(m.field(m.copy.funds.modal.limit).props.value, '725.50');
  assert.equal(m.field(m.copy.funds.modal.budgetLine).props.value, 'usd-budget');
  await m.next(); await m.click(m.copy.funds.modal.submit);
  assert.equal(m.saves[0].currencyCode, 'USD'); assert.equal(m.saves[0].limitAmount, '725.50');
});

test('invalid amounts block progress, while monthly cuts stay automatic and a limit above budget remains a warning', async () => {
  const m = await modal(); await m.next(); await m.change(m.copy.funds.modal.name, 'Fondo');
  for (const value of ['0', '-1', 'Infinity', 'NaN']) {
    await m.change(m.copy.funds.modal.limit, value); await m.next();
    assert.equal(m.step(), 'details'); assert.ok(m.errors().includes(m.wizard.invalidAmount));
  }
  assert.equal(m.find('PettyCashField', node => node.props.label === m.copy.funds.modal.cutOffDay), undefined);
  await m.change(m.copy.funds.modal.limit, '1500'); await m.next();
  assert.equal(m.step(), 'review'); assert.ok(m.errors().includes(m.copy.funds.modal.budgetExceededHint));
  assert.equal(m.button(m.copy.funds.modal.submit).props.disabled, false);
});

test('saving blocks duplicate requests, draft edits and dismissal; failure preserves review for retry', async () => {
  let rejectSave; let count = 0;
  const m = await modal({ onSave: () => { count++; return new Promise((_, reject) => { rejectSave = reject; }); } });
  await internalReview(m);
  const submit = m.button(m.copy.funds.modal.submit).props.onClick;
  const pending = submit(); await submit(); await m.flush();
  assert.equal(count, 1); assert.equal(m.tree().props.busy, true);
  assert.equal(m.find('fieldset').props.disabled, true);
  m.tree().props.onOpenChange(false); await m.flush(); assert.equal(m.closed(), 0);
  rejectSave(new Error('No se pudo guardar')); await pending; await m.flush();
  assert.equal(m.step(), 'review'); assert.ok(m.errors().includes('No se pudo guardar'));
  assert.equal(m.tree().props.busy, false);
  m.props.onSave = async () => { count++; }; m.render(); await m.flush();
  await m.click(m.copy.funds.modal.submit); assert.equal(count, 2);
});

test('cancel closes an untouched wizard and confirms discarding a changed draft inside the same modal', async () => {
  const untouched = await modal(); await untouched.click(untouched.copy.common.cancel); assert.equal(untouched.closed(), 1);
  const m = await modal(); await m.next(); await m.change(m.copy.funds.modal.name, 'Borrador');
  m.tree().props.onOpenChange(false); await m.flush(); assert.equal(m.closed(), 0);
  assert.ok(m.errors().includes(m.wizard.discardWarning));
  await m.click(m.wizard.keepEditing); assert.equal(m.field(m.copy.funds.modal.name).props.value, 'Borrador');
  await m.click(m.copy.common.cancel); await m.click(m.wizard.discard); assert.equal(m.closed(), 1); assert.equal(m.saves.length, 0);
});

test('loading, missing catalogs and removed choices cannot bypass review validation', async () => {
  const loading = await modal({ isLoadingReferenceData: true });
  assert.equal(loading.button(loading.wizard.next).props.disabled, true);
  const empty = await modal({ budgetLines: [], unitOptions: [], userOptions: [], businessOptions: [], paymentAccounts: [] });
  await empty.next(); await empty.next(); assert.equal(empty.step(), 'details'); assert.ok(empty.errors().length >= 4);
  const m = await modal(); await internalReview(m);
  m.props.paymentAccounts = []; m.render(); await m.flush();
  assert.equal(m.button(m.copy.funds.modal.submit).props.disabled, true);
  assert.ok(m.errors().some(message => message.includes('Cuenta')));
});

test('fund editing keeps a standard form, immutable currency and legacy allowances', async () => {
  const m = await modal({ initialFund: { id: 'f', name: 'Fondo anterior', fundType: 'INTERNAL_COMPANY', currencyCode: 'MXN',
    unitId: 'u', businessId: 'b', responsibleUserId: 'r', createdByUserId: 'r', paymentAccountId: 'cash',
    limitAmount: 100, cutOffDay: 30, fundingMethods: ['CASH'], spendingMethods: ['CASH'], budgetLinkPending: true } });
  assert.equal(m.tree().props.modalType, 'standard-form'); assert.equal(m.step(), undefined);
  assert.equal(m.field(m.copy.funds.modal.currency).props.disabled, true);
  assert.equal(m.button(m.copy.funds.modal.update).props.disabled, false);
  await m.click(m.copy.funds.modal.update); assert.equal(m.saves.length, 1);
});

test('editing schedules a prospective type change with its effective date, reason and target rules', async () => {
  const m = await modal({ initialFund: { id: '15', version: 7, name: 'Fondo interno', fundType: 'INTERNAL_COMPANY', currencyCode: 'MXN',
    unitId: 'u', businessId: 'b', responsibleUserId: 'r', createdByUserId: 'r', paymentAccountId: 'cash',
    limitAmount: 100, cutOffDay: 30, fundingMethods: [], spendingMethods: [], budgetId: 'b0', budgetLineId: 'b1', fundingSourceName: '' } });
  nodes(m.tree()).find(node => node.type === 'button' && text(node).includes(m.copy.funds.modal.externalFundDescription)).props.onClick();
  await m.flush();
  assert.ok(text(m.tree()).includes(m.wizard.typeChangeTitle));
  assert.equal(m.button(m.copy.funds.modal.update).props.disabled, true);
  await m.change(m.copy.funds.modal.ownerName, 'Cliente');
  await m.change(m.copy.funds.modal.recipientEmail, 'cliente@example.test');
  await m.change(m.wizard.reason, 'Cambio aprobado por dirección');
  await m.click(m.copy.funds.modal.update);
  assert.equal(m.saves.length, 1);
  assert.equal(m.saves[0].fundType, 'EXTERNAL_MANAGED');
  assert.equal(m.saves[0].budgetLineId, '');
  assert.equal(m.saves[0].typeChangeReason, 'Cambio aprobado por dirección');
  assert.match(m.saves[0].typeChangeEffectiveDate, /^\d{4}-\d{2}-\d{2}$/);
});

test('a pending type change locks configuration and can be cancelled inside the edit modal', async () => {
  let cancellations = 0;
  const m = await modal({ initialFund: { id: '15', version: 8, name: 'Fondo interno', fundType: 'INTERNAL_COMPANY', currencyCode: 'MXN',
    unitId: 'u', businessId: 'b', responsibleUserId: 'r', createdByUserId: 'r', paymentAccountId: 'cash',
    limitAmount: 100, cutOffDay: 30, fundingMethods: [], spendingMethods: [], budgetId: 'b0', budgetLineId: 'b1', fundingSourceName: '',
    pendingTypeChangeId: '23', pendingFundType: 'EXTERNAL_MANAGED', pendingTypeEffectiveDate: '2026-09-12' },
    onCancelTypeChange: async () => { cancellations++; } });
  assert.equal(m.find('fieldset').props.disabled, true);
  assert.equal(m.button(m.copy.funds.modal.update).props.disabled, true);
  assert.ok(m.errors().includes(m.wizard.scheduled(m.copy.funds.modal.externalFund, '2026-09-12')));
  await m.click(m.wizard.cancelChange);
  assert.equal(cancellations, 1);
});

test('all eight locales expose localized progress and the same create flow', async () => {
  for (const code of ['es-MX', 'es-CO', 'en-CA', 'en-US', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    const m = await modal({ locale: code });
    assert.equal(m.tree().props.eyebrow, m.wizard.progress(1, 3));
    await internalReview(m);
    assert.equal(m.button(m.copy.funds.modal.submit).props.disabled, false);
    assert.equal(m.find('IndiceModalWizardStepper').props.steps.at(-1).label, m.wizard.steps.review.label);
  }
});

test('Enter follows step validation and navigation moves focus to the current step or its errors', async () => {
  const m = await modal(); let focused = ''; let prevented = false;
  const body = { scrollTop: 250 }; m.tree().props.bodyRef.current = body;
  m.find('h3').props.ref.current = { focus: () => { focused = 'heading'; } };
  m.find('div', node => Boolean(node.props.ref)).props.ref.current = { focus: () => { focused = 'validation'; } };
  m.find('form').props.onSubmit({ preventDefault: () => { prevented = true; } }); await m.flush();
  assert.equal(prevented, true); assert.equal(m.step(), 'details'); assert.equal(body.scrollTop, 0);
  assert.equal(focused, 'heading'); assert.equal(m.saves.length, 0);
  m.find('form').props.onSubmit({ preventDefault() {} }); await m.flush();
  assert.equal(m.step(), 'details'); assert.equal(focused, 'validation'); assert.equal(m.saves.length, 0);
});

test('all five supported currencies retain the configured denomination through final submission', async () => {
  for (const currency of ['MXN', 'CAD', 'COP', 'USD', 'BRL']) {
    const m = await modal({ budgetLines: [budget('native', currency)],
      paymentAccounts: [account('fund', currency), account('source', currency, 'bank')] });
    await internalReview(m); await m.click(m.copy.funds.modal.submit);
    assert.equal(m.saves[0].currencyCode, currency); assert.equal(m.saves[0].budgetLineId, 'native');
  }
});

async function externalIdentity() {
  const m = await modal();
  nodes(m.tree()).find(node => node.type === 'button' && text(node).includes(m.copy.funds.modal.externalFundDescription)).props.onClick();
  await m.flush(); await m.next(); await m.change(m.copy.funds.modal.name, 'Fondo externo'); await m.next();
  await m.change(m.copy.funds.modal.ownerName, 'Cliente');
  await m.change(m.copy.funds.modal.recipientEmail, 'cliente@example.test');
  return m;
}

test('multiple assets validate each row, retain Back edits and remove only the selected row', async () => {
  const m = await externalIdentity();
  for (const [index, name] of ['Casa', 'Vehículo', 'Barco'].entries()) {
    await m.click('Agregar activo');
    await m.change(m.copy.funds.modal.assetType, ['REAL_ESTATE', 'VEHICLE', 'VESSEL'][index], index);
    await m.change(m.copy.funds.modal.assetName, name, index);
    await m.change(m.copy.funds.modal.assetReference, `REF-${index + 1}`, index);
  }
  await m.click('Agregar activo'); await m.next();
  assert.equal(m.step(), 'identity'); assert.ok(m.errors().some(error => error.includes('Activo 4')));
  const remove = async index => {
    m.find('button', node => node.props['aria-label'] === `Quitar activo: Activo ${index}`).props.onClick(); await m.flush();
  };
  await remove(4); await remove(2);
  assert.equal(m.field(m.copy.funds.modal.assetName, 0).props.value, 'Casa');
  assert.equal(m.field(m.copy.funds.modal.assetName, 1).props.value, 'Barco');
  assert.equal(m.field(m.copy.funds.modal.assetReference, 1).props.value, 'REF-3');
  await m.back(); await m.next();
  assert.equal(m.field(m.copy.funds.modal.assetName, 1).props.value, 'Barco');
  await m.next();
  const values = nodes(m.tree()).filter(node => node.type === 'IndiceModalSummary').flatMap(node => node.props.items).map(item => text(item.value));
  assert.ok(values.includes('Casa') && values.includes('Barco') && values.includes('REF-3'));
  assert.ok(!values.includes('Vehículo'));
  await m.click(m.copy.funds.modal.submit);
  assert.deepEqual(m.saves[0].managedAssets.map(({ name }) => name), ['Casa', 'Barco']);
});

test('editing converts a legacy asset to a row and allows adding or clearing all current assets', async () => {
  const initialFund = { id: 'f', name: 'Fondo externo', fundType: 'EXTERNAL_MANAGED', currencyCode: 'MXN',
    unitId: 'u', businessId: 'b', responsibleUserId: 'r', createdByUserId: 'r', paymentAccountId: 'cash',
    limitAmount: 100, cutOffDay: 30, fundingMethods: ['TRANSFER'], spendingMethods: ['CASH'],
    fundingSourceName: 'Cliente', externalOwnerType: 'PERSON', externalOwnerRelationship: 'CLIENT',
    externalOwnerName: 'Cliente', statementRecipientEmail: 'cliente@example.test',
    managedAssetType: 'REAL_ESTATE', managedAssetName: 'Anterior', managedAssetReference: 'REF' };
  const m = await modal({ initialFund });
  assert.equal(m.field(m.copy.funds.modal.assetName).props.value, 'Anterior');
  await m.click('Agregar activo'); assert.equal(m.button(m.copy.funds.modal.update).props.disabled, true);
  await m.change(m.copy.funds.modal.assetType, 'VEHICLE', 1);
  await m.change(m.copy.funds.modal.assetName, 'Nuevo', 1);
  await m.click(m.copy.funds.modal.update);
  assert.deepEqual(m.saves[0].managedAssets.map(asset => asset.name), ['Anterior', 'Nuevo']);
  await m.click('Quitar activo'); await m.click('Quitar activo');
  await m.click(m.copy.funds.modal.update); assert.deepEqual(m.saves[1].managedAssets, []);
});

test('managed asset collection has a bounded size and explicit empty snapshots stay empty', async () => {
  const m = await externalIdentity();
  for (let i = 0; i < 50; i++) await m.click('Agregar activo');
  assert.equal(m.button('Agregar activo').props.disabled, true);
  await m.click('Quitar activo'); assert.equal(m.button('Agregar activo').props.disabled, false);
  const { getFundManagedAssets, getStatementManagedAssets } = load(resolve(root, 'utils/managedAssets.ts'));
  assert.deepEqual(getFundManagedAssets({ managedAssets: [], managedAssetName: 'Old' }), []);
  assert.deepEqual(getStatementManagedAssets({ managedAssetsSnapshot: [], managedAssetNameSnapshot: 'Old' }), []);
  assert.equal(getStatementManagedAssets({ managedAssetTypeSnapshot: 'VEHICLE', managedAssetNameSnapshot: 'Historical' })[0].name, 'Historical');
});

test('fund creation keeps funding origins out of configuration for both fund types', async () => {
  const internal = await modal(); await internal.next(); await internal.change(internal.copy.funds.modal.name, 'Interno'); await internal.next();
  assert.equal(internal.find('PettyCashField', node => node.props.label === internal.copy.funds.modal.sourceAccount), undefined);
  assert.ok(!text(internal.tree()).includes(internal.copy.funds.modal.fundingMethods));
  await internal.click(internal.copy.funds.modal.submit);
  assert.deepEqual(internal.saves[0].fundingMethods, []);
  assert.equal(internal.saves[0].fundingSourcePaymentAccountId, '');

  const external = await externalIdentity(); await external.next();
  assert.equal(external.find('PettyCashField', node => node.props.label === external.copy.funds.modal.sourceAccount), undefined);
  external.props.budgetLines = [budget('refresh')]; external.render(); await external.flush();
  await external.click(external.copy.funds.modal.submit);
  assert.equal(external.saves[0].fundingSourcePaymentAccountId, '');
  assert.equal(external.saves[0].fundType, 'EXTERNAL_MANAGED'); assert.equal(external.saves[0].budgetLineId, '');
});
