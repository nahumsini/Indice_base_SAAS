import type { DragEvent } from 'react';
import { opportunityStages, type OpportunityStage, type SalesOpportunity } from '../../salesCrmContext';
import { cn } from '../../../../components/ui/utils';
import { getOpportunityIdFromDragEvent } from '../utils/prospectosFormatters';
import { stageLabels, stageProgressStyles } from '../utils/prospectosStatus';
import { ProspectosKanbanCard } from './ProspectosKanbanCard';

export function ProspectosKanbanColumn({
  stage,
  opportunities,
  allOpportunities,
  onOpenFiles,
  onOpenHistory,
  onEdit,
  onStageChange,
}: {
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
      className="min-h-[560px] rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-[#FF6B5E]/35 hover:bg-[#FF6B5E]/[0.03]"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={cn('h-2.5 w-2.5 rounded-full', stageProgressStyles[stage])} />
          <h3 className="text-sm font-bold text-slate-950">{stageLabels[stage]}</h3>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 shadow-sm">
          {opportunities.length}
        </span>
      </div>

      <div className="space-y-3">
        {opportunities.map((opportunity) => (
          <ProspectosKanbanCard key={opportunity.id} opportunity={opportunity} onOpenFiles={onOpenFiles} onOpenHistory={onOpenHistory} onEdit={onEdit} />
        ))}

        {opportunities.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm font-medium text-slate-400">
            Arrastra oportunidades aquí
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { opportunityStages };

