import {stageDotStyle} from '../utils/flowPersonalColors';
import { useId, useState, type DragEvent } from 'react';
import { Inbox } from 'lucide-react';
import type { OpportunityFlowStage, SalesOpportunity } from '../../salesCrmContext';
import { cn } from '../../../../components/ui/utils';
import type { ProspectosCopy } from '../translations';
import { getOpportunityIdFromDragEvent } from '../utils/prospectosFormatters';
import { getOpportunityStageDotClass, getOpportunityStageLabel } from '../utils/prospectosFlow';
import { ProspectosKanbanCard, type KanbanCardActions } from './ProspectosKanbanCard';
import type { KanbanCopy } from './kanbanCopy';
import type { KanbanTiming } from './kanbanModel';

export function ProspectosKanbanColumn({
  copy, labels, locale, stage, stages, opportunities, allOpportunities, totalCount, overdueCount, timings, mobileActive,
  onOverdue, register, remember, fullHeight = false, ...actions
}: KanbanCardActions & {
  copy: ProspectosCopy; labels: KanbanCopy; locale: string; stage: OpportunityFlowStage; stages: OpportunityFlowStage[];
  opportunities: SalesOpportunity[]; allOpportunities: SalesOpportunity[]; totalCount: number; overdueCount: number;
  timings: Map<string, KanbanTiming>; mobileActive: boolean; fullHeight?: boolean; onOverdue: () => void;
  register: (key: string, element: HTMLElement | null) => void; remember: (key: string, element: HTMLElement) => void;
}) {
  const headingId = useId();
  const [dragOver, setDragOver] = useState(false);
  const stageLabel = getOpportunityStageLabel(stage, copy.options.stages);
  const handleStageDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault(); setDragOver(false);
    const opportunity = allOpportunities.find(item => item.id === getOpportunityIdFromDragEvent(event));
    if (opportunity && opportunity.stage !== stage.key) actions.onStageChange(opportunity, stage.key);
  };

  return (
    <section aria-labelledby={headingId}
      onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDragOver(true); }}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(false); }}
      onDrop={handleStageDrop}
      className={cn(
        'min-w-0 flex-col overflow-hidden rounded-xl border bg-slate-50/80 dark:bg-slate-900/40 md:flex',
        fullHeight ? 'h-full min-h-0' : 'md:h-[min(72dvh,760px)] md:min-h-[380px]',
        mobileActive ? 'flex' : 'hidden',
        dragOver ? 'border-[#FF6B5E] ring-2 ring-[#FF6B5E]/20' : 'border-slate-200 dark:border-slate-700',
      )}>
      <div style={stageDotStyle(stage)} className={cn('h-1 shrink-0', getOpportunityStageDotClass(stage))} />
      <header className="shrink-0 border-b border-slate-200/70 px-3 py-3 dark:border-slate-700">
        <div className="flex items-center justify-between gap-2">
          <h3 id={headingId} className="min-w-0 break-words text-[15px] font-medium text-slate-900 dark:text-slate-100">{stageLabel}</h3>
          <span title={labels.count(opportunities.length, totalCount)} className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs tabular-nums text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">{opportunities.length === totalCount ? totalCount : opportunities.length + ' / ' + totalCount}</span>
        </div>
        <div className="mt-1.5 flex min-h-5 items-center text-xs text-slate-500 dark:text-slate-400">
          {overdueCount > 0 ? <button type="button" onClick={onOverdue} className="rounded text-rose-700 underline decoration-rose-300 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] dark:text-rose-300">{overdueCount} · {labels.overdue}</button>
            : <span>{labels.count(opportunities.length, totalCount)}</span>}
        </div>
      </header>
      <div ref={element => register(stage.key, element)} onScroll={event => remember(stage.key, event.currentTarget)}
        tabIndex={0} role="region" aria-label={stageLabel}
        className={cn('min-h-0 flex-1 space-y-2.5 p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF6B5E] md:overflow-y-auto md:overscroll-y-contain [scrollbar-gutter:stable]', fullHeight && 'overflow-y-auto overscroll-y-contain')}>
        {opportunities.map(opportunity => <ProspectosKanbanCard key={opportunity.id} copy={copy} labels={labels} locale={locale} opportunity={opportunity} timing={timings.get(opportunity.id)!} stages={stages} {...actions} />)}
        {opportunities.length === 0 ? <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <Inbox aria-hidden="true" className="h-5 w-5 text-slate-400" /><span>{totalCount ? labels.filteredEmpty : labels.empty}</span>
        </div> : null}
      </div>
    </section>
  );
}
