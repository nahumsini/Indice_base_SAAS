import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {createTypeScriptLoader} from './helpers/loadTypeScript.mjs';
const load=createTypeScriptLoader();
const {buildOpportunityStageFilter,matchesOpportunityStage}=load(resolve(import.meta.dirname,'../src/app/BasicModules/Sales/Whatsapping/opportunityStageFilters.ts'));
const recipients=[1,2,3,4,5].map(id=>({contact:{id,name:`Synthetic ${id}`}}));
const copy={allOpportunityStages:'Todas las etapas',noOpportunity:'Sin oportunidad',stageUnavailable:'Etapa no disponible'};
const labels={Proposal:'Propuesta',Negotiation:'Negociación'};
const opportunity=(id,contactId,key='proposal',label='Proposal',factory=true)=>({id,contactId,flowId:id,stage:{key,label,usesDefaultLabel:factory}});
const opportunities=[opportunity(10,1),opportunity(11,1),opportunity(12,2),opportunity(13,2,'negotiation','Negotiation'),opportunity(14,3,'custom','Revisión técnica',false),{id:15,contactId:5,stage:null},opportunity(99,99)];
const build=(base=recipients,source=opportunities)=>buildOpportunityStageFilter(recipients,source,base,labels,copy,'es-MX');
const option=(filter,label)=>filter.options.find(o=>o.label===label);
test('stage quantities count distinct audience contacts, with multiple opportunities and independent stages',()=>{
 const f=build();assert.equal(option(f,'Todas las etapas').count,5);assert.equal(option(f,'Propuesta').count,2);assert.equal(option(f,'Negociación').count,1);assert.equal(option(f,'Revisión técnica').count,1);
 assert.equal(matchesOpportunityStage(2,option(f,'Propuesta').value,f),true);assert.equal(matchesOpportunityStage(2,option(f,'Negociación').value,f),true);assert.equal(matchesOpportunityStage(99,option(f,'Propuesta').value,f),false);
});
test('search/view scope updates quantities while the selected stage cannot distort other options',()=>{
 const f=build([recipients[1]]);assert.equal(option(f,'Propuesta').count,1);assert.equal(option(f,'Negociación').count,1);assert.equal(option(f,'Revisión técnica').count,0);assert.equal(option(f,'Todas las etapas').count,1);
 const selected=option(f,'Propuesta').value;assert.deepEqual(recipients.filter(r=>matchesOpportunityStage(r.contact.id,selected,f)).map(r=>r.contact.id),[1,2]);
 const narrowed=[recipients[1]].filter(r=>matchesOpportunityStage(r.contact.id,selected,f));assert.deepEqual(narrowed.map(r=>r.contact.id),[2]);assert.equal(option(f,'Negociación').count,1);
});
test('authorized absence and unknown stage metadata are separate contact groups',()=>{
 const f=build();assert.equal(option(f,'Sin oportunidad').count,1);assert.equal(option(f,'Etapa no disponible').count,1);
 assert.equal(matchesOpportunityStage(4,'NO_OPPORTUNITY',f),true);assert.equal(matchesOpportunityStage(5,'NO_OPPORTUNITY',f),false);assert.equal(matchesOpportunityStage(5,'UNAVAILABLE',f),true);
});
test('matching visible stage names across flows are one business group, and custom labels remain distinct',()=>{
 const f=build(recipients,[...opportunities,opportunity(20,3,'custom-proposal','Propuesta',false),opportunity(21,1,'proposal','Propuesta revisada',false)]);
 assert.equal(option(f,'Propuesta').count,3);assert.equal(option(f,'Propuesta revisada').count,1);assert.equal(f.options.filter(o=>o.label==='Propuesta').length,1);
});
test('permission or unavailable projection never reveals stage buckets or treats contacts as having no opportunity',()=>{
 for(const source of [null,undefined]){const f=buildOpportunityStageFilter(recipients,source,recipients,labels,copy,'es-MX');assert.equal(f.available,false);assert.equal(f.options.length,1);assert.equal(matchesOpportunityStage(1,'NO_OPPORTUNITY',f),false);assert.equal(matchesOpportunityStage(1,'ALL',f),true)}
});
test('unknown values fail closed and an owner update changes groups without mutating the contact records',()=>{
 const before=JSON.stringify({recipients,opportunities});const f=build();assert.equal(matchesOpportunityStage(1,'__proto__',f),false);assert.equal(matchesOpportunityStage(1,'unknown',f),false);
 const changed=opportunities.map(o=>o.contactId===1?{...o,stage:{key:'negotiation',label:'Negotiation',usesDefaultLabel:true}}:o);const next=build(recipients,changed);
 assert.equal(option(next,'Propuesta').count,1);assert.equal(option(next,'Negociación').count,2);assert.equal(JSON.stringify({recipients,opportunities}),before);
});
test('duplicate locally confirmed references cannot count an outdated stage twice',()=>{
 const f=build(recipients,[...opportunities,{...opportunities[0],stage:{key:'negotiation',label:'Negotiation',usesDefaultLabel:true}}]);assert.equal(option(f,'Negociación').count,2);assert.equal(option(f,'Propuesta').count,2);
});
