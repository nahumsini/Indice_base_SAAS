import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const exports = {};
vm.runInNewContext(ts.transpile(readFileSync(new URL('../src/app/BasicModules/Sales/Whatsapping/contactOpportunities.ts', import.meta.url), 'utf8'), {module:ts.ModuleKind.CommonJS}), {exports, URLSearchParams});
const { contactOpportunities, opportunityUrl } = exports;
const existing = {contactId:7,id:900,flowId:20,name:'Existing',code:'OP-1'};
test('shows only opportunities for the selected contact, including multiple existing records', () => {
  const detail = {opportunities:[existing,{...existing,id:901},{...existing,contactId:8,id:902}]};
  assert.deepEqual(Array.from(contactOpportunities(detail,7), o=>o.id), [900,901]);
  assert.deepEqual(Array.from(contactOpportunities(detail,2)), []);
});
test('unavailable access is never presented as no opportunities or restored from a local cache', () => {
  assert.equal(contactOpportunities({opportunities:null},7,[existing]), null);
  assert.equal(contactOpportunities({},7,[existing]), undefined);
});
test('a confirmed new opportunity stays available after an outcome retry without duplicate links', () => {
  assert.deepEqual(Array.from(contactOpportunities({opportunities:[]},7,[existing]), o=>o.id), [900]);
  assert.deepEqual(Array.from(contactOpportunities({opportunities:[existing]},7,[existing]), o=>o.id), [900]);
});
test('opens the native opportunity detail in its own flow, without embedding campaign drafts', () => {
  assert.equal(opportunityUrl(existing), '/sales/leads?opportunity=900&flow=20');
  assert.equal(opportunityUrl({...existing,flowId:null}), '/sales/leads?opportunity=900');
});

const { opportunityStageLabel, mergeOpportunityReturn } = exports;
test('factory stage labels use the Sales locale while custom labels remain exact',()=>{
  const labels={Proposal:'Propuesta',Negotiation:'Negociación'};
  assert.equal(opportunityStageLabel({...existing,stage:{key:'proposal',label:'Proposal',usesDefaultLabel:true}},labels,'Etapa no disponible'),'Propuesta');
  assert.equal(opportunityStageLabel({...existing,stage:{key:'proposal',label:'Revisión con compras',usesDefaultLabel:false}},labels,'Etapa no disponible'),'Revisión con compras');
});
test('missing stage metadata is explicit and cannot turn a key into an invented business label',()=>{
  for(const stage of [null,undefined,{key:'unknown_key',label:'',usesDefaultLabel:false}])assert.equal(opportunityStageLabel({...existing,stage},{},'Etapa no disponible'),'Etapa no disponible');
});
test('the return read updates stage metadata while keeping the message and note baselines',()=>{
  const stage={key:'negotiation',label:'Negociación especial',usesDefaultLabel:false};
  const current={campaign:{id:'x'},recipients:[{contact:{id:7},version:1,message:'Message baseline',notes:'Note baseline'}],opportunities:[existing]};
  const updated=mergeOpportunityReturn(current,{...current,recipients:[{...current.recipients[0],version:9,message:'Remote',notes:'Remote'}],opportunities:[{...existing,stage}]});
  assert.equal(updated.opportunities[0].stage,stage);assert.equal(updated.recipients[0].message,'Message baseline');assert.equal(updated.recipients[0].notes,'Note baseline');assert.equal(updated.recipients[0].version,1);
});
