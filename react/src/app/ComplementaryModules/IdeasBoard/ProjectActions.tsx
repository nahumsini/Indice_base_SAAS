import {useEffect,useRef,useState} from 'react';
import {Copy,Link,MoreHorizontal,Pencil,RotateCcw,Share2,Trash2,FolderOpen,Search,UserPlus,Lock} from 'lucide-react';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuSeparator,DropdownMenuTrigger} from '../../components/ui/dropdown-menu';
import {IndiceModalFrame} from '../../components/indice-modal';
import {Button} from '../../components/ui/button';
import {IndiceEmoji} from '../../components/icons/ModuleTabEmoji';
import type {Project,ProjectSummary} from './ideaWorkspaceApi';
import {projectManagementApi,captureProjectActor,projectLink,validProjectName,type ProjectMember,type ProjectSharing} from './projectManagementApi';
import {projectManagementCopy} from './projectManagementCopy';
import {projectCardCopy} from './projectCardCopy';
import {projectSharingCopy} from './projectSharingCopy';
import {ProjectSharedBy} from './ProjectSharedBy';
import {ProjectTrashDetails} from './ProjectTrashDetails';

type Action='rename'|'copy'|'trash'|'restore'|'share'|'link';
export function projectActionError(error:unknown,locale:string){const c=projectManagementCopy(locale),status=(error as {status?:number}).status;return status===409?c.conflict:status===403||status===404?c.missing:status===422?c.limit:status===400?c.invalid:c.error;}
export function ProjectActions({item,locale,onChanged,onUse,primaryCopy=false,onOpen}:{item:ProjectSummary;locale:string;onChanged:(message:string,project?:Project)=>void;onUse?:()=>void;primaryCopy?:boolean;onOpen?:()=>void}){
 const c=projectManagementCopy(locale),ui=projectCardCopy(locale),[action,setAction]=useState<Action|null>(null),[actor,setActor]=useState('');
 function open(action:Action){try{setActor(captureProjectActor());setAction(action);}catch(error){onChanged(projectActionError(error,locale));}}
 const owned=item.owned!==false,trashed=!!item.deletedAt;
 return <div className={`project-actions${onOpen?' project-actions-card':''}`} onClick={e=>e.stopPropagation()}>
  {onOpen&&<div className="project-card-action-buttons" data-action-count={trashed?1:owned?3:2}>{trashed?<Button type="button" variant="outline" className="project-card-restore" aria-label={`${c.restore}: ${item.name}`} onClick={()=>open('restore')}><RotateCcw size={16}/>{ui.restore}</Button>:<>
   <Button type="button" className="project-card-open" aria-label={`${ui.open}: ${item.name}`} onClick={onOpen}><FolderOpen size={16}/>{ui.open}</Button>
   <Button type="button" variant="outline" aria-label={`${owned?c.duplicate:c.copy}: ${item.name}`} onClick={()=>open('copy')}><Copy size={16}/>{owned?ui.duplicate:ui.copy}</Button>
   {owned&&<Button type="button" variant="outline" aria-label={`${c.share}: ${item.name}`} onClick={()=>open('share')}><Share2 size={16}/>{ui.share}</Button>}
  </>}</div>}
  {!onOpen&&primaryCopy&&!trashed&&<Button className="idea-board-primary" onClick={()=>open('copy')}><Copy size={17}/>{owned?c.duplicate:c.copy}</Button>}
  {(!onOpen||!trashed)&&<DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="idea-board-button project-menu-trigger" aria-label={`${c.manage}: ${item.name}`} title={c.manage}><MoreHorizontal size={20}/></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="project-actions-menu">
   {trashed?<DropdownMenuItem onSelect={()=>open('restore')}><RotateCcw size={18}/>{c.restore}</DropdownMenuItem>:<>
    {owned&&onUse&&<DropdownMenuItem onSelect={onUse}><FolderOpen size={18}/>{c.use}</DropdownMenuItem>}
    {owned&&<DropdownMenuItem onSelect={()=>open('rename')}><Pencil size={18}/>{c.rename}</DropdownMenuItem>}
    {!onOpen&&<DropdownMenuItem onSelect={()=>open('copy')}><Copy size={18}/>{owned?c.duplicate:c.copy}</DropdownMenuItem>}
    <DropdownMenuItem onSelect={()=>open('link')}><Link size={18}/>{c.copyLink}</DropdownMenuItem>
    {owned&&<>{!onOpen&&<DropdownMenuItem onSelect={()=>open('share')}><Share2 size={18}/>{c.share}</DropdownMenuItem>}<DropdownMenuSeparator/><DropdownMenuItem className="project-trash-action" onSelect={()=>open('trash')}><Trash2 size={18}/>{c.remove}</DropdownMenuItem></>}
   </>}
  </DropdownMenuContent></DropdownMenu>}
  {action==='share'?<ProjectSharingDialog item={item} locale={locale} actor={actor} onClose={()=>setAction(null)} onSaved={()=>{setAction(null);onChanged(c.sharedSaved);}}/>:action==='link'?<ProjectLinkDialog item={item} locale={locale} onClose={()=>setAction(null)} onCopied={()=>onChanged(c.linkCopied)}/>:action&&<ProjectMutationDialog key={action} action={action} item={item} locale={locale} actor={actor} onClose={()=>setAction(null)} onSaved={project=>{setAction(null);onChanged(action==='rename'?c.renamed:action==='trash'?c.trashed:action==='restore'?c.restored:c.copied,project);}}/>}
 </div>;
}
export function ProjectMutationDialog({action,item,locale,actor,onClose,onSaved}:{action:'rename'|'copy'|'trash'|'restore';item:ProjectSummary;locale:string;actor:string;onClose:()=>void;onSaved:(project:Project)=>void}){
 const c=projectManagementCopy(locale),ui=projectCardCopy(locale),[name,setName]=useState(action==='copy'?`${item.name} · ${c.copySuffix}`.slice(0,120):item.name),[busy,setBusy]=useState(false),[error,setError]=useState(''),request=useRef<{id:string;name:string}|null>(null);
 const copying=action==='copy',restoring=action==='restore',naming=copying||action==='rename';
 async function save(){if(busy)return;if(naming&&!validProjectName(name)){setError(c.nameError);return;}request.current??={id:crypto.randomUUID(),name:name.trim()};const input=request.current;setBusy(true);setError('');
  try{const project=copying?await projectManagementApi.copy(item,input.id,input.name,actor):await projectManagementApi.change(item.id,{version:item.version??0,mutationId:input.id,...(action==='rename'?{name:input.name}:{trashed:action==='trash'})},actor);onSaved(project);}
  catch(error){setError(projectActionError(error,locale));if((error as {status?:number}).status===400)request.current=null;}
  finally{setBusy(false);}
 }
 const title=action==='copy'?(item.owned===false?c.copy:c.duplicate):action==='rename'?c.rename:action==='trash'?c.remove:c.restore;
 return <IndiceModalFrame open busy={busy} contentClassName="indice-idea-workspace-modal project-management-modal" title={title} description={copying?c.copyHint:action==='trash'?c.removeHint:action==='restore'?c.restoreHint:item.name} tone="blue" icon={copying?<Copy/>:action==='trash'?<Trash2/>:action==='restore'?<RotateCcw/>:<Pencil/>} modalType={naming?'standard-form':'confirmation'} closeLabel={c.close} onOpenChange={value=>{if(!value&&!busy)onClose();}} footer={<><Button variant="outline" disabled={busy} onClick={onClose}>{c.cancel}</Button><Button disabled={busy} className={action==='trash'?'project-trash-confirm':undefined} onClick={()=>void save()}>{busy?c.loading:action==='trash'?c.remove:action==='restore'?c.restore:copying?c.copy:c.save}</Button></>}>
  <form className="workspace-project-form" onSubmit={e=>{e.preventDefault();void save();}}>{copying&&item.owned===false&&<div className="project-copy-source"><small>{ui.sourceProject}</small><strong>{item.name}</strong><ProjectSharedBy name={item.ownerName} locale={locale}/></div>}{naming?<label className="workspace-field"><span>{copying?c.copyName:c.name}</span><input autoFocus value={name} maxLength={120} onChange={e=>setName(e.target.value)} disabled={busy||!!request.current} aria-invalid={!!error&&!validProjectName(name)}/></label>:restoring?<div className="project-restore-summary"><small>{ui.restoreDestination}</small><strong>{item.name}</strong><span className="project-restore-privacy"><Lock size={16}/>{c.private}</span><ProjectTrashDetails deletedAt={item.deletedAt} locale={locale}/></div>:<p className="project-confirm-name">{item.name}</p>}{error&&<p className="workspace-error" role="alert">{error}</p>}<button type="submit" hidden disabled={busy}/></form>
 </IndiceModalFrame>;
}
export function ProjectSharingDialog({item,locale,actor,onClose,onSaved}:{item:ProjectSummary;locale:string;actor:string;onClose:()=>void;onSaved:()=>void}){
 const c=projectManagementCopy(locale),ui=projectSharingCopy(locale);
 const [info,setInfo]=useState<ProjectSharing|null>(null),[draft,setDraft]=useState<ProjectMember[]>([]),[members,setMembers]=useState<ProjectMember[]>([]),[chosen,setChosen]=useState<Set<number>>(new Set());
 const [query,setQuery]=useState(''),[accessLoading,setAccessLoading]=useState(true),[directoryLoading,setDirectoryLoading]=useState(true),[busy,setBusy]=useState(false);
 const [readError,setReadError]=useState(''),[directoryError,setDirectoryError]=useState(''),[error,setError]=useState(''),[failureStatus,setFailureStatus]=useState<number|undefined>();
 const [accessRetry,setAccessRetry]=useState(0),[directoryRetry,setDirectoryRetry]=useState(0),request=useRef<{id:string;version:number;users:number[]}|null>(null);
 useEffect(()=>{
  const abort=new AbortController();setAccessLoading(true);setReadError('');setInfo(null);
  projectManagementApi.sharing(item.id,abort.signal).then(value=>{
   if(abort.signal.aborted)return;
   setInfo(value);setDraft(value.members);setChosen(new Set(value.members.map(m=>m.id)));
  }).catch(error=>{if(!abort.signal.aborted)setReadError(projectActionError(error,locale));})
   .finally(()=>{if(!abort.signal.aborted)setAccessLoading(false);});
  return()=>abort.abort();
 },[item.id,accessRetry]);
 useEffect(()=>{
  const abort=new AbortController();setDirectoryLoading(true);setDirectoryError('');
  const timer=setTimeout(()=>{
   projectManagementApi.members(query.trim(),abort.signal).then(value=>{if(!abort.signal.aborted)setMembers(value);})
    .catch(()=>{if(!abort.signal.aborted)setDirectoryError(ui.searchError);})
    .finally(()=>{if(!abort.signal.aborted)setDirectoryLoading(false);});
  },query?250:0);
  return()=>{abort.abort();clearTimeout(timer);};
 },[query,directoryRetry]);
 const original=new Set(info?.members.map(person=>person.id)??[]);
 const additions=[...chosen].filter(id=>!original.has(id)).length,removals=[...original].filter(id=>!chosen.has(id)).length,changes=additions+removals;
 const locked=busy||!!request.current||accessLoading||!info||failureStatus===403||failureStatus===404;
 const candidates=members.filter(person=>person.available&&!chosen.has(person.id)&&!original.has(person.id));
 const results=query.trim()?candidates:candidates.slice(0,4);
 function add(person:ProjectMember){
  if(locked||!person.available||chosen.size>=50)return;
  setDraft(current=>current.some(p=>p.id===person.id)?current:[...current,person]);
  setChosen(current=>new Set([...current,person.id]));
 }
 function remove(person:ProjectMember){
  if(locked)return;
  setChosen(current=>{const next=new Set(current);next.delete(person.id);return next;});
  if(!original.has(person.id))setDraft(current=>current.filter(p=>p.id!==person.id));
 }
 function undo(person:ProjectMember){if(!locked&&chosen.size<50)setChosen(current=>new Set([...current,person.id]));}
 async function save(){
  if(busy||!info||accessLoading||failureStatus===409||failureStatus===403||failureStatus===404||(!changes&&!request.current))return;
  request.current??={id:crypto.randomUUID(),version:info.version,users:[...chosen].sort((a,b)=>a-b)};
  const value=request.current;setBusy(true);setError('');setFailureStatus(undefined);
  try{await projectManagementApi.share(item.id,value.version,value.id,value.users,actor);onSaved();}
  catch(error){const status=(error as {status?:number}).status;setError(status===409?ui.conflict:projectActionError(error,locale));setFailureStatus(status);if(status===400)request.current=null;}
  finally{setBusy(false);}
 }
 function reloadAccess(){request.current=null;setError('');setFailureStatus(undefined);setAccessRetry(value=>value+1);}
 return <IndiceModalFrame open busy={busy} contentClassName="indice-idea-workspace-modal project-management-modal project-sharing-modal" title={c.share} description={item.name} tone="blue" icon={<Share2/>} closeLabel={c.close} onOpenChange={value=>{if(!value&&!busy)onClose();}}
  footerSummary={<span className="project-share-summary" role="status">{changes?ui.pending.replace('{count}',String(changes)):ui.noChanges}</span>}
  footer={<><Button variant="outline" disabled={busy} onClick={onClose}>{c.cancel}</Button><Button disabled={busy||accessLoading||!info||(!changes&&!request.current)||failureStatus===409||failureStatus===403||failureStatus===404} onClick={()=>void save()}>{busy?ui.saving:request.current?ui.retrySave:c.saveAccess}</Button></>}>
  <div className="project-share-form">
   <div className="project-sharing-note"><IndiceEmoji name="people" className="size-8"/><p>{c.shareHint}</p></div>
   {error&&<div className="workspace-error project-sharing-error" role="alert"><p>{error}</p>{failureStatus===409&&<Button variant="outline" disabled={busy} onClick={reloadAccess}>{ui.reloadAccess}</Button>}</div>}
   <section className="project-access-section" aria-label={ui.access}>
    <div className="project-share-heading"><h3>{ui.access}</h3><span>{chosen.size} / 50</span></div>
    {accessLoading?<p className="project-share-empty" role="status">{c.loading}</p>:readError?<div className="workspace-error project-sharing-error" role="alert"><p>{readError}</p><Button variant="outline" onClick={reloadAccess}>{c.refresh}</Button></div>:<>
     <ul className="project-access-list">
      <li className="project-person-row project-owner-row"><span className="project-person-avatar"><Lock size={16}/></span><span className="project-person-label"><strong>{ui.you}</strong><small>{ui.owner}</small></span></li>
      {draft.map(person=>{
       const removed=!chosen.has(person.id),added=!original.has(person.id);
       return <li key={person.id} className="project-person-row" data-access-state={removed?'removed':added?'added':'saved'}>
        <span className="project-person-avatar" aria-hidden="true">{person.name.trim().slice(0,1).toLocaleUpperCase(locale)}</span>
        <span className="project-person-label"><strong>{person.name}</strong>{removed?<small className="project-access-pending">{ui.pendingRemove}</small>:added?<small className="project-access-pending">{ui.pendingAdd}</small>:!person.available?<small>{c.unavailable}</small>:null}</span>
        <Button type="button" variant="ghost" className="project-access-action" aria-label={(removed?ui.undoLabel:ui.removeLabel).replace('{name}',person.name)} disabled={locked||removed&&chosen.size>=50} onClick={()=>removed?undo(person):remove(person)}>{removed?<><RotateCcw size={15}/>{ui.undo}</>:ui.remove}</Button>
       </li>;
      })}
     </ul>
     {!draft.length&&<p className="project-share-empty">{ui.private}</p>}
    </>}
   </section>
   <section className="project-add-section" aria-label={ui.addEmployees}>
    <label className="workspace-field"><span>{ui.addEmployees}</span><div className="project-member-search"><Search size={18}/><input value={query} maxLength={120} placeholder={ui.searchPlaceholder} aria-label={c.teamSearch} onChange={e=>setQuery(e.target.value)} disabled={locked}/>{query&&<button type="button" className="project-search-clear" disabled={locked} onClick={()=>setQuery('')} aria-label={ui.clearSearch}>×</button>}</div></label>
    <div className="project-search-results" aria-busy={directoryLoading}>
     {directoryLoading?<p className="project-share-empty" role="status">{c.loading}</p>:directoryError?<div className="workspace-error project-sharing-error" role="alert"><p>{directoryError}</p><Button variant="outline" disabled={locked} onClick={()=>setDirectoryRetry(value=>value+1)}>{c.refresh}</Button></div>:results.length?<ul>{results.map(person=><li key={person.id} className="project-person-row"><span className="project-person-avatar" aria-hidden="true">{person.name.trim().slice(0,1).toLocaleUpperCase(locale)}</span><span className="project-person-label"><strong>{person.name}</strong></span><Button type="button" variant="outline" aria-label={ui.addLabel.replace('{name}',person.name)} disabled={locked||chosen.size>=50} onClick={()=>add(person)}><UserPlus size={16}/>{ui.add}</Button></li>)}</ul>:<p className="project-share-empty">{query.trim()?ui.noResults:ui.noCandidates}</p>}
    </div>
    <small className="project-share-help" role={chosen.size>=50?'status':undefined}>{chosen.size>=50?c.peopleLimit:ui.searchHelp}</small>
   </section>
  </div>
 </IndiceModalFrame>;
}
function ProjectLinkDialog({item,locale,onClose,onCopied}:{item:ProjectSummary;locale:string;onClose:()=>void;onCopied:()=>void}){
 const c=projectManagementCopy(locale),url=projectLink(item,window.location.origin),[message,setMessage]=useState(''),copied=useRef(false);
 async function copy(){try{await navigator.clipboard.writeText(url);setMessage(c.linkCopied);if(!copied.current){copied.current=true;onCopied();}}catch{setMessage(c.manualCopy);}}
 return <IndiceModalFrame open contentClassName="indice-idea-workspace-modal project-management-modal" title={c.copyLink} description={c.linkHint} tone="blue" icon={<Link/>} closeLabel={c.close} onOpenChange={value=>{if(!value)onClose();}} footer={<><Button variant="outline" onClick={onClose}>{c.close}</Button><Button onClick={()=>void copy()}><Copy size={17}/>{c.copyLink}</Button></>}><label className="workspace-field"><span>{c.link}</span><input autoFocus readOnly value={url} onFocus={e=>e.currentTarget.select()}/></label>{message&&<p className="project-link-message" role="status">{message}</p>}</IndiceModalFrame>;
}
