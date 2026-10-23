import { useEffect, useId, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { getPublicAgendaBrandCopy } from '../translations/publicAgendaBrandCopy';
import { readAgendaLogo, safeAgendaLogo } from '../utils/publicAgendaLogo';
import { ActionButton } from './SchedulingPrimitives';

export function PublicAgendaLogo({ value, onChange, locale, onBusyChange }: {value?:string;onChange:(value:string)=>void;locale:string;onBusyChange?:(busy:boolean)=>void}) {
  const text=getPublicAgendaBrandCopy(locale),id=useId(),input=useRef<HTMLInputElement>(null),revision=useRef(0),latest=useRef(onChange);
  latest.current=onChange;
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const busyChange=useRef(onBusyChange);busyChange.current=onBusyChange;
  useEffect(()=>()=>{revision.current++;busyChange.current?.(false);},[]);
  const logo=safeAgendaLogo(value);
  return <section aria-labelledby={id} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-950/40">
    <h3 id={id} className="text-sm font-medium">{text.logo}</h3>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <div className="grid h-20 w-28 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-600">{logo?<img src={logo} alt={text.logo} className="max-h-full max-w-full object-contain"/>:<ImagePlus className="h-7 w-7 text-slate-400" aria-hidden/>}</div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap gap-2"><ActionButton disabled={busy} onClick={()=>input.current?.click()}><ImagePlus className="h-4 w-4" aria-hidden/>{busy?text.preparing:logo?text.replace:text.upload}</ActionButton>{logo&&<ActionButton disabled={busy} onClick={()=>{setError('');latest.current('');}}><Trash2 className="h-4 w-4" aria-hidden/>{text.remove}</ActionButton>}</div>
        <p id={`${id}-hint`} className="text-xs leading-5 text-slate-500 dark:text-slate-400">{text.logoHint}</p>
      </div>
    </div>
    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={busy} onChange={async event=>{
      const file=event.target.files?.[0];event.target.value='';if(!file)return;
      const current=++revision.current;setBusy(true);busyChange.current?.(true);setError('');
      try{const result=await readAgendaLogo(file);if(current===revision.current)latest.current(result);}catch(problem){if(current===revision.current)setError(problem instanceof Error&&problem.message==='logo_size'?text.largeLogo:text.invalidLogo);}finally{if(current===revision.current){setBusy(false);busyChange.current?.(false);}}
    }}/>
    {error&&<p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
  </section>;
}
