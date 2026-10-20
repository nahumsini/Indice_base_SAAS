import assert from 'node:assert/strict';
import test from 'node:test';
import {hookRuntime,loadTypescript} from './helpers/hook-runtime.mjs';
const root=new URL('../src/app/BasicModules/Sales/Funneling/',import.meta.url);
const campaign=loadTypescript(new URL('campaignModel.ts',root).pathname,()=>{throw Error('import');});
const model=loadTypescript(new URL('funnelModel.ts',root).pathname,()=>campaign);
const guide=loadTypescript(new URL('contentGuideModel.ts',root).pathname,()=>{throw Error('import');});
const {contentGenerationCopy}=loadTypescript(new URL('contentGenerationCopy.ts',root).pathname,()=>{throw Error('import');});
class ApiError extends Error {constructor(status){super('synthetic');this.status=status;}}
function plan(){return {...campaign.newCampaignIdea(),id:'saved-campaign',name:'Example campaign',objective:'Get inquiries',audience:'Local customers',version:3,updatedAt:'2026-10-19T00:00:00Z',estimatedConversion:null,stageEstimates:[],workshop:{...campaign.emptyCampaignBrief(),idea:'Explain our service',offer:'Our consultation'}};}
function setup(save=async(id,input)=>({...input,id,version:input.version+1,updatedAt:'',estimatedConversion:null,stageEstimates:[]})){
 globalThis.window=new EventTarget();const runtime=hookRuntime(),guard={current:null},saved=[];let source=plan();
 const {useCampaignContent,campaignContentDraft}=loadTypescript(new URL('useCampaignContent.ts',root).pathname,id=>{
 if(id==='react')return runtime.hooks;if(id.endsWith('/apiClient'))return{ApiClientError:ApiError};if(id==='./funnelApi')return{funnelApi:{save}};if(id==='./funnelModel')return model;throw Error(id);
 });
 runtime.render(()=>useCampaignContent({plan:source,guard,onSaved:value=>saved.push(value)}));
 return{runtime,guard,saved,draftFrom:campaignContentDraft,source:()=>source,refresh:value=>{source=value;runtime.render();},get editor(){return runtime.result;}};
}
const choice=()=>({...guide.emptyContentGuide(),contentType:'TUTORIAL',format:'SHORT_VIDEO',hook:'CUSTOM',customHook:'How can we help?',topic:'Choose the service'});
test('content entry restores campaign-owned choices without creating stages or a workshop for legacy plans',()=>{
 const s=setup();assert.equal(s.editor.dirty,false);assert.deepEqual(s.editor.draft.stages,[]);assert.equal(s.editor.draft.contentGuide,undefined);const legacy={...plan(),workshop:null,contentGuide:null};assert.equal(s.draftFrom(legacy).workshop,null);assert.equal(s.draftFrom(legacy).contentGuide,null);s.runtime.unmount();
});
test('guide and pasted response save in the original campaign with its exact version and other fields',async()=>{
 let captured;const s=setup(async(id,input)=>{captured={id,input:structuredClone(input)};return{...input,id,version:4,updatedAt:'',estimatedConversion:null,stageEstimates:[]};});const original=structuredClone(s.editor.draft);
 s.editor.update({contentGuide:choice(),workshop:{...original.workshop,aiResponse:'AI draft'}});await s.runtime.flush();assert.equal(s.editor.dirty,true);await s.editor.save();await s.runtime.flush();assert.equal(captured.id,'saved-campaign');assert.equal(captured.input.version,3);
 for(const key of ['name','objective','audience','channel','notes','stages','status'])assert.deepEqual(captured.input[key],original[key]);assert.equal(s.editor.draft.version,4);assert.equal(s.editor.dirty,false);assert.equal(s.saved.length,1);assert.equal(s.editor.saved,true);s.runtime.unmount();
});
test('failed saves retain choices and response, support retry and prevent concurrent duplicate submission',async()=>{
 let count=0,release;const s=setup(async(id,input)=>{count++;if(count===1)throw Error('offline');await new Promise(resolve=>release=resolve);return{...input,id,version:4};});s.editor.update({contentGuide:choice()});await s.runtime.flush();await s.editor.save();await s.runtime.flush();assert.equal(s.editor.error,'network');assert.equal(s.editor.draft.contentGuide.customHook,'How can we help?');const request=s.editor.save();await s.runtime.flush();await s.editor.save();let navigated=false;s.guard.current(()=>navigated=true);s.editor.update({contentGuide:guide.emptyContentGuide()});assert.equal(navigated,false);assert.equal(count,2);release();await request;await s.runtime.flush();assert.equal(s.editor.dirty,false);s.runtime.unmount();
});
test('unsaved campaign/view navigation can be cancelled, then explicitly discarded without writing',async()=>{
 let writes=0;const s=setup(async()=>{writes++;throw Error('unexpected');});s.editor.update({contentGuide:choice()});await s.runtime.flush();let destination='current';s.guard.current(()=>destination='second');await s.runtime.flush();assert.equal(s.editor.pending,true);assert.equal(destination,'current');s.editor.keepEditing();await s.runtime.flush();assert.equal(s.editor.draft.contentGuide.topic,'Choose the service');s.guard.current(()=>destination='ideas');await s.runtime.flush();s.editor.discard();await s.runtime.flush();assert.equal(destination,'ideas');assert.equal(s.editor.dirty,false);assert.equal(writes,0);s.runtime.unmount();assert.equal(s.guard.current,null);
});
test('409 keeps the draft and blocks overwrite while allowing explicit discard and reload',async()=>{
 let calls=0;const s=setup(async()=>{calls++;throw new ApiError(409);});s.editor.update({contentGuide:choice()});await s.runtime.flush();await s.editor.save();await s.runtime.flush();assert.equal(s.editor.error,'conflict');s.editor.update({contentGuide:guide.emptyContentGuide()});await s.editor.save();assert.equal(calls,1);assert.equal(s.editor.draft.contentGuide.hook,'CUSTOM');let reloaded=false;s.guard.current(()=>reloaded=true);await s.runtime.flush();s.editor.discard();await s.runtime.flush();assert.equal(reloaded,true);s.runtime.unmount();
});
test('external campaign updates rebase clean editors and preserve dirty editors as conflicts',async()=>{
 const s=setup();s.refresh({...s.source(),version:4,audience:'Updated audience'});await s.runtime.flush();assert.equal(s.editor.draft.audience,'Updated audience');s.editor.update({contentGuide:choice()});await s.runtime.flush();s.refresh({...s.source(),version:5,audience:'Someone else'});await s.runtime.flush();assert.equal(s.editor.error,'conflict');assert.equal(s.editor.draft.audience,'Updated audience');assert.equal(s.editor.draft.contentGuide.topic,'Choose the service');s.runtime.unmount();
});
test('late save responses cannot update an unmounted company context',async()=>{
 let release;const s=setup(async(id,input)=>{await new Promise(resolve=>release=resolve);return{...input,id,version:4};});s.editor.update({contentGuide:choice()});await s.runtime.flush();const request=s.editor.save();s.runtime.unmount();release();await request;assert.deepEqual(s.saved,[]);
});
test('content view restores via workspace memory and exposes complete copy in all eight locales',()=>{
 assert.equal(model.normalizeFunnelView('content'),'content');const keys=Object.keys(contentGenerationCopy('es-MX'));for(const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']){const c=contentGenerationCopy(locale);assert.deepEqual(Object.keys(c),keys);for(const text of Object.values(c))assert.ok(text.length);}
});
