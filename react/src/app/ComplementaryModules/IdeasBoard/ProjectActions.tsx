import {useEffect,useRef,useState} from 'react';
import {Copy,Link,MoreHorizontal,Pencil,RotateCcw,Share2,Trash2,FolderOpen,Search} from 'lucide-react';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuSeparator,DropdownMenuTrigger} from '../../components/ui/dropdown-menu';
import {IndiceModalFrame} from '../../components/indice-modal';
import {Button} from '../../components/ui/button';
import {IndiceEmoji} from '../../components/icons/ModuleTabEmoji';
import type {Project,ProjectSummary} from './ideaWorkspaceApi';
import {projectManagementApi,captureProjectActor,projectLink,validProjectName,type ProjectMember,type ProjectSharing} from './projectManagementApi';
import {projectManagementCopy} from './projectManagementCopy';

type Action='rename'|'copy'|'trash'|'restore'|'share'|'link';
export function projectActionError(error:unknown,locale:string){const c=projectManagementCopy(locale),status=(error as {status?:number}).status;return status===409?c.conflict:status===403||status===404?c.missing:status===422?c.limit:status===400?c.invalid:c.error;}
export function ProjectActions({item,locale,onChanged,onUse,primaryCopy=false}:{item:ProjectSummary;locale:string;onChanged:(message:string,project?:Project)=>void;onUse?:()=>void;primaryCopy?:boolean}){
 const c=projectManagementCopy(locale),[action,setAction]=useState<Action|null>(null),[actor,setActor]=useState('');
 function open(action:Action){try{setActor(captureProjectActor());setAction(action);}catch(error){onChanged(projectActionError(error,locale));}}
 const owned=item.owned!==false,trashed=!!item.deletedAt;
 return <div className="project-actions" onClick={e=>e.stopPropagation()}>
  {primaryCopy&&!trashed&&<Button className="idea-board-primary" onClick={()=>open('copy')}><Copy size={17}/>{owned?c.duplicate:c.copy}</Button>}
  <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="idea-board-button project-menu-trigger" aria-label={`${c.manage}: ${item.name}`} title={c.manage}><MoreHorizontal size={20}/></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="project-actions-menu">
   {trashed?<DropdownMenuItem onSelect={()=>open('restore')}><RotateCcw size={18}/>{c.restore}</DropdownMenuItem>:<>
    {owned&&onUse&&<DropdownMenuItem onSelect={onUse}><FolderOpen size={18}/>{c.use}</DropdownMenuItem>}
    {owned&&<DropdownMenuItem onSelect={()=>open('rename')}><Pencil size={18}/>{c.rename}</DropdownMenuItem>}
    <DropdownMenuItem onSelect={()=>open('copy')}><Copy size={18}/>{owned?c.duplicate:c.copy}</DropdownMenuItem>
    <DropdownMenuItem onSelect={()=>open('link')}><Link size={18}/>{c.copyLink}</DropdownMenuItem>
    {owned&&<><DropdownMenuItem onSelect={()=>open('share')}><Share2 size={18}/>{c.share}</DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem className="project-trash-action" onSelect={()=>open('trash')}><Trash2 size={18}/>{c.remove}</DropdownMenuItem></>}
   </>}
  </DropdownMenuContent></DropdownMenu>
  {action==='share'?<ProjectSharingDialog item={item} locale={locale} actor={actor} onClose={()=>setAction(null)} onSaved={()=>{setAction(null);onChanged(c.sharedSaved);}}/>:action==='link'?<ProjectLinkDialog item={item} locale={locale} onClose={()=>setAction(null)} onCopied={()=>onChanged(c.linkCopied)}/>:action&&<ProjectMutationDialog key={action} action={action} item={item} locale={locale} actor={actor} onClose={()=>setAction(null)} onSaved={project=>{setAction(null);onChanged(action==='rename'?c.renamed:action==='trash'?c.trashed:action==='restore'?c.restored:c.copied,project);}}/>}
 </div>;
}
export function ProjectMutationDialog({action,item,locale,actor,onClose,onSaved}:{action:'rename'|'copy'|'trash'|'restore';item:ProjectSummary;locale:string;actor:string;onClose:()=>void;onSaved:(project:Project)=>void}){
 const c=projectManagementCopy(locale),[name,setName]=useState(action==='copy'?`${item.name} · ${c.copySuffix}`.slice(0,120):item.name),[busy,setBusy]=useState(false),[error,setError]=useState(''),request=useRef<{id:string;name:string}|null>(null);
 const copying=action==='copy',naming=copying||action==='rename';
 async function save(){if(busy)return;if(naming&&!validProjectName(name)){setError(c.nameError);return;}request.current??={id:crypto.randomUUID(),name:name.trim()};const input=request.current;setBusy(true);setError('');
  try{const project=copying?await projectManagementApi.copy(item,input.id,input.name,actor):await projectManagementApi.change(item.id,{version:item.version??0,mutationId:input.id,...(action==='rename'?{name:input.name}:{trashed:action==='trash'})},actor);onSaved(project);}
  catch(error){setError(projectActionError(error,locale));if((error as {status?:number}).status===400)request.current=null;}
  finally{setBusy(false);}
 }
 const title=action==='copy'?(item.owned===false?c.copy:c.duplicate):action==='rename'?c.rename:action==='trash'?c.remove:c.restore;
 return <IndiceModalFrame open busy={busy} contentClassName="indice-idea-workspace-modal project-management-modal" title={title} description={copying?c.copyHint:action==='trash'?c.removeHint:action==='restore'?c.restoreHint:item.name} tone="blue" icon={copying?<Copy/>:action==='trash'?<Trash2/>:action==='restore'?<RotateCcw/>:<Pencil/>} modalType={naming?'standard-form':'confirmation'} closeLabel={c.close} onOpenChange={value=>{if(!value&&!busy)onClose();}} footer={<><Button variant="outline" disabled={busy} onClick={onClose}>{c.cancel}</Button><Button disabled={busy} className={action==='trash'?'project-trash-confirm':undefined} onClick={()=>void save()}>{busy?c.loading:action==='trash'?c.remove:action==='restore'?c.restore:copying?c.copy:c.save}</Button></>}>
  <form className="workspace-project-form" onSubmit={e=>{e.preventDefault();void save();}}>{naming?<label className="workspace-field"><span>{copying?c.copyName:c.name}</span><input autoFocus value={name} maxLength={120} onChange={e=>setName(e.target.value)} disabled={busy||!!request.current} aria-invalid={!!error&&!validProjectName(name)}/></label>:<p className="project-confirm-name">{item.name}</p>}{error&&<p className="workspace-error" role="alert">{error}</p>}<button type="submit" hidden disabled={busy}/></form>
 </IndiceModalFrame>;
}
export function ProjectSharingDialog({item,locale,actor,onClose,onSaved}:{item:ProjectSummary;locale:string;actor:string;onClose:()=>void;onSaved:()=>void}){
 const c=projectManagementCopy(locale),[info,setInfo]=useState<ProjectSharing|null>(null),[members,setMembers]=useState<ProjectMember[]>([]),[chosen,setChosen]=useState<Set<number>>(new Set()),[query,setQuery]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0),request=useRef<{id:string;version:number;users:number[]}|null>(null),selection=useRef(false);
 useEffect(()=>{const abort=new AbortController();setLoading(true);setError('');projectManagementApi.sharing(item.id,abort.signal).then(value=>{if(abort.signal.aborted)return;setInfo(value);if(!selection.current)setChosen(new Set(value.members.map(m=>m.id)));}).catch(error=>{if(!abort.signal.aborted)setError(projectActionError(error,locale));});return()=>abort.abort();},[item.id,retry]);
 useEffect(()=>{const abort=new AbortController();setLoading(true);const timer=setTimeout(()=>{projectManagementApi.members(query.trim(),abort.signal).then(value=>{if(!abort.signal.aborted)setMembers(value);}).catch(error=>{if(!abort.signal.aborted)setError(projectActionError(error,locale));}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});},query?250:0);return()=>{abort.abort();clearTimeout(timer);};},[query,retry]);
 const people=[...new Map([...(info?.members??[]).filter(m=>m.name.toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale))),...members].map(m=>[m.id,m])).values()];
 function toggle(id:number){selection.current=true;setChosen(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else if(next.size<50)next.add(id);return next;});}
 async function save(){if(busy||!info)return;request.current??={id:crypto.randomUUID(),version:info.version,users:[...chosen].sort((a,b)=>a-b)};const value=request.current;setBusy(true);setError('');try{await projectManagementApi.share(item.id,value.version,value.id,value.users,actor);onSaved();}catch(error){setError(projectActionError(error,locale));if((error as {status?:number}).status===400)request.current=null;}finally{setBusy(false);}}
 return <IndiceModalFrame open busy={busy} contentClassName="indice-idea-workspace-modal project-management-modal" title={c.share} description={item.name} tone="blue" icon={<Share2/>} closeLabel={c.close} onOpenChange={value=>{if(!value&&!busy)onClose();}} footer={<><Button variant="outline" disabled={busy} onClick={onClose}>{c.cancel}</Button><Button disabled={busy||loading||!info} onClick={()=>void save()}>{busy?c.loading:c.saveAccess}</Button></>}>
  <div className="project-share-form"><div className="project-sharing-note"><IndiceEmoji name="people" className="size-8"/><p>{c.shareHint}</p></div><label className="workspace-field"><span>{c.teamSearch}</span><div className="project-member-search"><Search size={18}/><input autoFocus value={query} maxLength={120} onChange={e=>setQuery(e.target.value)} disabled={busy||!!request.current}/></div></label><div className="project-member-count" role="status">{chosen.size} / 50 {c.selected}</div>
   {error&&<div className="workspace-error" role="alert">{error}<Button variant="outline" disabled={busy} onClick={()=>{request.current=null;selection.current=false;setRetry(v=>v+1);}}>{c.refresh}</Button></div>}
   {loading?<p role="status">{c.loading}</p>:!people.length?<p>{c.teamEmpty}</p>:<div className="project-member-list">{people.map(person=><label key={person.id} className="project-member-option"><input type="checkbox" checked={chosen.has(person.id)} disabled={busy||!!request.current||!person.available&&!chosen.has(person.id)||!chosen.has(person.id)&&chosen.size>=50} onChange={()=>toggle(person.id)}/><span><strong>{person.name}</strong>{!person.available&&<small>{c.unavailable}</small>}</span></label>)}</div>}
   <small>{c.peopleLimit}</small>
  </div>
 </IndiceModalFrame>;
}
function ProjectLinkDialog({item,locale,onClose,onCopied}:{item:ProjectSummary;locale:string;onClose:()=>void;onCopied:()=>void}){
 const c=projectManagementCopy(locale),url=projectLink(item,window.location.origin),[message,setMessage]=useState(''),copied=useRef(false);
 async function copy(){try{await navigator.clipboard.writeText(url);setMessage(c.linkCopied);if(!copied.current){copied.current=true;onCopied();}}catch{setMessage(c.manualCopy);}}
 return <IndiceModalFrame open contentClassName="indice-idea-workspace-modal project-management-modal" title={c.copyLink} description={c.linkHint} tone="blue" icon={<Link/>} closeLabel={c.close} onOpenChange={value=>{if(!value)onClose();}} footer={<><Button variant="outline" onClick={onClose}>{c.close}</Button><Button onClick={()=>void copy()}><Copy size={17}/>{c.copyLink}</Button></>}><label className="workspace-field"><span>{c.link}</span><input autoFocus readOnly value={url} onFocus={e=>e.currentTarget.select()}/></label>{message&&<p className="project-link-message" role="status">{message}</p>}</IndiceModalFrame>;
}
