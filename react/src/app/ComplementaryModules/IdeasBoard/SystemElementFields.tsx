import {SystemCatalogPicker} from './SystemCatalogPicker';
import {ProcessStepsFields} from './ProcessStepsFields';
import {processCatalog,offeringCatalog,channelCatalog,financeCatalog} from './systemCatalog';
import {systemCatalogCopy} from './systemCatalogCopy';
import {channelIcons,systemIconLabels} from './systemChannelSymbols';
import {useEffect,useId,useRef,useState} from 'react';
import {Camera,ImagePlus,RotateCcw,Trash2} from 'lucide-react';
import type {BoardNodeEditorContext} from '../../BasicModules/Sales/Funneling/ideasBoardLayout';
import {NodeAppearanceControls} from '../../BasicModules/Sales/Funneling/NodeAppearanceControls';
import {nodeImageStyle,nodeTextStyle} from '../../BasicModules/Sales/Funneling/nodeAppearance';
import {boardWorkbenchCopy} from '../../BasicModules/Sales/Funneling/boardWorkbenchCopy';
import {areaIcons,areas,isSystemNode,isLegacySystemNode,symbols,systemBounds,type DiagnosticNode as SystemNode} from './systemBoardModel';
import {workspaceCopy} from './workspaceCopy';
import {systemElementCopy} from './systemElementCopy';

/** Named diagnostic elements use the same node, asset API and commit as the common editor. */
export function SystemElementFields({node,onChange,locale,api,actor,onBusyChange,nameManaged=false,bounds=systemBounds}:BoardNodeEditorContext) {
 const n=node as SystemNode,labels=systemIconLabels(locale),catalog=systemCatalogCopy(locale),c=workspaceCopy(locale),ui=systemElementCopy(locale),w=boardWorkbenchCopy(locale);
 const nameId=useId(),nameHelpId=useId();
 const input=useRef<HTMLInputElement>(null),uploading=useRef(false),alive=useRef(true),current=useRef(node as SystemNode);current.current=node as SystemNode;
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[failed,setFailed]=useState<{file:File;id:string}|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 if(!isLegacySystemNode(n))return null;
 const channel=channelIcons.includes(n.icon),available=areaIcons[n.category];const icons=available.includes(n.icon)?available:[n.icon,...available];
 const items=channel?channelCatalog:n.category==='PROCESS'?processCatalog:n.category==='FINANCE'?financeCatalog:offeringCatalog;
 function update(next:SystemNode){onChange(next);}
 function choose(icon:string){const oldName=labels[n.icon],nextName=labels[icon];update({...n,kind:'TEXT',assetId:null,icon,...(n.category==='PRODUCT'&&['BOX','SERVICE'].includes(icon)?{offeringType:icon==='SERVICE'?'SERVICE' as const:'PRODUCT' as const}:{}),text:(!n.text||n.text===oldName||n.text===c.iconLabels[n.icon as keyof typeof c.iconLabels])?nextName:n.text});setError('');setFailed(null);}
 const image=n.kind==='IMAGE'&&n.assetId?api.photoUrl(n.assetId):'',placeholder=c[`${areas[n.category].label}Example` as 'personExample'];
 async function photo(file:File,id:string=crypto.randomUUID()) {
  if(uploading.current)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||!file.size||file.size>5*1024*1024||file.name.length>180){setError(c.imageError);setFailed(null);return;}
  uploading.current=true;setBusy(true);onBusyChange(true);setError('');setFailed(null);
  try{const asset=await api.upload(file,id,actor);if(alive.current)update({...current.current,kind:'IMAGE',assetId:asset.id});}
  catch{if(alive.current){setError(ui.photoError);setFailed({file,id});}}
  finally{uploading.current=false;if(alive.current){setBusy(false);onBusyChange(false);}}
 }
 return <div className="system-element-editor">
  <div className="system-element-intro" data-category={n.category}>
   <span className="system-element-preview-label">{ui.preview}</span>
   <div className="system-element-card-preview">{image?<img src={image} alt="" style={nodeImageStyle(n)}/>:<span aria-hidden="true">{symbols[n.icon]??'✨'}</span>}<span style={nodeTextStyle(n)}>{n.text||(channel?catalog.channels:c[areas[n.category].label])}</span></div>

  </div>
  <div className="system-element-fields">
   {!nameManaged&&<div className="workspace-field"><label htmlFor={nameId}>{c.name}</label><input id={nameId} aria-describedby={nameHelpId} required autoFocus disabled={busy} maxLength={4000} placeholder={placeholder} value={n.text} onChange={e=>update({...n,text:e.target.value})}/><small id={nameHelpId}>{ui.nameHelp}</small></div>}
   {n.category==='PRODUCT'&&!channel&&<fieldset className="board-product-type" disabled={busy}><legend>{catalog.offering}</legend>{(['PRODUCT','SERVICE'] as const).map(type=><button key={type} type="button" aria-pressed={(n.offeringType??(n.icon==='SERVICE'?'SERVICE':'PRODUCT'))===type} onClick={()=>update({...n,offeringType:type,icon:['BOX','SERVICE'].includes(n.icon)?type==='SERVICE'?'SERVICE':'BOX':n.icon})}>{type==='PRODUCT'?'📦':'🤝'} {type==='PRODUCT'?catalog.product:catalog.service}</button>)}</fieldset>}
   {n.category==='PERSON'?<fieldset className="workspace-icon-field" disabled={busy}><legend>{c.icon}</legend><div className="workspace-icon-picker system-element-icons">{icons.map(icon=><button type="button" key={icon} aria-label={labels[icon]} aria-pressed={n.icon===icon&&!image} onClick={()=>choose(icon)}><span aria-hidden="true">{symbols[icon]}</span><span>{labels[icon]}</span></button>)}</div></fieldset>:<SystemCatalogPicker items={items} value={n.icon} onChange={choose} locale={locale} disabled={busy} label={channel?catalog.channels:n.category==='PROCESS'?catalog.processType:n.category==='FINANCE'?catalog.report:catalog.industry}/>}
   {(n.category==='PROCESS'||!!n.steps?.length)&&<ProcessStepsFields steps={n.steps??[]} onChange={steps=>update({...n,steps})} locale={locale} disabled={busy}/>}
   {(n.category==='PERSON'||!!image)&&<div className="system-element-photo"><div><Camera size={19}/><span>{c.photo}</span></div><div className="system-element-photo-actions"><button type="button" className="idea-board-button idea-board-secondary" disabled={busy} onClick={()=>input.current?.click()}><ImagePlus size={17}/>{busy?c.loading:image?ui.changePhoto:ui.photo}</button>{image&&<button type="button" className="idea-board-button" disabled={busy} onClick={()=>update({...n,kind:'TEXT',assetId:null})}><Trash2 size={16}/>{c.removePhoto}</button>}</div><small>{ui.photoHelp}</small><input ref={input} hidden type="file" accept="image/png,image/jpeg,image/webp" aria-label={c.photo} disabled={busy} onChange={e=>{const selected=e.target.files?.[0];e.target.value='';if(selected)void photo(selected);}}/></div>}
   {error&&<div role="alert" className="workspace-error">{error}{failed&&<button type="button" aria-label={c.retry} className="idea-board-button" onClick={()=>void photo(failed.file,failed.id)}><RotateCcw size={16}/>{c.retry}</button>}</div>}
  </div>
  <details className="board-editor-details"><summary>{w.appearance}</summary><fieldset disabled={busy}><NodeAppearanceControls node={n} locale={locale} system bounds={bounds} onChange={onChange}/></fieldset></details>
 </div>;
}
