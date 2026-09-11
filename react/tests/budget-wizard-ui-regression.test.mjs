import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

const root = resolve('src/app/BasicModules/Expenses');
const stub = new Proxy({}, { get: (_, name) => name });
const load = (path, resolver = () => stub) => loadTypescript(resolve(root, path), resolver);
const t = load('translations/es-MX.ts', () => ({ mergeFinanceTranslations: (_, copy) => copy })).esMX;
const catalog = load('Budgets/budgetTaxCatalog.ts');
const schedule = load('Budgets/budgetUtils.ts');
const drafts = load('Budgets/budgetDraftState.ts', id => id.endsWith('budgetTaxCatalog') ? catalog : stub);
const formatting = load('Budgets/budgetFormatting.ts');
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : React.isValidElement(tree)
  ? [tree, ...nodes(tree.props.children), ...nodes(tree.props.footer), ...nodes(tree.props.footerLeading)] : [];
const viewResolver = id => id === 'react/jsx-runtime' ? jsx : id.endsWith('budgetUtils') ? schedule
  : id.endsWith('budgetFormatting') ? formatting : id.endsWith('budgetTaxCatalog') ? catalog : stub;
const cost = load('components/modals/BudgetWizardCostStep.tsx', viewResolver);
const scheduleView = load('components/modals/BudgetWizardSchedule.tsx', viewResolver);

function wizard({ initial = {}, mode = 'create', onSubmit } = {}) {
  const runtime = hookRuntime(); let draft = {...drafts.createInitialBudgetDraftState('MXN'),...initial}; const calls=[];
  const { BudgetCreateModal } = load('components/modals/BudgetCreateModal.tsx', id => id === 'react' ? runtime.hooks
    : id.endsWith('useBudgetsTranslations') ? {useBudgetsTranslations:()=>t,useBudgetsResolvedLocale:()=> 'es-MX'} : viewResolver(id));
  const props = {mode,accountingAccountOptions:[{value:'1010',label:'Caja'}],unitOptions:[{value:'1',label:'Cancún'}],businessOptions:[{value:'11',label:'Local',unitId:'1'}],providers:[],onClose(){},
    onDraftChange:updates=>{draft={...draft,...updates};}, onSubmit:onSubmit || (async()=>calls.push({master:drafts.buildBudgetMasterDraft(draft),line:drafts.buildBudgetLineDraft(draft)}))};
  const all=()=>nodes(runtime.render(()=>BudgetCreateModal({...props,draft})));
  const node=type=>all().find(n=>n.type===type);
  return {runtime,all,node,calls,props,get draft(){return draft;},change:props.onDraftChange,
    submit:()=>node('form').props.onSubmit({preventDefault(){}}),
    get next(){return all().find(n=>n.type==='button'&&n.props.type==='submit');},
    get cost(){return nodes(cost.BudgetWizardCostStep(node('BudgetWizardCostStep').props));}};
}
const valid = {concept:'Renta',amount:'1160',budgetPeriodStart:'2026-09-10',budgetPeriodEnd:'2026-11-30'};

test('wizard gates dependent steps and explains missing values while keeping automatic context visible',async()=>{
  const ui=wizard();ui.all();ui.all();
  assert.equal(ui.draft.businessUnit,'1');assert.equal(ui.draft.business,'11');assert.equal(ui.draft.accountingAccount,'1010');
  assert.equal(ui.next.props.disabled,true);
  assert.match(ui.all().find(n=>n.props.role==='status').props.children,/Concepto.*Monto/);
  ui.node('IndiceModalWizardStepper').props.onStepSelect('review');assert.ok(ui.node('BudgetWizardCostStep'));
  assert.equal(ui.all().filter(n=>n.props.children===t.budgets.modal.back).length,0);
  ui.change({concept:'Renta',amount:'1160'});await ui.submit();assert.ok(ui.node('BudgetWizardScheduleStep'));
  assert.equal(ui.next.props.disabled,true);ui.change({budgetPeriodStart:'2026-09-10',budgetPeriodEnd:'2026-09-01'});
  assert.equal(ui.next.props.disabled,true);await ui.submit();assert.equal(ui.calls.length,0);
});

test('cost capture, note and account survive review/back; submit uses unchanged draft builders',async()=>{
  const ui=wizard();ui.all();ui.all();
  ui.cost.find(n=>n.type==='input'&&n.props.autoFocus).props.onChange({target:{value:'Renta local'}});
  ui.cost.find(n=>n.props.type==='number').props.onChange({target:{value:'1160'}});
  ui.cost.find(n=>n.type==='textarea').props.onChange({target:{value:'Contrato anual'}});
  ui.change({budgetPeriodStart:'2026-09-10',budgetPeriodEnd:'2026-11-30'});
  await ui.submit();await ui.submit();const snapshot=structuredClone(ui.draft);
  ui.node('BudgetWizardReview').props.onEdit('cost');assert.equal(ui.cost.find(n=>n.type==='textarea').props.value,'Contrato anual');
  assert.deepEqual(ui.draft,snapshot);await ui.submit();await ui.submit();await ui.submit();
  assert.equal(ui.calls.length,1);assert.deepEqual(ui.calls[0].master,drafts.buildBudgetMasterDraft(snapshot));
  assert.deepEqual(ui.calls[0].line,drafts.buildBudgetLineDraft(snapshot));
  assert.equal(ui.calls[0].master.name,'Renta local');assert.equal(ui.calls[0].line.total,1160);
});

test('failed save preserves review and all inputs; repeated submission while busy calls only once',async()=>{
  let reject,count=0;const ui=wizard({initial:valid,onSubmit:()=>{count++;return new Promise((_,r)=>{reject=r;});}});
  ui.all();ui.all();await ui.submit();await ui.submit();const before=structuredClone(ui.draft);
  const first=ui.submit();await ui.submit();assert.equal(count,1);assert.equal(ui.next.props.disabled,true);
  assert.equal(ui.node('fieldset').props.disabled,true);reject(new Error('Offline'));await first;
  assert.deepEqual(ui.draft,before);assert.ok(ui.node('BudgetWizardReview'));
  assert.equal(ui.node('IndiceModalValidation').props.messages[0],t.budgets.messages.createFailed);
  assert.equal(ui.next.props.disabled,false);
});

function taxUi(presentation='choice',currency='MXN') {
  const runtime=hookRuntime();let draft={...drafts.createInitialBudgetDraftState(currency),amount:'1160'};
  const {BudgetTaxControls}=load('components/modals/BudgetTaxControls.tsx', id=>id==='react'?runtime.hooks:id.endsWith('useBudgetsTranslations')?{useBudgetsTranslations:()=>t}:viewResolver(id));
  const change=updates=>{draft={...draft,...updates};};
  const all=()=>nodes(runtime.render(()=>BudgetTaxControls({draft,presentation,onDraftChange:change})));
  return {all,change,get draft(){all();all();return draft;},select:mode=>all().find(n=>n.props.type==='radio'&&n.props.value===mode).props.onChange()};
}
test('three tax choices use existing included/added calculations and preserve profile when toggling',()=>{
  const ui=taxUi();assert.equal(ui.all().filter(n=>n.props.type==='radio').length,3);
  ui.select('included');assert.equal(ui.draft.taxIncluded,true);assert.equal(ui.draft.taxes,'160.00');
  assert.equal(drafts.buildBudgetLineDraft(ui.draft).total,1160);assert.equal(drafts.buildBudgetLineDraft(ui.draft).amount,1000);
  const profile=ui.draft.taxProfileId;ui.select('added');assert.equal(ui.draft.taxProfileId,profile);
  assert.equal(ui.draft.taxes,'185.60');assert.equal(drafts.buildBudgetLineDraft(ui.draft).total,1345.6);
  ui.select('none');assert.equal(ui.draft.taxes,'');assert.equal(ui.draft.taxIncluded,false);assert.equal(drafts.buildBudgetLineDraft(ui.draft).total,1160);
  assert.equal(taxUi('checkboxes').all().filter(n=>n.props.type==='checkbox').length,2);
});
test('tax choice keeps manual rates across modes and updates available tax for a new currency',()=>{
  const ui=taxUi('choice','USD');ui.select('included');
  const manual=catalog.getBudgetTaxProfiles('US').find(p=>p.manualRate);
  assert.ok(manual);ui.change({taxProfileId:manual.id,taxRate:'7.25'});ui.select('added');
  assert.equal(ui.draft.taxRate,'7.25');assert.equal(ui.draft.taxProfileId,manual.id);assert.equal(ui.draft.taxes,'84.10');
  ui.change({budgetCurrencyCode:'CAD'});assert.equal(ui.draft.taxCountry,'CA');
  assert.ok(catalog.getBudgetTaxProfiles('CA').some(p=>p.id===ui.draft.taxProfileId));
});
test('quick periods and actual preview handle year changes and leap/month-end recurrences',()=>{
  const {getBudgetQuickPeriodEnd}=scheduleView;
  assert.equal(getBudgetQuickPeriodEnd('2026-11-30',3),'2027-01-31');
  assert.equal(getBudgetQuickPeriodEnd('2028-01-31',3),'2028-03-31');assert.equal(getBudgetQuickPeriodEnd('',3),'');
  const dates=schedule.getBudgetScheduleDates(new Date('2028-01-31T00:00:00'),new Date(getBudgetQuickPeriodEnd('2028-01-31',3)+'T00:00:00'),'monthly');
  assert.deepEqual(dates.map(d=>[d.getMonth()+1,d.getDate()]),[[1,31],[2,29],[3,31]]);
  const ui=wizard({initial:{...valid,budgetPeriodStart:'2028-01-31',budgetPeriodEnd:'2028-03-31'}});ui.all();ui.all();
  ui.node('IndiceModalWizardStepper').props.onStepSelect('schedule');
  assert.deepEqual(ui.node('BudgetWizardScheduleStep').props.dates,dates);assert.equal(ui.node('BudgetWizardScheduleStep').props.plannedTotal,3480);
});
test('edit review describes one existing line even with an extended period; it does not claim creation of a new series',()=>{
  const ui=wizard({initial:valid,mode:'edit'});ui.all();ui.all();ui.node('IndiceModalWizardStepper').props.onStepSelect('review');
  const review=ui.node('BudgetWizardReview');assert.equal(review.props.dates.length,1);assert.equal(review.props.plannedTotal,1160);assert.equal(review.props.mode,'edit');
  assert.equal(ui.next.props.children.at(-1),t.budgets.modal.finishEdit);
});
