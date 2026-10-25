import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,Camera,Check,Columns2,ImagePlus,LoaderCircle,Maximize2,RotateCcw,Trash2} from 'lucide-react';
import type {FiveSMetadata} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import {fiveSCopy} from './fiveSCopy';
import {fiveSEvidenceCopy} from './fiveSEvidenceCopy';
import './fiveSEvidence.css';

export type FiveSEvidenceKey='beforeAssetId'|'afterAssetId';
type EvidenceView='EDIT'|'PAIR'|FiveSEvidenceKey;
type EvidenceProps={
 actionId:string; evidence:FiveSMetadata; locale:string; readonly:boolean; busy:boolean; uploadingKey:FiveSEvidenceKey|null;
 assetUrl:(id:string)=>string; error?:{key:FiveSEvidenceKey;message:string}; retryKey?:FiveSEvidenceKey;
 onUpload:(file:File,key:FiveSEvidenceKey)=>void; onRemove:(key:FiveSEvidenceKey)=>void;
 onInvalid:(key:FiveSEvidenceKey,message:string)=>void; onRetry:()=>void;
};
const slots=['beforeAssetId','afterAssetId'] as const;

export function FiveSEvidencePhoto({id,assetUrl,label,locale}:{id:string;assetUrl:(id:string)=>string;label:string;locale:string}){
 const [failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0),c=fiveSEvidenceCopy(locale),url=assetUrl(id);
 useEffect(()=>{setFailed(false);},[id,url]);
 return <div className="five-s-evidence-image">{failed?<div className="five-s-evidence-image-error" role="status"><Camera size={24} aria-hidden="true"/><p>{c.imageError}</p><button type="button" className="idea-board-button" onClick={()=>{setFailed(false);setAttempt(value=>value+1);}}><RotateCcw size={16} aria-hidden="true"/>{c.reload}</button></div>:<img key={`${id}:${attempt}`} src={url} alt={label} onError={()=>setFailed(true)}/>}</div>;
}

export function FiveSEvidence({actionId,evidence:f,locale,readonly,busy,uploadingKey,assetUrl,error,retryKey,onUpload,onRemove,onInvalid,onRetry}:EvidenceProps){
 const c=fiveSCopy(locale),e=fiveSEvidenceCopy(locale),[view,setView]=useState<EvidenceView>('EDIT'),[dragging,setDragging]=useState<FiveSEvidenceKey|null>(null),dragDepth=useRef(0),panelRef=useRef<HTMLDivElement>(null),comparisonRef=useRef<HTMLDivElement>(null),previousView=useRef<EvidenceView>('EDIT');
 const paired=!!f.beforeAssetId&&!!f.afterAssetId;
 const label=(key:FiveSEvidenceKey)=>key==='beforeAssetId'?c.before:c.after;
 const comparing=view!=='EDIT';
 // A removed image or a changed action must not leave an empty comparison pane.
 useEffect(()=>{setView('EDIT');setDragging(null);dragDepth.current=0;},[actionId]);
 useEffect(()=>{if(view==='PAIR'&&!paired||view!=='EDIT'&&view!=='PAIR'&&!f[view])setView('EDIT');},[f.beforeAssetId,f.afterAssetId,view,paired]);
 useEffect(()=>{
  if(previousView.current===view)return;
  previousView.current=view;
  if(view!=='EDIT'){
   comparisonRef.current?.scrollIntoView({block:'start'});
   comparisonRef.current?.querySelector<HTMLButtonElement>('button[aria-pressed=true]')?.focus({preventScroll:true});
  }else panelRef.current?.querySelector<HTMLButtonElement>('.five-s-evidence-compare,.five-s-evidence-enlarge')?.focus({preventScroll:true});
 },[view]);
 return <div className="five-s-evidence-panel" ref={panelRef}>
  <div className="five-s-evidence-top"><p>{comparing?e.compareHelp:e.intro}</p>{comparing?<button type="button" className="idea-board-button" onClick={()=>setView('EDIT')}><ArrowLeft size={16} aria-hidden="true"/>{e.back}</button>:paired&&<button type="button" className="idea-board-button five-s-evidence-compare" disabled={busy} onClick={()=>setView('PAIR')}><Columns2 size={17} aria-hidden="true"/>{e.compare}</button>}</div>
  {comparing?<div ref={comparisonRef} className="five-s-evidence-review">
   <div className="five-s-evidence-view" role="group" aria-label={e.view}>
    {([...(paired?[{value:'PAIR' as const,text:e.together}]:[]),...slots.filter(key=>!!f[key]).map(key=>({value:key,text:label(key)}))]).map(option=><button type="button" key={option.value} aria-pressed={view===option.value} onClick={()=>setView(option.value)}>{option.text}</button>)}
   </div>
   <div className="five-s-evidence-comparison" data-view={view}>
    {slots.filter(key=>!!f[key]&&(view==='PAIR'||view===key)).map(key=><figure key={key}><figcaption>{label(key)}</figcaption><FiveSEvidencePhoto id={f[key]!} assetUrl={assetUrl} label={label(key)} locale={locale}/></figure>)}
   </div>
  </div>:<div className="five-s-evidence-slots">{slots.map(key=>{
   const id=f[key],uploading=busy&&uploadingKey===key;
   return <section className="five-s-evidence-slot" key={key} aria-label={label(key)} data-dragging={dragging===key}
    onDragEnter={event=>{if(readonly||busy)return;event.preventDefault();dragDepth.current++;setDragging(key);}}
    onDragOver={event=>{event.preventDefault();event.dataTransfer.dropEffect=readonly||busy?'none':'copy';}}
    onDragLeave={event=>{if(readonly||busy)return;event.preventDefault();dragDepth.current=Math.max(0,dragDepth.current-1);if(!dragDepth.current)setDragging(null);}}
    onDrop={event=>{event.preventDefault();setDragging(null);dragDepth.current=0;if(readonly||busy)return;const files=event.dataTransfer.files;if(files.length!==1){onInvalid(key,e.oneFile);return;}onUpload(files[0],key);}}>
    <header><div><h5>{label(key)}</h5><p>{key==='beforeAssetId'?e.beforeHelp:e.afterHelp}</p></div>{id&&<span className="five-s-photo-ready"><Check size={15} aria-hidden="true"/>{e.ready}</span>}</header>
    {id?<><FiveSEvidencePhoto id={id} assetUrl={assetUrl} label={label(key)} locale={locale}/><button type="button" className="five-s-evidence-enlarge" disabled={busy} onClick={()=>setView(key)} aria-label={`${e.enlarge}: ${label(key)}`}><Maximize2 size={15} aria-hidden="true"/>{e.enlarge}</button></>:<div className="five-s-evidence-placeholder"><ImagePlus size={28} aria-hidden="true"/><span>{readonly?e.missing:dragging===key?e.dropReady:<><span className="five-s-evidence-drop-text">{e.drop}</span><span className="five-s-evidence-mobile-text">{e.mobileChoose}</span></>}</span></div>}
    {!readonly&&<div className="five-s-evidence-actions"><label className="idea-board-button five-s-evidence-upload" data-disabled={busy}>
     {uploading?<LoaderCircle className="five-s-evidence-spinner" size={17} aria-hidden="true"/>:<Camera size={17} aria-hidden="true"/>}{uploading?c.uploading:id?e.replace:e.choose}
     <input type="file" aria-label={`${id?e.replace:e.choose}: ${label(key)}`} accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)onUpload(file,key);}}/>
    </label>{id&&<button type="button" className="idea-board-button five-s-evidence-remove" disabled={busy} aria-label={`${e.remove}: ${label(key)}`} onClick={()=>onRemove(key)}><Trash2 size={16} aria-hidden="true"/>{e.remove}</button>}</div>}
    {uploading&&<p className="five-s-evidence-uploading" role="status">{c.uploading}</p>}
    {error?.key===key&&<div className="five-s-evidence-error" role="alert"><p>{error.message}</p>{retryKey===key&&<button type="button" className="idea-board-button" disabled={busy} onClick={onRetry}><RotateCcw size={16} aria-hidden="true"/>{c.retry}</button>}</div>}
   </section>;
  })}</div>}
  <p className="five-s-evidence-help">{c.photoHelp}{!readonly&&<> {e.savedOnAction}</>}</p>
 </div>;
}
