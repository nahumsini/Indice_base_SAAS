import {IndiceTitleBar} from '../../components/frontend-os';
import {IndiceEmoji} from '../../components/icons/ModuleTabEmoji';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ChevronLeft,ChevronRight,FolderOpen,FolderPlus,Search} from 'lucide-react';
import {IndiceModalFrame} from '../../components/indice-modal';
import {Button} from '../../components/ui/button';
import {OriginalModuleEmoji} from '../../components/icons/OriginalModuleEmoji';
import {ideaWorkspaceApi,type Project,type ProjectInput,type ProjectPage} from './ideaWorkspaceApi';
import {fromSystemDocument} from './systemBoardModel';
import {WorkspaceCanvas} from './WorkspaceCanvas';
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
  <form onSubmit={e=>{e.preventDefault();void save();}} className="workspace-project-form"><label className="workspace-field">{c.projectName}<input autoFocus aria-label={c.projectName} value={name} maxLength={120} onChange={e=>setName(e.target.value)} disabled={busy||!!submitted.current} aria-invalid={!!error&&!name.trim()}/></label><p>{c.projectKind}: {draft.input.kind==='SYSTEM'?c.system:c.myBoard}</p>{error&&<p className="workspace-error" role="alert">{error}</p>}<button hidden type="submit" disabled={busy}/></form>
 </IndiceModalFrame>;
}

export function IdeaProjects({locale,active,revision}:{locale:string;active:boolean;revision:number}) {
 const c=workspaceCopy(locale),[search,setSearch]=useState(''),[page,setPage]=useState(1),[data,setData]=useState<ProjectPage|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(false),[retry,setRetry]=useState(0),[selected,setSelected]=useState<string|null>(null),[project,setProject]=useState<Project|null>(null);
 useEffect(()=>{
  if(!active||selected)return;const abort=new AbortController();setLoading(true);setError(false);const timer=setTimeout(()=>{
   ideaWorkspaceApi.list(search.trim(),page,abort.signal).then(result=>{if(abort.signal.aborted)return;setData(result);}).catch(()=>{if(!abort.signal.aborted)setError(true);}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
  },search?250:0);return()=>{abort.abort();clearTimeout(timer);};
 },[active,search,page,revision,retry,selected]);
 useEffect(()=>{
  if(!active||!selected){setProject(null);return;}const abort=new AbortController();setProject(null);setLoading(true);setError(false);
  ideaWorkspaceApi.get(selected,abort.signal).then(value=>{if(!abort.signal.aborted)setProject(value);}).catch(()=>{if(!abort.signal.aborted)setError(true);}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});return()=>abort.abort();
 },[active,selected,retry]);
 return <section hidden={!active} className="idea-board idea-projects" data-idea-projects>
  <IndiceTitleBar tone="coral" className="board-workspace-title-bar" title={selected&&project?project.summary.name:c.projects} subtitle={selected?c.readonly:c.projectsHint} icon={<IndiceEmoji name="folder" className="size-8"/>} actions={selected?<button className="idea-board-button idea-board-secondary" onClick={()=>{setSelected(null);setProject(null);}}><ArrowLeft size={17}/>{c.back}</button>:undefined}/>

  {!selected&&<div className="workspace-project-search"><label className="workspace-field"><span>{c.search}</span><div><Search size={18}/><input aria-label={c.search} value={search} maxLength={120} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></div></label><span>{data?.total??0} · {c.projects}</span></div>}
  {loading?<div className="idea-board-loading" role="status">{c.loading}</div>:error?<div className="idea-board-loading" role="alert">{c.loadError}<button className="idea-board-button" onClick={()=>setRetry(value=>value+1)}>{c.retry}</button></div>:selected&&project?<ProjectPreview key={project.summary.id} project={project} locale={locale}/>:<>
   {data?.items.length?<div className="workspace-project-grid">{data.items.map(item=><article key={item.id} className="workspace-project-card"><div className={`workspace-project-art ${item.kind==='SYSTEM'?'workspace-project-art-system':''}`} aria-hidden="true">{item.kind==='SYSTEM'?<><span/><span/><span/><span/><b>↻</b></>:<OriginalModuleEmoji id="ideas-board" className="size-16"/>}</div><div className="workspace-project-card-body"><span className="workspace-project-type">{item.kind==='SYSTEM'?c.system:c.myBoard}</span><h3>{item.name}</h3><p>{item.nodeCount} {c.ideas} · {item.connectionCount} {c.links}</p><time dateTime={item.createdAt}>{new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(new Date(item.createdAt))}</time><button className="idea-board-button idea-board-secondary" aria-label={`${c.open}: ${item.name}`} onClick={()=>setSelected(item.id)}><FolderOpen size={17}/>{c.open}</button></div></article>)}</div>:<div className="workspace-project-empty"><FolderOpen size={44}/><p>{search?c.noMatches:c.emptyProjects}</p></div>}
   {!!data?.total&&<div className="workspace-project-pagination"><span>{page} / {Math.max(1,Math.ceil(data.total/data.pageSize))}</span><button className="idea-board-button idea-board-secondary" aria-label={c.previous} disabled={page<=1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={18}/>{c.previous}</button><button className="idea-board-button idea-board-secondary" aria-label={c.next} disabled={page*data.pageSize>=data.total} onClick={()=>setPage(p=>p+1)}>{c.next}<ChevronRight size={18}/></button></div>}
  </>}
 </section>;
}
function ProjectPreview({project,locale}:{project:Project;locale:string}) {
 const [content,setContent]=useState(()=>project.system?fromSystemDocument(project.system):project.freeform!);
 return <WorkspaceCanvas content={content} onChange={setContent} readonly system={project.summary.kind==='SYSTEM'} locale={locale} initialFit/>;
}
