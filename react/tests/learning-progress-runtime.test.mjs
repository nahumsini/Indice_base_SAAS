import { createTypeScriptLoader } from './helpers/loadTypeScript.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {LearningProgressStore} from '../src/app/learningMode/learningProgressStore.ts';
import {learningChapters} from '../src/app/learningMode/curriculum.ts';
import {MODULE_TAB_SCOPE_CATALOG} from '../src/app/access/tabScopeCatalog.ts';
import {readFileSync} from 'node:fs';

const deferred=()=>{let resolve,reject;const promise=new Promise((ok,no)=>{resolve=ok;reject=no;});return {promise,resolve,reject};};
const snapshot=id=>({catalogVersion:'test',currentChapterId:id,stages:[],chapters:[],nextMission:null});
const change=id=>({chapterId:id,version:2,operation:'understood'});

test('late company responses cannot populate the new company or the old cache',async()=>{
  let scope='1:1';const first=deferred();let reads=0;
  const store=new LearningProgressStore({get:()=>++reads===1?first.promise:Promise.resolve(snapshot('new')),update:async()=>snapshot('unused')},()=>scope);
  store.subscribe('es-MX',()=>{});const pending=store.refresh('es-MX');
  scope='2:1';store.subscribe('es-MX',()=>{});await store.refresh('es-MX');
  first.resolve(snapshot('old'));await pending;
  assert.equal(store.snapshot('es-MX').progress.currentChapterId,'new');
  scope='1:1';assert.equal(store.snapshot('es-MX').progress,null);
});

test('queued old-company intent is discarded before transport',async()=>{
  let scope='1:1';const gate=deferred(),started=deferred();const calls=[];
  const store=new LearningProgressStore({get:async()=>snapshot('read'),update:async(id)=>{calls.push(id);started.resolve();return gate.promise;}},()=>scope);
  const first=store.update(change('first'),'es-MX');await started.promise;
  const queued=store.update(change('second'),'es-MX');scope='2:1';store.subscribe('es-MX',()=>{});
  gate.resolve(snapshot('first'));await Promise.all([first,queued]);
  assert.deepEqual(calls,['first']);assert.equal(store.snapshot('es-MX').progress,null);
});

test('writes serialize and a stale GET cannot overwrite a confirmed declaration',async()=>{
  const read=deferred(),first=deferred(),started=deferred();const calls=[];
  const store=new LearningProgressStore({get:()=>read.promise,update:async id=>{calls.push(id);started.resolve();return id==='first'?first.promise:snapshot(id);}},()=> '1:1');
  const refresh=store.refresh('en-CA');const a=store.update(change('first'),'en-CA');
  const b=store.update(change('second'),'en-CA');await started.promise;
  assert.deepEqual(calls,['first']);first.resolve(snapshot('first'));await Promise.all([a,b]);
  read.resolve(snapshot('stale'));await refresh;
  assert.deepEqual(calls,['first','second']);assert.equal(store.snapshot('en-CA').progress.currentChapterId,'second');
});

test('failed declaration remains retryable instead of becoming local completion',async()=>{
  let attempts=0;
  const store=new LearningProgressStore({get:async()=>snapshot('pending'),update:async id=>{if(++attempts===1)throw new Error('offline');return snapshot(id);}},()=> '1:1');
  await store.refresh('es-MX');await store.update(change('done'),'es-MX');
  assert.equal(store.snapshot('es-MX').error,true);assert.equal(store.snapshot('es-MX').progress.currentChapterId,'pending');
  await store.retry('es-MX');assert.equal(attempts,2);assert.equal(store.snapshot('es-MX').error,false);
  assert.equal(store.snapshot('es-MX').progress.currentChapterId,'done');
});

test('unauthenticated state never sends a progress request',async()=>{
  const store=new LearningProgressStore({get:()=>assert.fail('read'),update:()=>assert.fail('write')},()=>null);
  await store.refresh('es-MX');await store.update(change('x'),'es-MX');assert.equal(store.snapshot('es-MX').ready,false);
});

test('a later successful chapter does not discard an earlier failed declaration',async()=>{
  let firstAttempts=0;
  const store=new LearningProgressStore({get:async()=>snapshot('pending'),update:async id=>{if(id==='first'&&++firstAttempts===1)throw new Error('offline');return snapshot(id);}},()=> '1:1');
  await store.update(change('first'),'es-MX');await store.update(change('second'),'es-MX');
  assert.equal(store.snapshot('es-MX').error,true);
  await store.refresh('es-MX');assert.equal(store.snapshot('es-MX').error,true);
  await store.retry('es-MX');assert.equal(firstAttempts,2);assert.equal(store.snapshot('es-MX').error,false);
});

test('all current chapters have bilingual workflows, stable IDs and explicit POS exceptions',()=>{
  const expected = Object.values(MODULE_TAB_SCOPE_CATALOG).flatMap(scope => Object.keys(scope.tabs).map(tab => `${scope.moduleSlug}.${tab}`));
  assert.deepEqual(learningChapters.map(c => c.id).sort(), expected.sort());
  assert.equal(new Set(learningChapters.map(c => c.id)).size, learningChapters.length);
  for (const [module, tabs] of Object.entries({control_minutas:['meetings','agreements','indicators'],scheduling:['calendar','reservations','clients','events','indicators','configuration']})) {
    assert.deepEqual(learningChapters.filter(c=>c.module===module).map(c=>c.tab),tabs);
    assert.ok(learningChapters.filter(c=>c.module===module).every(c=>c.evidenceTools.length===0));
  }
  for(const c of learningChapters){assert.equal(c.steps.length,3);for(const step of c.steps){assert.equal(step.length,2);assert.ok(step.every(text=>text.length>20));}}
  const sale=learningChapters.find(c=>c.id==='pos.sale');assert.equal(sale.companion,false);assert.equal(sale.journey,false);
  assert.ok(learningChapters.filter(c=>c.module==='config_center').every(c=>!c.companion));
  assert.ok(learningChapters.find(c=>c.id==='receivables.kpis').steps[0][0].length>20);
});

test('navigation to a later stage does not claim earlier stages completed',()=>{
  const source=readFileSync(new URL('../src/app/Dashboard/operationalJourney.ts',import.meta.url),'utf8');
  const body=source.match(/export function resolveOperationalJourneyStatus\([\s\S]*?\n}\n/)[0];
  const fn=Function('stageIndex','currentStep',body.slice(body.indexOf(' {')+2,-2));
  assert.equal(fn(0,5),'pending');assert.equal(fn(5,5),'active');
});

test('beginner examples have complete localized steps, feedback and exact existing routes', async () => {
  const { getLearningPracticeCopy, learningPracticeRoutes, learningStagePractices } = createTypeScriptLoader()(new URL('../src/app/learningMode/practiceExamples.ts', import.meta.url).pathname);
  for (const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']) {
    for (const id of ['company', 'team', 'tasks', 'expenses', 'products', 'indicators']) {
      const copy = getLearningPracticeCopy(locale, id);
      for (const key of ['title','purpose','see','do','check','question','correct','incorrect','correctFeedback','incorrectFeedback','openLabel']) assert.ok(copy[key]?.trim(), `${locale}/${id}/${key}`);
      for (const key of ['see','do','check','notice','question','summary']) assert.ok(copy.labels[key]?.trim(), `${locale}/${key}`);
      assert.notEqual(copy.correct, copy.incorrect);
    }
  }
  assert.deepEqual({...learningStagePractices}, {company_setup:'company',human_resources:'team',operations:'tasks',finance:'expenses',commercial:'products',analytics:'indicators'});
  assert.deepEqual({...learningPracticeRoutes.company}, {page:'home-panel',tab:'business-structure'});
  assert.deepEqual({...learningPracticeRoutes.team}, {page:'human-resources',tab:'collaborators'});
  assert.deepEqual({...learningPracticeRoutes.products}, {page:'inventory',tab:'products'});
  assert.deepEqual({...learningPracticeRoutes.indicators}, {page:'kpis',tab:'kpis'});
  assert.deepEqual({...learningPracticeRoutes.tasks}, {page:'processes-tasks',tab:'calendar'});
  assert.deepEqual({...learningPracticeRoutes.expenses}, {page:'expenses',tab:'expenses'});
  assert.match(getLearningPracticeCopy('es-MX','expenses').check, /no necesitas registrar un pago/);
  const source = readFileSync(new URL('../src/app/learningMode/components/LearningPracticeExample.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /learningApi|markUnderstood|authApi|apiClient|fetch\(/);
});

test('six practices resolve the whole selected business case in every locale', () => {
  const load = createTypeScriptLoader();
  const { getLearningPracticeCopy } = load(new URL('../src/app/learningMode/practiceExamples.ts', import.meta.url).pathname);
  const { getPracticeCaseValues } = load(new URL('../src/app/learningMode/practiceCases.ts', import.meta.url).pathname);
  for (const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']) {
    for (const [character, owner, currency] of [['emily','Emily','CAD'],['juanito','Juanito','MXN'],['camila','Camila','COP']]) {
      const values = getPracticeCaseValues(locale, character);
      for (const id of ['company','team','tasks','expenses','products','indicators']) {
        const copy = getLearningPracticeCopy(locale, id, character);
        const text = Object.entries(copy).filter(([key]) => key !== 'labels').map(([,value]) => value).join(' ');
        assert.doesNotMatch(text, /\{\w+\}/, `${locale}/${character}/${id} unresolved token`);
        for (const other of ['Emily','Juanito','Camila'].filter(name => name !== owner)) assert.ok(!text.includes(other), `${locale}/${character}/${id} mixed owner ${other}`);
        assert.ok(copy.see.includes(owner), `${locale}/${character}/${id} owner`);
        if (id === 'tasks' || id === 'team') assert.ok(copy.see.includes(values.worker));
        if (id === 'expenses') { assert.ok(copy.see.includes(values.purchase)); assert.ok(copy.see.includes(values.expenseAmount)); assert.ok(copy.question.includes(owner)); }
        if (id === 'products') { assert.ok(copy.see.includes(values.product)); assert.ok(copy.see.includes(values.unitPrice)); assert.ok(copy.question.includes(values.unitPrice)); assert.ok(copy.correctFeedback.includes(values.unitPrice)); }
        if (id === 'company') assert.ok(copy.correct.includes(values.company));
        if (id === 'team') assert.equal(copy.correct, values.role);
        if (id === 'indicators') { assert.ok(copy.see.includes(values.company)); assert.ok(copy.see.includes(values.purchase)); assert.notEqual(copy.correct, copy.incorrect); }
      }
      for (const amount of ['expenseAmount','unitPrice','salesFirst','salesSecond','difference']) assert.ok(values[amount].startsWith(currency+' '));
    }
  }
  for (const id of ['company','team','tasks','expenses','products','indicators']) {
    assert.deepEqual(getLearningPracticeCopy('es-MX', id, null), getLearningPracticeCopy('es-MX', id, 'emily'));
    assert.deepEqual(getLearningPracticeCopy('es-MX', id, 'unknown'), getLearningPracticeCopy('es-MX', id, 'emily'));
  }
  assert.equal(getLearningPracticeCopy('es-MX','products','camila').see.includes('filtro de aceite'),true);
  assert.equal(getLearningPracticeCopy('es-MX','products','juanito').see.includes('arroz de 1 kg'),true);
});

test('beginner module presents one activity at a time and keeps both views reachable', async () => {
  const { hookRuntime } = await import('./helpers/hook-runtime.mjs');
  const runtime = hookRuntime();
  const jsx = (type, props) => ({type,props});
  const load = createTypeScriptLoader({
    react: runtime.hooks,
    'react/jsx-runtime': {jsx, jsxs:jsx, Fragment:'fragment'},
    '../../shared/context': {useLanguage:()=>({currentLanguage:{code:'es-MX'}})},
    '../../components/ui/button': {Button:'button'},
  });
  const { LearningGuideActivities } = load(new URL('../src/app/learningMode/components/LearningGuideActivities.tsx', import.meta.url).pathname);
  function nodes(tree) { if (!tree || typeof tree !== 'object') return []; return [tree,...[tree.props?.children].flat(Infinity).flatMap(nodes)]; }
  runtime.render(()=>LearningGuideActivities({introduction:'fictional-practice',children:'real-tools'}));
  const text=()=>JSON.stringify(runtime.result);
  assert.match(text(),/fictional-practice/);assert.doesNotMatch(text(),/real-tools/);
  nodes(runtime.result).find(n=>n.type==='button'&&n.props.children==='Herramientas de la pestaña').props.onClick();
  await runtime.flush();assert.match(text(),/real-tools/);assert.doesNotMatch(text(),/fictional-practice/);
  nodes(runtime.result).find(n=>n.type==='button'&&n.props.children==='Ejemplo práctico').props.onClick();
  await runtime.flush();assert.match(text(),/fictional-practice/);assert.doesNotMatch(text(),/real-tools/);
  const standalone=hookRuntime();
  const plainLoad=createTypeScriptLoader({react:standalone.hooks,'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'../../shared/context':{useLanguage:()=>({currentLanguage:{code:'es-MX'}})},'../../components/ui/button':{Button:'button'}});
  const Plain=plainLoad(new URL('../src/app/learningMode/components/LearningGuideActivities.tsx',import.meta.url).pathname).LearningGuideActivities;
  standalone.render(()=>Plain({children:'existing-guide'}));
  assert.match(JSON.stringify(standalone.result),/existing-guide/);assert.doesNotMatch(JSON.stringify(standalone.result),/Herramientas de la pestaña/);
});

test('Matrices practice follows visible areas and sources instead of assuming a missing value is no stock', () => {
  const { getLearningPracticeCopy }=createTypeScriptLoader()(new URL('../src/app/learningMode/practiceExamples.ts',import.meta.url).pathname);
  const copy=getLearningPracticeCopy('es-MX','indicators','camila');
  assert.match(copy.do,/Matrices/);assert.match(copy.do,/Diagnóstico/);assert.match(copy.do,/Fuentes/);
  assert.match(copy.correctFeedback,/Primero revisa los datos/);assert.match(copy.incorrectFeedback,/no prueba que falten productos/);
});

test('remaining basic modules offer localized read-only practices with coherent cash arithmetic', () => {
  const load=createTypeScriptLoader();
  const {getLearningPracticeCopy,learningPracticeRoutes}=load(new URL('../src/app/learningMode/practiceExamples.ts',import.meta.url).pathname);
  const {getPracticeCaseValues}=load(new URL('../src/app/learningMode/practiceCases.ts',import.meta.url).pathname);
  const {beginnerWorkflowSummary}=load(new URL('../src/app/learningMode/beginnerWorkflowSteps.ts',import.meta.url).pathname);
  const number=value=>Number(value.replace(/[^0-9]/g,''));
  for(const locale of ['es-MX','es-CO','en-CA','en-US','fr-CA','pt-BR','ko-CA','zh-CA']) {
    for(const character of ['emily','juanito','camila']) {
      const values=getPracticeCaseValues(locale,character);
      assert.equal(number(values.fundAmount)-number(values.expenseAmount),number(values.remainingAmount));
      assert.equal(number(values.saleAmount)-number(values.paymentAmount),number(values.debtAmount));
      assert.equal(number(values.expectedAmount)-number(values.countedAmount),number(values.cashDifference));
      for(const id of ['pettyCash','receivables','posRegisters','posClosing']) {
        const copy=getLearningPracticeCopy(locale,id,character);
        for(const field of ['title','purpose','see','do','check','question','correct','incorrect','correctFeedback','incorrectFeedback','openLabel']) assert.ok(copy[field]?.trim(),`${locale}/${character}/${id}/${field}`);
        const text=Object.entries(copy).filter(([key])=>key!=='labels').map(([,value])=>value).join(' ');
        assert.doesNotMatch(text,/\{\w+\}/);
        assert.ok(copy.see.includes(values.company));
        for(const other of ['Emily','Juanito','Camila'].filter(owner=>owner!==values.owner)) assert.ok(!text.includes(other));
        assert.notEqual(copy.correct,copy.incorrect);
      }
      const account=getLearningPracticeCopy(locale,'receivables',character);
      assert.equal(account.correct,values.debtAmount);assert.equal(account.incorrect,values.saleAmount);
    }
  }
  for(const [module,tabs] of Object.entries({petty_cash:['cash','control','statements','kpis'],receivables:['credit-customers','credit-sales','accounts-receivable','payments','kpis'],pos:['cajas','kiosks','clientes','cortes','kpis']})) {
    for(const tab of tabs)for(const locale of ['es-MX','en-CA'])for(let i=0;i<3;i++)assert.ok(beginnerWorkflowSummary(`${module}.${tab}`,i,locale)?.length>20);
  }
  assert.equal(beginnerWorkflowSummary('pos.sale',0,'es-MX'),undefined);
  assert.deepEqual({...learningPracticeRoutes.posClosing},{page:'point-of-sale',tab:'cortes'});
  assert.deepEqual({...learningPracticeRoutes.posRegisters},{page:'point-of-sale',tab:'cajas'});
  assert.match(getLearningPracticeCopy('es-MX','pettyCash','camila').do,/sin crear uno ni registrar movimientos/);
  assert.match(getLearningPracticeCopy('es-MX','posClosing','camila').do,/No necesitas cerrar un turno/);
});
