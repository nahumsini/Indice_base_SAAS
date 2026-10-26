import {useEffect,useRef,useState} from 'react';
import type {BoardNodeEditorContext} from '../../BasicModules/Sales/Funneling/ideasBoardLayout';
import type {FiveSMetadata} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import {fiveSCopy} from './fiveSCopy';
import {fiveSSections} from './fiveSModel';
import {fiveSActionTitle} from './fiveSSetupModel';
import {FiveSEvidence,type FiveSEvidenceKey} from './FiveSEvidence';
export function FiveSFields({node,onChange,locale,api,actor,onBusyChange,readonly=false,assetUrl=api.photoUrl}:BoardNodeEditorContext&{readonly?:boolean;assetUrl?:(id:string)=>string}){
 const c=fiveSCopy(locale),f=node.fiveS!,current=useRef(node);current.current=node;
 const scope=useRef({actor,id:node.id,readonly});scope.current={actor,id:node.id,readonly};
 const alive=useRef(true),lock=useRef(false),[busy,setBusy]=useState(false),[failure,setFailure]=useState<{file:File;id:string;key:'beforeAssetId'|'afterAssetId'}|null>(null),[error,setError]=useState<{key:FiveSEvidenceKey;message:string}|undefined>(),[uploadingKey,setUploadingKey]=useState<FiveSEvidenceKey|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const change=(patch:Partial<FiveSMetadata>)=>onChange({...current.current,fiveS:{...current.current.fiveS!,...patch}});
 function changeAction(action:string){
  const value=current.current,previous=fiveSActionTitle(value.fiveS!.action??'');
  onChange({...value,text:!value.text.trim()||value.text===previous?fiveSActionTitle(action):value.text,fiveS:{...value.fiveS!,action}});
 }
 async function upload(file:File,key:'beforeAssetId'|'afterAssetId',id:string=crypto.randomUUID()){
  if(lock.current||scope.current.readonly||scope.current.actor!==actor||scope.current.id!==node.id)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||!file.size||file.size>5*1024*1024||file.name.length>180){setError({key,message:c.photoHelp});setFailure(null);return;}
  const source={actor,id:current.current.id};
  const validContext=()=>alive.current&&scope.current.actor===source.actor&&scope.current.id===source.id&&!scope.current.readonly;
  lock.current=true;setBusy(true);setUploadingKey(key);onBusyChange(true);setError(undefined);setFailure(null);
  try{const photo=await api.upload(file,id,actor);if(validContext())change({[key]:photo.id});}
  catch{if(validContext()){setError({key,message:c.uploadError});setFailure({file,key,id});}}
  finally{lock.current=false;if(alive.current){setBusy(false);setUploadingKey(null);onBusyChange(false);}}
 }
 return <div className="five-s-fields">
  <div className="five-s-form-grid">
   <label className="workspace-field five-s-full"><span>{c[`${f.section}Help`]} *</span><textarea autoFocus={!readonly} required rows={3} maxLength={1000} placeholder={c[`${f.section}Example`]} disabled={busy||readonly} value={f.action??''} onChange={e=>changeAction(e.target.value)}/><small>{c.actionHint}</small></label>
   <label className="workspace-field"><span>{c.owner} <small>({c.optional})</small></span><input maxLength={120} placeholder={c.ownerHint} disabled={busy||readonly} value={f.owner??''} onChange={e=>change({owner:e.target.value})}/></label>
   <label className="workspace-field"><span>{c.due} <small>({c.optional})</small></span><input type="date" min="1900-01-01" max="9999-12-31" disabled={busy||readonly} value={f.dueDate??''} onChange={e=>change({dueDate:e.target.value||null})}/></label>
  </div>
  <details className="board-editor-details" open={f.status==='VERIFIED'||undefined}>
   <summary>{c.followUp}</summary><div className="five-s-detail-fields">
    <label className="workspace-field"><span>{c.notes}</span><textarea rows={2} maxLength={1000} disabled={busy||readonly} value={f.details??''} onChange={e=>change({details:e.target.value})}/></label>
    <label className="workspace-field"><span>{c.result}{f.status==='VERIFIED'?' *':''}</span><textarea rows={2} maxLength={1000} required={f.status==='VERIFIED'} disabled={busy||readonly} value={f.result??''} onChange={e=>change({result:e.target.value})}/><small>{c.verifiedHelp}</small></label>
    <label className="workspace-field"><span>{c.review}</span><input type="date" disabled={busy||readonly} value={f.reviewDate??''} onChange={e=>change({reviewDate:e.target.value||null})}/></label>
   </div>
  </details>
  <details className="board-editor-details">
   <summary>{c.editingOptions}<span className="five-s-disclosure-status">{c[f.status??'PENDING']}</span></summary><div className="five-s-detail-fields">
    <div className="five-s-form-grid">
     <label className="workspace-field"><span>{c.section}</span><select disabled={busy||readonly} value={f.section} onChange={e=>change({section:e.target.value as FiveSMetadata['section']})}>{fiveSSections.map(s=><option key={s} value={s}>{c[s]}</option>)}</select></label>
     <label className="workspace-field"><span>{c.status}</span><select disabled={busy||readonly} value={f.status??'PENDING'} onChange={e=>change({status:e.target.value as FiveSMetadata['status']})}>{(['PENDING','IN_PROGRESS','VERIFIED'] as const).map(s=><option key={s} value={s}>{c[s]}</option>)}</select></label>
    </div>
    <label className="workspace-field"><span>{c.cardTitle}</span><input maxLength={180} disabled={busy||readonly} value={node.text} onChange={e=>onChange({...current.current,text:e.target.value||fiveSActionTitle(current.current.fiveS!.action??'')})}/><small>{c.cardTitleHint}</small></label>
   </div>
  </details>
  <details className="board-editor-details"><summary>{c.evidence}{(f.beforeAssetId||f.afterAssetId)&&<span className="five-s-disclosure-status">{Number(!!f.beforeAssetId)+Number(!!f.afterAssetId)} / 2</span>}</summary>
   <FiveSEvidence actionId={node.id} evidence={f} locale={locale} readonly={readonly} busy={busy} uploadingKey={uploadingKey} assetUrl={assetUrl}
    error={error} retryKey={failure?.key} onUpload={(file,key)=>void upload(file,key)}
    onRemove={key=>{if(readonly||lock.current)return;change({[key]:null});setError(undefined);setFailure(null);}}
    onInvalid={(key,message)=>{if(readonly||lock.current)return;setError({key,message});setFailure(null);}}
    onRetry={()=>{if(failure)void upload(failure.file,failure.key,failure.id);}}/>
  </details>
 </div>;
}
