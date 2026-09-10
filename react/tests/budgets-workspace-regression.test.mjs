import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { resolve } from 'node:path';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';
const root=resolve('src/app/BasicModules/Expenses');
const load=(path,require=()=>({}))=>loadTypescript(resolve(root,path),require);
const period=load('Budgets/budgetPeriod.ts');
const copy=load('Budgets/budgetWorkspace.copy.ts');
const bulkCopy=loadTypescript(resolve(root,'../shared/financeBulkActions.copy.ts'),()=>({}));
const translations=load('translations/es-MX.ts',()=>({mergeFinanceTranslations:(_locale,copy)=>copy})).esMX;
function nodes(tree) {return Array.isArray(tree)?tree.flatMap(nodes):React.isValidElement(tree)?[tree,...nodes(tree.props.children),...nodes(tree.props.pagination),...nodes(tree.props.footer)]:[];}
const stub=new Proxy({}, {get:(_,key)=>key});

test('this month includes both month boundaries and excludes previous/next month, including leap February',()=>{
  const range=period.getBudgetPeriodRange('this_month','','',new Date(2026,8,9));
  assert.equal(period.isBudgetInPeriod(new Date(2026,8,1),range),true);
  assert.equal(period.isBudgetInPeriod(new Date(2026,8,30,23,59,59,999),range),true);
  assert.equal(period.isBudgetInPeriod(new Date(2026,7,31,23,59,59,999),range),false);
  assert.equal(period.isBudgetInPeriod(new Date(2026,9,1),range),false);
  const leap=period.getBudgetPeriodRange('this_month','','',new Date(2028,1,12));
  assert.equal(leap.end.getDate(),29);
  const next=period.getBudgetPeriodRange('next_month','','',new Date(2026,11,9));
  assert.equal(next.start.getFullYear(),2027);assert.equal(next.start.getMonth(),0);
});

test('the current month filters scheduled budget dates, not creation or payment dates, and survives workspace restoration',async()=>{
  const runtime=hookRuntime();let memory;
  const {useBudgetLogic}=load('Budgets/useBudgetLogic.ts',id=>id==='react'?runtime.hooks:id.endsWith('budgetPeriod')?period:{useWorkspaceNavigationMemory:props=>{memory=props;}});
  const now=new Date(),thisDate=new Date(now.getFullYear(),now.getMonth(),1),next=new Date(now.getFullYear(),now.getMonth()+1,1);
  const rows=[{id:'current',type:'budget',dueDate:thisDate,createdAt:new Date(2020,0,1),folio:'A',concept:'Renta',businessUnit:'1',business:'2'},
    {id:'next',type:'budget',dueDate:next,createdAt:thisDate,folio:'B',concept:'Renta',businessUnit:'1',business:'2'},
    {id:'expense',type:'expense',dueDate:thisDate,folio:'C',concept:'Renta',businessUnit:'1',business:'2'}];
  runtime.render(()=>useBudgetLogic({expenses:rows}));runtime.result.setFutureFilter('this_month');await runtime.flush();
  assert.deepEqual(runtime.result.filteredBudgetExpenses.map(row=>row.id),['current']);
  const saved=memory.state;memory.onRestore(saved);await runtime.flush();assert.equal(runtime.result.futureFilter,'this_month');
  memory.onRestore({...saved,futureFilter:'corrupt'});await runtime.flush();assert.equal(runtime.result.futureFilter,'next_month');
});

const row=(id,currency='MXN')=>({id:`budget-line-${id}`,version:0,folio:`BUD-${id}`,concept:`Línea ${id}`,dueDate:new Date(2026,8,id),createdAt:new Date(),currency,status:'ACTIVE',unitId:'1',businessUnit:'Uno',business:'Local',plannedAmount:100,committedAmount:0,actualExpenseAmount:30,availableAmount:70});
function tableSetup() {
  const runtime=hookRuntime();
  const selection=load('hooks/useExpenseRowSelection.ts',id=>id==='react'?runtime.hooks:stub);
  const pagination=loadTypescript(resolve(root,'../../hooks/useTablePagination.ts'),id=>id==='react'?runtime.hooks:stub);
  const config=load('Budgets/components/budgetLineTableConfig.ts');
  const {BudgetLinesTable}=load('Budgets/components/BudgetLinesTable.tsx',id=>{
    if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return jsx;
    if(id.endsWith('useExpenseRowSelection'))return selection;if(id.endsWith('useTablePagination'))return pagination;
    if(id.endsWith('useBudgetsTranslations'))return {useBudgetsTranslations:()=>translations,useBudgetsResolvedLocale:()=> 'es-MX'};
    if(id.endsWith('useWorkspaceNavigationMemory'))return {useWorkspaceNavigationMemory:()=>{}};
    if(id.endsWith('usePersistentColumnWidths'))return {usePersistentColumnWidths:()=>({columnWidths:config.budgetLineDefaultWidths,resizeColumn:()=>{}})};
    if(id.endsWith('budgetLineTableConfig'))return config;
    if(id.endsWith('IndiceTableEngine'))return {...stub,getIndiceTableMinimumWidth:()=>1200,IndiceTableShell:'IndiceTableShell',IndiceOperationalTable:'IndiceOperationalTable',IndiceTableColGroup:'IndiceTableColGroup',IndiceTableHeaderRow:'IndiceTableHeaderRow'};
    return stub;
  });
  const props={budgetLines:Array.from({length:12},(_,i)=>row(i+1)),columns:[{key:'folio',visible:true}],bulkOptions:{units:[],businesses:[],providers:[],accounts:[]},onBulkAction:async()=>{},onDeleteBudgetLine:()=>{},onEditBudgetLine:()=>{}};
  const render=()=>runtime.render(()=>BudgetLinesTable(props));return {runtime,props,render};
}

test('selection spans pages, totals receive all filtered rows and only selected rows, filters prune selection',async()=>{
  const view=tableSetup();let tree=view.render();
  nodes(tree).find(node=>node.type==='BudgetLineMobileCards').props.onSelectionChange('budget-line-1',true);
  await view.runtime.flush();tree=view.render();
  const pag=nodes(tree).find(node=>typeof node.type==='function' && node.type.name==='BudgetPagination').props.pagination;
  pag.onPageChange(2);await view.runtime.flush();tree=view.render();
  nodes(tree).find(node=>node.type==='BudgetLineMobileCards').props.onSelectionChange('budget-line-11',true);
  await view.runtime.flush();tree=view.render();
  const totals=nodes(tree).find(node=>node.type==='BudgetTableTotals').props;
  assert.equal(totals.rows.length,12);assert.deepEqual(totals.selectedRows.map(row=>row.id),['budget-line-1','budget-line-11']);
  assert.equal(nodes(tree).find(node=>node.type==='BudgetBulkActionsBar').props.rows.length,2);
  view.props.budgetLines=view.props.budgetLines.filter(row=>row.id==='budget-line-11');view.render();await view.runtime.flush();
  assert.deepEqual(nodes(view.render()).find(node=>node.type==='BudgetTableTotals').props.selectedRows.map(row=>row.id),['budget-line-11']);
});

test('bulk actions expose classification and explain the payment owner without invoking a fake payment mutation',()=>{
  const {BudgetBulkActionsBar}=load('Budgets/components/BudgetBulkActionsBar.tsx',id=>{
    if(id==='react/jsx-runtime')return jsx;if(id.endsWith('budgetWorkspace.copy'))return copy;if(id.endsWith('financeBulkActions.copy'))return bulkCopy;return stub;
  });
  const tree=BudgetBulkActionsBar({rows:[row(1)],options:{units:[],businesses:[{value:'2',label:'Local',unitId:'1'},{value:'3',label:'Otra',unitId:'9'}],accounts:[],providers:[]},locale:'es-MX',onClearSelection:()=>{},onApply:()=>{}});
  assert.deepEqual(tree.props.actions.map(item=>item.action),['DELETE','UNIT','BUSINESS','PROVIDER','ACCOUNTING_ACCOUNT','PAYMENT_ACCOUNT']);
  assert.equal(tree.props.actions.find(item=>item.action==='BUSINESS').options.length,1);
  assert.match(tree.props.actions.find(item=>item.action==='PAYMENT_ACCOUNT').blockedReason,/pagar el gasto/);
});

test('footer uses server totals across currencies, and errors expose retry instead of stale amounts',()=>{
  let query;let error=null;let retried=0;
  const runtime=hookRuntime();
  const {BudgetTableTotals}=load('Budgets/components/BudgetTableTotals.tsx',id=>{
    if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return jsx;
    if(id.endsWith('useBudgetsTranslations'))return {useBudgetsTranslations:()=>translations,useBudgetsResolvedLocale:()=> 'es-MX'};
    if(id.endsWith('BusinessCurrencyContext'))return {usePreferredBusinessCurrency:()=>({preferredCurrency:'MXN'})};
    if(id.endsWith('financeBulkActions.copy'))return bulkCopy;if(id.endsWith('budgetWorkspace.copy'))return copy;
    if(id.endsWith('budgetFormatting'))return {formatBudgetCurrency:(value,currency)=>`${value} ${currency}`};
    if(id.endsWith('kpiMonetaryApi'))return {useKpiMonetaryAggregates:queries=>{query=queries;return {loading:false,error,refresh:()=>retried++,data:Object.fromEntries(queries.map(q=>[q.key,{nativeTotals:[{amount:100,currency:'MXN'},{amount:30,currency:'USD'}]}]))};}};
    return stub;
  });
  const render=()=>runtime.render(()=>BudgetTableTotals({rows:[row(1),row(2,'USD')],selectedRows:[row(2,'USD')]}));
  let tree=render();assert.deepEqual(query[0].ids,['1','2']);assert.deepEqual(query[4].ids,['2']);
  assert.ok(nodes(tree).some(node=>typeof node.props.children==='string' && node.props.children.includes('100 MXN MXN / 30 USD USD')));
  error=Error('offline');tree=render();assert.equal(nodes(tree).filter(node=>node.props.role==='alert').length,1);
  nodes(tree).find(node=>node.type==='button').props.onClick();assert.equal(retried,1);
  assert.ok(nodes(tree).some(node=>node.props.children==='—'));
});

test('bulk API submits versions and one action for the selection, retaining returned authoritative rows',async()=>{
  let sent;
  const {budgetLinesService}=load('services/budget-lines.service.ts',id=>id.endsWith('apiClient')?{apiClient:async(path,request)=>{sent={path,...JSON.parse(request.body)};return {budgetLines:[{id:1,version:2}]};}}:
    id.endsWith('budget-line.adapter')?{getBudgetLineApiId:id=>Number(id.replace('budget-line-','')),toBudgetExpense:dto=>dto}:stub);
  const result=await budgetLinesService.applyBulkAction('PROVIDER',[row(1)],'42','');
  assert.equal(sent.path,'/api/v1/finance/budget-lines/bulk-actions');assert.deepEqual(sent.rows,[{id:1,expectedVersion:0}]);assert.equal(sent.targetId,42);assert.equal(result[0].version,2);
});
