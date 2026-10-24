import {useEffect,useRef,useState} from 'react';
import {getCachedAuthSession} from '../../../../api/authSessionStore';
import {workspaceStateApi} from '../../../../api/workspaceState';
import {useAuthorizationRevision} from '../../../../hooks/useAuthorizationRevision';
import {normalizeFlowColors,type FlowColors} from '../utils/flowPersonalColors';
const actor=()=>{const s=getCachedAuthSession();return s?`${s.company.id}:${s.user.id}`:'';};
const key=(flowId:number)=>`opportunity-colors-${flowId}`;
/** Presentation preference uses the shared company/user workspace-state owner. */
export function useOpportunityFlowColors(flowIds:number[]) {
 const revision=useAuthorizationRevision(),scope=actor(),signature=flowIds.filter(id=>id>0).sort((a,b)=>a-b).join(',');
 const [values,setValues]=useState<{scope:string;colors:Record<number,FlowColors>}>({scope:'',colors:{}});
 const [ready,setReady]=useState(false),[error,setError]=useState(false),[reload,setReload]=useState(0);
 const valid=useRef<{scope:string;active:boolean}|null>(null),saving=useRef(false);
 useEffect(()=>{
  const context={scope,active:true};valid.current=context;setReady(false);setError(false);setValues(old=>old.scope===scope?old:{scope,colors:{}});
  const ids=signature?signature.split(',').map(Number):[];
  Promise.all(ids.map(async id=>{const response=await workspaceStateApi.get('sales',key(id));return [id,normalizeFlowColors(response.state.colors)] as const;}))
   .then(entries=>{if(context.active&&actor()===scope){setValues({scope,colors:Object.fromEntries(entries)});setReady(true);}})
   .catch(()=>{if(context.active&&actor()===scope)setError(true);});
  return()=>{context.active=false;};
 },[signature,scope,revision,reload]);
 async function save(flowId:number,colors:FlowColors){
  const context=valid.current;
  if(!Number.isSafeInteger(flowId)||flowId<=0||!ready||saving.current||!context?.active||context.scope!==actor())throw new Error('Preference context changed');
  saving.current=true;
  try {
   const normalized=normalizeFlowColors(colors);
   await workspaceStateApi.save('sales',key(flowId),{colors:normalized});
   if(!context.active||context.scope!==actor())throw new Error('Preference context changed');
   setValues(old=>({...old,colors:{...old.colors,[flowId]:normalized}}));
  }finally{saving.current=false;}
 }
 return {colors:values.scope===scope?values.colors:{},ready,error,retry:()=>setReload(v=>v+1),save};
}
