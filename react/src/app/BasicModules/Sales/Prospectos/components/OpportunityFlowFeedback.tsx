import { ArrowRight, CheckCircle2, Workflow, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { OpportunityFlow } from '../../types/opportunities';
import type { ProspectosCopy } from '../translations/prospectosTranslations';

export type OpportunityFlowReassignment = {
  opportunityName: string;
  flowId: number;
  flowName: string;
};

export function OpportunityFlowFeedback({
  copy, flows, activeFlow, counts, reassignment, onViewFlow, onDismiss,
}: {
  copy: ProspectosCopy['flow'];
  flows: OpportunityFlow[];
  activeFlow: OpportunityFlow | null;
  counts: ReadonlyMap<number, number> | null;
  reassignment: OpportunityFlowReassignment | null;
  onViewFlow: (flowId: number) => Promise<void>;
  onDismiss: () => void;
}) {
  if (reassignment) {
    return (
      <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
        <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1 basis-60">
          <p className="break-words text-sm font-medium">{copy.reassigned(reassignment.opportunityName, reassignment.flowName)}</p>
          <p className="mt-1 text-sm">{copy.reassignedDescription}</p>
        </div>
        <Button variant="outline" className="h-11 gap-2 bg-white dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-200" onClick={() => void onViewFlow(reassignment.flowId)}>
          {copy.viewFlow}<ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={copy.close} onClick={onDismiss}>
          <X className="h-4 w-4 dark:text-emerald-200" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  if (!counts || !activeFlow || counts.get(activeFlow.id) !== 0) return null;
  const otherFlows = flows.filter(flow => flow.id !== activeFlow.id && (counts.get(flow.id) ?? 0) > 0);
  if (otherFlows.length === 0) return null;

  return (
    <div role="status" className="flex flex-wrap items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
      <Workflow className="mt-0.5 h-5 w-5 shrink-0 text-[#D84C42] dark:text-[#FF6B5E]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium text-slate-900 dark:text-white">{copy.emptyFlow(activeFlow.name)}</p>
        <p className="mt-1 text-sm">{copy.otherFlowsDescription}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {otherFlows.map(flow => (
            <Button key={flow.id} variant="outline" className="h-auto min-h-11 max-w-full gap-2 whitespace-normal bg-white text-left dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" onClick={() => void onViewFlow(flow.id)}>
              <span className="min-w-0 break-words">{copy.viewNamedFlow(flow.name)} · {copy.opportunities(counts.get(flow.id) ?? 0)}</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
