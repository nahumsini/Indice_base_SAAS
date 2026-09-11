import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';
const root=resolve('src/app/BasicModules/Expenses');
const load=(path,resolver=()=>({}))=>loadTypescript(resolve(root,path),resolver);
const stub=new Proxy({},{get:(_,key)=>key});
const t=load('translations/es-MX.ts',()=>({mergeFinanceTranslations:(_locale,copy)=>copy})).esMX;
const filters=load('utils/expenseFilters.ts');
const copy=load('Expenses/components/expenseDetail.copy.ts').getExpenseDetailCopy('es-MX');
const hooksCopy={useExpensesTranslations:()=>t,useExpensesResolvedLocale:()=> 'es-MX'};
const nodes=tree=>Array.isArray(tree)?tree.flatMap(nodes):React.isValidElement(tree)?[tree,...nodes(tree.props.children),...nodes(tree.props.footer)]:[];
const row={id:'45',version:3,folio:'EXP-2026-045',concept:'Renta de oficina',description:'Servicio de agosto',amount:100,taxes:16,total:116,amountPaid:116,currency:'MXN',date:new Date(2026,7,15),paymentDate:new Date(2026,7,15),status:'paid',backendStatus:'PAID',type:'real',category:{name:'Gastos',emoji:''},business:'999',businessUnit:'888',accountingAccount:'777',providerName:'Proveedor de ejemplo',paymentMethod:'transfer'};

test('all ordinary statuses expose removal, with audited and received-order exceptions',()=>{
  for(const status of ['DRAFT','PENDING_APPROVAL','APPROVED','PARTIALLY_PAID','PAID','CANCELLED','REJECTED'])assert.equal(filters.canDeleteExpense({...row,backendStatus:status}),true,status);
  assert.equal(filters.canDeleteExpense({...row,accountingPosted:true}),true);
  for(const override of [{status:'audited'},{backendStatus:'CLOSED'},{auditStatus:'AUDITED'},{originFund:{id:'1'}},{purchaseOrderId:'5',purchaseOrderReceived:true},{purchaseOrderId:'5'}])assert.equal(filters.canDeleteExpense({...row,...override}),false);
  assert.equal(filters.canDeleteExpense({...row,purchaseOrderId:'5',purchaseOrderReceived:false}),true);
});
test('row actions route view, pay, edit and delete without duplicate or print',()=>{
  const calls=[];
  const {ExpenseRowActions}=load('components/table/ExpenseRowActions.tsx',id=>id==='react/jsx-runtime'?jsx:id.endsWith('useExpensesTranslations')?hooksCopy:id.endsWith('expenseDetail.copy')?{getExpenseDetailCopy:()=>copy}:stub);
  const tree=ExpenseRowActions({expenseId:row.id,onView:()=>calls.push('view'),onStartEdit:()=>calls.push('edit'),onDelete:id=>calls.push(`delete:${id}`),onMarkPaid:id=>calls.push(`pay:${id}`),showAudit:false,showRecordPayment:false});
  const buttons=nodes(tree).filter(node=>node.type.name==='ActionButton');
  assert.deepEqual(buttons.map(node=>node.props.label),[copy.title,t.expenses.rowActions.markPaid,t.common.edit,t.expenses.rowActions.deleteExpense]);
  buttons.forEach(button=>button.props.onClick());assert.deepEqual(calls,['view','pay:45','edit','delete:45']);
});
test('delete confirmation requires a reason and preserves it after an API error',async()=>{
  const runtime=hookRuntime();let submitted=[];
  const {ExpenseDeleteModal}=load('components/modals/ExpenseDeleteModal.tsx',id=>{
    if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return jsx;
    if(id.endsWith('useExpensesTranslations'))return hooksCopy;
    if(id.endsWith('financeBulkActions.copy'))return {getFinanceBulkCopy:()=>({reason:'Motivo'})};
    if(id.endsWith('finance-api.errors'))return {toFinanceApiErrorMessage:e=>e.message};return stub;
  });
  const render=()=>runtime.render(()=>ExpenseDeleteModal({expenses:[row],onClose(){},onDelete:async reason=>{submitted.push(reason);throw new Error('El gasto cambió');}}));
  const deletion=()=>nodes(render()).find(n=>n.type==='button'&&n.props.className.includes('bg-red-600'));
  assert.equal(deletion().props.disabled,true);
  nodes(render()).find(n=>n.type==='textarea').props.onChange({target:{value:'Captura duplicada'}});
  assert.equal(deletion().props.disabled,false);deletion().props.onClick();await runtime.flush();
  assert.deepEqual(submitted,['Captura duplicada']);assert.equal(nodes(render()).find(n=>n.type==='textarea').props.value,'Captura duplicada');
  assert.ok(nodes(render()).some(n=>n.type==='IndiceModalValidation'&&n.props.messages.includes('El gasto cambió')));
});
test('payable modal retains chosen transaction currency and captured fields when preference changes',async()=>{
  const runtime=hookRuntime();let submitted;
  const {PayableAccountDialog}=load('components/modals/PayableAccountDialog.tsx',id=>{
    if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return jsx;
    if(id.endsWith('useExpensesTranslations'))return hooksCopy;
    if(id.endsWith('budgetTaxCatalog'))return load('Budgets/budgetTaxCatalog.ts');
    if(id.endsWith('financeCurrencyOptions'))return {DEFAULT_FINANCE_CURRENCY:'MXN',financeCurrencySelectOptions:['MXN','USD','CAD'].map(value=>({value,label:value}))};
    if(id.endsWith('expenses.utils'))return {formatCurrency:(amount,currency)=>`${amount} ${currency}`};return stub;
  });
  const props={open:true,currency:'MXN',isSubmitting:false,providers:[{id:'1',name:'Supplier'}],onOpenChange(){},onSubmit:async values=>{submitted=values;}};
  const render=()=>runtime.render(()=>PayableAccountDialog(props));
  nodes(render()).find(n=>n.type==='QuickProviderField').props.onChange('1');
  nodes(render()).find(n=>n.props.autoFocus).props.onChange({target:{value:'Agosto'}});
  nodes(render()).find(n=>n.type==='input'&&n.props.type==='number').props.onChange({target:{value:'50'}});
  const dates=nodes(render()).filter(n=>n.type==='input'&&n.props.type==='date');assert.equal(dates.length,1);dates[0].props.onChange({target:{value:'2026-09-30'}});
  nodes(render()).find(n=>n.type==='select').props.onChange({target:{value:'USD'}});
  props.currency='CAD';render();await runtime.flush();
  await nodes(render()).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
  assert.equal(submitted.currency,'USD');assert.equal(submitted.concept,'Agosto');const today=new Date();assert.equal(submitted.expenseDate,`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`);assert.equal(submitted.dueDate,'2026-09-30');assert.equal(submitted.total,50);
  assert.ok(nodes(render()).filter(n=>n.type==='details').length>=2);
});
const require=createRequire(import.meta.url),cache=new Map();
function realModule(file){
  if(cache.has(file))return cache.get(file);
  const exports=loadTypescript(file,id=>{
    if(id.endsWith('documentPrintFeedback'))return {notifyDocumentPrintFailure(){}};
    if(!id.startsWith('.'))return require(id);
    const path=resolve(dirname(file),id);return realModule(existsSync(path+'.ts')?path+'.ts':path+'.tsx');
  });cache.set(file,exports);return exports;
}
test('voucher uses purchase-order layout, native dates and amounts, resolved account names',()=>{
  const {buildExpenseVoucherDefinition}=realModule(resolve(root,'utils/expensePrintDocument.ts'));
  const {buildStandardDocumentPdf}=realModule(resolve(root,'../shared/print/standardDocumentPdf.ts'));
  for(const currency of ['MXN','USD','CAD','COP','BRL']){
    const definition=buildExpenseVoucherDefinition({expense:{...row,currency},locale:'es-MX',t,context:{business:'Sucursal Centro',businessUnit:'Monterrey',accountingAccount:'6000 - Rentas',paymentAccount:'Banco de prueba'}});
    assert.equal(definition.contract.category,'transaction-document');assert.equal(definition.contract.pageSize,'letter');
    assert.equal(definition.tables[0].rows.length,1);assert.equal(definition.tables[0].columns.length,4);assert.equal(definition.signatures.length,3);
    assert.equal(definition.metrics[0].label,`Total (${currency})`);assert.ok(definition.metadata.some(field=>field.value==='6000 - Rentas'));
    assert.ok(definition.metadata.some(field=>field.value?.includes('15 ago 2026')));assert.ok(!definition.metadata.some(field=>['999','888','777'].includes(field.value)));
    definition.generatedAt=new Date(2026,8,10,10);const pdf=buildStandardDocumentPdf(definition);assert.equal(pdf.getNumberOfPages(),1);assert.ok(pdf.output().startsWith('%PDF-'));
    if(currency==='MXN'&&process.env.EXPENSE_PDF_QA_OUTPUT)writeFileSync(process.env.EXPENSE_PDF_QA_OUTPUT,Buffer.from(pdf.output('arraybuffer')));
  }
});
