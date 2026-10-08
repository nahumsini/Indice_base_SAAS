import { useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import type { BookingPage, Staff } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { ActionButton, Feedback } from './SchedulingPrimitives';

/** Links describe the saved publication, never an unsaved alias or draft. */
export function PublicAgendaLinks({ page, staff, copy, publicAccessEnabled }: {
  page: BookingPage | null; staff: Staff[]; copy: SchedulingCopy; publicAccessEnabled: boolean;
}) {
  const [feedback, setFeedback] = useState<'copied' | 'error' | null>(null);
  const copyLink = async (path: string) => {
    try { await navigator.clipboard.writeText(new URL(path, window.location.origin).href); setFeedback('copied'); }
    catch { setFeedback('error'); }
  };
  if (!page) return null;
  const available = page.published && publicAccessEnabled;
  return <section className="min-w-0 space-y-3 border-t border-slate-200 pt-5 dark:border-slate-700">
    <h2 className="text-sm font-medium">{copy.share}</h2>
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
