import {
  AlertTriangle,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Gauge,
  ListChecks,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { opportunityStages, type OpportunityStage } from '../../salesCrmContext';
import type {
  OperationalAlertChip,
  OperationalDistributionSegment,
  OperationalKpiMetric,
} from '../../../shared/operational';
import { OperationalKpiArea } from '../../../shared/operational';
import type { ProspectosCopy } from '../translations';
import type { OpportunityPeriodFilter } from '../types/prospectosTypes';
import { stageProgressStyles } from '../utils/prospectosStatus';

export function ProspectosKpiStrip({
  copy,
  visibleCount,
  openCount,
  hotCount,
  weightedProbability,
  proposalCount,
  scheduledCount,
  unscheduledCount,
  overdueCount,
  periodFilter,
  periodClosedCount,
  periodWonCount,
  periodLostCount,
  periodWonValueLabel,
  periodWonConvertedLabel,
  periodLostValueLabel,
  periodLostConvertedLabel,
  periodConversionRate,
  formattedPipelineValue,
  convertedPipelineLabel,
  showConvertedPipeline,
  pipelineExchangeRateDate,
  stageCounts,
}: {
  copy: ProspectosCopy;
  visibleCount: number;
  openCount: number;
  hotCount: number;
  weightedProbability: number;
  proposalCount: number;
  scheduledCount: number;
  unscheduledCount: number;
  overdueCount: number;
  periodFilter: OpportunityPeriodFilter;
  periodClosedCount: number;
  periodWonCount: number;
  periodLostCount: number;
  periodWonValueLabel: string;
  periodWonConvertedLabel: string;
  periodLostValueLabel: string;
  periodLostConvertedLabel: string;
  periodConversionRate: number;
  formattedPipelineValue: string;
  convertedPipelineLabel: string;
  showConvertedPipeline: boolean;
  pipelineExchangeRateDate: string;
  stageCounts: Array<{ stage: OpportunityStage; count: number }>;
}) {
  const periodLabel = periodFilter === 'all'
    ? copy.filters.periodOptions.all
    : copy.filters.periodOptions[periodFilter];
  const metricItems: OperationalKpiMetric[] = [
    {
      id: 'won-period',
      icon: <TrendingUp className="h-4 w-4" />,
      label: copy.kpiEngine.labels.wonPeriod,
      value: periodWonValueLabel,
      iconClassName: 'text-emerald-600',
      valueClassName: 'text-emerald-600',
    },
    {
      id: 'pipeline',
      icon: <Clock3 className="h-4 w-4" />,
      label: copy.kpiEngine.labels.pipeline,
      value: formattedPipelineValue,
      iconClassName: 'text-[#2563EB]',
      valueClassName: 'text-[#2563EB]',
    },
    {
      id: 'lost-period',
      icon: <TrendingDown className="h-4 w-4" />,
      label: copy.kpiEngine.labels.lostPeriod,
      value: periodLostValueLabel,
      iconClassName: 'text-[#B63B32]',
      valueClassName: 'text-[#B63B32]',
    },
    {
      id: 'conversion',
      icon: <Gauge className="h-4 w-4" />,
      label: copy.kpiEngine.labels.conversion,
      value: `${periodConversionRate}%`,
      iconClassName: 'text-[#9A6B05]',
      valueClassName: 'text-[#9A6B05]',
    },
    {
      id: 'open',
      icon: <ListChecks className="h-4 w-4" />,
      label: copy.kpiEngine.labels.open,
      value: openCount,
      iconClassName: 'text-[#2563EB]',
      valueClassName: 'text-[#2563EB]',
    },
    {
      id: 'closed-period',
      icon: <CalendarCheck2 className="h-4 w-4" />,
      label: copy.kpiEngine.labels.closedPeriod,
      value: periodClosedCount,
      iconClassName: 'text-slate-500',
      valueClassName: 'text-slate-700 dark:text-slate-200',
    },
  ];
  const alertChips: OperationalAlertChip[] = [];

  if (overdueCount > 0) {
    alertChips.push({
      id: 'overdue',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: copy.kpiEngine.alerts.overdue(overdueCount),
      tone: 'danger',
    });
  }

  if (unscheduledCount > 0) {
    alertChips.push({
      id: 'unscheduled',
      icon: <CalendarClock className="h-3.5 w-3.5" />,
      label: copy.kpiEngine.alerts.unscheduled(unscheduledCount),
      tone: 'warning',
    });
  }

  if (hotCount > 0) {
    alertChips.push({
      id: 'hot',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: copy.kpiEngine.alerts.hot(hotCount),
      tone: 'brand',
    });
  }

  if (proposalCount > 0) {
    alertChips.push({
      id: 'proposal',
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: copy.kpiEngine.alerts.proposal(proposalCount),
      tone: 'success',
    });
  }

  if (periodLostCount > 0) {
    alertChips.push({
      id: 'lost-period',
      icon: <TrendingDown className="h-3.5 w-3.5" />,
      label: copy.kpiEngine.alerts.lostPeriod(periodLostCount, periodLostConvertedLabel),
      tone: 'danger',
    });
  }

  if (periodWonCount > 0) {
    alertChips.push({
      id: 'won-period',
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: copy.kpiEngine.alerts.wonPeriod(periodWonCount, periodWonConvertedLabel),
      tone: 'success',
    });
  }

  if (showConvertedPipeline) {
    alertChips.push({
      id: 'finalPipeline',
      icon: <Clock3 className="h-3.5 w-3.5" />,
      label: copy.kpiEngine.alerts.finalPipeline(convertedPipelineLabel),
      tone: 'brand',
    });
  }

  alertChips.push({
    id: 'exchangeRateDate',
    label: copy.kpiEngine.alerts.exchangeRateDate(pipelineExchangeRateDate),
    tone: 'neutral',
  });

  const distributionSegments: OperationalDistributionSegment[] = opportunityStages.map((stage) => ({
    id: stage,
    label: copy.kpiEngine.segments[stage],
    count: stageCounts.find((stageCount) => stageCount.stage === stage)?.count ?? 0,
    className: stageProgressStyles[stage],
  }));

  return (
    <OperationalKpiArea
      alertChips={alertChips}
      distributionSegments={distributionSegments}
      insight={copy.kpiEngine.insight({
        periodLabel,
        openCount,
        periodClosedCount,
        periodConversionRate,
        periodLostValueLabel,
        periodWonValueLabel,
        formattedPipelineValue,
        hotCount,
        overdueCount,
        proposalCount,
        unscheduledCount,
        visibleCount,
        weightedProbability,
      })}
      insightIcon={<Gauge className="h-4 w-4" />}
      metrics={metricItems}
    />
  );
}
