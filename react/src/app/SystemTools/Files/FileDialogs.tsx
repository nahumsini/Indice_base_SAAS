import {useEffect,useRef,useState} from 'react';
import {Button} from '../../components/ui/button';
import {Input} from '../../components/ui/input';
import {IndiceModalFrame,IndiceConfirmationDialog} from '../../components/indice-modal';
import {ApiClientError} from '../../lib/apiClient';
import {filesApi} from './filesApi';
import {fileCategory,fileEmoji,canMoveFileTo,type FileEntry,type FileMember,type FileSharing,type Crumb} from './filesModel';
import {IndiceEmoji} from '../../components/icons/ModuleTabEmoji';
import type {FilesCopy} from './filesCopy';
const primary='min-h-11 rounded-xl bg-white px-5 text-[var(--indice-brand-action)] hover:bg-blue-50';
const secondary='min-h-11 rounded-xl border border-white/40 bg-white px-5 text-slate-700 hover:bg-blue-50';

export function FileEditDialog({action,entry,parentId,actor,c,onClose,onSaved}:{action:'folder'|'rename'|'move'|'trash'|'restore';entry?:FileEntry;parentId:string|null;actor:string;c:FilesCopy;onClose:()=>void;onSaved:()=>void}){
 const [name,setName]=useState(entry?.name??''),[destination,setDestination]=useState<string|null>(entry?.parentId??null),[destinations,setDestinations]=useState<Crumb[]|null>(null),[search,setSearch]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[discard,setDiscard]=useState(false),[destinationRetry,setDestinationRetry]=useState(0);
 const working=useRef(false),mounted=useRef(true),id=useRef(crypto.randomUUID()),attempt=useRef<{body:string;id:string}|null>(null),initial=useRef(entry);
 const dirty=action==='folder'?!!name.trim():action==='rename'?name!==entry?.name:action==='move'?destination!==entry?.parentId:false;
 useEffect(()=>{mounted.current=true;const controller=new AbortController();if(action==='move'&&entry){setError('');setDestinations(null);filesApi.destinations(entry.id,controller.signal).then(v=>{if(!controller.signal.aborted)setDestinations(v);}).catch(()=>{if(!controller.signal.aborted)setError('network');});}return()=>{mounted.current=false;controller.abort();};},[destinationRetry]);
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function close(){if(working.current)return;dirty?setDiscard(true):onClose();}
 const moveAllowed=canMoveFileTo(entry,destination,destinations);
 async function save(){if(working.current||error==='conflict'||action==='move'&&!moveAllowed)return;if(['folder','rename'].includes(action)&&(!name.trim()||name.length>180||/[\\/\u0000-\u001f\u007f]/.test(name)))return;working.current=true;setBusy(true);setError('');const body=JSON.stringify([action,name,destination]);if(attempt.current?.body!==body)attempt.current={body,id:crypto.randomUUID()};try{if(action==='folder')await filesApi.folder(id.current,name.trim(),parentId,actor);else await filesApi.change(initial.current!,action.toUpperCase(),action==='rename'?{name:name.trim()}:action==='move'?{parentId:destination}:{},attempt.current.id,actor);if(mounted.current)onSaved();}catch(e){if(mounted.current)setError(e instanceof ApiClientError&&e.status===409?'conflict':'network');}finally{working.current=false;if(mounted.current)setBusy(false);}}
 if(discard)return <IndiceConfirmationDialog open tone="blue" title={c.discardTitle} description={c.discardHint} cancelLabel={c.keep} confirmLabel={c.discard} onCancel={()=>setDiscard(false)} onConfirm={onClose}/>;
 const title=action==='folder'?c.newFolder:action==='rename'?c.rename:action==='move'?c.move:action==='trash'?c.sendTrash:c.restore;
 const hint=action==='move'?c.moveHint:action==='trash'?c.trashHint:action==='restore'?c.restoreHint:action==='rename'?c.renameHint:c.folderHint;
 return <IndiceModalFrame open tone="blue" modalType={action==='trash'?'confirmation':'standard-form'} title={title} description={hint} iconPresentation="original" icon={<IndiceEmoji name={action==='folder'||action==='move'?'folder':action==='trash'?'trash':action==='restore'?'refresh':'pencil'} className="size-8" />} busy={busy} onOpenChange={open=>{if(!open)close();}} footer={<><Button className={secondary} disabled={busy} onClick={close}>{c.cancel}</Button><Button className={primary} disabled={busy||error==='conflict'||['folder','rename'].includes(action)&&!name.trim()||action==='move'&&!moveAllowed} onClick={()=>void save()}>{busy?c.saving:action==='trash'?c.sendTrash:action==='restore'?c.restore:action==='move'?c.moveHere:c.save}</Button></>}>
  <form className="files-dialog" onSubmit={e=>{e.preventDefault();if(action==='folder'||action==='rename')void save();}}>
   {entry&&<p className="files-selected-name">{fileEmoji(entry)} {entry.name}</p>}
   {error&&<p role="alert" className="files-alert">{error==='conflict'?c.conflict:c.error}</p>}
   <fieldset disabled={busy||error==='conflict'} className="space-y-4">
    {['folder','rename'].includes(action)&&<label className="files-field"><span>{c.name}</span><Input autoFocus value={name} maxLength={180} onChange={e=>setName(e.target.value)}/></label>}
    {action==='move'&&<><label className="files-field"><span>{c.findFolder}</span><Input value={search} onChange={e=>setSearch(e.target.value)}/></label><label className="files-field"><span>{c.destination}</span><select aria-label={c.destination} value={destination??''} onChange={e=>setDestination(e.target.value||null)}>
     <option value="" disabled={!entry?.owned||entry.parentId===null}>{c.privateRoot}</option>
     {entry?.parentId&&!destinations?.some(d=>d.id===entry.parentId)&&<option value={entry.parentId} disabled>{c.currentFolder}</option>}
     {destinations?.filter(d=>d.id===destination||d.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(d=><option key={d.id} value={d.id} disabled={d.id===entry?.parentId}>{d.name}</option>)}
    </select></label>{!destinations&&(error?<Button type="button" variant="outline" onClick={()=>setDestinationRetry(value=>value+1)}>{c.retry}</Button>:<p role="status">{c.loading}</p>)}</>}
   </fieldset>
  </form>
 </IndiceModalFrame>;
}

export function FileSharingDialog({entry,actor,c,onClose,onSaved}:{entry:FileEntry;actor:string;c:FilesCopy;onClose:()=>void;onSaved:()=>void}){
 const [data,setData]=useState<FileSharing|null>(null),[members,setMembers]=useState<FileMember[]>([]),[levels,setLevels]=useState<Record<string,number>>({}),[search,setSearch]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[discard,setDiscard]=useState(false);
 const baseline=useRef(''),working=useRef(false),mounted=useRef(true),attempt=useRef<{body:string;id:string}|null>(null);
 const canManage=(data?.entry.permission??entry.permission)>=3,dirty=!!data&&JSON.stringify(levels)!==baseline.current;
 useEffect(()=>{mounted.current=true;const controller=new AbortController();Promise.all([filesApi.sharing(entry.id,controller.signal),filesApi.members(controller.signal)]).then(([sharing,people])=>{if(controller.signal.aborted)return;setData(sharing);setMembers(people);const initial=Object.fromEntries(sharing.grants.filter(g=>!g.inherited&&!g.owner).map(g=>[g.userId,g.permission]));baseline.current=JSON.stringify(initial);setLevels(initial);}).catch(()=>{if(!controller.signal.aborted)setError('network');});return()=>{mounted.current=false;controller.abort();};},[]);
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function close(){if(working.current)return;dirty?setDiscard(true):onClose();}
 async function save(){if(!data||!canManage||working.current||error==='conflict')return;working.current=true;setBusy(true);setError('');const grants=Object.entries(levels).filter(([,level])=>level>0).map(([userId,permission])=>({userId:Number(userId),permission})).sort((a,b)=>a.userId-b.userId),body=JSON.stringify(grants);if(attempt.current?.body!==body)attempt.current={body,id:crypto.randomUUID()};try{await filesApi.share(data.entry,grants,attempt.current.id,actor);if(mounted.current)onSaved();}catch(e){if(mounted.current)setError(e instanceof ApiClientError&&e.status===409?'conflict':'network');}finally{working.current=false;if(mounted.current)setBusy(false);}}
 if(discard)return <IndiceConfirmationDialog open tone="blue" title={c.discardTitle} description={c.discardHint} cancelLabel={c.keep} confirmLabel={c.discard} onCancel={()=>setDiscard(false)} onConfirm={onClose}/>;
 const direct=new Map(members.map(m=>[m.id,m]));data?.grants.filter(g=>!g.owner&&!g.inherited).forEach(g=>{if(!direct.has(g.userId))direct.set(g.userId,{id:g.userId,name:g.name});});
 const owners=new Set(data?.grants.filter(g=>g.owner&&!g.inherited).map(g=>g.userId));
 const people=[...direct.values()].filter(m=>!owners.has(m.id)&&m.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
 return <IndiceModalFrame open tone="blue" modalType="standard-form" title={c.access} description={c.sharingHint} iconPresentation="original" icon={<IndiceEmoji name="people" className="size-8" />} busy={busy} onOpenChange={open=>{if(!open)close();}} footer={<><Button className={secondary} disabled={busy} onClick={close}>{c.close}</Button>{canManage&&<Button className={primary} disabled={!data||!dirty||busy||error==='conflict'} onClick={()=>void save()}>{busy?c.saving:c.save}</Button>}</>}>
  <div className="files-dialog"><p className="files-selected-name">{fileEmoji(entry)} {entry.name}</p>{error&&<p role="alert" className="files-alert">{error==='conflict'?c.conflict:c.error}</p>}{!data?<p role="status">{c.loading}</p>:<>
   <div className="files-grants">{data.grants.filter(g=>g.owner||g.inherited).map((g,index)=><div key={`${g.userId}:${index}`}><span>👤 {g.name}<small>{g.inherited?c.inherited:c.ownerBadge}</small></span><span>{g.permission===3?c.MANAGE:g.permission===2?c.EDIT:c.VIEW}</span></div>)}</div>
   {canManage?<><label className="files-field"><span>{c.employeeSearch}</span><Input value={search} onChange={e=>setSearch(e.target.value)}/></label><fieldset disabled={busy||error==='conflict'} className="files-grants">{people.map(m=><label key={m.id}><span>👤 {m.name}</span><select aria-label={`${c.access}: ${m.name}`} value={levels[m.id]??0} onChange={e=>setLevels(old=>{const next={...old};if(Number(e.target.value))next[m.id]=Number(e.target.value);else delete next[m.id];return next;})}>{[0,1,2,3].map(n=><option key={n} value={n}>{n===0?c.NONE:n===1?c.VIEW:n===2?c.EDIT:c.MANAGE}</option>)}</select></label>)}</fieldset></>:<div className="files-grants">{data.grants.filter(g=>!g.inherited&&!g.owner).map(g=><div key={g.userId}><span>👤 {g.name}</span><span>{g.permission===3?c.MANAGE:g.permission===2?c.EDIT:c.VIEW}</span></div>)}</div>}
  </>}</div>
 </IndiceModalFrame>;
}

export function FilePreviewDialog({entry,c,onClose}:{entry:FileEntry;c:FilesCopy;onClose:()=>void}){
 const [text,setText]=useState<string|null>(null),[error,setError]=useState(false);const kind=fileCategory(entry);
 useEffect(()=>{const controller=new AbortController();if(kind==='TEXT')filesApi.text(entry,controller.signal).then(value=>{if(!controller.signal.aborted)setText(value);}).catch(()=>{if(!controller.signal.aborted)setError(true);});return()=>controller.abort();},[entry.id]);
 const url=filesApi.content(entry.id,true);
 return <IndiceModalFrame open tone="blue" modalType="operational-workspace" title={entry.name} description={c.previewHint} icon={<span>{fileEmoji(entry)}</span>} onOpenChange={open=>{if(!open)onClose();}} footer={<><Button className={secondary} onClick={onClose}>{c.close}</Button><a className={`files-modal-link ${primary}`} href={filesApi.content(entry.id)} download={entry.name}>{c.download}</a></>}>
  <div className="files-preview">{error?<p role="alert">{c.error}</p>:kind==='IMAGE'?<img src={url} alt={entry.name} onError={()=>setError(true)}/>:kind==='VIDEO'?<video controls preload="metadata" src={url} onError={()=>setError(true)}/>:kind==='AUDIO'?<div className="files-audio"><span aria-hidden="true">🎧</span><audio controls preload="metadata" src={url} onError={()=>setError(true)}/></div>:kind==='TEXT'?text===null?<p role="status">{c.loading}</p>:<><pre>{text}</pre>{entry.sizeBytes>102400&&<p>{c.textTruncated}</p>}</>:<div className="files-preview-empty"><span aria-hidden="true">📄</span><p>{c.noPreview}</p></div>}</div>
 </IndiceModalFrame>;
}
