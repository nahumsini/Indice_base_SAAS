import assert from 'node:assert/strict';
import test from 'node:test';
import {LearningProgressStore} from '../src/app/learningMode/learningProgressStore.ts';
import {learningChapters} from '../src/app/learningMode/curriculum.ts';
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
  assert.equal(learningChapters.length,58);assert.equal(new Set(learningChapters.map(c=>c.id)).size,58);
  assert.equal(new Set(learningChapters.map(c=>c.module)).size,10);
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
