import { useState } from 'react';
import { ChevronDown, Copy, ExternalLink } from 'lucide-react';
import type { BookingPage, Staff } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { ActionButton, controlClass, Feedback } from './SchedulingPrimitives';

/** Links describe the saved publication, never an unsaved alias or draft. */
export function PublicAgendaLinks({ page, staff, copy, publicAccessEnabled, title, compact = false }: {
  page: BookingPage | null; staff: Staff[]; copy: SchedulingCopy; publicAccessEnabled: boolean; title?: string; compact?: boolean;
}) {
  const [feedback, setFeedback] = useState<'copied' | 'error' | null>(null);
  const copyLink = async (path: string) => {
    try { await navigator.clipboard.writeText(new URL(path, window.location.origin).href); setFeedback('copied'); }
    catch { setFeedback('error'); }
  };
  if (!page) return null;
  const available = page.published && publicAccessEnabled;
  if (compact) return <section className="min-w-0 space-y-2 pb-3" aria-label={title ?? copy.share}>
    {!page.published && <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.unpublished}</p>}
    <div className="flex min-w-0 items-center gap-2">
      <input readOnly aria-label={title ?? copy.share} className={`${controlClass} min-w-0 flex-1 text-xs`} value={new URL(page.publicUrl,window.location.origin).href}/>
      {available && <><ActionButton asChild className="min-w-11 shrink-0 px-3"><a aria-label={copy.share} title={copy.share} href={page.publicUrl} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden className="h-4 w-4"/></a></ActionButton><ActionButton aria-label={copy.copy} title={copy.copy} className="min-w-11 shrink-0 px-3" onClick={() => void copyLink(page.publicUrl)}><Copy aria-hidden className="h-4 w-4"/></ActionButton></>}
    </div>
    {available && staff.some(item => item.active) && <details className="group/staff">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-xs font-medium [&::-webkit-details-marker]:hidden"><span>{copy.personalLink} · {staff.filter(item => item.active).length}</span><ChevronDown aria-hidden className="h-4 w-4 transition-transform group-open/staff:rotate-180"/></summary>
      <div className="space-y-2">{staff.filter(item => item.active).map(item => <div key={item.id} className="flex min-w-0 items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800"><span className="min-w-0 break-words text-xs">{item.publicName}</span><ActionButton aria-label={`${copy.copy}: ${item.publicName}`} className="min-w-11 shrink-0 px-3" onClick={() => void copyLink(`${page.publicUrl}?consultant=${item.id}`)}><Copy aria-hidden className="h-4 w-4"/></ActionButton></div>)}</div>
    </details>}
    {feedback && <p role={feedback === 'error' ? 'alert' : 'status'} className={`text-xs ${feedback === 'error' ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{copy[feedback]}</p>}
  </section>;
  return <section className="min-w-0 space-y-3 border-t border-slate-200 pt-5 dark:border-slate-700">
    <h2 className="text-sm font-medium">{title ?? copy.share}</h2>
    {!page.published && <Feedback>{copy.unpublished}</Feedback>}
    <p className="break-all rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800">{new URL(page.publicUrl, window.location.origin).href}</p>
    {available && <><div className="flex flex-wrap gap-2">
      <ActionButton asChild><a href={page.publicUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" />{copy.share}</a></ActionButton>
      <ActionButton onClick={() => void copyLink(page.publicUrl)}><Copy className="h-4 w-4" />{copy.copy}</ActionButton>
    </div><h3 className="text-sm font-medium">{copy.personalLink}</h3>
      {staff.filter(item => item.active).map(item => <div key={item.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <span className="min-w-0 break-words text-sm">{item.publicName}</span>
        <ActionButton aria-label={`${copy.copy}: ${item.publicName}`} onClick={() => void copyLink(`${page.publicUrl}?consultant=${item.id}`)}><Copy className="h-4 w-4" />{copy.copy}</ActionButton>
      </div>)}
    </>}
    {feedback && <Feedback error={feedback === 'error'}>{copy[feedback]}</Feedback>}
  </section>;
}
