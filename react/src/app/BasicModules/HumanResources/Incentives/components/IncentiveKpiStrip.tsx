import { Bot, CheckCircle2, Eye, Gift, HandCoins, Users } from 'lucide-react';
import { OperationalKpiArea } from '../../../shared/operational';
import type { IncentivesTranslations } from '../translations';

interface IncentiveKpiStripProps {
  activeCount: number;
  automatedCount: number;
  copy: IncentivesTranslations;
  eligibleCount: number;
  manualCount: number;
  pausedCount: number;
  scheduledCount: number;
  selectedCount: number;
  totalCount: number;
  visibleCount: number;
}

export function IncentiveKpiStrip(props: IncentiveKpiStripProps) {
  const { activeCount, automatedCount, copy, eligibleCount, manualCount, pausedCount, scheduledCount, selectedCount, totalCount, visibleCount } = props;

  return (
    <OperationalKpiArea
      className="mb-5"
      metrics={[
        { id: 'total', icon: <Gift className="h-4 w-4" />, label: copy.kpis.total, value: totalCount },
        { id: 'active', icon: <CheckCircle2 className="h-4 w-4" />, label: copy.kpis.active, value: activeCount, valueClassName: 'text-emerald-600' },
        { id: 'automated', icon: <Bot className="h-4 w-4" />, label: copy.kpis.automated, value: automatedCount, valueClassName: 'text-blue-600' },
        { id: 'manual', icon: <HandCoins className="h-4 w-4" />, label: copy.kpis.manual, value: manualCount, valueClassName: 'text-amber-600' },
        { id: 'visible', icon: <Eye className="h-4 w-4" />, label: copy.kpis.visibleAfterFilters, value: visibleCount },
        { id: 'eligible', icon: <Users className="h-4 w-4" />, label: copy.kpis.eligibleEmployees, value: eligibleCount },
      ]}
      distributionSegments={[
        { id: 'active', label: copy.statuses.Activo, count: activeCount, className: 'bg-emerald-500' },
        { id: 'scheduled', label: copy.statuses.Programado, count: scheduledCount, className: 'bg-blue-500' },
        { id: 'paused', label: copy.statuses.Pausado, count: pausedCount, className: 'bg-slate-400' },
      ]}
      insight={copy.kpis.summary(activeCount, scheduledCount, pausedCount, selectedCount, visibleCount, totalCount)}
      insightIcon={<Gift className="h-4 w-4" />}
    />
  );
}
