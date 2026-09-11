import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';
const root = resolve('src/app/BasicModules/Expenses');
const stub = new Proxy({}, { get: (_, name) => name });
const load = (path, resolver = () => stub) => loadTypescript(resolve(root, path), resolver);
const t = load('translations/es-MX.ts', () => ({ mergeFinanceTranslations: (_, copy) => copy })).esMX;
const dates = load('utils/expenseDates.ts');
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : React.isValidElement(tree) ? [tree, ...nodes(tree.props.children), ...nodes(tree.props.footer)] : [];
function modal(overrides = {}) {
  const runtime = hookRuntime(); const calls = [];
  const { PayableAccountDialog } = load('components/modals/PayableAccountDialog.tsx', id => {
    if (id === 'react') return runtime.hooks;
    if (id === 'react/jsx-runtime') return jsx;
    if (id.endsWith('useExpensesTranslations')) return { useExpensesTranslations: () => t };
    if (id.endsWith('budgetTaxCatalog')) return load('Budgets/budgetTaxCatalog.ts');
    if (id.endsWith('financeCurrencyOptions')) return { DEFAULT_FINANCE_CURRENCY: 'MXN', financeCurrencySelectOptions: ['MXN','USD','CAD','COP','BRL'].map(value => ({value, label:value})) };
    if (id.endsWith('expenses.utils')) return { formatCurrency: (amount, currency) => `${amount} ${currency}` };
    return stub;
  });
  const props = { open: true, currency: 'MXN', isSubmitting: false, providers: [{id:'1', name:'Supplier', status:'active'}], onOpenChange(){}, onSubmit: async value => { calls.push(value); }, ...overrides };
  const render = () => runtime.render(() => PayableAccountDialog(props));
  return { runtime, props, calls, all: () => nodes(render()), submit: () => nodes(render()).find(n => n.type === 'form').props.onSubmit({preventDefault(){}}) };
}
function fill(ui, amount = '69.99') {
  ui.all().find(n => n.type === 'QuickProviderField').props.onChange('1');
  ui.all().find(n => n.props.autoFocus).props.onChange({target:{value:'Servicio'}});
  ui.all().find(n => n.props.type === 'number').props.onChange({target:{value:amount}});
  ui.all().find(n => n.props.type === 'date').props.onChange({target:{value:'2026-10-15'}});
}
const save = ui => ui.all().find(n => n.type === 'button' && n.props.type === 'submit');
test('registration date is automatic at submission, even after midnight; only due date is editable', async () => {
  const RealDate = Date; let now = new RealDate(2026,8,10,23,59);
  globalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [now.getTime()])); } };
  try {
    const ui = modal(); fill(ui);
    assert.equal(ui.all().filter(n => n.props.type === 'date').length, 1);
    now = new RealDate(2026,8,11,0,1);
    await ui.submit();
    assert.equal(ui.calls[0].expenseDate, '2026-09-11'); assert.equal(ui.calls[0].dueDate, '2026-10-15');
    assert.equal(ui.calls[0].taxes, 0);
  } finally { globalThis.Date = RealDate; }
});
test('required fields, inactive providers, invalid dates and fractional cents block submission', async () => {
  const ui = modal();
  assert.equal(save(ui).props.disabled, true); assert.match(ui.all().find(n => n.props.role === 'status').props.children, /Proveedor.*Concepto.*Monto.*vencimiento/);
  fill(ui); assert.equal(save(ui).props.disabled, false);
  ui.props.providers[0].status = 'inactive'; await ui.submit(); assert.equal(ui.calls.length, 0);
  ui.props.providers[0].status = 'active';
  ui.all().find(n => n.props.type === 'date').props.onChange({target:{value:'2026-02-30'}});
  await ui.submit(); assert.equal(ui.calls.length, 0);
  fill(ui, '0.009'); assert.equal(save(ui).props.disabled, true);
});
test('due shortcuts roll over months and keep the registration date separate', async () => {
  const ui = modal(); fill(ui);
  for (const days of [0,7,15,30]) {
    const button = ui.all().find(n => n.type === 'button' && n.props.children === (days ? t.expenses.payableAccount.dueInDays(days) : t.expenses.payableAccount.dueToday));
    button.props.onClick(); const expected = new Date(); expected.setDate(expected.getDate() + days);
    assert.equal(ui.all().find(n => n.props.type === 'date').props.value, dates.formatExpenseDate(expected));
  }
});
test('included and added tax totals are in exact cents and use the selected currency immediately', async () => {
  for (const currency of ['MXN','USD','CAD','COP','BRL']) for (const included of [true,false]) {
    const ui = modal({ currency }); fill(ui);
    ui.all().find(n => n.type === 'BudgetTaxControls').props.onDraftChange({taxEnabled:true, taxIncluded:included, taxRate:'16', taxes:'999.999'});
    await ui.submit(); const value = ui.calls[0];
    assert.equal(value.currency, currency);
    assert.equal(Math.round(value.amount*100) + Math.round(value.taxes*100), Math.round(value.total*100));
    for (const amount of [value.amount,value.taxes,value.total]) assert.match(String(amount), /^\d+(\.\d{1,2})?$/);
    if (included) assert.equal(value.total,69.99);
    if (currency === 'MXN' && included) { assert.equal(value.amount,60.34); assert.equal(value.taxes,9.65); }
  }
});
test('a failed save retains the draft and displays the error; rapid submission calls only once', async () => {
  let reject; let count = 0;
  const ui = modal({onSubmit: () => {count++; return new Promise((_,r) => {reject=r;});}}); fill(ui);
  const handler = ui.all().find(n => n.type === 'form').props.onSubmit;
  const first = handler({preventDefault(){}}); await handler({preventDefault(){}});
  assert.equal(count,1); assert.equal(save(ui).props.disabled,true); assert.equal(ui.all().find(n => n.type === 'IndiceModalFrame').props.busy,true);
  reject(new Error('No se pudo guardar.')); await first; await ui.runtime.flush();
  assert.ok(ui.all().some(n => n.type === 'IndiceModalValidation' && n.props.messages.includes('No se pudo guardar.')));
  assert.equal(ui.all().find(n => n.props.type === 'number').props.value,'69.99'); assert.equal(save(ui).props.disabled,false);
});
// Execute the actual workspace handlers with their API and state boundaries controlled.
function workspaceHandler(name, next, locals) {
  const source = readFileSync(resolve(root,'Expenses/Expenses.tsx'),'utf8');
  const body = source.slice(source.indexOf(`  const ${name} =`), source.indexOf(`  const ${next} =`));
  const js = ts.transpileModule(body + `\nreturn ${name};`, {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  return new Function(...Object.keys(locals),js)(...Object.values(locals));
}
test('workspace surfaces create errors to the modal and inserts only the persisted payable', async () => {
  let reject = true, rows = [], closed = false, message;
  const handler = workspaceHandler('handlePayableAccountSubmit','handleQuickProviderCreate', {
    providers:[{id:'1',name:'Supplier'}], currentUser:{id:'7'}, AUTO_PAYABLE_FOLIO:'AUTO-CXP',mockExpenses:[{category:{name:'Expense'}}],t,
    expensesService:{ createPayableAccount: async draft => { if(reject) throw new Error('Offline'); return {...draft,id:'55'}; },getExpenseById:async()=>null },
    expenseAttachmentsService:{upload:()=>{}}, isBackendId:()=>true,setIsPayableAccountSubmitting(){},setExpenses:fn=>{rows=fn(rows);},
    setIsPayableAccountModalOpen:value=>{closed=!value;},setFailureToastMessage:value=>{message=value;},setSuccessToastMessage(){},toFinanceApiErrorMessage:error=>error.message,
  });
  const ui=modal({onSubmit:handler});fill(ui);await ui.submit();
  assert.equal(rows.length,0);assert.equal(closed,false);assert.equal(message,'Offline');
  assert.ok(ui.all().some(n=>n.type==='IndiceModalValidation'&&n.props.messages.includes('Offline')));
  reject=false;await ui.submit();assert.equal(rows.length,1);assert.equal(rows[0].id,'55');assert.equal(rows[0].status,'pending');assert.equal(rows[0].amountPaid,0);assert.equal(closed,true);
});
test('failed quick provider creation never adds or selects a phantom provider', async () => {
  let changes=0;
  const handler=workspaceHandler('handleQuickProviderCreate','requestDeleteExpense',{
    providers:[],providerRecords:[],t,isBackendId:()=>true,
    createQuickProviderRecord:()=>({id:'local-only',name:'Supplier'}),providersService:{createProvider:async()=>{throw new Error('Rejected');}},
    onProvidersChange:()=>{changes++;},toExpenseProvider:value=>value,setSuccessToastMessage(){},setFailureToastMessage(){},toFinanceApiErrorMessage:error=>error.message,
  });
  await assert.rejects(()=>handler('Supplier'),/Rejected/);assert.equal(changes,0);
});
