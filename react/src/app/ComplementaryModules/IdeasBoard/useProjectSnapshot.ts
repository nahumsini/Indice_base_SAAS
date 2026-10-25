import {useEffect,useState} from 'react';
import {ideaWorkspaceApi,type Project,type ProjectSummary} from './ideaWorkspaceApi';

type SnapshotState={key:string;status:'idle'|'loading'|'ready'|'error';project?:Project};
/** Page-local reads only. No document or asset is cached across workspace lifetimes. */
export function useProjectSnapshot(item:ProjectSummary,enabled:boolean){
 const key=`${item.ownerId??'self'}:${item.id}:${item.version??0}:${item.deletedAt??''}`;
 const [state,setState]=useState<SnapshotState>({key,status:'idle'}),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  if(!enabled||item.deletedAt)return;
  const abort=new AbortController();setState({key,status:'loading'});
  ideaWorkspaceApi.get(item.id,abort.signal,item.ownerId).then(project=>{
   if(!abort.signal.aborted)setState({key,status:'ready',project});
  }).catch(()=>{if(!abort.signal.aborted)setState({key,status:'error'});});
  return()=>abort.abort();
 },[key,enabled,attempt]);
 return{...(state.key===key?state:{key,status:'idle' as const}),retry:()=>setAttempt(value=>value+1)};
}
