import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,CheckCircle2,Copy,FolderPlus,Hand,Loader2,Pencil,Plus,Redo2,Trash2,Undo2,X} from 'lucide-react';
import {IndiceModalFrame} from '../../components/indice-modal';
import {Button} from '../../components/ui/button';
import {OriginalModuleEmoji} from '../../components/icons/OriginalModuleEmoji';
import {useIdeasBoard} from '../../BasicModules/Sales/Funneling/useIdeasBoard';
import {ideasBoardCopy} from '../../BasicModules/Sales/Funneling/ideasBoardCopy';
import {connect,withoutNode,type BoardContent,type IdeaNode} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import {areaOrder,areas,areaIcons,elementBounds,newElement,sameSystemIdeas,symbols,type Area,type SystemNode} from './systemBoardModel';
import {systemBoardApi} from './ideaWorkspaceApi';
import {WorkspaceCanvas} from './WorkspaceCanvas';
import {NodeAppearanceControls} from '../../BasicModules/Sales/Funneling/NodeAppearanceControls';
import {workspaceCopy} from './workspaceCopy';

export function SystemBoard({locale,active,onSaveProject}:{locale:string;active:boolean;onSaveProject:(content:BoardContent,actor:string)=>void}) {
 const c=workspaceCopy(locale),b=ideasBoardCopy(locale),board=useIdeasBoard(systemBoardApi,sameSystemIdeas);
 const [canvasExpanded,setCanvasExpanded]=useState(false);
 const [tool,setTool]=useState<'PAN'|'CONNECT'>('PAN'),[selection,setSelection]=useState<string|null>(null),[source,setSource]=useState<string|null>(null);
 const [draft,setDraft]=useState<SystemNode|null>(null),[label,setLabel]=useState<{id:string;text:string}|null>(null),[message,setMessage]=useState(''),[reloadConfirm,setReloadConfirm]=useState(false);
 const [focus,setFocus]=useState<{key:number;area?:Area}>(),sequence=useRef(0);
 const selected=board.content.nodes.find(n=>n.id===selection) as SystemNode|undefined;
 const disabled=board.loading||board.loadError;
 function add(category:Area) {const node=newElement(board.content,category);if(!node){setMessage(c.limit);return;}if(category==='FINANCE')node.text=c.iconLabels[node.icon as keyof typeof c.iconLabels];setDraft(node);}
 function remove() {if(selection)board.commit(withoutNode(board.content,selection));setSelection(null);setSource(null);}
 function link(id:string) {if(!source||!board.content.nodes.some(n=>n.id===source)){setSource(id);return;}if(source===id)return;const next=connect(board.content,source,id);if(next===board.content&&next.connections.length>=200)setMessage(c.limit);else board.commit(next);setSource(null);setTool('PAN');}
 function duplicate() {if(!selected)return;const node=newElement(board.content,selected.category);if(!node){setMessage(c.limit);return;}const duplicate:SystemNode={...node,text:selected.text,icon:selected.icon,kind:selected.kind,assetId:selected.assetId,appearance:selected.appearance,width:selected.width,height:selected.height};const bounds=elementBounds(duplicate);duplicate.x=Math.min(duplicate.x,bounds.right-duplicate.width);duplicate.y=Math.min(duplicate.y,bounds.bottom-duplicate.height);board.commit({...board.content,nodes:[...board.content.nodes,duplicate]});setSelection(node.id);}
 return <section hidden={!active} className="idea-board system-board" data-system-board>
  <div hidden={canvasExpanded}><header className="idea-board-heading"><div className="idea-board-brand"><span className="idea-board-emblem"><ArrowUpRight size={24}/></span><div><h2>{c.system}</h2><p>{c.systemHint}</p></div></div>
   <div className="idea-board-heading-meta"><span className="idea-board-status" data-state={board.state} role="status">{board.loading||board.state==='saving'?<Loader2 size={14}/>:<CheckCircle2 size={14}/>}<span>{board.loading?b.saving:board.state==='saving'?b.saving:board.state==='saved'?b.saved:board.state==='conflict'?b.conflict:b.error}</span></span><button className="idea-board-button idea-board-secondary" disabled={disabled||board.state!=='saved'} onClick={()=>onSaveProject(structuredClone(board.content),board.actor.current)}><FolderPlus size={18}/>{c.saveProject}</button></div>
  </header>
  <div className="system-flow" aria-label={c.overview}>{areaOrder.map((category,i)=><span key={category}><span className="system-flow-number">{i+1}</span>{c[areas[category].label]}<span aria-hidden="true">→</span></span>)}<span aria-hidden="true">↻</span></div>
  <div className="system-area-nav" role="toolbar" aria-label={c.system}>
   <button className="idea-board-button idea-board-secondary" disabled={disabled} onClick={()=>setFocus({key:++sequence.current})}>{c.allAreas}</button>
   {areaOrder.map(category=><div key={category} className="system-area-controls" data-category={category}>
    <button className="idea-board-button" disabled={disabled} onClick={()=>setFocus({key:++sequence.current,area:category})}><OriginalModuleEmoji id={areas[category].module} className="size-7"/>{c[areas[category].label]}<span className="system-area-count">{(board.content.nodes as SystemNode[]).filter(n=>n.category===category).length}</span></button>
    <button className="idea-board-button" aria-label={`${c.add}: ${c[areas[category].label]}`} title={`${c.add}: ${c[areas[category].label]}`} disabled={disabled} onClick={()=>add(category)}><Plus size={18}/></button>
   </div>)}
  </div>
  <div className="workspace-actionbar" role="toolbar" aria-label={c.selectHint}>
   <button className="idea-board-button" aria-pressed={tool==='PAN'} disabled={disabled} onClick={()=>{setTool('PAN');setSource(null);}}><Hand size={17}/>{c.move}</button>
   <button className="idea-board-button" aria-pressed={tool==='CONNECT'} disabled={disabled} onClick={()=>{setTool('CONNECT');setSource(selection);}}><ArrowUpRight size={17}/>{c.connect}</button>
   {selected&&<><span className="workspace-selected-name">{selected.text}</span><button className="idea-board-button" onClick={()=>setDraft({...selected})}><Pencil size={17}/>{c.edit}</button><button className="idea-board-button" onClick={duplicate}><Copy size={17}/>{c.duplicate}</button><button className="idea-board-button" onClick={remove}><Trash2 size={17}/>{c.remove}</button></>}
   <div className="workspace-history"><button className="idea-board-button" aria-label={b.undo} disabled={disabled||!board.history.past.length} onClick={()=>board.travel('undo')}><Undo2 size={17}/></button><button className="idea-board-button" aria-label={b.redo} disabled={disabled||!board.history.future.length} onClick={()=>board.travel('redo')}><Redo2 size={17}/></button></div>
  </div>
  {(message||board.state==='error'||board.state==='conflict')&&<div className="idea-board-notice" role="status">{message|| (board.state==='conflict'?b.conflict:c.saveError)}{board.state==='error'&&<button className="idea-board-button" onClick={()=>void board.retry()}>{c.retry}</button>}{board.state==='conflict'&&<><button className="idea-board-button" disabled={board.checking} onClick={()=>void board.retry()}>{b.recheck}</button><button className="idea-board-button" onClick={()=>setReloadConfirm(true)}>{b.reload}</button></>}<button className="idea-board-button" aria-label={b.close} onClick={()=>setMessage('')}><X size={16}/></button></div>}
  </div>
  {disabled?<div className="idea-board-loading" role="status">{board.loading?c.loading:<>{c.saveError}<button className="idea-board-button" onClick={board.reload}>{c.retry}</button></>}</div>:<WorkspaceCanvas content={board.content} onChange={board.commit} locale={locale} active={active} tool={tool} selected={selection} source={source} onSelect={setSelection} onConnect={link} onEdit={n=>setDraft({...n} as SystemNode)} onLabel={(id,text)=>setLabel({id,text})} onRemove={remove} focusRequest={focus} initialFit={board.content.nodes.length===0} onExpandedChange={setCanvasExpanded} expandedTools={<div className="system-expanded-tools" role="toolbar" aria-label={c.system}>
   {areaOrder.map(category=><button key={category} className="idea-board-button" aria-label={`${c.add}: ${c[areas[category].label]}`} onClick={()=>add(category)}><OriginalModuleEmoji id={areas[category].module} className="size-6"/><Plus size={14}/>{c[areas[category].label]}</button>)}
   <button className="idea-board-button" aria-pressed={tool==='PAN'} onClick={()=>{setTool('PAN');setSource(null);}}><Hand size={16}/>{c.move}</button><button className="idea-board-button" aria-pressed={tool==='CONNECT'} onClick={()=>{setTool('CONNECT');setSource(selection);}}><ArrowUpRight size={16}/>{c.connect}</button>
   {selected&&<><button className="idea-board-button" onClick={()=>setDraft({...selected})}><Pencil size={16}/>{c.edit}</button><button className="idea-board-button" onClick={remove}><Trash2 size={16}/>{c.remove}</button></>}
   <button className="idea-board-button" aria-label={b.undo} disabled={!board.history.past.length} onClick={()=>board.travel('undo')}><Undo2 size={16}/></button><button className="idea-board-button" aria-label={b.redo} disabled={!board.history.future.length} onClick={()=>board.travel('redo')}><Redo2 size={16}/></button>
   <button className="idea-board-button idea-board-secondary" disabled={board.state!=='saved'} onClick={()=>onSaveProject(structuredClone(board.content),board.actor.current)}><FolderPlus size={16}/>{c.saveProject}</button><span role="status">{board.state==='saved'?b.saved:board.state==='saving'?b.saving:board.state==='conflict'?b.conflict:c.saveError}</span>
   {(board.state==='error'||board.state==='conflict')&&<button className="idea-board-button" onClick={()=>{if(board.state==='conflict')setReloadConfirm(true);else void board.retry();}}>{board.state==='conflict'?b.reload:c.retry}</button>}
  </div>}/>}
  {draft&&<SystemElementDialog key={draft.id} node={draft} isNew={!board.content.nodes.some(n=>n.id===draft.id)} locale={locale} actor={board.actor.current} onClose={()=>setDraft(null)} onSave={node=>{const exists=board.content.nodes.some(n=>n.id===node.id);board.commit({...board.content,nodes:exists?board.content.nodes.map(n=>n.id===node.id?node:n):[...board.content.nodes,node]});setDraft(null);setSelection(node.id);setFocus({key:++sequence.current,area:node.category});}}/>}
  {label&&<IndiceModalFrame contentClassName="indice-idea-workspace-modal" open onOpenChange={open=>{if(!open)setLabel(null);}} title={c.connectionLabel} description={c.connectHint} icon={<ArrowUpRight/>} tone="coral" footer={<><Button variant="outline" onClick={()=>setLabel(null)}>{c.cancel}</Button><Button onClick={()=>{board.commit({...board.content,connections:board.content.connections.map(link=>link.id===label.id?{...link,label:label.text.trim()}:link)});setLabel(null);}}>{c.save}</Button></>}>
   <label className="workspace-field">{c.connectionLabel}<input autoFocus maxLength={160} value={label.text} onChange={e=>setLabel({...label,text:e.target.value})}/></label><button className="idea-board-button" onClick={()=>{board.commit({...board.content,connections:board.content.connections.filter(link=>link.id!==label.id)});setLabel(null);}}><Trash2 size={16}/>{c.remove}</button>
  </IndiceModalFrame>}
  {reloadConfirm&&<IndiceModalFrame contentClassName="indice-idea-workspace-modal" open onOpenChange={setReloadConfirm} title={b.reload} description={b.discardHint} icon={<Redo2/>} tone="coral" modalType="confirmation" footer={<><Button variant="outline" onClick={()=>setReloadConfirm(false)}>{c.cancel}</Button><Button onClick={()=>{setReloadConfirm(false);setSelection(null);setSource(null);board.reload();}}>{b.discard}</Button></>}><p>{b.conflict}</p></IndiceModalFrame>}
 </section>;
}

function SystemElementDialog({node,isNew,locale,actor,onClose,onSave}:{node:SystemNode;isNew:boolean;locale:string;actor:string;onClose:()=>void;onSave:(node:SystemNode)=>void}) {
 const c=workspaceCopy(locale),[draft,setDraft]=useState({...node}),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),uploadId=useRef(crypto.randomUUID());
 useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
 const image=preview||(draft.assetId?systemBoardApi.photoUrl(draft.assetId):'');
 async function save(){
  const name=draft.text.trim();if(!name||name.length>120||/[\x00-\x1f\x7f]/.test(name)){setError(c.nameRequired);return;}
  setBusy(true);setError('');try{let assetId=draft.assetId;if(file)assetId=(await systemBoardApi.upload(file,uploadId.current,actor)).id;onSave({...draft,text:name,assetId,kind:assetId?'IMAGE':'TEXT'});}catch{setError(c.saveError);}finally{setBusy(false);}
 }
 const placeholder=c[`${areas[draft.category].label}Example` as 'personExample'];
 return <IndiceModalFrame contentClassName="indice-idea-workspace-modal" open busy={busy} onOpenChange={open=>{if(!open)onClose();}} title={`${isNew?c.add:c.edit} · ${c[areas[draft.category].label]}`} description={draft.category==='FINANCE'?c.financeHint:c.addHint} icon={<OriginalModuleEmoji id={areas[draft.category].module} className="size-10"/>} iconPresentation="original" tone="coral" closeLabel={c.cancel}
  footer={<><Button variant="outline" disabled={busy} onClick={onClose}>{c.cancel}</Button><Button disabled={busy} onClick={()=>void save()}>{busy?c.loading:c.save}</Button></>}>
  <form className="workspace-element-form" onSubmit={e=>{e.preventDefault();void save();}}>
   <div className="workspace-element-preview">{image?<img src={image} alt=""/>:<span aria-hidden="true">{symbols[draft.icon]}</span>}<span>{draft.text||c[areas[draft.category].label]}</span></div>
   <label className="workspace-field">{c.name}<input autoFocus aria-label={c.name} maxLength={120} value={draft.text} placeholder={placeholder} aria-invalid={!!error&&!draft.text.trim()} onChange={e=>setDraft({...draft,text:e.target.value})} disabled={busy}/></label>
   <fieldset disabled={busy} className="workspace-icon-field"><legend>{c.icon}</legend><div className="workspace-icon-picker">{areaIcons[draft.category].map(icon=><button key={icon} type="button" aria-label={c.iconLabels[icon as keyof typeof c.iconLabels]} aria-pressed={draft.icon===icon&&!image} onClick={()=>{const oldName=c.iconLabels[draft.icon as keyof typeof c.iconLabels],name=c.iconLabels[icon as keyof typeof c.iconLabels];setDraft({...draft,icon,assetId:null,kind:'TEXT',text:draft.category==='FINANCE'&&(!draft.text||draft.text===oldName)?name:draft.text});setFile(null);}}><span aria-hidden="true">{symbols[icon]}</span><span>{c.iconLabels[icon as keyof typeof c.iconLabels]}</span></button>)}</div></fieldset>
   {draft.category==='PERSON'&&<div><label className="workspace-field">{c.photo}<input type="file" accept="image/png,image/jpeg,image/webp" aria-label={c.photo} disabled={busy} onChange={e=>{const selected=e.target.files?.[0];if(selected){if(!['image/png','image/jpeg','image/webp'].includes(selected.type)||!selected.size||selected.size>5*1024*1024||selected.name.length>180){setError(c.imageError);}else{setFile(selected);uploadId.current=crypto.randomUUID();setError('');}}e.target.value='';}}/></label>{image&&<button type="button" className="idea-board-button" onClick={()=>{setFile(null);setDraft({...draft,assetId:null,kind:'TEXT'});}} disabled={busy}>{c.removePhoto}</button>}</div>}
   <fieldset disabled={busy} style={{border:0,padding:0,margin:0,minWidth:0}}><NodeAppearanceControls node={image?{...draft,kind:'IMAGE'}:draft} onChange={value=>setDraft(value as SystemNode)} locale={locale} system bounds={elementBounds(draft)}/></fieldset>
   {error&&<p className="workspace-error" role="alert">{error}</p>}
   <button hidden type="submit" disabled={busy}/>
  </form>
 </IndiceModalFrame>;
}
