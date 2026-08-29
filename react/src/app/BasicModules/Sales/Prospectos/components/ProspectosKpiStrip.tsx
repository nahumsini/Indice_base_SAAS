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
import type { OpportunityFlowStage, OpportunityStage } from '../../salesCrmContext';
import type {
  OperationalAlertChip,
  OperationalDistributionSegment,
  OperationalKpiCurrencyContext,
  OperationalKpiMetric,
} from '../../../shared/operational';
import { OperationalKpiArea } from '../../../shared/operational';
import type { ProspectosCopy } from '../translations';
import type { OpportunityPeriodFilter } from '../types/prospectosTypes';
import { getOpportunityStageDotClass, getOpportunityStageLabel } from '../utils/prospectosFlow';

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
  periodWonConvertedLabel,
  periodLostConvertedLabel,
  periodConversionRate,
  convertedPipelineLabel,
  pipelineExchangeRateDate,
  stageCounts,
  stages,
  currencyContext,
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
  periodWonConvertedLabel: string;
  periodLostConvertedLabel: string;
  periodConversionRate: number;
  convertedPipelineLabel: string;
  pipelineExchangeRateDate: string;
  stageCounts: Array<{ stage: OpportunityStage; count: number }>;
  stages: OpportunityFlowStage[];
  currencyContext: OperationalKpiCurrencyContext;
}) {
  const periodLabel = periodFilter === 'all'
    ? copy.filters.periodOptions.all
    : copy.filters.periodOptions[periodFilter];
  const metricItems: OperationalKpiMetric[] = [
    {
      id: 'won-period',
      icon: <TrendingUp className="h-4 w-4" />,
      label: copy.kpiEngine.labels.wonPeriod,
      value: periodWonConvertedLabel,
      iconClassName: 'text-emerald-600',
      valueClassName: 'text-emerald-600',
    },
    {
      id: 'pipeline',
      icon: <Clock3 className="h-4 w-4" />,
      label: copy.kpiEngine.labels.pipeline,
      value: convertedPipelineLabel,
      iconClassName: 'text-[#2563EB]',
      valueClassName: 'text-[#2563EB]',
    },
    {
      id: 'lost-period',
      icon: <TrendingDown className="h-4 w-4" />,
      label: copy.kpiEngine.labels.lostPeriod,
      value: periodLostConvertedLabel,
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

  alertChips.push({
    id: 'exchangeRateDate',
    label: copy.kpiEngine.alerts.exchangeRateDate(pipelineExchangeRateDate),
    tone: 'neutral',
  });

  const distributionSegments: OperationalDistributionSegment[] = stages.map((stage) => ({
    id: stage.key,
    label: stage.usesDefaultLabel
      ? (copy.kpiEngine.segments as Record<string, string>)[stage.key]
        ?? getOpportunityStageLabel(stage, copy.options.stages as Record<string, string>)
      : stage.label,
    count: stageCounts.find((stageCount) => stageCount.stage === stage.key)?.count ?? 0,
    className: getOpportunityStageDotClass(stage),
  }));

  return (
    <OperationalKpiArea
      alertChips={alertChips}
      currencyContext={currencyContext}
      distributionSegments={distributionSegments}
      insight={copy.kpiEngine.insight({
        periodLabel,
        openCount,
        periodClosedCount,
        periodConversionRate,
        periodLostValueLabel: periodLostConvertedLabel,
        periodWonValueLabel: periodWonConvertedLabel,
        formattedPipelineValue: convertedPipelineLabel,
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
