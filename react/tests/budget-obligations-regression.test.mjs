import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

const root = resolve('src/app/BasicModules/Expenses');
function pure(path) {
  return loadTypescript(path, id => {
    const target = resolve(dirname(path), id);
    const file = [target + '.ts', target + '/index.ts'].find(existsSync);
    if (!file) throw Error(`Unexpected dependency: ${id}`);
    return pure(file);
  });
}
const dates = pure(resolve(root, 'utils/expenseDates.ts'));
const schedule = pure(resolve(root, 'Budgets/budgetUtils.ts'));
const adapter = pure(resolve(root, 'adapters/budget-line.adapter.ts'));
const expenseAdapter = pure(resolve(root, 'adapters/expense.adapter.ts'));
const filters = pure(resolve(root, 'utils/expenseFilters.ts'));

test('monthly schedules clamp short months and restore the original day, including leap years and year rollover', () => {
  const months = (year, month, day) => schedule.getBudgetScheduleDates(new Date(year, month, day), new Date(year + 1, month, day), 'monthly').map(dates.formatExpenseDate);
  assert.deepEqual(months(2026, 0, 31).slice(0, 4), ['2026-01-31','2026-02-28','2026-03-31','2026-04-30']);
  assert.deepEqual(months(2028, 0, 31).slice(0, 3), ['2028-01-31','2028-02-29','2028-03-31']);
  assert.deepEqual(months(2026, 11, 31).slice(0, 3), ['2026-12-31','2027-01-31','2027-02-28']);
  assert.equal(dates.formatExpenseDate(schedule.addFrequencyInterval(new Date(2028, 1, 29), 'annual', 1)), '2029-02-28');
});

test('budget dates retain the chosen calendar day when saving from positive and negative UTC offsets', () => {
  const original = process.env.TZ;
  try {
    for (const zone of ['Pacific/Kiritimati','America/Mexico_City','America/Toronto']) {
      process.env.TZ = zone;
      const entry = schedule.generateProjectedBudgetEntries({businessUnit:'',business:'',concept:'Rent',currency:'MXN',duration:2,frequency:'monthly',startDate:new Date(2026,8,1),total:116,amount:100,taxes:16})[0];
      const payload = adapter.toBudgetLineApiRequest({...entry,budgetId:'10'});
      assert.equal(payload.customFields.dueDate, '2026-09-01');
      assert.equal(payload.customFields.startDate, '2026-09-01');
      assert.equal(dates.formatExpenseDate(adapter.toBudgetExpense({id:1,companyId:1,budgetId:10,name:'Rent',plannedAmount:116,status:'ACTIVE',currencyCode:'MXN',customFields:payload.customFields}).dueDate), '2026-09-01');
    }
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});

test('generated payables show partial payment while retaining overdue balance and payment history', () => {
  const dto = {id:42,companyId:1,budgetLineId:10,folio:'CXP-2026-001',concept:'Rent',totalAmount:116,subtotalAmount:100,taxAmount:16,paidAmount:40,balanceAmount:76,currencyCode:'MXN',expenseDate:'2026-08-20',dueDate:'2026-08-20',paymentDate:'2026-08-21',status:'PARTIALLY_PAID',paymentStatus:'OVERDUE',customFields:{entryType:'payable',legacyStatus:'pending'}};
  const expense = expenseAdapter.toExpense(dto);
  assert.equal(expense.type, 'payable');
  assert.equal(expense.status, 'partial');
  assert.equal(filters.canPayExpense(expense), true);
  assert.equal(filters.getEffectiveExpenseStatus(expense, new Date(2026,8,10)), 'partial');
  assert.equal(filters.isExpenseEffectivelyOverdue(expense, new Date(2026,8,10)), true);
  for (const statusFilter of ['partial', 'overdue', 'pending_and_overdue']) {
    assert.deepEqual(filters.filterExpenses([expense], {
      searchTerm:'', periodFilter:'this_month', businessUnitFilter:'all', businessFilter:'all',
      providerFilter:'all', statusFilter,
    }, new Date(2026,8,10)).map(row => row.id), ['42']);
  }
  assert.equal(filters.getExpenseBalance(expense), 76);
  assert.equal(dates.formatExpenseDate(expense.date), '2026-08-20');
  const paid = expenseAdapter.toExpense({...dto,status:'PAID',paymentStatus:'PAID',paidAmount:116,balanceAmount:0,paymentDate:'2026-09-10'});
  assert.equal(paid.status, 'paid'); assert.equal(filters.canPayExpense(paid), false);
  assert.equal(filters.getExpenseBalance(paid), 0);
  assert.equal(dates.formatExpenseDate(paid.date), '2026-08-20');
});

test('sync submits no client authority or money fields and uses the protected POST', async () => {
  let sent;
  const module = loadTypescript(resolve(root,'services/budget-lines.service.ts'), id => id.endsWith('apiClient')
    ? {apiClient:async(path, request)=>{sent={path,request};return {enabled:true,generated:1,reviews:[]};}} : {});
  assert.equal((await module.budgetLinesService.synchronizeObligations()).generated, 1);
  assert.equal(sent.path, '/api/v1/finance/expenses/budget-obligations/synchronize');
  assert.deepEqual(sent.request, {method:'POST'});
});

function moduleSetup() {
  const runtime = hookRuntime(), calls = [];
  let activeTab = 'budgets', fail = false;
  const services = {
    budgetLinesService:{
      synchronizeObligations: async()=>{calls.push('sync');if(fail) throw Error('offline');return {enabled:true,generated:1,reviews:[{budgetLineId:9,name:'Old rent',reason:'HISTORICAL_RECONCILIATION'}]};},
      getBudgetExpenses:async()=>{calls.push('budgets');return [{id:'budget-line-1',type:'budget'}];},
    },
    expensesService:{getExpenses:async()=>{calls.push('expenses');return [{id:'1',type:'payable'}];}},
    providersService:{getProviderRecords:async()=>[]},toFinanceApiErrorMessage:error=>error.message,
  };
  const stub = new Proxy({}, {get:(_,key)=>key});
  const {default:Module} = loadTypescript(resolve(root,'ExpensesModule.tsx'), id => {
    if(id==='react')return {...runtime.hooks,lazy:()=> 'LazyTab',Suspense:'Suspense'};
    if(id==='react/jsx-runtime')return jsx;
    if(id==='./services')return services;
    if(id.endsWith('/api/auth'))return {authApi:{getSessionOrNull:async()=>({}),me:async()=>({})}};
    if(id.endsWith('useRoutedModuleTab'))return {useRoutedModuleTab:()=>({activeTab,isTabLoading:false,setActiveTab:next=>{activeTab=next;}})};
    if(id.endsWith('useAuthorizationRevision'))return {useAuthorizationRevision:()=>0};
    if(id.endsWith('useExpensesModuleTranslations'))return {useExpensesModuleTranslations:()=>({locale:'es-MX',module:{tabs:{}}})};
    if(id.endsWith('expenses.mock'))return {mockExpenses:[]};
    if(id.endsWith('providerRecords.mock'))return {mockProviderRecords:[]};
    if(id.endsWith('budgetUtils'))return {generateProjectedBudgetEntries:()=>[]};
    if(id.endsWith('apiClient'))return {ApiClientError:class extends Error{}};
    return stub;
  });
  const render=()=>runtime.render(()=>Module({onNavigate:()=>{}}));
  const flush=async()=>{for(let i=0;i<4;i++){await runtime.flush();await new Promise(resolve=>setImmediate(resolve));}};
  return {runtime,calls,render,flush,tab:value=>{activeTab=value;},fail:()=>{fail=true;}};
}
function nodes(tree) {return Array.isArray(tree)?tree.flatMap(nodes):React.isValidElement(tree)?[tree,...nodes(tree.props.children)]:[];}

test('returning from budgets awaits generation before reloading real expenses and shows reconciliation details', async()=>{
  const view=moduleSetup();view.render();await view.flush();assert.equal(view.calls.includes('sync'),false);
  view.calls.length=0;view.tab('expenses');view.render();await view.flush();
  assert.ok(view.calls.indexOf('sync') < view.calls.indexOf('expenses'));
  const tree=view.render();
  const notice=nodes(tree).find(n=>n.type==='BudgetObligationNotice');
  assert.equal(notice.props.reviews[0].budgetLineId,9);
  const content=nodes(tree).find(n=>n.type==='LazyTab');
  assert.deepEqual(content.props.expenses.map(e=>e.id),['1','budget-line-1']);
});

test('a failed synchronization remains visible and does not hide existing expenses', async()=>{
  const view=moduleSetup();view.fail();view.tab('expenses');view.render();await view.flush();
  const tree=view.render();
  assert.equal(nodes(tree).find(n=>n.type==='BudgetObligationNotice').props.error,'offline');
  assert.equal(nodes(tree).find(n=>n.type==='LazyTab').props.expenses[0].id,'1');
});
