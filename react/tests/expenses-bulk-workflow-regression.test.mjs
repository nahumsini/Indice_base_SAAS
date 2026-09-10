import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { resolve } from 'node:path';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

const root = resolve('src/app/BasicModules/Expenses');
const pure = path => loadTypescript(resolve(root, path), () => ({}));
const copy = pure('utils/expenseWorkflow.copy.ts');
const filters = pure('utils/expenseFilters.ts');
const dateInput = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
function nodes(tree) { return Array.isArray(tree) ? tree.flatMap(nodes) : React.isValidElement(tree) ? [tree, ...nodes(tree.props.children), ...nodes(tree.props.footer)] : []; }
function text(tree) { return Array.isArray(tree) ? tree.map(text).join('') : React.isValidElement(tree) ? text(tree.props.children) : typeof tree === 'string' ? tree : ''; }
const expense = overrides => ({ id:'1', version:0, backendStatus:'APPROVED', total:116, amountPaid:16, currency:'MXN', date:new Date(2026,0,1), type:'real', ...overrides });
const account = overrides => ({ id:'10', name:'Bank', currency:'MXN', isActive:true, backendType:'BANK', ...overrides });
function setup(name, overrides={}) {
  const runtime=hookRuntime(), calls=[]; let closed=0;
  const component = loadTypescript(resolve(root, `components/modals/${name}.tsx`), id => {
    if (id==='react') return runtime.hooks;
    if (id==='react/jsx-runtime') return jsx;
    if (id.endsWith('expenseWorkflow.copy')) return copy;
    if (id.endsWith('expenseFilters')) return filters;
    if (id.endsWith('expenseBulkInput')) return pure('utils/expenseBulkInput.ts');
    if (id.endsWith('budgetTaxCatalog')) return pure('Budgets/budgetTaxCatalog.ts');
    if (id.endsWith('useExpensesTranslations')) return { useExpensesResolvedLocale:()=> 'es-MX' };
    if (id.endsWith('expenseDates')) return { formatExpenseDate:dateInput };
    if (id.endsWith('finance-api.errors')) return { toFinanceApiErrorMessage:error => error.message };
    return new Proxy({}, {get:(_,key)=>key});
  })[name];
  const props=name==='ExpenseBulkStatusModal' ? {
    rows:[expense()], paymentAccounts:[account()], locale:'es-MX', onApply: async change=>calls.push(change), onClose:()=>closed++, ...overrides,
  } : { open:true, isSaving:false, preferredCurrency:'MXN', accountingAccounts:[{value:'20',label:'6000 - Expenses'}], paymentAccounts:[{value:'10',label:'Bank',currency:'MXN'}],
    providers:[], editableExpenses:[], lockedExpenseCount:0, onCreate:async (...args)=>calls.push(args), onUpdate:async (...args)=>calls.push(args), onOpenChange:open=>{if(!open)closed++;}, ...overrides };
  const render=()=>runtime.render(()=>component(props));
  render();render();
  const field=label=>nodes(render()).find(node=>(node.props['aria-label']===label || node.props.label===label));
  const button=()=>nodes(render()).find(node=>node.type==='Button' && (text(node)==='Aplicar a la selección' || /^Importar \d/.test(text(node))));
  return {runtime,render,field,button,calls,props,closed:()=>closed};
}
const paste=(view,value)=>nodes(view.render()).find(node=>node.type==='td' && node.props.onPaste).props.onPaste({clipboardData:{getData:()=>value},preventDefault(){}});

test('paid spreadsheet import accepts optional accounts and tax, preserving dates and gross totals', async()=>{
  const view=setup('ExpenseBulkIntegrationModal');
  paste(view,'15/08/2026\tExpense A\t116\tBank\t6000\tsi\n15/08/2026\tExpense B\t232');
  assert.equal(view.button().props.disabled,false);
  assert.ok(nodes(view.render()).filter(node=>node.type==='th').map(text).at(-1).startsWith('Incluye impuesto'));
  view.button().props.onClick(); await view.runtime.flush();
  const [rows,key]=view.calls[0]; assert.ok(key);
  assert.equal(rows[0].paid,true);assert.equal(rows[0].total,116);assert.equal(rows[0].taxIncluded,true);assert.equal(rows[0].taxRate,0.16);
  assert.equal(rows[1].total,232);assert.equal(rows[1].taxIncluded,false);assert.equal(rows[1].taxRate,0);
  assert.equal(rows[1].paid,true);assert.equal(rows[1].date,'2026-08-15');
  assert.equal(rows[1].paymentAccountId,undefined);assert.equal(rows[1].accountingAccountId,undefined);
});

test('header controls fill 35 entered rows, leave blank rows unused and allow individual overrides', async()=>{
  const view=setup('ExpenseBulkIntegrationModal');
  paste(view,Array.from({length:35},(_,i)=>`15/08/2026\tExpense ${i}\t50`).join('\n'));
  view.field('Cuenta de pago para todas las filas').props.onChange('10');
  view.field('Cuenta contable para todas las filas').props.onChange('20');
  view.field('Incluye impuesto en todas las filas capturadas').props.onChange({target:{checked:true}});
  assert.equal(view.field('Incluye impuesto en todas las filas capturadas').props.checked,true);
  view.field('Cuenta de pago, fila 2').props.onChange('');
  view.field('Cuenta contable, fila 2').props.onChange('');
  view.field('Incluye impuesto, 2').props.onChange({target:{checked:false}});
  assert.equal(view.field('Incluye impuesto en todas las filas capturadas').props['aria-checked'],'mixed');
  view.button().props.onClick();await view.runtime.flush();
  const rows=view.calls[0][0];assert.equal(rows.length,35);
  rows.forEach((row,i)=>{
    assert.equal(row.total,50);assert.equal(row.paid,true);
    assert.equal(row.paymentAccountId,i===1?undefined:'10');
    assert.equal(row.accountingAccountId,i===1?undefined:'20');
    assert.equal(row.taxIncluded,i!==1);
  });
});

test('header defaults work before pasting and explicit spreadsheet accounts and tax override them', async()=>{
  const view=setup('ExpenseBulkIntegrationModal');
  view.field('Cuenta de pago para todas las filas').props.onChange('10');
  view.field('Cuenta contable para todas las filas').props.onChange('20');
  view.field('Incluye impuesto en todas las filas capturadas').props.onChange({target:{checked:true}});
  assert.equal(view.button().props.disabled,true); // Defaults never create empty expenses.
  view.field('Fecha, fila 3').props.onChange({target:{value:'19/08/2026'}});
  paste(view,'15/08/2026\tDefault row\t50\n15/08/2026\tExplicit unassigned\t50\t\t\t0');
  view.field('Concepto, fila 3').props.onChange({target:{value:'Typed row'}});
  view.field('Monto (MXN), fila 3').props.onChange({target:{value:'50'}});
  view.button().props.onClick();await view.runtime.flush();
  const rows=view.calls[0][0];assert.equal(rows.length,3);
  for(const i of [0,2]){
    assert.equal(rows[i].paymentAccountId,'10');assert.equal(rows[i].accountingAccountId,'20');assert.equal(rows[i].taxIncluded,true);
  }
  assert.equal(rows[1].paymentAccountId,undefined);assert.equal(rows[1].accountingAccountId,undefined);assert.equal(rows[1].taxIncluded,false);
});

test('all-tax checkbox can clear every row and accounts can be cleared in one operation', async()=>{
  const view=setup('ExpenseBulkIntegrationModal');
  paste(view,'15/08/2026\tA\t50\tBank\t6000\tsi\n15/08/2026\tB\t50\tBank\t6000\tsi');
  view.field('Incluye impuesto en todas las filas capturadas').props.onChange({target:{checked:false}});
  view.field('Cuenta de pago para todas las filas').props.onChange('');
  view.field('Cuenta contable para todas las filas').props.onChange('');
  view.button().props.onClick();await view.runtime.flush();
  assert.equal(view.calls[0][0].length,2);
  view.calls[0][0].forEach(row=>{assert.equal(row.taxIncluded,false);assert.equal(row.taxRate,0);assert.equal(row.paymentAccountId,undefined);assert.equal(row.accountingAccountId,undefined);});
});

test('an explicitly invalid payment account still blocks import; header choices follow batch currency',()=>{
  const view=setup('ExpenseBulkIntegrationModal',{paymentAccounts:[{value:'10',label:'Bank',currency:'MXN'},{value:'11',label:'US bank',currency:'USD'}]});
  assert.deepEqual(view.field('Cuenta de pago para todas las filas').props.options.map(x=>x.value),['10']);
  paste(view,'15/08/2026\tInvalid account\t50\tUS bank');
  assert.equal(view.button().props.disabled,true);
  view.field('Cuenta de pago para todas las filas').props.onChange('10');
  assert.equal(view.button().props.disabled,false);
});

test('bulk fill is disabled while saving and resets when capture is cleared',()=>{
  const view=setup('ExpenseBulkIntegrationModal');
  view.field('Cuenta de pago para todas las filas').props.onChange('10');
  view.field('Incluye impuesto en todas las filas capturadas').props.onChange({target:{checked:true}});
  view.props.isSaving=true;
  for(const label of ['Cuenta de pago para todas las filas','Cuenta contable para todas las filas','Incluye impuesto en todas las filas capturadas'])assert.equal(view.field(label).props.disabled,true);
  view.props.isSaving=false;
  nodes(view.render()).find(node=>node.type==='Button' && text(node)==='Limpiar tabla').props.onClick();
  assert.equal(view.field('Cuenta de pago para todas las filas').props.value,'');
  assert.equal(view.field('Incluye impuesto en todas las filas capturadas').props.checked,false);
});

test('pending import uses a separate due date and does not require a payment account', async()=>{
  const view=setup('ExpenseBulkIntegrationModal');
  view.field('Importar gastos como').props.onChange({target:{value:'pending'}});
  view.field('Fecha de vencimiento').props.onChange({target:{value:'2026-12-31'}});
  paste(view,'15/08/2026\tPending\t116');
  assert.equal(view.button().props.disabled,false);view.button().props.onClick();await view.runtime.flush();
  const row=view.calls[0][0][0];assert.equal(row.paid,false);assert.equal(row.dueDate,'2026-12-31');assert.equal(row.date,'2026-08-15');
});

test('currency selects the tax profile; manual tax must be explicit and an open batch keeps its currency', async()=>{
  const view=setup('ExpenseBulkIntegrationModal',{preferredCurrency:'USD',paymentAccounts:[{value:'10',label:'US bank',currency:'USD'}]});
  paste(view,'15/08/2026\tUS expense\t108\tUS bank\t6000\t1');
  assert.equal(view.button().props.disabled,true);
  view.field('Tasa de impuesto (%)').props.onChange({target:{value:'8'}});
  view.props.preferredCurrency='MXN';
  assert.equal(view.button().props.disabled,false);view.button().props.onClick();await view.runtime.flush();
  assert.equal(view.calls[0][0][0].currency,'USD');assert.equal(view.calls[0][0][0].taxRate,0.08);
});

test('future expense dates require pending import instead of recording a future payment',()=>{
  const view=setup('ExpenseBulkIntegrationModal');
  const future=new Date();future.setDate(future.getDate()+2);
  paste(view,`${dateInput(future)}\tFuture\t116\tBank`);
  assert.equal(view.button().props.disabled,true);
  view.field('Importar gastos como').props.onChange({target:{value:'pending'}});
  assert.equal(view.button().props.disabled,false);
});

test('import retry preserves rows, tax choices and key, and double submission sends only one request', async()=>{
  let fail;const calls=[];
  const view=setup('ExpenseBulkIntegrationModal',{onCreate:(...args)=>{calls.push(args);return new Promise((_,reject)=>fail=reject);}});
  paste(view,'15/08/2026\tRetained\t116\tBank\t6000\tx');
  const button=view.button();button.props.onClick();button.props.onClick();assert.equal(calls.length,1);
  fail(Error('Temporary failure'));await view.runtime.flush();assert.equal(view.closed(),0);
  view.button().props.onClick();assert.deepEqual(calls[0],calls[1]);fail(Error('Again'));await view.runtime.flush();
});

test('bulk paid status asks for a same-currency account, confirms payment date and preserves request identity on failure',async()=>{
  let reject;const calls=[];
  const view=setup('ExpenseBulkStatusModal',{onApply:change=>{calls.push(change);return new Promise((_,fail)=>reject=fail);}});
  assert.equal(view.button().props.disabled,true);
  view.field('Cuenta de pago').props.onChange('10');assert.equal(view.button().props.disabled,false);
  const button=view.button();button.props.onClick();button.props.onClick();assert.equal(calls.length,1);
  reject(Error('Balance changed'));await view.runtime.flush();assert.equal(view.closed(),0);
  view.button().props.onClick();assert.deepEqual(calls[0],calls[1]);assert.equal(calls[0].target,'PAID');assert.equal(calls[0].paymentAccountId,'10');
  reject(Error('Refresh required'));await view.runtime.flush();
});

test('pending and overdue require coherent due dates and never send a payment account',async()=>{
  for(const [target,offset] of [['PENDING',1],['OVERDUE',-1]]){
    const view=setup('ExpenseBulkStatusModal');view.field('Nuevo estatus').props.onChange({target:{value:target}});
    const date=new Date();date.setDate(date.getDate()+offset);
    view.field('Fecha de vencimiento').props.onChange({target:{value:dateInput(date)}});
    assert.equal(view.button().props.disabled,false);view.button().props.onClick();await view.runtime.flush();
    assert.equal(view.calls[0].target,target);assert.equal(view.calls[0].paymentAccountId,undefined);
  }
});

test('funds, paid records and mixed-currency payments stay protected',()=>{
  for(const rows of [[expense({originFund:{id:'3'}})],[expense({backendStatus:'PAID',amountPaid:116})],[expense(),expense({id:'2',currency:'USD'})]]){
    const view=setup('ExpenseBulkStatusModal',{rows});view.field('Cuenta de pago').props.onChange('10');assert.equal(view.button().props.disabled,true);
  }
});

test('quick payment accepts overdue and partial expenses and excludes settled or fund-owned records',()=>{
  assert.equal(filters.canPayExpense(expense({status:'overdue'})),true);
  assert.equal(filters.canPayExpense(expense({backendStatus:'PARTIALLY_PAID'})),true);
  for(const overrides of [{backendStatus:'PAID',amountPaid:116},{backendStatus:'CANCELLED'},{backendStatus:'CLOSED'},{originFund:{id:'2'}},{type:'budget'}])
    assert.equal(filters.canPayExpense(expense(overrides)),false);
});
