import { useId } from 'react';
import { Settings2, Workflow } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { salesTitleBarSecondaryActionClassName } from '../../components/SalesTitleBar';
import type { OpportunityFlow } from '../../types/opportunities';
import type { ProspectosCopy } from '../translations';

/** The active flow is workspace context shared by Table, Kanban and Agenda. */
export function OpportunityFlowBar({
  copy,
  flows,
  selectedFlowId,
  counts,
  ready,
  managementLabel,
  onSelectFlow,
  onManageFlow,
}: {
  copy: ProspectosCopy['flow'];
  flows: OpportunityFlow[];
  selectedFlowId: number | null;
  counts: ReadonlyMap<number, number> | null;
  ready: boolean;
  managementLabel: string;
  onSelectFlow: (flowId: number) => Promise<void>;
  onManageFlow: () => void;
}) {
  const labelId = useId();
  const countId = useId();
  const selectedFlow = flows.find(flow => flow.id === selectedFlowId);
  const selectedCount = selectedFlow && counts ? counts.get(selectedFlow.id) ?? 0 : null;

  return (
    <section
      aria-labelledby={labelId}
      className="grid gap-3 rounded-xl border border-[#FF6B5E]/25 bg-[#FF6B5E]/5 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center dark:border-[#FF6B5E]/25 dark:bg-[#FF6B5E]/10"
    >
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <span id={labelId} className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <Workflow className="h-4 w-4 text-[#B63B32] dark:text-[#FFB0AA]" aria-hidden="true" />
          {copy.selectFlow}
        </span>
        <Select
          disabled={!ready}
          value={selectedFlowId === null ? undefined : String(selectedFlowId)}
          onValueChange={(value) => void onSelectFlow(Number(value))}
        >
          <SelectTrigger
            aria-labelledby={labelId}
            aria-describedby={countId}
            title={selectedFlow?.name}
            className="min-h-11 min-w-0 flex-1 whitespace-normal rounded-lg border-[#FF6B5E]/30 bg-white text-left text-base font-medium text-[#B63B32] shadow-none data-[size=default]:h-auto focus-visible:ring-[#FF6B5E]/25 [&>[data-slot=select-value]]:line-clamp-none [&>[data-slot=select-value]]:block [&>[data-slot=select-value]]:min-w-0 [&>[data-slot=select-value]]:flex-1 dark:border-[#FF6B5E]/40 dark:bg-slate-900 dark:text-[#FFB0AA]"
          >
            <SelectValue placeholder={copy.selectFlow}>
              <span className="block whitespace-normal break-words [overflow-wrap:anywhere]">{selectedFlow?.name}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-w-[calc(100vw-2rem)]">
            {flows.map(flow => (
              <SelectItem key={flow.id} value={String(flow.id)} textValue={flow.name}>
                <span className="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]">
                  {flow.name}{flow.factory ? ` · ${copy.factory}` : ''}
                  {' · '}{counts ? copy.opportunities(counts.get(flow.id) ?? 0) : '…'}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end">
        <span id={countId} role="status" className="rounded-full border border-[#FF6B5E]/15 bg-white/80 px-3 py-1 text-sm tabular-nums text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {selectedCount === null ? '…' : copy.opportunities(selectedCount)}
        </span>
        <Button type="button" variant="outline" className={`${salesTitleBarSecondaryActionClassName} w-auto`} onClick={onManageFlow}>
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          {managementLabel}
        </Button>
      </div>
    </section>
  );
}
