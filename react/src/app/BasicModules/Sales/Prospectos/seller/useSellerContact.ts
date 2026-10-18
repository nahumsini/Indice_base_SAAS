import { useEffect, useRef, useState } from 'react';
import { ApiClientError } from '../../../../lib/apiClient';
import { toFrontendOpportunity } from '../../adapters/salesApiAdapters';
import { sellerApi, type CallCommand, type CallHistory, type CallOutcome, type CallScript, type SellerOpportunity } from './sellerApi';
import type { SellerCopy } from './sellerCopy';
import { nextActionDay } from '../utils/nextActionDraft';

export function useSellerContact(flow: number, id: number, timezone: string, t: SellerCopy, onSaved: () => void) {
  const [snapshot,setSnapshot]=useState<SellerOpportunity | null>(null);
  const [history,setHistory]=useState<CallHistory>({ items: [], nextCursor: null });
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [conflict,setConflict]=useState(false);
  const [busy,setBusy]=useState(false);
  const [notes,setNotes]=useState('');
  const [outcome,setOutcome]=useState<CallOutcome | ''>('');
  const [followup,setFollowup]=useState<'schedule' | 'clear'>('schedule');
  const [action,setAction]=useState('call');
  const [date,setDate]=useState(() => nextActionDay(timezone,1));
  const [time,setTime]=useState('09:00');
  const [changed,setChanged]=useState(false);
  const pending=useRef(false);
  // A network-uncertain retry must replay the exact original command and key.
  const retry=useRef<CallCommand | null>(null);
  const mounted=useRef(true);
  const dirty=changed || Boolean(notes || outcome) || retry.current!==null;
  useEffect(()=> { mounted.current=true; let current=true;
    Promise.all([sellerApi.opportunity(flow,id),sellerApi.history(flow,id)]).then(([record,log])=>{if(current){setSnapshot(record);setHistory(log);}})
      .catch(()=>{if(current)setError(t.error);}).finally(()=>{if(current)setLoading(false);});
    return ()=>{ current=false; mounted.current=false; };
  },[flow,id,t]);
  useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirty||busy){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty,busy]);
  const reload=async()=>{ if(pending.current) return; setLoading(true); setError(''); try { const record=await sellerApi.opportunity(flow,id); if(mounted.current){setSnapshot(record);setConflict(false);retry.current=null;} }catch{if(mounted.current)setError(t.error);}finally{if(mounted.current)setLoading(false);} };
  const older=async()=>{if(!history.nextCursor||pending.current)return; pending.current=true;try{const page=await sellerApi.history(flow,id,history.nextCursor);if(mounted.current)setHistory(current=>({items:[...current.items,...page.items],nextCursor:page.nextCursor}));}catch{setError(t.error);}finally{pending.current=false;}};
  const save=async(script:CallScript | null)=>{
    if(pending.current||!snapshot||!outcome||conflict||followup==='schedule'&&(!date||!time))return;
    pending.current=true;setBusy(true);setError('');
    const command=retry.current ?? { requestKey:crypto.randomUUID(),revision:snapshot.revision,outcome,notes,scriptId:script?.id??null,scriptVersion:script?.publishedVersion??null,followupMode:followup,nextAction:followup==='schedule'?action:null,nextActionAt:followup==='schedule'?date+' '+time:null };
    retry.current=command;
    try { await sellerApi.record(flow,id,command); if(mounted.current){retry.current=null;setNotes('');setOutcome('');setChanged(false);onSaved();} }
    catch(error){if(mounted.current){const isConflict=error instanceof ApiClientError&&error.status===409;setConflict(isConflict);setError(isConflict?t.conflict:t.error);if(error instanceof ApiClientError&&error.status<500)retry.current=null;}}
    finally{pending.current=false;if(mounted.current)setBusy(false);}
  };
  return { record:snapshot?toFrontendOpportunity(snapshot.opportunity):null, history, loading,error,conflict,busy,dirty,
    uncertain:retry.current!==null,notes,setNotes,outcome,setOutcome,followup,setFollowup,action,setAction,date,setDate,time,setTime,
    changed:()=>setChanged(true),reload,older,save };
}
