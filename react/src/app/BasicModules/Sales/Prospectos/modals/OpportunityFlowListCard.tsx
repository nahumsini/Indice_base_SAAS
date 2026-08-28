import { CheckCircle2, Eye, PencilLine, Workflow } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../components/ui/utils';
import type { OpportunityFlow } from '../../salesCrmContext';
import type { ProspectosCopy } from '../translations';

export function OpportunityFlowListCard({
  flow,
  selected,
  canManage,
  activating,
  copy,
  onActivate,
  onOpen,
}: {
  flow: OpportunityFlow;
  selected: boolean;
  canManage: boolean;
  activating: boolean;
  copy: ProspectosCopy['flow'];
  onActivate: () => void;
  onOpen: () => void;
}) {
  const opportunityCount = flow.stages.reduce((total, stage) => total + stage.opportunityCount, 0);

  return (
    <article className={cn(
      'rounded-xl border bg-white p-3 transition dark:bg-slate-900',
      selected
        ? 'border-[#FF6B5E] shadow-sm'
        : 'border-slate-200 hover:border-[#FF6B5E]/40 dark:border-slate-700',
    )}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#FF6B5E]/10 text-[#B63B32]">
            <Workflow className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-medium text-slate-950 dark:text-white">{flow.name}</h3>
              {selected ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">{copy.activeBadge}</span> : null}
              {flow.factory ? <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">{copy.factory}</span> : null}
              {flow.defaultFlow ? <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">{copy.defaultBadge}</span> : null}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {copy.flowCardSummary(flow.stages.length, opportunityCount)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <Button type="button" variant="outline" className="h-11 gap-2 rounded-lg" onClick={onOpen}>
            {canManage && !flow.factory ? <PencilLine className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {canManage && !flow.factory ? copy.editFlow : copy.viewStages}
          </Button>
          {!selected ? (
            <Button type="button" className="h-11 gap-2 rounded-lg bg-[#FF6B5E] text-[#222831] hover:bg-[#E85C50]" disabled={activating} onClick={onActivate}>
              <CheckCircle2 className="h-4 w-4" />
              {activating ? copy.activating : copy.useFlow}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
