import { useCallback,useEffect,useRef,useState } from 'react';
import { ApiClientError } from '../../../lib/apiClient';
import { conversationsApi,type Timeline } from './conversationsApi';
import { mergeTimeline } from './conversationState';
export function useConversationTimeline(id:string) {
 const [timeline,setTimeline]=useState<Timeline|null>(null),[error,setError]=useState<unknown>(null),[loading,setLoading]=useState(true),[loadingEarlier,setLoadingEarlier]=useState(false);
 const current=useRef<Timeline|null>(null),cursor=useRef(0),inFlight=useRef(false),historyFlight=useRef(false),failures=useRef(0),revoked=useRef(false),alive=useRef(true),abort=useRef<AbortController|null>(null),historyAbort=useRef<AbortController|null>(null);
 const accept=useCallback((value:Timeline)=>{current.current=mergeTimeline(current.current,value);setTimeline(current.current);},[]);
 const failure=useCallback((e:unknown)=>{if(!alive.current)return;failures.current++;setError(e);if(e instanceof ApiClientError&&[401,403,404].includes(e.status)){revoked.current=true;current.current=null;setTimeline(null);}},[]);
 const refresh=useCallback(async()=>{
  if(inFlight.current||revoked.current||!alive.current)return;inFlight.current=true;abort.current=new AbortController();
  try{for(let batch=0;batch<10;batch++){
   const value=await conversationsApi.timeline(id,cursor.current,abort.current.signal);if(!alive.current||revoked.current)return;
   const previous=cursor.current;accept(value);cursor.current=Math.max(cursor.current,value.cursor);setError(null);failures.current=0;
   if(value.cursor>=value.conversation.changeSeq||value.cursor<=previous)break;
  }}catch(e){if(!abort.current.signal.aborted)failure(e);}
  finally{if(alive.current)setLoading(false);inFlight.current=false;}
 },[id,accept,failure]);
 const loadEarlier=useCallback(async()=>{
  const snapshot=current.current;if(!snapshot||!snapshot.hasEarlier||historyFlight.current||revoked.current)return;
  historyFlight.current=true;setLoadingEarlier(true);historyAbort.current=new AbortController();
  const oldest=<T extends {id:string;createdAt:string}>(items:T[])=>[...items].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id))[0]?.id;
  try{const result=await conversationsApi.history(id,{message:oldest(snapshot.messages),note:oldest(snapshot.notes),event:snapshot.events.length?Math.min(...snapshot.events.map(e=>e.seq)):undefined},historyAbort.current.signal);
   if(!alive.current||revoked.current||!current.current)return;
   // History must not advance the incremental receipt cursor or overwrite a newer conversation version.
   const merged=mergeTimeline(current.current,{...current.current,...result});current.current={...merged,hasEarlier:result.hasEarlier};setTimeline(current.current);setError(null);
  }catch(e){if(!historyAbort.current.signal.aborted)failure(e);}finally{historyFlight.current=false;if(alive.current)setLoadingEarlier(false);}
 },[id,failure]);
 useEffect(()=>{alive.current=true;let timer:ReturnType<typeof setTimeout>;let stopped=false;
  const poll=async()=>{if(!document.hidden)await refresh();if(!stopped)timer=setTimeout(poll,Math.min(30000,3000*2**Math.min(failures.current,4)));};
  const focus=()=>{if(!document.hidden)void refresh();};void poll();window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  return()=>{stopped=true;alive.current=false;clearTimeout(timer);abort.current?.abort();historyAbort.current?.abort();window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
 },[refresh]);
 return {timeline,error,loading,refresh,loadEarlier,loadingEarlier,revoked:revoked.current};
}
