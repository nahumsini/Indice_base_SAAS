import { useCallback, useState } from 'react';
import { Copy, Plus, RotateCw } from 'lucide-react';
import { IndiceTitleBar } from '../../../components/frontend-os/IndiceTitleBar';
import { schedulingApi, type Event } from '../services/schedulingApi';
import { useSchedulingQuery } from '../hooks/useSchedulingQuery';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { ActionButton, Feedback, panelClass } from '../components/SchedulingPrimitives';
import { EventEditor } from '../components/EventEditor';
import { EventCancellation } from '../components/EventCancellation';
import { schedulingEmoji, schedulingTone } from '../utils/schedulingIdentity';

export default function EventsTab({ copy, locale, administrator }: { copy: SchedulingCopy; locale: string; administrator: boolean }) {
  const query = useSchedulingQuery(useCallback(async (signal: AbortSignal) => {
    const [events, catalog, links] = await Promise.all([schedulingApi.events(signal), schedulingApi.catalog(signal), schedulingApi.links(signal)]); return { events, catalog, links };
  }, []));
  const [editor, setEditor] = useState<Event | 'new' | null>(null);
  const [cancelling, setCancelling] = useState<Event | null>(null);
  const [feedback, setFeedback] = useState<'copied' | 'error' | null>(null);
  return <>
    <IndiceTitleBar tone={schedulingTone} title={copy.events} subtitle={copy.eventsHint} icon={schedulingEmoji.events}
      actions={<><ActionButton onClick={query.reload} disabled={query.loading}><RotateCw className="h-4 w-4"/>{copy.refresh}</ActionButton>{administrator && <ActionButton primary disabled={!query.data?.catalog.staff.length} onClick={() => setEditor('new')}><Plus className="h-4 w-4" />{copy.newEvent}</ActionButton>}</>} />
    {feedback && <Feedback error={feedback === 'error'}>{copy[feedback]}</Feedback>}
    {query.loading ? <Feedback>{copy.loading}</Feedback> : query.error ? <Feedback error>{copy.error}</Feedback> : query.data && <>
      <p className="text-xs text-slate-500 dark:text-slate-400">{copy.eventsLimit}</p>
      {!query.data.events.length ? <Feedback>{copy.empty}</Feedback> : <div className="grid gap-5 xl:grid-cols-2">{query.data.events.map(event => {
        const staff = query.data!.catalog.staff.find(s => s.id === event.staffId);
        return <article key={event.id} className={`${panelClass} space-y-4`}><div className="flex items-start justify-between gap-3"><h3 className="min-w-0 break-words text-lg font-medium">{event.title}</h3>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800">{event.status === 'CANCELLED' ? copy.CANCELLED : event.published ? copy.published : copy.unpublished}</span></div>
          <p className="text-sm text-slate-500 dark:text-slate-300">{event.description}</p>
          <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">{copy.consultant}</dt><dd className="mt-1">{staff?.publicName ?? '—'}</dd></div>
            <div><dt className="text-slate-500">{copy.eventAt}</dt><dd className="mt-1">{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: staff?.timezone }).format(new Date(event.startAt))}<span className="block text-xs text-slate-500">{staff?.timezone}</span></dd></div>
            <div><dt className="text-slate-500">{copy.reserved}</dt><dd className="mt-1">{event.confirmedCount} / {event.capacity}</dd></div><div><dt className="text-slate-500">{copy.duration}</dt><dd className="mt-1">{event.durationMinutes} {copy.minutes}</dd></div></dl>
          <div className="flex flex-wrap gap-3">{administrator && event.status === 'ACTIVE' && event.confirmedCount === 0 && new Date(event.startAt) > new Date() && <ActionButton onClick={() => setEditor(event)}>{copy.edit}</ActionButton>}
            {administrator && event.status === 'ACTIVE' && <ActionButton onClick={() => setCancelling(event)}>{copy.cancelEvent}</ActionButton>}
            {event.status === 'ACTIVE' && event.published && query.data!.links.publicUrl && new Date(event.startAt) > new Date() && <ActionButton onClick={async () => {
              try { await navigator.clipboard.writeText(new URL(`${query.data!.links.publicUrl}?event=${event.id}`, window.location.origin).href); setFeedback('copied'); } catch { setFeedback('error'); }
            }}><Copy className="h-4 w-4" />{copy.copy}</ActionButton>}
          </div>
        </article>;
      })}</div>}
      {editor && <EventEditor copy={copy} catalog={query.data.catalog} event={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); query.reload(); }} />}
      {cancelling && <EventCancellation copy={copy} event={cancelling} onClose={() => setCancelling(null)} onSaved={() => { setCancelling(null); query.reload(); }} />}
    </>}
  </>;
}
