import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Trash2} from 'lucide-react';
import {Button} from '../../../../components/ui/button';
import {SalesModalFrame} from '../../components/SalesModalFrame';
import {salesApi} from '../../salesApi';
import {ApiClientError} from '../../../../lib/apiClient';
import {getCachedAuthSession} from '../../../../api/authSessionStore';
import {toBackendOpportunityStageKey} from '../../adapters/salesApiAdapters';
import type {OpportunityFlow} from '../../types/opportunities';
import type {ProspectosCopy} from '../translations';
import {flowText,type FlowManagerCopy} from './flowManagerCopy';
const actor=()=>{const s=getCachedAuthSession();return s?`${s.company.id}:${s.user.id}`:'';};
export function OpportunityFlowRetirementModal({flow,flows,copy,text,onClose,onSaved}: {
 flow:OpportunityFlow;flows:OpportunityFlow[];copy:ProspectosCopy['flow'];text:FlowManagerCopy;onClose:()=>void;onSaved:(source:number,target:number)=>Promise<void>;
}) {
 const [scope]=useState(actor),[target,setTarget]=useState(flows.find(f=>f.factory&&f.id!==flow.id)?.id??flows.find(f=>f.id!==flow.id)?.id??0);
 const [preview,setPreview]=useState<Awaited<ReturnType<typeof salesApi.previewFlowRetirement>>|null>(null),[mapping,setMapping]=useState<Record<string,string>>({}),[step,setStep]=useState(1),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const pending=useRef<Parameters<typeof salesApi.retireOpportunityFlow>[1]|null>(null),latch=useRef(false),mounted=useRef(true),receipt=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{
  let active=true;setPreview(null);setError('');setMapping({});pending.current=null;
  if(actor()!==scope)return;
  salesApi.previewFlowRetirement(flow.id,target,scope).then(value=>{if(active&&actor()===scope){setPreview(value);setStep(1);}}).catch(()=>{if(active)setError(text.deleteError);});
  return()=>{active=false;};
 },[flow.id,target,scope,revision,text.deleteError]);
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(busy||uncertain){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[busy,uncertain]);
 const destination=flows.find(f=>f.id===target),open=preview?.stages.filter(s=>s.type==='OPEN'&&s.opportunityCount>0)??[];
 const complete=!!preview&&preview.opportunityCount<=5000&&open.every(s=>mapping[s.key]);
 async function confirm(){
  if(latch.current||!preview||!complete||actor()!==scope)return;latch.current=true;setBusy(true);setError('');
  pending.current??={commandId:crypto.randomUUID(),signature:preview.signature,targetFlowId:target,stageMapping:mapping};
  try {
   const result=await salesApi.retireOpportunityFlow(flow.id,pending.current,scope);receipt.current=true;
   if(mounted.current&&actor()===scope){setUncertain(false);await onSaved(result.flowId,result.targetFlowId);}
  }catch(failure){if(mounted.current&&actor()===scope){
   if(!receipt.current&&failure instanceof ApiClientError&&failure.status>=400&&failure.status<500){pending.current=null;setUncertain(false);setError(failure.status===409?text.deleteChanged:failure.code==='flow_retirement_limit'?text.deleteLimit:text.deleteError);if(failure.status===409){setPreview(null);setStep(1);}}
   else {setUncertain(true);setError(text.deletePending);}
  }}finally{latch.current=false;if(mounted.current)setBusy(false);}
 }
 const name=destination?.factory?text.factoryName:destination?.name??'';
 return <SalesModalFrame open onOpenChange={value=>{if(!value&&!busy&&!uncertain)onClose();}} title={flowText(text.deleteTitle,{name:flow.name})} description={text.deleteHint} icon={<Trash2/>} modalType="wizard" busy={busy||uncertain} closeLabel={copy.close} contentClassName="flow-manager-modal flow-retirement-modal"
  footer={<><Button variant="outline" disabled={busy||uncertain} onClick={()=>step===2?setStep(1):onClose()}>{step===2?text.back:copy.cancel}</Button>{step===1?<Button className="flow-primary" disabled={!complete||busy} onClick={()=>setStep(2)}>{text.review}<ArrowRight size={16}/></Button>:<Button data-modal-destructive className="flow-delete-confirm" disabled={busy||!complete} onClick={()=>void confirm()}><Trash2 size={16}/>{busy?copy.saving:uncertain?copy.retry:text.confirmDelete}</Button>}</>}>
  <div className="flow-retirement-steps"><span className={step===1?'active':''}>1 · {text.destination}</span><span className={step===2?'active':''}>2 · {text.review}</span></div>
  {error&&<div className="flow-message flow-error" role="alert">{error}{!busy&&!uncertain&&<Button variant="outline" onClick={()=>setRevision(v=>v+1)}>{copy.retry}</Button>}</div>}
  {!preview&&!error&&<p role="status">{text.loading}</p>}
  {step===1?<div className="flow-retirement-content"><label htmlFor="flow-retirement-target">{text.destination}<select id="flow-retirement-target" disabled={busy||uncertain} value={target} onChange={event=>setTarget(Number(event.target.value))}>{flows.filter(f=>f.id!==flow.id).map(f=><option key={f.id} value={f.id}>{f.factory?text.factoryName:f.name}</option>)}</select></label>
   {preview&&<><p className="flow-detail-note">{preview.opportunityCount?flowText(text.deletePopulated,{count:preview.opportunityCount,name}):text.deleteEmpty}</p>{preview.opportunityCount>5000?<div role="alert" className="flow-message flow-error">{text.deleteLimit}</div>:<>{open.length>0&&<div className="flow-retirement-mapping"><h3>{text.mapping}</h3><p>{text.mappingHint}</p>{open.map(stage=><label key={stage.key} htmlFor={`map-${stage.key}`}><span>{stage.label}<small>{copy.opportunities(stage.opportunityCount)}</small></span><ArrowRight size={16}/><select id={`map-${stage.key}`} value={mapping[stage.key]??''} onChange={event=>setMapping(old=>({...old,[stage.key]:event.target.value}))}><option value="">—</option>{destination?.stages.filter(s=>s.type==='OPEN').map(s=><option key={s.key} value={toBackendOpportunityStageKey(s.key)}>{s.label}</option>)}</select></label>)}</div>}<p className="flow-detail-note">🔒 {text.preserveTerminal}</p></>}</>}
  </div>:<div className="flow-retirement-content"><h3>{flow.name} → {name}</h3>{flow.defaultFlow&&<p className="flow-detail-note">{copy.defaultBadge}: {name}</p>}<p>{preview?.opportunityCount?flowText(text.deletePopulated,{count:preview.opportunityCount,name}):text.deleteEmpty}</p>{open.map(s=><div className="flow-mapping-review" key={s.key}><span>{s.label}</span><ArrowRight size={16}/><span>{destination?.stages.find(target=>toBackendOpportunityStageKey(target.key)===mapping[s.key])?.label}</span></div>)}<p className="flow-detail-note">🔒 {text.preserveTerminal}</p></div>}
 </SalesModalFrame>;
}
