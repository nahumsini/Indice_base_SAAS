import { opportunityStages, type OpportunityStage, type SalesOpportunity } from '../../salesCrmContext';
import type { ProspectosCopy } from '../translations';
import { ProspectosKanbanColumn } from './ProspectosKanbanColumn';

export function ProspectosKanban({
  copy,
  opportunities,
  onOpenFiles,
  onOpenHistory,
  onEdit,
  onStageChange,
}: {
  copy: ProspectosCopy;
  opportunities: SalesOpportunity[];
  onOpenFiles: (opportunity: SalesOpportunity) => void;
  onOpenHistory: (opportunity: SalesOpportunity) => void;
  onEdit: (opportunity: SalesOpportunity) => void;
  onStageChange: (opportunity: SalesOpportunity, stage: OpportunityStage) => void;
}) {
  return (
    <section className="overflow-x-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="grid min-w-[1540px] grid-cols-7 gap-4">
        {opportunityStages.map((stage) => (
          <ProspectosKanbanColumn
            copy={copy}
            key={stage}
            stage={stage}
            opportunities={opportunities.filter((opportunity) => opportunity.stage === stage)}
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
