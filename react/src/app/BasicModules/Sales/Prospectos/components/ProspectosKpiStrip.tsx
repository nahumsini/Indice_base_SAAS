import type { ReactNode } from 'react';
import { CheckCircle2, Clock3, Gauge, ListChecks, TrendingUp } from 'lucide-react';
import { opportunityStages, type OpportunityStage } from '../../salesCrmContext';
import { cn } from '../../../../components/ui/utils';
import { stageLabels, stageProgressStyles } from '../utils/prospectosStatus';

function PipelineMetric({
  icon,
  value,
  label,
  valueClassName = 'text-slate-950',
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
  valueClassName?: string;
}) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm">
        {icon}
      </span>
      <span className="text-base font-semibold">
        <span className={cn('mr-2 font-bold', valueClassName)}>{value}</span>
        <span className="text-slate-600">{label}</span>
      </span>
    </span>
  );
}

export function ProspectosKpiStrip({
  visibleCount,
  openCount,
  weightedProbability,
  proposalCount,
  formattedPipelineValue,
  stageCounts,
}: {
  visibleCount: number;
  openCount: number;
  weightedProbability: number;
  proposalCount: number;
  formattedPipelineValue: string;
  stageCounts: Array<{ stage: OpportunityStage; count: number }>;
}) {
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 text-sm text-slate-600">
          <PipelineMetric icon={<TrendingUp className="h-4 w-4" />} value={visibleCount} label="oportunidades" />
          <PipelineMetric icon={<ListChecks className="h-4 w-4" />} value={openCount} label="activas" valueClassName="text-[#2563EB]" />
          <PipelineMetric icon={<Gauge className="h-4 w-4" />} value={`${weightedProbability}%`} label="probabilidad prom." valueClassName="text-[#9a6b05]" />
          <PipelineMetric icon={<CheckCircle2 className="h-4 w-4" />} value={proposalCount} label="en propuesta" valueClassName="text-[#177d66]" />
          <PipelineMetric icon={<Clock3 className="h-4 w-4" />} value={formattedPipelineValue} label="pipeline" valueClassName="text-[#9a6b05]" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="flex h-3 overflow-hidden rounded-full bg-slate-200">
          {stageCounts.map(({ stage, count }) => {
            const width = visibleCount > 0 ? (count / visibleCount) * 100 : 0;
            return <div key={stage} className={cn('h-full', stageProgressStyles[stage])} style={{ width: `${width}%` }} aria-hidden="true" />;
          })}
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-500">
          {opportunityStages.map((stage) => (
            <span key={stage} className="inline-flex items-center gap-2">
              <span className={cn('h-2.5 w-2.5 rounded-full', stageProgressStyles[stage])} />
              {stageLabels[stage]}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

