import type { OpportunityFlowStage, OpportunityStage, SalesOpportunity } from '../../salesCrmContext';
import type { ProspectosCopy } from '../translations';
import { ProspectosKanbanColumn } from './ProspectosKanbanColumn';

export function ProspectosKanban({
  copy,
  opportunities,
  stages,
  onOpenFiles,
  onOpenHistory,
  onEdit,
  onStageChange,
}: {
  copy: ProspectosCopy;
  opportunities: SalesOpportunity[];
  stages: OpportunityFlowStage[];
  onOpenFiles: (opportunity: SalesOpportunity) => void;
  onOpenHistory: (opportunity: SalesOpportunity) => void;
  onEdit: (opportunity: SalesOpportunity) => void;
  onStageChange: (opportunity: SalesOpportunity, stage: OpportunityStage) => void;
}) {
  return (
    <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${stages.length}, minmax(204px, 1fr))`,
          minWidth: `${Math.max(920, stages.length * 220)}px`,
        }}
      >
        {stages.map((stage) => (
          <ProspectosKanbanColumn
            copy={copy}
            key={stage.key}
            stage={stage}
            opportunities={opportunities.filter((opportunity) => opportunity.stage === stage.key)}
            allOpportunities={opportunities}
            onOpenFiles={onOpenFiles}
            onOpenHistory={onOpenHistory}
            onEdit={onEdit}
            onStageChange={onStageChange}
          />
        ))}
      </div>
    </section>
  );
}
