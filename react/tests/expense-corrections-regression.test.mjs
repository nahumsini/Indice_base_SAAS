import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { resolve } from 'node:path';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';
const root = resolve('src/app/BasicModules/Expenses');
const load = (path, resolver = () => ({})) => loadTypescript(resolve(root, path), resolver);
const stub = new Proxy({}, { get: (_, key) => key });
const translations = load('translations/es-MX.ts', () => ({ mergeFinanceTranslations: (_locale, copy) => copy })).esMX;
const tax = load('Budgets/budgetTaxCatalog.ts');
const currency = { DEFAULT_FINANCE_CURRENCY: 'MXN', financeCurrencySelectOptions: ['MXN','USD','CAD','COP','BRL'].map(value=>({value,label:value})), isFinanceCurrencyOption: value=>['MXN','USD','CAD','COP','BRL'].includes(value) };
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : React.isValidElement(tree) ? [tree, ...nodes(tree.props.children), ...nodes(tree.props.footer)] : [];
const paidExpense = {id:'55',version:2,folio:'EXP-2026-055',concept:'Old text',amount:100,taxes:16,total:116,amountPaid:116,currency:'MXN',date:new Date(2026,7,15),dueDate:new Date(2026,7,15),paymentDate:new Date(2026,7,15),status:'paid',backendStatus:'PAID',type:'real',taxIncluded:true,taxMode:'manual'};
function formSetup(editingExpense = null, onSubmitExpense = async () => {}) {
  const runtime = hookRuntime();
  const {ExpenseFormModal} = load('components/modals/ExpenseFormModal.tsx', id => {
    if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return jsx;
    if(id.endsWith('useExpensesTranslations'))return {useExpensesTranslations:()=>translations};
    if(id.endsWith('budgetTaxCatalog'))return tax;if(id.endsWith('financeCurrencyOptions'))return currency;
    if(id.endsWith('expenses.utils'))return {formatCurrency:(amount,currency)=>`${amount} ${currency}`};
    if(id.endsWith('finance-api.errors'))return {toFinanceApiErrorMessage:error=>error.message};
    return stub;
  });
  const props = {editingExpense,onSubmitExpense,onClose:()=>{},paymentAccounts:[
    {id:'1',name:'Bank',currency:'MXN',isActive:true},{id:'2',name:'USD',currency:'USD',isActive:true},
    {id:'3',name:'Fund',currency:'MXN',isActive:true,linkedFundId:'4'}]};
  const render=()=>runtime.render(()=>ExpenseFormModal(props));
  const field=(name,label)=>nodes(render()).find(node=>node.type.name===name&&(!label||node.props.label===label));
  return {runtime,render,field};
}
test('individual capture submits paid with its August payment date, optional bank and double-submit protection',async()=>{
  let calls=[],finish;
  const view=formSetup(null,async values=>{calls.push(values);await new Promise(resolve=>{finish=resolve;});});
  view.field('DateInput').props.onChange('2026-08-15');view.field('TextInput').props.onChange('Rent');view.field('MoneyInput').props.onChange('50');
  assert.deepEqual(view.field('SelectInput',translations.paymentAccounts.headerTitle).props.options.map(o=>o.value),['','1']);
  const form=nodes(view.render()).find(node=>node.type==='form');const saving=form.props.onSubmit({preventDefault(){}});
  await form.props.onSubmit({preventDefault(){}});assert.equal(calls.length,1);
  assert.equal(calls[0].status,'paid');assert.equal(calls[0].expenseDate,'2026-08-15');assert.equal(calls[0].paymentDate,'2026-08-15');
  assert.equal(calls[0].paymentAccountId,'');assert.equal(calls[0].total,50);assert.equal(calls[0].taxes,0);finish();await saving;
});
test('paid correction retains tax breakdown and exposes save errors without discarding fields',async()=>{
  let values;const view=formSetup(paidExpense,async submitted=>{values=submitted;throw new Error('Total below payments');});
  assert.equal(view.field('SelectInput',translations.expenses.modal.currency).props.disabled,true);
  view.field('TextInput').props.onChange('Corrected rent');await nodes(view.render()).find(node=>node.type==='form').props.onSubmit({preventDefault(){}});
  await view.runtime.flush();assert.equal(values.concept,'Corrected rent');assert.equal(values.total,116);assert.equal(values.amount,100);assert.equal(values.taxes,16);
  assert.ok(nodes(view.render()).some(node=>node.type==='IndiceModalValidation'&&node.props.messages.includes('Total below payments')));
});
test('edit and deletion eligibility are separate; paid deletion is allowed while source editing stays protected',()=>{
  const {canEditExpense,canDeleteExpense,canPayExpense}=load('utils/expenseFilters.ts');
  assert.equal(canEditExpense(paidExpense),true);assert.equal(canDeleteExpense(paidExpense),true);
  const partial={...paidExpense,total:150,backendStatus:'PARTIALLY_PAID',status:'partial'};
  assert.equal(canEditExpense(partial),true);assert.equal(canPayExpense(partial),true);
  for(const change of [{originFund:{id:'1'}},{accountingPosted:true},{purchaseOrderId:'2'},{backendStatus:'CLOSED'}])assert.equal(canEditExpense({...paidExpense,...change}),false);
});
test('paid capture preserves explicit tax and native dates; corrections send version to their owner',async()=>{
  const calls=[];
  const adapter=load('adapters/expense.adapter.ts',id=>{
    if(id.endsWith('categories.data'))return load('data/categories.data.ts');
    if(id.endsWith('finance-status.types'))return load('types/finance-status.types.ts');
    if(id.endsWith('adapter.utils'))return load('adapters/adapter.utils.ts');if(id.endsWith('expenseDates'))return load('utils/expenseDates.ts');
    if(id.endsWith('financeCurrencyOptions'))return currency;return {};
  });
  const {expensesService}=load('services/expenses.service.ts',id=>{
    if(id.endsWith('apiClient'))return {apiClient:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return {expenses:[{id:55}]};}};
    if(id.endsWith('expense.adapter'))return {...adapter,toExpense:x=>x};return {};
  });
  await expensesService.createExpense(paidExpense,[],'stable-capture-key');
  const paid=calls[0];assert.match(paid.url,/\/import$/);assert.equal(paid.body.requestKey,'stable-capture-key');
  const row=paid.body.expenses[0];assert.equal(row.settleOnCreate,true);assert.equal(row.paymentAccountId,null);
  assert.equal(row.expenseDate,'2026-08-15');assert.equal(row.customFields.paymentDate,'2026-08-15');assert.equal(row.taxAmount,16);assert.equal(row.customFields.bulkTaxIncluded,undefined);
  await expensesService.updateExpense(paidExpense);assert.match(calls[1].url,/\/55\/corrections$/);assert.equal(calls[1].body.expectedVersion,2);
});
