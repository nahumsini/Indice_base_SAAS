import {useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'react-router';
import {MoreHorizontal,LayoutGrid,List,RefreshCw,Home,ArrowUp,FolderInput} from 'lucide-react';
import {Button} from '../../components/ui/button';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '../../components/ui/dropdown-menu';
import {TableBody,TableCell,TableRow} from '../../components/ui/table';
import {IndiceModuleShell,IndiceTitleBar,IndiceWorkspaceNavigation,IndiceFilterBar,IndiceFilterSearch,IndiceFilterSelect} from '../../components/frontend-os';
import {IndiceTableShell,IndiceOperationalTable,IndiceTableHeaderRow} from '../../components/table/IndiceTableEngine';
import {DataTablePagination} from '../../components/table/DataTablePagination';
import {useLanguage} from '../../context/LanguageContext';
import {useAuthorizationRevision} from '../../hooks/useAuthorizationRevision';
import {filesApi} from './filesApi';
import {ApiClientError} from '../../lib/apiClient';
import {filesCopy,type FilesCopy} from './filesCopy';
import {fileEmoji,fileSize,validFileBatch,canShowFileThumbnail,type FileEntry,type FilePage,type FileAction} from './filesModel';
import {FileEditDialog,FileSharingDialog,FilePreviewDialog} from './FileDialogs';
import {IndiceEmoji} from '../../components/icons/ModuleTabEmoji';
import './filesWorkspace.css';
type Job={id:string;file:File;parent:string|null;actor:string;state:'waiting'|'uploading'|'saved'|'failed';capacity?:boolean};
type Dialog={action:FileAction|'folder';entry?:FileEntry};

function EntryArtwork({entry,compact=false}:{entry:FileEntry;compact?:boolean}){
 const [failed,setFailed]=useState(false);
 const thumbnail=canShowFileThumbnail(entry)&&!failed;
 const name=entry.kind==='FOLDER'?'folder':entry.contentType.startsWith('image/')?'photo':entry.contentType.startsWith('audio/')||entry.contentType.startsWith('video/')?undefined:'documents';
 return <span className={`files-artwork${compact?' files-artwork-compact':''}${thumbnail?' files-artwork-image':''}`} aria-hidden="true">
  {thumbnail?<img src={filesApi.content(entry.id,true)} alt="" loading="lazy" decoding="async" onError={()=>setFailed(true)}/>:<IndiceEmoji name={name} fallback={<span>{fileEmoji(entry)}</span>} className={compact?'size-6':'size-11'}/>}
 </span>;
}
function EntryActions({entry,c,onAction}:{entry:FileEntry;c:FilesCopy;onAction:(action:FileAction,entry:FileEntry)=>void}){
 const action=(kind:FileAction,emoji:string,label:string)=><DropdownMenuItem key={kind} className="min-h-11 gap-2" onClick={()=>onAction(kind,entry)}><span aria-hidden="true">{emoji}</span>{label}</DropdownMenuItem>;
 return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={`${c.actions}: ${entry.name}`}><MoreHorizontal size={20}/></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="min-w-52">{entry.trashed?action('restore','♻️',c.restore):<>{action('open',entry.kind==='FOLDER'?'📂':'👁️',c.open)}{entry.kind==='FILE'&&<DropdownMenuItem asChild><a className="min-h-11 gap-2" href={filesApi.content(entry.id)} download={entry.name}><span aria-hidden="true">📥</span>{c.download}</a></DropdownMenuItem>}{action('share','👥',entry.permission>=3?c.share:c.access)}{entry.permission>=2&&action('rename','✏️',c.rename)}{entry.permission>=3&&<>{action('move','📂',c.move)}{action('trash','🗑️',c.sendTrash)}</>}</>}</DropdownMenuContent></DropdownMenu>;
}
export default function FilesWorkspace({onNavigate}:{onNavigate?:(page?:string)=>void}){const revision=useAuthorizationRevision();return <FilesBrowser key={revision} onNavigate={onNavigate}/>;}
function FilesBrowser({onNavigate}:{onNavigate?:(page?:string)=>void}){
 const {currentLanguage}=useLanguage(),locale=currentLanguage.code,c=filesCopy(locale);const [params,setParams]=useSearchParams();
 const scope=['OWNED','SHARED','TRASH'].includes(params.get('view')??'')?params.get('view')!:'OWNED',folder=params.get('folder')||null;
 const [data,setData]=useState<FilePage|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[query,setQuery]=useState(''),[search,setSearch]=useState(''),[type,setType]=useState('ALL'),[page,setPage]=useState(1),[size,setSize]=useState(25),[view,setView]=useState('grid'),[refresh,setRefresh]=useState(0),[dialog,setDialog]=useState<Dialog|null>(null),[jobs,setJobs]=useState<Job[]>([]),[uploading,setUploading]=useState(false),[drag,setDrag]=useState(false),[widths,setWidths]=useState<Record<string,number>>({name:360,owner:210,size:130,updated:190});
 const fileInput=useRef<HTMLInputElement>(null),mounted=useRef(true),running=useRef(false),controller=useRef(new AbortController());
 useEffect(()=>{mounted.current=true;controller.current=new AbortController();return()=>{mounted.current=false;controller.current.abort();};},[]);
 useEffect(()=>{const timer=setTimeout(()=>{setSearch(query.trim());setPage(1);},250);return()=>clearTimeout(timer);},[query]);
 useEffect(()=>{const request=new AbortController();setLoading(true);setError('');filesApi.list({scope,folder:folder??undefined,q:search,type,page,pageSize:size},request.signal).then(value=>{if(!request.signal.aborted){setData(value);if(value.total>0&&value.items.length===0&&page>1)setPage(Math.max(1,Math.ceil(value.total/size)));}}).catch(()=>{if(!request.signal.aborted)setError('network');}).finally(()=>{if(!request.signal.aborted)setLoading(false);});return()=>request.abort();},[scope,folder,search,type,page,size,refresh]);
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(uploading||jobs.some(j=>j.state==='failed')){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[uploading,jobs]);
 function navigate(scopeValue:string,folderValue:string|null=null){if(running.current)return;setParams(old=>{const next=new URLSearchParams(old);next.set('view',scopeValue);folderValue?next.set('folder',folderValue):next.delete('folder');return next;});setQuery('');setSearch('');setPage(1);setData(null);}
 function action(kind:FileAction,entry:FileEntry){if(running.current)return;if(kind==='open'&&entry.kind==='FOLDER')navigate(scope,entry.id);else setDialog({action:kind,entry});}
 function saved(){setDialog(null);setRefresh(v=>v+1);}
 async function run(queue:Job[]){if(running.current)return;running.current=true;setUploading(true);setError('');setJobs(queue);for(const job of queue){if(controller.current.signal.aborted)break;setJobs(old=>old.map(j=>j.id===job.id?{...j,state:'uploading'}:j));try{await filesApi.upload(job.file,job.id,job.parent,job.actor,controller.current.signal);if(mounted.current)setJobs(old=>old.map(j=>j.id===job.id?{...j,state:'saved'}:j));}catch(error){if(mounted.current)setJobs(old=>old.map(j=>j.id===job.id?{...j,state:'failed',capacity:error instanceof ApiClientError&&error.code==='files_storage_capacity'}:j));}}
  running.current=false;if(mounted.current){setUploading(false);setRefresh(v=>v+1);}}
 function choose(files:File[]){setDrag(false);if(!data||scope==='TRASH'||scope==='SHARED'&&!folder||data.folderPermission<2||running.current)return;if(!validFileBatch(files)){setError('file');return;}void run(files.map(file=>({id:crypto.randomUUID(),file,parent:folder,actor:data.actorKey,state:'waiting'})));}
 const canCreate=!!data&&!loading&&data.folderPermission>=2&&scope!=='TRASH'&&(scope==='OWNED'||!!folder)&&!uploading;
 const columns=[{id:'name',label:c.name},{id:'owner',label:c.owner},{id:'size',label:c.size},{id:'updated',label:c.updated}].map(column=>({...column,width:widths[column.id],defaultWidth:widths[column.id],contentMinimumWidth:column.id==='name'?180:100,resizeLabel:c.resize}));
 const pagination=data?<DataTablePagination currentPage={page} totalPages={Math.max(1,Math.ceil(data.total/size))} totalCount={data.total} pageSize={size} pageSizeOptions={[25,50,100]} pageStart={data.total?(page-1)*size+1:0} pageEnd={Math.min(page*size,data.total)} onPageChange={setPage} onPageSizeChange={value=>{setSize(value);setPage(1);}}/>:null;
 const sectionTitle=scope==='SHARED'?c.shared:scope==='TRASH'?c.trash:c.owned;
 const crumbs=data?.breadcrumbs??[],parentFolder=crumbs.length>1?crumbs[crumbs.length-2].id:null;
 const sectionHint=scope==='SHARED'?c.sharedHint:scope==='TRASH'?c.trashSubtitle:c.ownedHint;
 const showCreateActions=scope==='OWNED'||!!folder&&!!data&&data.folderPermission>=2&&scope!=='TRASH';
 return <IndiceModuleShell containedWorkspace currentModule="files" tone="blue" title={c.title} subtitle={c.subtitle} activeTab={scope}
  onTabChange={value=>navigate(value)} onNavigate={onNavigate?page=>{if(!running.current)onNavigate(page);}:undefined}
  tabs={[{id:'OWNED',label:c.owned,icon:'📁',disabled:uploading},{id:'SHARED',label:c.shared,icon:'👥',disabled:uploading},{id:'TRASH',label:c.trash,icon:'🗑️',disabled:uploading}]}>
  <div className="files-workspace" aria-busy={uploading} onDragOver={event=>{event.preventDefault();if(canCreate&&event.dataTransfer.types.includes('Files'))setDrag(true);}} onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setDrag(false);}} onDrop={event=>{event.preventDefault();choose(Array.from(event.dataTransfer.files));}}>
  <IndiceTitleBar tone="blue" title={sectionTitle} subtitle={sectionHint} icon={<IndiceEmoji name="folder" className="size-8" />} actions={<>
   <Button variant="outline" className="files-secondary" disabled={uploading||loading} onClick={()=>setRefresh(v=>v+1)}><RefreshCw size={17}/>{c.refresh}</Button>
   {showCreateActions&&<><Button variant="outline" className="files-secondary" disabled={!canCreate} onClick={()=>setDialog({action:'folder'})}><IndiceEmoji name="folder" className="size-5" />{c.newFolder}</Button><Button className="files-primary" disabled={!canCreate} onClick={()=>fileInput.current?.click()}><IndiceEmoji name="upload" className="size-5" />{c.upload}</Button></>}
  </>}/>
  <input ref={fileInput} type="file" multiple hidden onChange={event=>{choose(Array.from(event.target.files??[]));event.target.value='';}}/>
  <nav className="files-folder-navigation" aria-label={c.folderNavigation}>
   <div className="files-folder-buttons"><Button variant="outline" className="files-secondary" disabled={!folder||uploading} onClick={()=>navigate(scope)}><Home size={17}/>{c.home}</Button>{folder&&<Button variant="outline" className="files-secondary" disabled={uploading||loading||!data} onClick={()=>navigate(scope,parentFolder)}><ArrowUp size={17}/>{c.upLevel}</Button>}</div>
   <ol className="files-breadcrumbs"><li>{folder?<button disabled={uploading} onClick={()=>navigate(scope)}>{sectionTitle}</button>:<span aria-current="page">{sectionTitle}</span>}</li>{crumbs.map((crumb,index)=><li key={crumb.id}><span aria-hidden="true">/</span>{index===crumbs.length-1?<span aria-current="page">{crumb.name}</span>:<button disabled={uploading} onClick={()=>navigate(scope,crumb.id)}>{crumb.name}</button>}</li>)}</ol>
  </nav>
  <IndiceWorkspaceNavigation variant="views" tone="blue" value={view} ariaLabel={c.title} onValueChange={setView} items={[{id:'grid',label:c.grid,icon:<LayoutGrid size={17}/>},{id:'list',label:c.list,icon:<List size={17}/>}]} />
  <IndiceFilterBar title={c.filters} gridClassName="md:grid-cols-[minmax(0,2fr)_minmax(180px,1fr)]" summary={<div className="files-filter-summary"><span>{c.results.replace('{count}',data?new Intl.NumberFormat(locale).format(data.total):'—')}</span>{(query||type!=='ALL')&&<Button variant="outline" className="min-h-11" onClick={()=>{setQuery('');setType('ALL');setPage(1);}}>{c.clear}</Button>}</div>}>
   <IndiceFilterSearch tone="blue" value={query} label={c.search} placeholder={c.search} onValueChange={value=>setQuery(value.slice(0,180))} onClear={()=>setQuery('')} clearLabel={c.clearSearch}/>
   <IndiceFilterSelect tone="blue" value={type} label={c.type} onValueChange={value=>{setType(value);setPage(1);}} options={['ALL','FOLDER','IMAGE','VIDEO','AUDIO','TEXT','DOCUMENT'].map(key=>({value:key,label:c[key as keyof FilesCopy]}))}/>
  </IndiceFilterBar>
  {error&&<div role="alert" className="files-alert">{error==='file'?c.invalidFile:c.error}<Button variant="outline" onClick={()=>setRefresh(v=>v+1)}>{c.retry}</Button></div>}
  {!!jobs.length&&<section className="files-upload-queue" aria-live="polite"><div><strong>📤 {uploading?c.uploading:c.upload}</strong>{!uploading&&jobs.some(j=>j.state==='failed')&&<Button variant="outline" onClick={()=>void run(jobs.filter(j=>j.state==='failed'))}>{c.retry}</Button>}{!uploading&&<Button variant="ghost" onClick={()=>setJobs([])}>{c.close}</Button>}</div>{jobs.map(job=><p key={job.id}><span>{job.file.name}</span><span>{job.state==='saved'?`✓ ${c.uploaded}`:job.state==='failed'?(job.capacity?c.capacity:c.failed):c.uploading}</span></p>)}</section>}
  {loading?<div className="files-empty" role="status">{c.loading}</div>:data?.items.length?view==='grid'?<section className="files-grid" aria-label={c.title}>{data.items.map(entry=><article key={entry.id}><div className="files-card-top"><button className="files-artwork-button" disabled={entry.trashed} aria-label={`${c.open}: ${entry.name}`} onClick={()=>action('open',entry)}><EntryArtwork entry={entry}/></button><EntryActions entry={entry} c={c} onAction={action}/></div><button className="files-entry-name" disabled={entry.trashed} onClick={()=>action('open',entry)}>{entry.name}</button><p>{entry.ownerName}</p><small>{fileSize(entry.sizeBytes,locale)} · {new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(new Date(entry.updatedAt))}</small><div className="files-card-bottom"><button onClick={()=>action(entry.trashed?'restore':'share',entry)}>{entry.trashed?`♻️ ${c.restore}`:entry.owned?`🔒 ${c.access}`:`👥 ${c.access}`}</button>{!entry.trashed&&entry.permission>=3&&<button className="files-move-action" disabled={uploading} aria-label={`${c.move}: ${entry.name}`} onClick={()=>action('move',entry)}><FolderInput size={16}/>{c.move}</button>}</div></article>)}</section>:<IndiceTableShell pagination={pagination}><IndiceOperationalTable minimumWidth={Object.values(widths).reduce((a,b)=>a+b,0)+110}><IndiceTableHeaderRow tone="blue" columns={columns} actions={{label:c.actions,width:110}} onResize={(id,width)=>setWidths(old=>({...old,[id]:width}))}/><TableBody>{data.items.map(entry=><TableRow key={entry.id}><TableCell><button className="files-entry-name files-entry-row" disabled={entry.trashed} onClick={()=>action('open',entry)}><EntryArtwork entry={entry} compact/><span>{entry.name}</span></button></TableCell><TableCell>{entry.ownerName}</TableCell><TableCell>{fileSize(entry.sizeBytes,locale)}</TableCell><TableCell>{new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(new Date(entry.updatedAt))}</TableCell><TableCell><div className="files-row-actions">{!entry.trashed&&entry.permission>=3&&<Button variant="ghost" size="icon" className="min-h-11 min-w-11" disabled={uploading} aria-label={`${c.move}: ${entry.name}`} onClick={()=>action('move',entry)}><FolderInput size={18}/></Button>}<EntryActions entry={entry} c={c} onAction={action}/></div></TableCell></TableRow>)}</TableBody></IndiceOperationalTable></IndiceTableShell>:<div className="files-empty"><span aria-hidden="true">{scope==='TRASH'?'🗑️':scope==='SHARED'?'👥':'📁'}</span><h3>{query||type!=='ALL'?c.noResults:scope==='TRASH'?c.emptyTrash:scope==='SHARED'?c.emptyShared:c.empty}</h3>{scope==='OWNED'&&!query&&type==='ALL'&&<p>{c.emptyHint}</p>}</div>}
  {(view==='grid'||!data?.items.length)&&pagination}{canCreate&&<p className="files-upload-hint">📥 {c.uploadHint}</p>}{drag&&<div className="files-drop-overlay"><span>📥</span>{c.drop}</div>}
  {dialog&&data&&(dialog.action==='open'?<FilePreviewDialog entry={dialog.entry!} c={c} onClose={()=>setDialog(null)}/>:dialog.action==='share'?<FileSharingDialog entry={dialog.entry!} actor={data.actorKey} c={c} onClose={()=>{setDialog(null);setRefresh(v=>v+1);}} onSaved={saved}/>:<FileEditDialog action={dialog.action} entry={dialog.entry} parentId={folder} actor={data.actorKey} c={c} onClose={()=>setDialog(null)} onSaved={saved}/>)}
 </div>
 </IndiceModuleShell>;
}
