import type { ProspectosCopy } from '../translations';
import type { OpportunityNativePipelineTotals } from '../utils/prospectosPipeline';

export function OpportunityPipelineCell({
  copy,
  pipeline,
}: {
  copy: ProspectosCopy['kpis'];
  pipeline: OpportunityNativePipelineTotals;
}) {
  return (
    <div className="min-w-0 max-w-full space-y-1">
      <p className="break-words text-sm font-medium text-slate-950">{pipeline.totalLabel}</p>
      {pipeline.quoteCount > 0 ? (
        <p className="text-xs font-medium text-slate-500">
          {copy.pipelineQuotes(pipeline.quoteCount)}
        </p>
      ) : (
        <p className="text-xs font-medium text-slate-400">{copy.pipeline}</p>
      )}
    </div>
  );
}
