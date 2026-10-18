import { CalendarClock, Clock3, GripVertical, History, Mail, MessageCircle, MoreHorizontal, Paperclip, PencilLine, Phone } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '../../../../components/ui/dropdown-menu';
import type { OpportunityFlowStage, OpportunityStage, SalesOpportunity } from '../../salesCrmContext';
import { getPhoneHref, getWhatsAppHref } from '../../utils/salesCommunicationUtils';
import type { ProspectosCopy } from '../translations';
import { formatCurrencyAmount, parseMoney, setOpportunityDragData } from '../utils/prospectosFormatters';
import { getOpportunityStageDotClass, getOpportunityStageLabel } from '../utils/prospectosFlow';
import type { KanbanCopy } from './kanbanCopy';
import type { KanbanTiming } from './kanbanModel';

export type KanbanCardActions = {
  onOpenFiles: (opportunity: SalesOpportunity) => void;
  onOpenHistory: (opportunity: SalesOpportunity) => void;
  onEdit: (opportunity: SalesOpportunity) => void;
  onNextAction: (opportunity: SalesOpportunity) => void;
  onStageChange: (opportunity: SalesOpportunity, stage: OpportunityStage) => void;
};

export function ProspectosKanbanCard({ copy, labels, locale, opportunity, timing, stages, onOpenFiles, onOpenHistory, onEdit, onNextAction, onStageChange }: KanbanCardActions & {
  copy: ProspectosCopy; labels: KanbanCopy; locale: string; opportunity: SalesOpportunity; timing: KanbanTiming; stages: OpportunityFlowStage[];
}) {
  const hasPhone = Boolean(opportunity.phone.trim());
  const hasEmail = Boolean(opportunity.email.trim());
  const actionHref = opportunity.nextAction === 'Call' && hasPhone ? getPhoneHref(opportunity.phone)
    : opportunity.nextAction === 'WhatsApp' && hasPhone ? getWhatsAppHref(opportunity.phone)
    : opportunity.nextAction === 'Email' && hasEmail ? 'mailto:' + opportunity.email : undefined;
  const ActionIcon = opportunity.nextAction === 'Call' ? Phone : opportunity.nextAction === 'WhatsApp' ? MessageCircle : opportunity.nextAction === 'Email' ? Mail : PencilLine;
  const dateLabel = timing.date ? timing.today ? labels.today : new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(timing.date + 'T12:00:00Z')) : labels.noTime;
  const owner = opportunity.owner || labels.unassigned;
  const initials = owner.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('');
  const actionClass = 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[#b63b32] hover:bg-[#FF6B5E]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] dark:text-[#ff9c93]';

  return (
    <article draggable onDragStart={event => {
      if ((event.target as HTMLElement).closest('button, a, [role="menuitem"]')) { event.preventDefault(); return; }
      setOpportunityDragData(event, opportunity.id);
    }} className="group rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-500">
      <div className="flex items-start gap-1.5">
        <button type="button" onClick={() => onOpenHistory(opportunity)} className="min-w-0 flex-1 rounded text-left text-[15px] font-medium leading-5 text-slate-900 hover:text-[#b63b32] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] dark:text-slate-100" title={opportunity.opportunityName}>
          <span className="line-clamp-2 break-words">{opportunity.opportunityName}</span>
        </button>
        <GripVertical aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-slate-300 active:cursor-grabbing dark:text-slate-500" />
      </div>
      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400" title={[opportunity.company, opportunity.contactPerson].filter(Boolean).join(' · ')}>
        {opportunity.contactPerson || opportunity.company}
      </p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <p className="text-sm font-medium tabular-nums text-slate-900 dark:text-slate-100">
          {formatCurrencyAmount(parseMoney(opportunity.estimatedValue), opportunity.currency)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{opportunity.currency} · {labels.estimate}</span>
        </p>
        <span className={cn('text-xs', opportunity.temperature === 'Hot' ? 'text-[#b63b32] dark:text-[#ff9c93]' : 'text-slate-500 dark:text-slate-400')}>
          {copy.options.temperatures[opportunity.temperature]} · {opportunity.probability}
        </span>
      </div>
      <button type="button" onClick={() => onNextAction(opportunity)} aria-label={copy.agenda.nextAction + ': ' + opportunity.opportunityName} aria-haspopup="dialog" title={[copy.agenda.nextAction, opportunity.nextActionTimezone].filter(Boolean).join(' · ')} className={cn(
        'mt-2 block w-full rounded-lg border px-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]',
        timing.state === 'overdue' ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
          : timing.state === 'unscheduled' ? 'border-amber-200/70 bg-amber-50/60 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300'
            : 'border-slate-200/70 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300',
      )}>
        <span className="flex items-center gap-1.5 text-xs font-medium"><CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />{copy.options.nextActions[opportunity.nextAction]}{timing.state !== 'today' && timing.state !== 'scheduled' ? <span className="ml-auto font-normal">{timing.state === 'overdue' ? copy.options.statuses.Overdue : labels[timing.state]}</span> : null}</span>
        <span className="mt-1 flex items-center gap-1.5 text-xs"><Clock3 aria-hidden="true" className="h-3.5 w-3.5" />{dateLabel}{timing.date ? ' · ' + (timing.time || labels.noTime) : ''}</span>
      </button>
      <div className="mt-2 flex items-center gap-1">
        <div className="mr-auto flex min-w-0 items-center gap-1.5" title={labels.owner + ': ' + owner}>
          <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-200">{initials}</span>
          <span className="truncate text-xs text-slate-600 dark:text-slate-300">{owner}</span>
        </div>
        {actionHref ? <a href={actionHref} draggable={false} target={actionHref.startsWith('https:') ? '_blank' : undefined} rel="noreferrer" className={actionClass} aria-label={copy.options.nextActions[opportunity.nextAction] + ' · ' + opportunity.contactPerson}><ActionIcon className="h-4 w-4" aria-hidden="true" />{copy.options.nextActions[opportunity.nextAction]}</a>
          : <button type="button" onClick={() => onEdit(opportunity)} className={actionClass} aria-label={copy.quickActions.edit(opportunity.opportunityName)}><PencilLine className="h-4 w-4" aria-hidden="true" /></button>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><button type="button" aria-label={labels.actions + ': ' + opportunity.opportunityName} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] dark:text-slate-300 dark:hover:bg-slate-700"><MoreHorizontal className="h-4 w-4" /></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>{labels.actions}</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => onOpenHistory(opportunity)}><History />{labels.details}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(opportunity)}><PencilLine />{copy.quickActions.edit(opportunity.opportunityName)}</DropdownMenuItem>
            <DropdownMenuSub><DropdownMenuSubTrigger>{labels.move}</DropdownMenuSubTrigger><DropdownMenuSubContent>
              {stages.map(stage => <DropdownMenuItem key={stage.key} disabled={stage.key === opportunity.stage} onSelect={() => onStageChange(opportunity, stage.key)}><span className={cn('h-2 w-2 rounded-full', getOpportunityStageDotClass(stage))} />{getOpportunityStageLabel(stage, copy.options.stages)}</DropdownMenuItem>)}
            </DropdownMenuSubContent></DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!hasPhone} asChild={hasPhone}>{hasPhone ? <a draggable={false} href={getPhoneHref(opportunity.phone)}><Phone />{copy.quickActions.call(opportunity.contactPerson)}</a> : <span>{copy.quickActions.noPhone}</span>}</DropdownMenuItem>
            <DropdownMenuItem disabled={!hasPhone} asChild={hasPhone}>{hasPhone ? <a draggable={false} href={getWhatsAppHref(opportunity.phone)} target="_blank" rel="noreferrer"><MessageCircle />{copy.quickActions.whatsapp(opportunity.contactPerson)}</a> : <span>{copy.quickActions.noPhone}</span>}</DropdownMenuItem>
            <DropdownMenuItem disabled={!hasEmail} asChild={hasEmail}>{hasEmail ? <a draggable={false} href={'mailto:' + opportunity.email}><Mail />{copy.quickActions.email(opportunity.contactPerson)}</a> : <span>{copy.quickActions.noEmail}</span>}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onOpenFiles(opportunity)}><Paperclip />{copy.quickActions.files(opportunity.opportunityName)}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
