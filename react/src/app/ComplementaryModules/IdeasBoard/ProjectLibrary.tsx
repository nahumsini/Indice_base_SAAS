import {useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'react-router';
import {ArrowLeft,ChevronLeft,ChevronRight,FolderOpen,RefreshCw,Search} from 'lucide-react';
import {IndiceTitleBar} from '../../components/frontend-os';
import {IndiceEmoji} from '../../components/icons/ModuleTabEmoji';
import {OriginalModuleEmoji} from '../../components/icons/OriginalModuleEmoji';
import {ideaWorkspaceApi,type Project,type ProjectPage,type ProjectSummary} from './ideaWorkspaceApi';
import {fromSystemDocument} from './systemBoardModel';
import {WorkspaceCanvas} from './WorkspaceCanvas';
import {workspaceCopy} from './workspaceCopy';
import {ProjectActions,projectActionError} from './ProjectActions';
import {projectManagementApi,type ProjectScope} from './projectManagementApi';
import {projectManagementCopy} from './projectManagementCopy';

export function IdeaProjects({locale,active,revision,onUseProject}:{locale:string;active:boolean;revision:number;onUseProject?:(project:Project)=>void}) {
 const c=workspaceCopy(locale),m=projectManagementCopy(locale),[params,setParams]=useSearchParams(),selected=params.get('project'),owner=params.get('owner'),[scope,setScope]=useState<ProjectScope>('OWNED'),[search,setSearch]=useState(''),[page,setPage]=useState(1),[data,setData]=useState<ProjectPage|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0),[project,setProject]=useState<Project|null>(null),[notice,setNotice]=useState(''),[using,setUsing]=useState(false);
 useEffect(()=>{
  if(!active||selected)return;const abort=new AbortController();setLoading(true);setError('');const timer=setTimeout(()=>{
   ideaWorkspaceApi.list(search.trim(),page,abort.signal,12,scope).then(result=>{if(abort.signal.aborted)return;setData(result);const last=Math.max(1,Math.ceil(result.total/result.pageSize));if(page>last)setPage(last);}).catch(error=>{if(!abort.signal.aborted)setError(projectActionError(error,locale));}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
  },search?250:0);return()=>{abort.abort();clearTimeout(timer);};
 },[active,search,page,scope,revision,retry,selected,locale]);
 useEffect(()=>{
  if(!active||!selected){setProject(null);return;}const abort=new AbortController();setProject(null);setLoading(true);setError('');
  if(!/^[0-9a-f-]{36}$/.test(selected)||owner!==null&&!/^[1-9]\d*$/.test(owner)){setError(m.missing);setLoading(false);return()=>abort.abort();}
  ideaWorkspaceApi.get(selected,abort.signal,owner===null?undefined:Number(owner)).then(value=>{if(!abort.signal.aborted)setProject(value);}).catch(error=>{if(!abort.signal.aborted)setError(projectActionError(error,locale));}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});return()=>abort.abort();
 },[active,selected,owner,revision,retry,locale]);
 const activeRef=useRef(active);activeRef.current=active;
 useEffect(()=>()=>{activeRef.current=false;},[]);
 useEffect(()=>{if(!active)setUsing(false);},[active]);
 function open(item:ProjectSummary){const next=new URLSearchParams(params);next.set('project',item.id);if(item.ownerId!=null)next.set('owner',String(item.ownerId));else next.delete('owner');setParams(next);setNotice('');}
 function back(){const next=new URLSearchParams(params);next.delete('project');next.delete('owner');setParams(next);setProject(null);}
 function changed(message:string,next?:Project){setNotice(message);if(message===m.linkCopied)return;if(next?.summary.deletedAt){back();setScope('TRASH');setPage(1);}else if(next&&next.summary.id!==selected){if(selected)open(next.summary);else{setScope('OWNED');setPage(1);}}setRetry(value=>value+1);}
 async function use(item:ProjectSummary){if(using||!onUseProject)return;setUsing(true);try{const value=await ideaWorkspaceApi.get(item.id,undefined,item.ownerId);if(activeRef.current)onUseProject(value);}catch(error){if(activeRef.current)setNotice(projectActionError(error,locale));}finally{if(activeRef.current)setUsing(false);}}
 if(!active)return <section hidden className="idea-board idea-projects" data-idea-projects/>;
 return <section hidden={!active} className="idea-board idea-projects" data-idea-projects>
  <IndiceTitleBar tone="coral" className="board-workspace-title-bar" title={selected&&project?project.summary.name:c.projects} subtitle={selected?m.viewOnly:m.hint} icon={<IndiceEmoji name="folder" className="size-8"/>} actions={selected?<div className="project-preview-actions"><button className="idea-board-button idea-board-secondary" onClick={back}><ArrowLeft size={17}/>{c.back}</button>{project&&<ProjectActions key={`${project.summary.ownerId}:${project.summary.id}:${project.summary.version}`} item={project.summary} locale={locale} primaryCopy onChanged={changed} onUse={project.summary.owned!==false&&onUseProject?()=>void use(project.summary):undefined}/>}</div>:<button type="button" className="idea-board-button idea-board-secondary" onClick={()=>setRetry(v=>v+1)} disabled={loading} aria-label={m.refresh}><RefreshCw size={17}/>{m.refresh}</button>}/>
  {notice&&<div className="workspace-success project-library-notice" role="status"><span>{notice}</span><button className="idea-board-button" aria-label={m.close} onClick={()=>setNotice('')}>×</button></div>}
  {using&&<p role="status">{m.working}</p>}
  {!selected&&<div className="project-library-filters"><div className="project-scope-tabs" role="group" aria-label={c.projects}>{([['OWNED',m.mine,'folder'],['SHARED',m.shared,'people'],['TRASH',m.trash,'documents']] as const).map(([value,label,icon])=><button type="button" key={value} aria-pressed={scope===value} onClick={()=>{setScope(value);setPage(1);setData(null);setNotice('');}}><IndiceEmoji name={icon} className="size-6"/>{label}</button>)}</div><div className="workspace-project-search"><label className="workspace-field"><span>{c.search}</span><div><Search size={18}/><input aria-label={c.search} value={search} maxLength={120} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></div></label><span aria-live="polite">{data?.total??0} · {scope==='OWNED'?m.mine:scope==='SHARED'?m.shared:m.trash}</span></div></div>}
  {loading?<div className="idea-board-loading" role="status">{c.loading}</div>:error?<div className="idea-board-loading" role="alert">{error}<button className="idea-board-button" onClick={()=>setRetry(value=>value+1)}>{c.retry}</button></div>:selected&&project?<ProjectPreview key={`${project.summary.ownerId}:${project.summary.id}`} project={project} locale={locale}/>:!selected&&<>
   {data?.items.length?<div className="workspace-project-grid">{data.items.map(item=><article key={`${item.ownerId}:${item.id}`} className="workspace-project-card"><div className={`workspace-project-art ${item.kind==='SYSTEM'?'workspace-project-art-system':''}`} aria-hidden="true">{item.kind==='SYSTEM'?<><span/><span/><span/><span/><b>↻</b></>:<OriginalModuleEmoji id="ideas-board" className="size-16"/>}</div><div className="workspace-project-card-body"><div className="project-card-topline"><span className="workspace-project-type">{item.kind==='SYSTEM'?c.system:c.myBoard}</span><ProjectActions item={item} locale={locale} onChanged={changed} onUse={onUseProject?()=>void use(item):undefined}/></div><h3>{item.name}</h3><div className={`project-access-badge ${item.owned===false||item.shareCount?'is-shared':''}`}><IndiceEmoji name={item.owned===false||item.shareCount?'people':'check'} className="size-4"/>{item.owned===false?`${m.from} ${item.ownerName??''}`:item.shareCount?`${m.withTeam} · ${item.shareCount}`:m.private}</div><p>{item.nodeCount} {c.ideas} · {item.connectionCount} {c.links}</p><time dateTime={item.createdAt}>{new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(new Date(item.createdAt))}</time>{item.deletedAt?<button className="idea-board-button idea-board-secondary" onClick={()=>open(item)}><FolderOpen size={17}/>{c.open}</button>:<button className="idea-board-button idea-board-secondary" aria-label={`${c.open}: ${item.name}`} onClick={()=>open(item)}><FolderOpen size={17}/>{c.open}</button>}</div></article>)}</div>:<div className="workspace-project-empty"><FolderOpen size={44}/><p>{search?c.noMatches:scope==='SHARED'?m.emptyShared:scope==='TRASH'?m.emptyTrash:m.emptyMine}</p></div>}
   {!!data?.total&&<div className="workspace-project-pagination"><span>{page} / {Math.max(1,Math.ceil(data.total/data.pageSize))}</span><button className="idea-board-button idea-board-secondary" aria-label={c.previous} disabled={page<=1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={18}/>{c.previous}</button><button className="idea-board-button idea-board-secondary" aria-label={c.next} disabled={page*data.pageSize>=data.total} onClick={()=>setPage(p=>p+1)}>{c.next}<ChevronRight size={18}/></button></div>}
  </>}
 </section>;
}
function ProjectPreview({project,locale}:{project:Project;locale:string}) {
 const [content,setContent]=useState(()=>project.system?fromSystemDocument(project.system):project.freeform!),m=projectManagementCopy(locale);
 return <WorkspaceCanvas content={content} onChange={setContent} readonly system={project.summary.kind==='SYSTEM'} locale={locale} initialFit assetUrl={id=>projectManagementApi.assetUrl(project.summary,id)} privacyLabel={project.summary.owned===false?`${m.from} ${project.summary.ownerName??''} · ${m.viewOnly}`:project.summary.shareCount?m.withTeam:m.private}/>;
}
