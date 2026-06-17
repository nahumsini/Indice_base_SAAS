import type { DragEvent } from 'react';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import { cn } from '../../../../components/ui/utils';
import type { SalesOpportunity } from '../../salesCrmContext';
import type { ProspectosCopy } from '../translations';
import { setOpportunityDragData } from '../utils/prospectosFormatters';
import { temperatureClasses } from '../utils/prospectosStatus';

export function ProspectosAgendaSidebar({
  copy,
  unscheduledOpportunities,
  opportunitySchedules,
  onDraftChange,
  onScheduleDrop,
}: {
  copy: ProspectosCopy;
  unscheduledOpportunities: SalesOpportunity[];
  opportunitySchedules: Map<string, { date: string; time: string }>;
  onDraftChange: (opportunity: SalesOpportunity, field: 'date' | 'time', value: string) => void;
  onScheduleDrop: (event: DragEvent<HTMLElement>, date: string, time: string) => void;
}) {
  return (
    <aside
      className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onScheduleDrop(event, '', '')}
    >
      <div className="mb-4">
        <h4 className="text-base font-bold text-slate-950">{copy.agenda.unscheduledTitle}</h4>
        <p className="mt-1 text-sm text-slate-600">{copy.agenda.unscheduledDescription}</p>
      </div>

      <div className="space-y-3">
        {unscheduledOpportunities.length > 0 ? unscheduledOpportunities.map((opportunity) => (
          <article
            key={opportunity.id}
            draggable
            onDragStart={(event) => setOpportunityDragData(event, opportunity.id)}
            className="cursor-grab rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-[#FF6B5E]/35 hover:bg-white hover:shadow-sm active:cursor-grabbing"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-950">{opportunity.opportunityName}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{opportunity.company} · {copy.options.nextActions[opportunity.nextAction]}</p>
              </div>
              <Badge variant="outline" className={cn('rounded-full px-2 py-0.5 text-xs font-bold', temperatureClasses[opportunity.temperature])}>
                {copy.options.temperatures[opportunity.temperature]}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={opportunitySchedules.get(opportunity.id)?.date ?? ''}
                onChange={(event) => onDraftChange(opportunity, 'date', event.target.value)}
                className="h-9 rounded-xl border-slate-200 bg-white text-xs font-semibold shadow-none"
              />
              <Input
                type="time"
                value={opportunitySchedules.get(opportunity.id)?.time ?? ''}
                onChange={(event) => onDraftChange(opportunity, 'time', event.target.value)}
                className="h-9 rounded-xl border-slate-200 bg-white text-xs font-semibold shadow-none"
              />
            </div>
          </article>
        )) : (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm font-medium text-slate-400">
            {copy.agenda.allScheduled}
          </div>
        )}
      </div>
    </aside>
  );
}
