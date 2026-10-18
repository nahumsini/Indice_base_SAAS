import { CalendarClock, CheckCircle2, Mail, Phone, UserRound } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { getPhoneHref } from '../../utils/salesCommunicationUtils';
import type { ContinuityFlow, ContinuityItem } from './postSaleWorkspaceApi';
import { continuityColors, continuityUrgency, formatContinuityDate } from './continuityModel';
import { stageLabel, type ContinuityCopy } from './continuityCopy';
function Card({ item, flow, today, locale, t, onOpen, onMove, busy }: {
  item: ContinuityItem; flow?: ContinuityFlow; today: string; locale: string; t: ContinuityCopy;
  onOpen: (item: ContinuityItem) => void; onMove: (item: ContinuityItem, stage: string) => void; busy: boolean;
}) {
  const urgency = continuityUrgency(item, today);
  const tone = urgency === 'overdue' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200'
    : urgency === 'today' || urgency === 'unscheduled' ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200'
      : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900" draggable={Boolean(flow) && !busy}
    onDragStart={(event) => { event.dataTransfer.setData('text/plain', String(item.sourceId)); event.dataTransfer.effectAllowed = 'move'; }}>
    <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-500">{item.reference}</span>
      {item.kind === 'lost' && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.recoveryStatus === 'recovered' ? t.reactivated : item.recoveryStatus === 'paused' ? t.paused : item.recoveryStatus === 'scheduled' ? t.scheduled : t.unscheduled}</span>}
      {urgency === 'done' && item.kind === 'won' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
    </div>
    <button className="mt-2 block w-full text-left text-base font-medium leading-snug text-slate-900 hover:text-[#b63b32] dark:text-white" onClick={() => onOpen(item)}>{item.clientName || item.title}</button>
    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.contactName || item.title}</p>
    {item.kind === 'lost' && item.lossReason && <p className="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{item.lossReason}</p>}
    <button onClick={() => onOpen(item)} className={`mt-4 flex w-full items-start gap-2 rounded-xl border p-3 text-left ${tone}`}>
      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0"><span className="block line-clamp-2 text-sm font-medium">{item.nextAction || t.noAction}</span>
      <span className="mt-1 block text-xs">{item.nextActionDate ? formatContinuityDate(item.nextActionDate, locale) : t.noDate}{urgency === 'overdue' ? ` · ${t.overdue}` : urgency === 'today' ? ` · ${t.today}` : ''}</span></span>
    </button>
    <div className="mt-3 flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500"><UserRound className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{item.ownerName || t.noOwner}</span></span>
      <div className="flex shrink-0 gap-1">{item.phone && <Button asChild size="icon" variant="ghost"><a href={getPhoneHref(item.phone)} aria-label={`${t.phone} · ${item.contactName || item.clientName}`}><Phone className="h-4 w-4" /></a></Button>}
      {item.email && <Button asChild size="icon" variant="ghost"><a href={`mailto:${item.email}`} aria-label={`${t.email} · ${item.contactName || item.clientName}`}><Mail className="h-4 w-4" /></a></Button>}</div>
    </div>
    {flow && <Select value={item.stageKey} disabled={busy} onValueChange={(value) => onMove(item, value)}><SelectTrigger aria-label={`${t.stage} · ${item.reference}`} className="mt-2 h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent>{flow.stages.map((stage) => <SelectItem key={stage.key} value={stage.key}>{stageLabel(stage.key, stage.label, flow.id === 0, t)}</SelectItem>)}</SelectContent></Select>}
  </article>;
}
export function ContinuityBoard({ items, flow, today, locale, t, onOpen, onMove, busy }: {
  items: ContinuityItem[]; flow?: ContinuityFlow; today: string; locale: string; t: ContinuityCopy;
  onOpen: (item: ContinuityItem) => void; onMove: (item: ContinuityItem, stage: string) => void; busy: boolean;
}) {
  if (!flow) return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <Card key={item.sourceId} {...{ item, today, locale, t, onOpen, onMove, busy }} />)}</div>;
  return <div className="flex gap-4 overflow-x-auto pb-3" aria-label={t.board}>{flow.stages.map((stage) => {
    const cards = items.filter((item) => item.stageKey === stage.key);
    return <section key={stage.key} aria-label={stageLabel(stage.key, stage.label, flow.id === 0, t)}
      className="flex min-h-[300px] w-[300px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
      onDragOver={(event) => { if (!busy) event.preventDefault(); }} onDrop={(event) => {
        event.preventDefault(); const sourceId = Number(event.dataTransfer.getData('text/plain')); const item = items.find((value) => value.sourceId === sourceId);
        if (item && item.stageKey !== stage.key && !busy) onMove(item, stage.key);
      }}>
      <header className="border-t-4 px-4 py-4" style={{ borderTopColor: continuityColors[stage.colorToken] }}><h3 className="flex items-center justify-between gap-2 text-sm font-medium">{stageLabel(stage.key, stage.label, flow.id === 0, t)}<span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900">{cards.length}</span></h3><p className="mt-1 text-xs text-slate-500">{t.columnPage}</p></header>
      <div className="max-h-[65dvh] space-y-3 overflow-y-auto px-3 pb-3">{cards.length ? cards.map((item) => <Card key={item.sourceId} {...{ item, flow, today, locale, t, onOpen, onMove, busy }} />) : <p className="rounded-xl border border-dashed border-slate-200 px-5 py-12 text-center text-sm text-slate-400 dark:border-slate-700">{t.emptyStage}</p>}</div>
    </section>;
  })}</div>;
}
