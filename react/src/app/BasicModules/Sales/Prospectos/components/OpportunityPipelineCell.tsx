import { Badge } from '../../../../components/ui/badge';
import type { ProspectosCopy } from '../translations';
import type { OpportunityPipelineTotals } from '../utils/prospectosPipeline';

export function OpportunityPipelineCell({
  copy,
  pipeline,
}: {
  copy: ProspectosCopy['kpis'];
  pipeline: OpportunityPipelineTotals;
}) {
  return (
    <div className="min-w-0 max-w-full space-y-1">
      <p className="break-words text-sm font-black text-slate-950">{pipeline.totalLabel}</p>
      {pipeline.quoteCount > 0 ? (
        <p className="text-xs font-semibold text-slate-500">
          {copy.pipelineQuotes(pipeline.quoteCount)}
        </p>
      ) : (
        <p className="text-xs font-semibold text-slate-400">{copy.pipeline}</p>
      )}
      {pipeline.totalsByCurrency.length > 1 ? (
        <Badge variant="outline" className="h-auto whitespace-normal rounded-full border-[#FF6B5E]/20 bg-[#FF6B5E]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#B63B32]">
          {copy.finalPipeline}: {pipeline.convertedLabel}
        </Badge>
      ) : null}
    </div>
  );
}
