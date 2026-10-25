import {useRef,useState} from 'react';
import {FolderPlus} from 'lucide-react';
import {IndiceModalFrame} from '../../components/indice-modal';
import {Button} from '../../components/ui/button';
import {ideaWorkspaceApi,type ProjectInput} from './ideaWorkspaceApi';
import {fiveSCopy} from './fiveSCopy';
import {workspaceCopy} from './workspaceCopy';

export type ProjectDraft={input:Omit<ProjectInput,'name'>;actor:string};
export function SaveProjectDialog({draft,locale,onClose,onSaved,title,description,saveLabel}:{draft:ProjectDraft;locale:string;onClose:()=>void;onSaved:()=>void;title?:string;description?:string;saveLabel?:string}) {
 const c=workspaceCopy(locale),[name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),id=useRef(crypto.randomUUID()),submitted=useRef<ProjectInput|null>(null);
 async function save(){
  if(busy)return;const value=name.trim();if(!value||value.length>120||/[\x00-\x1f\x7f]/.test(value)){setError(c.nameRequired);return;}
  setBusy(true);setError('');submitted.current??={...draft.input,name:value};
  try{await ideaWorkspaceApi.save(id.current,submitted.current,draft.actor);onSaved();}
  catch(error){setError((error as {status?:number}).status===422?c.projectLimit:c.saveError);}
  finally{setBusy(false);}
 }
 return <IndiceModalFrame contentClassName="indice-idea-workspace-modal" open busy={busy} onOpenChange={open=>{if(!open)onClose();}} title={title??c.saveProject} description={description??c.projectsHint} icon={<FolderPlus/>} tone="blue" closeLabel={c.cancel}
  footer={<><Button variant="outline" disabled={busy} onClick={onClose}>{c.cancel}</Button><Button disabled={busy} onClick={()=>void save()}>{busy?c.loading:saveLabel??c.saveProject}</Button></>}>
  <form onSubmit={e=>{e.preventDefault();void save();}} className="workspace-project-form"><label className="workspace-field">{c.projectName}<input autoFocus aria-label={c.projectName} value={name} maxLength={120} onChange={e=>setName(e.target.value)} disabled={busy||!!submitted.current} aria-invalid={!!error&&!name.trim()}/></label><p>{c.projectKind}: {draft.input.kind==='SYSTEM'?c.system:draft.input.freeform?.nodes.some(n=>n.fiveS?.role==='SECTION')?fiveSCopy(locale).tab:c.myBoard}</p>{error&&<p className="workspace-error" role="alert">{error}</p>}<button hidden type="submit" disabled={busy}/></form>
 </IndiceModalFrame>;
}

export {IdeaProjects} from './ProjectLibrary';
