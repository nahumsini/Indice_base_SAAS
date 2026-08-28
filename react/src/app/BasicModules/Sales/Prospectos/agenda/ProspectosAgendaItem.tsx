import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import { cn } from '../../../../components/ui/utils';
import type { OpportunityFlowStage, SalesOpportunity } from '../../salesCrmContext';
import { ProspectosQuickActions } from '../components/ProspectosQuickActions';
import type { ProspectosCopy } from '../translations';
import { formatCurrencyAmount, parseMoney, setOpportunityDragData } from '../utils/prospectosFormatters';
import { getOpportunityStageBadgeClass, getOpportunityStageConfig, getOpportunityStageLabelByKey } from '../utils/prospectosFlow';
import { temperatureClasses } from '../utils/prospectosStatus';

export function ProspectosAgendaItem({
  copy,
  opportunity,
  stages,
  schedule,
  compact = false,
  onDraftChange,
  onOpenFiles,
  onOpenHistory,
  onEdit,
}: {
  copy: ProspectosCopy;
  opportunity: SalesOpportunity;
  stages: OpportunityFlowStage[];
  schedule: { date: string; time: string };
  compact?: boolean;
  onDraftChange: (opportunity: SalesOpportunity, field: 'date' | 'time', value: string) => void;
  onOpenFiles: (opportunity: SalesOpportunity) => void;
  onOpenHistory: (opportunity: SalesOpportunity) => void;
  onEdit: (opportunity: SalesOpportunity) => void;
}) {
  return (
    <article
      key={opportunity.id}
      draggable
      onDragStart={(event) => setOpportunityDragData(event, opportunity.id)}
      className="cursor-grab rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#FF6B5E]/35 hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-slate-950">{opportunity.opportunityName}</p>
            <Badge variant="outline" className={cn('rounded-full px-2.5 py-1 font-medium', temperatureClasses[opportunity.temperature])}>
              {copy.options.temperatures[opportunity.temperature]}
            </Badge>
            <Badge variant="outline" className={cn('rounded-full px-2.5 py-1 font-medium', getOpportunityStageBadgeClass(getOpportunityStageConfig(stages, opportunity.stage)))}>
              {getOpportunityStageLabelByKey(stages, opportunity.stage, copy.options.stages as Record<string, string>)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600">{opportunity.company} · {opportunity.contactPerson}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {opportunity.owner} · {formatCurrencyAmount(parseMoney(opportunity.estimatedValue), opportunity.currency)} · {opportunity.probability}
          </p>
        </div>

        <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-2')}>
          <Input
            type="date"
            value={schedule.date}
            onChange={(event) => onDraftChange(opportunity, 'date', event.target.value)}
            className="h-9 rounded-lg border-slate-200 text-xs font-medium shadow-none"
          />
          <Input
            type="time"
            value={schedule.time}
            onChange={(event) => onDraftChange(opportunity, 'time', event.target.value)}
            className="h-9 rounded-lg border-slate-200 text-xs font-medium shadow-none"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-3 py-2">
          <p className="text-xs font-medium tracking-normal text-[#B63B32]">{copy.agenda.nextAction}</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{copy.options.nextActions[opportunity.nextAction]}</p>
        </div>
        <ProspectosQuickActions copy={copy.quickActions} opportunity={opportunity} onOpenFiles={onOpenFiles} onOpenHistory={onOpenHistory} onEdit={onEdit} />
      </div>
    </article>
  );
}

export function ProspectosWeeklyAgendaItem({
  copy,
  opportunity,
  schedule,
  onOpenFiles,
  onOpenHistory,
  onEdit,
}: {
  copy: ProspectosCopy;
  opportunity: SalesOpportunity;
  schedule: { date: string; time: string };
  onOpenFiles: (opportunity: SalesOpportunity) => void;
  onOpenHistory: (opportunity: SalesOpportunity) => void;
  onEdit: (opportunity: SalesOpportunity) => void;
}) {
  return (
    <article
      key={opportunity.id}
      draggable
      onDragStart={(event) => setOpportunityDragData(event, opportunity.id)}
      className="cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-[#FF6B5E]/35 hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full border border-[#FF6B5E]/35 bg-[#FF6B5E]/10 px-2 py-0.5 text-[11px] font-medium text-[#B63B32]">
          {schedule.time || '--:--'}
        </span>
        <Badge variant="outline" className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', temperatureClasses[opportunity.temperature])}>
          {copy.options.temperatures[opportunity.temperature]}
        </Badge>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium leading-5 text-slate-950">{opportunity.opportunityName}</p>
      <p className="mt-1 truncate text-xs font-medium text-[#2563EB]">{opportunity.company}</p>
      <p className="mt-2 truncate text-xs text-slate-500">{copy.options.nextActions[opportunity.nextAction]} · {opportunity.owner}</p>
    </article>
  );
}
