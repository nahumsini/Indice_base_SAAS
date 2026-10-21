import {MoreHorizontal} from 'lucide-react';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '../../components/ui/dropdown-menu';
import {BoardToolEmoji} from '../../BasicModules/Sales/Funneling/BoardToolEmoji';
import {useEffect,useRef,useState} from 'react';
import {FolderOpen,Search} from 'lucide-react';
import {IndiceModalFrame} from '../../components/indice-modal';
import {Button} from '../../components/ui/button';
import type {BoardFileContext,BoardFileSnapshot} from '../../BasicModules/Sales/Funneling/boardFileTools';
import {emptyBoard,type BoardContent} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import {SaveProjectDialog,type ProjectDraft} from './IdeaProjects';
import {ideaWorkspaceApi,type ProjectSummary} from './ideaWorkspaceApi';
import {sameSystemIdeas,toSystemDocument} from './systemBoardModel';
import {boardFileCopy} from './boardFileCopy';
import {editableProject,hasBoardWork,listBoardFiles,type BoardFileKind} from './boardFileModel';
import {workspaceCopy} from './workspaceCopy';
type SaveRequest={draft:ProjectDraft;expected:BoardFileSnapshot;next?:BoardContent;purpose:'save'|'new'|'open'};
export function BoardFileControls({context,locale,kind,onSaved}:{context:BoardFileContext;locale:string;kind:BoardFileKind;onSaved:()=>void}) {
 const f=boardFileCopy(locale),c=workspaceCopy(locale),latest=useRef(context);latest.current=context;
 const archived=useRef<BoardFileSnapshot|null>(null);
 const [picker,setPicker]=useState(false),[request,setRequest]=useState<SaveRequest|null>(null);
 useEffect(()=>{if(!context.active){setPicker(false);setRequest(null);}},[context.active]);
 function begin(purpose:SaveRequest['purpose'],next?:BoardContent){
  if(!latest.current.ready){latest.current.notify(f.openError);return;}const expected=latest.current.capture();
  if(purpose!=='save'&&(!hasBoardWork(expected.content)||(archived.current?.actor===expected.actor&&sameSystemIdeas(archived.current.content,expected.content)))){if(next&&latest.current.replace(expected,next)){archived.current=purpose==='open'?{actor:expected.actor,content:structuredClone(next)}:null;latest.current.notify(purpose==='new'?f.newReady:f.opened);}else latest.current.notify(f.openError);return;}
  setRequest({purpose,next,expected,draft:{actor:expected.actor,input:kind==='SYSTEM'?{kind,freeform:null,system:toSystemDocument(expected.content)}:{kind,freeform:expected.content,system:null}}});
 }
 function saved(){const pending=request;if(!pending)return;setRequest(null);archived.current=pending.expected;onSaved();
  if(pending.next){const replaced=latest.current.replace(pending.expected,pending.next);if(replaced)archived.current=pending.purpose==='open'?{actor:pending.expected.actor,content:structuredClone(pending.next)}:null;latest.current.notify(replaced?(pending.purpose==='new'?f.newReady:f.opened):f.changed);}
  else latest.current.notify(c.savedProject);
 }
 return <>
  <div className="board-file-actions" data-file-kind={kind} role="group" aria-label={kind==='SYSTEM'?c.system:c.myBoard}>
   {context.compact?<DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="idea-board-button idea-board-secondary board-file-options" aria-label={f.options} title={f.options} disabled={!context.ready}><MoreHorizontal size={20}/></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="board-file-options-menu"><DropdownMenuItem disabled={!context.ready} onSelect={()=>begin('new',emptyBoard())}><BoardToolEmoji name="new"/>{f.newFile}</DropdownMenuItem>{kind==='FREEFORM'&&<DropdownMenuItem disabled={!context.ready} onSelect={()=>setPicker(true)}><BoardToolEmoji name="open"/>{f.open}</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>:<>
   <button type="button" className="idea-board-button idea-board-secondary" disabled={!context.ready} aria-label={f.newFile} title={f.newFile} onClick={()=>begin('new',emptyBoard())}><BoardToolEmoji name="new"/><span>{f.newFile}</span></button>
   {kind==='FREEFORM'&&<button type="button" className="idea-board-button idea-board-secondary" disabled={!context.ready} onClick={()=>setPicker(true)}><BoardToolEmoji name="open"/>{f.open}</button>}
   </>}
   <button type="button" className="idea-board-button idea-board-primary" disabled={!context.ready} onClick={()=>begin('save')}><BoardToolEmoji name="save"/>{f.save}</button>
  </div>
  {picker&&<OpenBoardDialog kind={kind} locale={locale} onClose={()=>setPicker(false)} onOpen={content=>{setPicker(false);begin('open',content);}}/>}
  {request&&<SaveProjectDialog draft={request.draft} locale={locale} title={request.purpose==='new'?f.saveNew:request.purpose==='open'?f.saveOpen:undefined} description={request.purpose==='new'?f.newHint:request.purpose==='open'?f.openHint:f.saveHint} saveLabel={request.purpose==='new'?f.saveNew:request.purpose==='open'?f.saveOpen:undefined} onClose={()=>setRequest(null)} onSaved={saved}/>}
 </>;
}
function OpenBoardDialog({kind,locale,onClose,onOpen}:{kind:BoardFileKind;locale:string;onClose:()=>void;onOpen:(content:BoardContent)=>void}) {
 const f=boardFileCopy(locale),c=workspaceCopy(locale),[items,setItems]=useState<ProjectSummary[]>([]),[search,setSearch]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const alive=useRef(true),opening=useRef(false);
 useEffect(()=>{alive.current=true;const abort=new AbortController();setLoading(true);setError('');
  listBoardFiles((page,signal)=>ideaWorkspaceApi.list('',page,signal,50),kind,abort.signal).then(value=>{if(!abort.signal.aborted)setItems(value);}).catch(()=>{if(!abort.signal.aborted)setError(c.loadError);}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
  return()=>{alive.current=false;abort.abort();};
 },[kind,retry]);
 async function open(id:string){if(opening.current)return;opening.current=true;setBusy(true);setError('');
  try{const project=await ideaWorkspaceApi.get(id);if(alive.current)onOpen(editableProject(project,kind));}catch{if(alive.current)setError(f.openError);}finally{opening.current=false;if(alive.current)setBusy(false);}
 }
 const matches=items.filter(item=>item.name.toLocaleLowerCase(locale).includes(search.trim().toLocaleLowerCase(locale)));
 return <IndiceModalFrame open busy={busy} contentClassName="indice-idea-workspace-modal" title={`${f.openTitle} · ${kind==='SYSTEM'?c.system:c.myBoard}`} description={f.pickerHint} icon={<FolderOpen/>} tone="coral" closeLabel={c.cancel} onOpenChange={value=>{if(!value)onClose();}} footer={<Button variant="outline" disabled={busy} onClick={onClose}>{c.cancel}</Button>}>
  <div className="board-file-picker"><label className="workspace-field"><span>{f.search}</span><div><Search size={17}/><input autoFocus value={search} maxLength={120} onChange={event=>setSearch(event.target.value)} disabled={busy}/></div></label>
   {error&&<div className="workspace-error" role="alert">{error}<Button variant="outline" disabled={busy} onClick={()=>setRetry(value=>value+1)}>{c.retry}</Button></div>}
   {loading?<p role="status">{c.loading}</p>:!matches.length?<p>{f.empty}</p>:<div className="board-file-list">{matches.map(item=><article key={item.id}><div><strong>{item.name}</strong><span>{item.nodeCount} {c.ideas} · {new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(new Date(item.createdAt))}</span></div><Button disabled={busy} aria-label={`${f.open}: ${item.name}`} onClick={()=>void open(item.id)}>{busy?c.loading:f.open}</Button></article>)}</div>}
  </div>
 </IndiceModalFrame>;
}
