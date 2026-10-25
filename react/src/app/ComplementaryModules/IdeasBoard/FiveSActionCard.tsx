import {CalendarDays,Check,CheckCircle2,Clock3,Pencil,Play,RotateCcw,UserRound} from 'lucide-react';
import type {IdeaNode} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import {fiveSCopy} from './fiveSCopy';
import {localDateKey,matchesFiveS} from './fiveSModel';

export function FiveSActionCard({node,locale,disabled,error,onEdit,onProgress}:{node:IdeaNode;locale:string;disabled:boolean;error?:string;onEdit:()=>void;onProgress:()=>void}){
 const c=fiveSCopy(locale),f=node.fiveS!,status=f.status??'PENDING';
 const overdue=matchesFiveS(node,'OVERDUE'),today=f.dueDate===localDateKey()&&status!=='VERIFIED';
 const StatusIcon=status==='VERIFIED'?CheckCircle2:status==='IN_PROGRESS'?Play:Clock3;
 const ProgressIcon=status==='VERIFIED'?RotateCcw:status==='IN_PROGRESS'?Check:Play;
 const next=status==='VERIFIED'?c.reopen:status==='IN_PROGRESS'?c.verify:c.start;
 const date=f.dueDate?new Intl.DateTimeFormat(locale,{day:'numeric',month:'short',year:'numeric'}).format(new Date(f.dueDate+'T12:00:00')):c.noDate;
 return <article className="five-s-action-card" data-progress={status}>
  <span className="five-s-status" data-status={status}><StatusIcon size={14} aria-hidden="true"/>{c[status]}</span>
  <h5>{node.text}</h5>
  {f.action?.trim()!==node.text.trim()&&<p className="five-s-card-description">{f.action}</p>}
  <dl className="five-s-card-meta">
   <div><dt><UserRound size={14} aria-hidden="true"/>{c.owner}</dt><dd data-empty={!f.owner?.trim()}>{f.owner?.trim()||c.noOwner}</dd></div>
   <div><dt><CalendarDays size={14} aria-hidden="true"/>{c.due}</dt><dd data-empty={!f.dueDate} data-overdue={overdue}>{f.dueDate?<time dateTime={f.dueDate}>{date}</time>:date}{overdue?<span className="five-s-date-alert">{c.overdueDate}</span>:today?<span className="five-s-date-today">{c.todayDate}</span>:null}</dd></div>
  </dl>
  <div className="five-s-card-actions">
   <button type="button" className="idea-board-button five-s-progress-action" disabled={disabled} onClick={onProgress} aria-label={`${next}: ${node.text}`}><ProgressIcon size={16} aria-hidden="true"/>{next}</button>
   <button type="button" className="idea-board-button five-s-card-edit" disabled={disabled} onClick={onEdit} aria-label={`${c.edit}: ${node.text}`} title={c.edit}><Pencil size={16} aria-hidden="true"/></button>
  </div>
  {error&&<p className="five-s-progress-error" role="alert">{error}</p>}
 </article>;
}
