import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const base='src/app/ComplementaryModules/MinutesControl/';
class ApiClientError extends Error{constructor(status){super('synthetic failure');this.status=status;}}
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
const nodes=node=>node==null||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...nodes(node.props?.children)];
function harness(status){
 const runtime=hookRuntime(),calls=[];
 const {AgreementTaskEditor}=loadTypescript(resolve(base+'components/AgreementEditors.tsx'),id=>{
  if(id==='react')return runtime.hooks;
  if(id==='react/jsx-runtime')return jsx;
  if(id.endsWith('/apiClient'))return {ApiClientError};
  if(id.endsWith('/MeetingPrimitives'))return {Editor:'Editor',Field:'Field',Feedback:'Feedback',control:'control',useMeetingQuery:()=>({data:{items:[{participants:[{id:43,name:'Synthetic participant'}]}]}})};
  if(id.endsWith('/meetingApi'))return {meetingApi:{delegateTask:async(record,body)=>{calls.push({record,body});throw new ApiClientError(status);}}};
  if(id.includes('/translations/'))return loadTypescript(resolve(base+'translations/'+id.split('/').pop()+'.ts'),()=>({}));
  return {};
 });
 const record={id:7,meetingId:1,title:'Deliver agreed result',assigneeId:43,dueDate:'2026-10-30',version:9};
 runtime.render(()=>AgreementTaskEditor({record,copy:{},locale:'es-MX',onClose(){},onSaved(){}}));
 return {runtime,calls};
}
test('a stale delegation keeps its fields and blocks another save until the agreement is reviewed',async()=>{
 const h=harness(409);assert.equal(h.runtime.result.props.ready,true);
 await assert.rejects(h.runtime.result.props.onSave());await h.runtime.flush();
 assert.equal(h.runtime.result.props.ready,false);assert.equal(h.calls.length,1);
 assert.equal(nodes(h.runtime.result).find(node=>node.type==='input'&&node.props.type==='date').props.value,'2026-10-30');
 h.runtime.unmount();
});
test('a temporary failure preserves the exact delegated commitment for a safe retry',async()=>{
 const h=harness(503);await assert.rejects(h.runtime.result.props.onSave());await h.runtime.flush();assert.equal(h.runtime.result.props.ready,true);
 await assert.rejects(h.runtime.result.props.onSave());assert.deepEqual(h.calls[0],h.calls[1]);assert.equal(h.calls[0].record.version,9);h.runtime.unmount();
});
