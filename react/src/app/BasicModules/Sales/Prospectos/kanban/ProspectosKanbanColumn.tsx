import type { DragEvent } from 'react';
import { opportunityStages, type OpportunityStage, type SalesOpportunity } from '../../salesCrmContext';
import { cn } from '../../../../components/ui/utils';
import type { ProspectosCopy } from '../translations';
import { getOpportunityIdFromDragEvent } from '../utils/prospectosFormatters';
import { stageProgressStyles } from '../utils/prospectosStatus';
import { ProspectosKanbanCard } from './ProspectosKanbanCard';

export function ProspectosKanbanColumn({
  copy,
  stage,
  opportunities,
  allOpportunities,
  onOpenFiles,
  onOpenHistory,
  onEdit,
  onStageChange,
}: {
  copy: ProspectosCopy;
  stage: OpportunityStage;
  opportunities: SalesOpportunity[];
  allOpportunities: SalesOpportunity[];
  onOpenFiles: (opportunity: SalesOpportunity) => void;
  onOpenHistory: (opportunity: SalesOpportunity) => void;
  onEdit: (opportunity: SalesOpportunity) => void;
  onStageChange: (opportunity: SalesOpportunity, stage: OpportunityStage) => void;
}) {
  const handleStageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const opportunityId = getOpportunityIdFromDragEvent(event);
    const opportunity = allOpportunities.find((item) => item.id === opportunityId);

    if (!opportunity || opportunity.stage === stage) {
      return;
    }

    onStageChange(opportunity, stage);
  };

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleStageDrop}
      className="min-h-[560px] rounded-lg border border-slate-200 bg-slate-50/80 p-3 transition-colors hover:border-[#FF6B5E]/35 hover:bg-[#FF6B5E]/[0.03]"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('h-2.5 w-2.5 rounded-full', stageProgressStyles[stage])} />
            <h3 className="text-sm font-bold text-slate-950">{copy.options.stages[stage]}</h3>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">{copy.kanban.dragHint}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200">
          {opportunities.length}
        </span>
      </div>

      <div className="space-y-3">
        {opportunities.map((opportunity) => (
          <ProspectosKanbanCard key={opportunity.id} copy={copy} opportunity={opportunity} onOpenFiles={onOpenFiles} onOpenHistory={onOpenHistory} onEdit={onEdit} />
        ))}

        {opportunities.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm font-medium text-slate-400">
            {copy.kanban.emptyColumn}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { opportunityStages };
