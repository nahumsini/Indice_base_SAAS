import { X } from 'lucide-react';
import { Input } from '../../components/ui/input';
/** Committed addresses are chips; unfinished input remains part of the draft and its validation. */
export function MailRecipients({ label,value,disabled,onChange }: {label:string;value:string;disabled:boolean;onChange:(value:string)=>void}) {
  const parts=value.split(/[,;]+/);const pending=parts.pop()??'';const addresses=parts.map(v=>v.trim()).filter(Boolean);
  const update=(tail:string)=>onChange([...addresses,tail].join(', '));
  return <div className="space-y-2"><label className="text-sm">{label}<Input aria-label={label} aria-describedby="mail-recipient-hint" value={pending.trimStart()} disabled={disabled} inputMode="email" maxLength={5000} className="mt-2 h-11" onChange={e=>update(e.target.value)} onBlur={()=>{if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pending.trim()))update(`${pending.trim()}, `);}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(pending.trim())update(`${pending.trim()}, `);}}}/></label>
    {!!addresses.length&&<div className="flex flex-wrap gap-2">{addresses.map((address,index)=><span key={`${address}-${index}`} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-blue-50 pl-3 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100"><span className="break-all">{address}</span><button type="button" className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg focus-visible:ring-2" disabled={disabled} aria-label={`${label}: ${address} ×`} onClick={()=>onChange([...addresses.filter((_,i)=>i!==index),pending].join(', '))}><X className="h-3 w-3"/></button></span>)}</div>}
  </div>;
}
