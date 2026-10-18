import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';
const root='src/app/BasicModules/Sales/';
const load=(path,require=()=>({}))=>loadTypescript(resolve(root+path),require);
const status=load('Prospectos/utils/prospectosStatus.ts');
const format=load('Prospectos/utils/prospectosFormatters.ts',()=>status);
const timing=load('Prospectos/kanban/kanbanModel.ts',()=>format);
const model=load('Prospectos/seller/sellerModel.ts',id=>id.includes('kanbanModel')?timing:{toBackendOpportunityStageKey:value=>value.toLowerCase()});
const {getSellerCopy}=load('Prospectos/seller/sellerCopy.ts');
const nextAction=load('Prospectos/utils/nextActionDraft.ts',()=>format);
const now=new Date('2026-10-18T18:00:00Z');
const stages=[{key:'New',type:'OPEN'},{key:'Won',type:'WON'},{key:'Lost',type:'LOST'}];
const base={id:'1',stage:'New',status:'Active',contactPerson:'Contact',company:'Company',phone:'12345',opportunityName:'Opportunity',nextActionDate:'',ownerUserCompanyId:3};
test('daily queue prioritizes due contacts and respects owner, timezone, terminal stages and search',()=>{
 const records=[{...base,id:'1',nextActionDate:'2026-10-18 15:00'}, {...base,id:'2',nextActionDate:'2026-10-17 09:00'}, {...base,id:'3'}, {...base,id:'4',stage:'Won'}, {...base,id:'5',status:'On hold'}, {...base,id:'6',ownerUserCompanyId:4}];
 const queue=(filter='all',mine=false,owner=3,query='')=>model.sellerQueue(records,stages,'America/Toronto',filter,mine,owner,query,now).map(r=>r.id);
 assert.deepEqual(queue(),['2','1','3','6']);assert.deepEqual(queue('today'),['1']);assert.deepEqual(queue('overdue'),['2']);assert.deepEqual(queue('unscheduled',true),['3']);assert.deepEqual(queue('all',true,null),[]);assert.deepEqual(queue('all',false,3,'unknown'),[]);
 assert.deepEqual(records.map(r=>r.id),['1','2','3','4','5','6']);
});
test('script selection uses published stage-specific versions then general scripts',()=>{
 const general={id:1,archived:false,publishedVersion:1,published:{stageKey:''}};
 const specific={id:2,archived:false,publishedVersion:2,published:{stageKey:'new'}};
 const draft={id:3,archived:false,publishedVersion:null,published:null};
 assert.equal(model.suggestedScript([general,specific,draft],'New'),specific);
 assert.equal(model.suggestedScript([general,{...specific,archived:true}],'New'),general);
 assert.equal(model.suggestedScript([draft],'New'),null);
});
test('scripts preserve missing variables and validate bounded content without executing HTML',()=>{
 assert.equal(model.scriptVariables('Hello {{contact}} of {{company}} <script>x</script>',{contact:'Ana',company:''}),'Hello Ana of {{company}} <script>x</script>');
 const content={name:'Call',goal:'',stageKey:'',blocks:[{title:'Opening',text:'Hello'}]};
 assert.equal(model.validScript(content),true);assert.equal(Boolean(model.validScript({...content,blocks:[]})),false);assert.equal(Boolean(model.validScript({...content,blocks:[{title:'',text:'Hi'}]})),false);
});
test('all supported language families provide the same seller tools and outcomes',()=>{
 const keys=Object.keys(getSellerCopy('en-CA')).sort();
 for(const locale of ['es-MX','es-CO','en-US','fr-CA','pt-BR','ko-CA','zh-CA']) {const copy=getSellerCopy(locale);assert.deepEqual(Object.keys(copy).sort(),keys);assert.equal(copy.blocks.length,6);for(const value of Object.values(copy))assert.ok(value.length>0);}
});
class ApiError extends Error {constructor(status){super('failed');this.status=status;}}
function setup(record){
 let calls=[];let saved=0;let implementation=async()=>({});
 global.window={addEventListener(){},removeEventListener(){}};
 const runtime=hookRuntime();
 const api={opportunity:async()=>({revision:'a'.repeat(64),opportunity:base}),history:async()=>({items:[],nextCursor:null}),record:async(...args)=>{calls.push(args);return implementation(...args);}};
 const {useSellerContact}=load('Prospectos/seller/useSellerContact.ts',id=>id==='react'?runtime.hooks:id.endsWith('apiClient')?{ApiClientError:ApiError}:id.endsWith('salesApiAdapters')?{toFrontendOpportunity:value=>value}:id.endsWith('sellerApi')?{sellerApi:api}:nextAction);
 const copy=getSellerCopy('es-MX');runtime.render(()=>useSellerContact(1,1,'America/Toronto',copy,()=>saved++));
 return {runtime,calls,saved:()=>saved,run:fn=>{implementation=fn;},cleanup:()=>{runtime.unmount();delete global.window;}};
}
test('recording waits for confirmation, blocks double submits and preserves exact command on uncertain retries',async()=>{
 const f=setup();await f.runtime.flush();f.runtime.result.setOutcome('answered');f.runtime.result.setNotes('Agreement');await f.runtime.flush();
 let reject;f.run(()=>new Promise((_,fail)=>{reject=fail;}));
 const pending=f.runtime.result.save(null);await f.runtime.flush();await f.runtime.result.save(null);assert.equal(f.calls.length,1);assert.equal(f.saved(),0);
 reject(new Error('network'));await pending;await f.runtime.flush();assert.equal(f.runtime.result.notes,'Agreement');assert.equal(f.runtime.result.uncertain,true);
 f.run(async()=>({}));await f.runtime.result.save(null);await f.runtime.flush();assert.deepEqual(f.calls[0][2],f.calls[1][2]);assert.equal(f.saved(),1);assert.equal(f.runtime.result.notes,'');f.cleanup();
});
test('conflicts preserve notes, require refresh and create no success notification',async()=>{
 const f=setup();await f.runtime.flush();f.runtime.result.setOutcome('busy');f.runtime.result.setNotes('Call back');await f.runtime.flush();f.run(async()=>{throw new ApiError(409);});
 await f.runtime.result.save(null);await f.runtime.flush();assert.equal(f.runtime.result.conflict,true);assert.equal(f.saved(),0);assert.equal(f.runtime.result.notes,'Call back');
 await f.runtime.result.save(null);assert.equal(f.calls.length,1);await f.runtime.result.reload();await f.runtime.flush();assert.equal(f.runtime.result.conflict,false);assert.equal(f.runtime.result.notes,'Call back');f.cleanup();
});
