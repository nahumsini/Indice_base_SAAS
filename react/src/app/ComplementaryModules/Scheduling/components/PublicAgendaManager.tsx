import { useState } from 'react';
import { CalendarDays, ChevronDown, Eye, EyeOff, Link, Pencil, Plus, SlidersHorizontal } from 'lucide-react';
import { IndiceFilterBar, IndiceFilterSearch, IndiceFilterSelect } from '../../../components/frontend-os/IndiceFilterBar';
import { IndiceViewState } from '../../../components/frontend-os/IndiceViewState';
import type { BookingPage, Staff } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { getPublicAgendaEditorCopy } from '../translations/publicAgendaEditorCopy';
import { getPublicAgendaManagerCopy } from '../translations/publicAgendaManagerCopy';
import { ActionButton } from './SchedulingPrimitives';
import { PublicAgendaLinks } from './PublicAgendaLinks';

/** Browse saved agendas only. Creation and editing replace this workspace with a wizard. */
export function PublicAgendaManager({ pages, staff, copy, locale, publicAccessEnabled, disabled, onCreate, onEdit, onPreview, onUnpublish }: {
  pages: BookingPage[]; staff: Staff[]; copy: SchedulingCopy; locale: string; publicAccessEnabled: boolean; disabled: boolean;
  onCreate: () => void;
  onEdit: (page: BookingPage) => void; onPreview: (page: BookingPage) => void; onUnpublish: (page: BookingPage) => void;
}) {
  const text = getPublicAgendaManagerCopy(locale), editor = getPublicAgendaEditorCopy(locale);
  const [search,setSearch] = useState(''), [status,setStatus] = useState('all'), [sharing,setSharing] = useState<number | null>(null);
  const term = search.trim().toLocaleLowerCase(locale);
  const visible = pages.filter(page => (!term || `${page.title} ${page.alias}`.toLocaleLowerCase(locale).includes(term)) && (status === 'all' || page.published === (status === 'published')));
  const count = visible.length === 1 ? text.oneAgenda : `${visible.length} ${text.count}`;
  const compactAction = 'min-w-11 !px-3 max-sm:!h-auto max-sm:!whitespace-normal max-sm:py-2 sm:w-11 sm:!px-0';
  return <div className="min-w-0 space-y-3">
    <section aria-label={text.roster} className="flex min-w-0 flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-900">
      <div className="min-w-0"><h3 className="text-base font-semibold text-slate-900 dark:text-white">{text.roster}</h3><p aria-live="polite" className="mt-1 text-sm text-slate-500 dark:text-slate-400">{count}</p></div>
      <ActionButton primary disabled={disabled} onClick={onCreate} className="w-full shrink-0 sm:w-auto"><Plus aria-hidden className="h-4 w-4"/>{text.newAgenda}</ActionButton>
    </section>
    <details open={Boolean(term || status !== 'all') || undefined} className="group/agenda-filters rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-4 text-sm font-medium text-slate-600 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/40 [&::-webkit-details-marker]:hidden dark:text-slate-300 dark:hover:bg-slate-800"><SlidersHorizontal aria-hidden className="h-4 w-4"/>{copy.filters}<ChevronDown aria-hidden className="ml-auto h-4 w-4 transition-transform group-open/agenda-filters:rotate-180"/></summary>
    <IndiceFilterBar title={<span className="sr-only">{copy.filters}</span>} className="!rounded-none !border-0 !bg-transparent !px-4 !pb-4 !pt-0 !shadow-none [&>div:first-child]:!mb-0" gridClassName="md:!grid-cols-[minmax(0,1fr)_12rem]">
      <IndiceFilterSearch label={text.search} placeholder={text.searchHint} tone="coral" value={search} onValueChange={setSearch} onClear={() => setSearch('')} clearLabel={text.clear}/>
      <IndiceFilterSelect label={copy.status} tone="coral" value={status} onValueChange={setStatus} options={[{value:'all',label:text.all},{value:'published',label:copy.published},{value:'draft',label:editor.draft}]}/>
    </IndiceFilterBar>
    </details>
    {!publicAccessEnabled && <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">{text.blocked}</p>}
    {visible.length ? <ul aria-label={text.roster} className="space-y-2.5">
      {visible.map(page => <li key={page.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 transition-shadow hover:border-[#FF6B5E]/40 hover:shadow-sm focus-within:border-[#FF6B5E]/60 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3"><span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF6B5E]/10 text-[#B63B32] dark:text-[#FFAB9F]"><CalendarDays className="h-5 w-5"/></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words text-sm font-semibold text-slate-900 [overflow-wrap:anywhere] dark:text-white">{page.title}</h3><span className={`rounded-full px-2 py-1 text-xs font-medium ${page.published ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{page.published ? copy.published : editor.draft}</span></div><p className="mt-1 break-words text-xs leading-5 text-slate-500 dark:text-slate-400">{page.published ? publicAccessEnabled ? text.readyHint : text.notAvailable : text.draftHint}</p></div></div>
          <div className="grid grid-cols-2 items-stretch gap-1.5 sm:flex sm:shrink-0 sm:items-center">
            <ActionButton primary disabled={disabled} title={copy.edit} aria-label={`${copy.edit}: ${page.title}`} className={compactAction} onClick={() => onEdit(page)}><Pencil aria-hidden className="h-4 w-4"/><span className="sm:sr-only">{copy.edit}</span></ActionButton>
            <ActionButton disabled={disabled} title={text.links} aria-label={`${text.links}: ${page.title}`} aria-expanded={sharing === page.id} className={compactAction} onClick={() => setSharing(value => value === page.id ? null : page.id)}><Link aria-hidden className="h-4 w-4"/><span className="sm:sr-only">{text.links}</span></ActionButton>
            <ActionButton disabled={disabled} title={text.preview} aria-label={`${text.preview}: ${page.title}`} className={compactAction} onClick={() => onPreview(page)}><Eye aria-hidden className="h-4 w-4"/><span className="sm:sr-only">{text.preview}</span></ActionButton>
            {page.published && <ActionButton disabled={disabled} title={text.unpublish} aria-label={`${text.unpublish}: ${page.title}`} className={compactAction} onClick={() => onUnpublish(page)}><EyeOff aria-hidden className="h-4 w-4"/><span className="sm:sr-only">{text.unpublish}</span></ActionButton>}
          </div>
        </div>
        {sharing === page.id && <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800"><p className="mb-2 text-xs font-medium text-slate-700 dark:text-slate-200">{text.bookingLink}</p><PublicAgendaLinks compact title={text.bookingLink} page={page} staff={staff} copy={{...copy,personalLink:text.staffLinks,share:text.openAgenda,unpublished:text.notPublished}} publicAccessEnabled={publicAccessEnabled}/></div>}
      </li>)}
    </ul> : <IndiceViewState compact tone="coral" variant="empty" title={pages.length ? text.noMatches : text.empty} description={pages.length ? undefined : text.emptyHint}/>}
    <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{text.shared}</p>
  </div>;
}
