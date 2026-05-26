import { AlertTriangle } from 'lucide-react';

export function ProspectosInsightBar({
  hotCount,
  formattedPipelineValue,
  weightedProbability,
}: {
  hotCount: number;
  formattedPipelineValue: string;
  weightedProbability: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-5 py-4 text-sm font-medium text-slate-700">
      <AlertTriangle className="h-4 w-4 shrink-0 text-[#B63B32]" />
      <span>
        {hotCount} oportunidades hot requieren seguimiento; el pipeline visible es de {formattedPipelineValue} y la probabilidad promedio es {weightedProbability}%.
      </span>
    </div>
  );
}

