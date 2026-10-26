import {useState} from 'react';
import {CalendarDays,Check,CheckCircle2,Clock3,Pencil,Play,RotateCcw,UserRound} from 'lucide-react';
import type {IdeaNode} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import {fiveSCopy} from './fiveSCopy';
import {personalIdeasBoardApi} from './personalIdeasBoardApi';
import {FiveSEvidence} from './FiveSEvidence';
import {localDateKey,matchesFiveS} from './fiveSModel';

export function FiveSActionCard({node,locale,disabled,error,onEdit,onProgress}:{node:IdeaNode;locale:string;disabled:boolean;error?:string;onEdit:()=>void;onProgress:()=>void}){
 const c=fiveSCopy(locale),f=node.fiveS!,status=f.status??'PENDING';
 const hasDescription=!!f.action?.trim()&&f.action.trim()!==node.text.trim(),hasDetails=hasDescription||!!f.details?.trim()||!!f.result?.trim();
 const actionText=f.action?.trim()??'',title=node.text.trim();
 const descriptionPreview=actionText.startsWith(title+'\n')?actionText.slice(title.length).trim():actionText;
 const todayKey=localDateKey();
 const overdue=matchesFiveS(node,'OVERDUE'),today=f.dueDate===localDateKey()&&status!=='VERIFIED';
 const StatusIcon=status==='VERIFIED'?CheckCircle2:status==='IN_PROGRESS'?Play:Clock3;
 const ProgressIcon=status==='VERIFIED'?RotateCcw:status==='IN_PROGRESS'?Check:Play;
 const next=status==='VERIFIED'?c.reopen:status==='IN_PROGRESS'?c.verify:c.start;
 const date=f.dueDate?new Intl.DateTimeFormat(locale,{day:'numeric',month:'short',year:'numeric'}).format(new Date(f.dueDate+'T12:00:00')):c.noDate;
 return <article className="five-s-action-card" data-progress={status}>
  <span className="five-s-status" data-status={status}><StatusIcon size={14} aria-hidden="true"/>{c[status]}</span>
  <h5>{node.text}</h5>
  <dl className="five-s-card-meta">
   <div><dt><UserRound size={14} aria-hidden="true"/>{c.owner}</dt><dd data-empty={!f.owner?.trim()}>{f.owner?.trim()||c.noOwner}</dd></div>
   <div><dt><CalendarDays size={14} aria-hidden="true"/>{c.due}</dt><dd data-empty={!f.dueDate} data-overdue={overdue}>{f.dueDate?<time dateTime={f.dueDate}>{date}</time>:date}{overdue?<span className="five-s-date-alert">{c.overdueDate}</span>:today?<span className="five-s-date-today">{c.todayDate}</span>:null}</dd></div>
   {f.reviewDate&&<div className="five-s-card-review"><dt><CalendarDays size={14} aria-hidden="true"/>{c.review}</dt><dd data-review={f.reviewDate<todayKey?'OVERDUE':f.reviewDate===todayKey?'TODAY':'UPCOMING'}><time dateTime={f.reviewDate}>{new Intl.DateTimeFormat(locale,{day:'numeric',month:'short',year:'numeric'}).format(new Date(f.reviewDate+'T12:00:00'))}</time>{f.reviewDate<=todayKey&&<span className={f.reviewDate<todayKey?'five-s-review-alert':'five-s-review-today'}>{f.reviewDate<todayKey?c.reviewOverdue:c.reviewToday}</span>}</dd></div>}
  </dl>
  {hasDetails&&<details className="board-editor-details five-s-card-details">
   <summary><span>{c.viewDetails}{hasDescription&&<span className="five-s-card-description-preview">{descriptionPreview}</span>}</span></summary>
   <div className="five-s-card-expanded">
    {hasDescription&&<div><strong>{c.action}</strong><p>{f.action}</p></div>}
    {f.details?.trim()&&<div><strong>{c.notes}</strong><p>{f.details}</p></div>}
    {f.result?.trim()&&<div><strong>{c.result}</strong><p>{f.result}</p></div>}
   </div>
  </details>}
  {(f.beforeAssetId||f.afterAssetId)&&<FiveSCardEvidence node={node} locale={locale}/> }
  <div className="five-s-card-actions">
   <button type="button" className="idea-board-button five-s-progress-action" disabled={disabled} onClick={onProgress} aria-label={`${next}: ${node.text}`}><ProgressIcon size={16} aria-hidden="true"/>{next}</button>
   <button type="button" className="idea-board-button five-s-card-edit" disabled={disabled} onClick={onEdit} aria-label={`${c.edit}: ${node.text}`} title={c.edit}><Pencil size={16} aria-hidden="true"/>{c.editShort}</button>
  </div>
  {error&&<p className="five-s-progress-error" role="alert">{error}</p>}
 </article>;
}

export function FiveSCardEvidence({node,locale}:{node:IdeaNode;locale:string}){
 const c=fiveSCopy(locale),f=node.fiveS!,[open,setOpen]=useState(false);
 return <details className="board-editor-details five-s-card-photos" onToggle={event=>setOpen(event.currentTarget.open)}>
  <summary>{f.beforeAssetId&&f.afterAssetId?c.viewPhotosPair:f.beforeAssetId?c.viewPhotoBefore:c.viewPhotoAfter}</summary>
  {open&&<div className="five-s-card-evidence"><FiveSEvidence actionId={node.id} evidence={f} locale={locale} readonly busy={false} uploadingKey={null} assetUrl={personalIdeasBoardApi.photoUrl} onUpload={()=>{}} onRemove={()=>{}} onInvalid={()=>{}} onRetry={()=>{}}/></div>}
 </details>;
}
