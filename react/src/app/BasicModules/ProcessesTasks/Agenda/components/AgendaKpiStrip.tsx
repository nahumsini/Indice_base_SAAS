import {
  AlertTriangle,
  ClipboardCheck,
  Eye,
  Gauge,
  Timer,
} from 'lucide-react';
import { Skeleton } from '../../../../components/ui/skeleton';
import { OperationalKpiArea } from '../../../shared/operational';
import { defaultAgendaTranslations, type AgendaTranslations } from '../translations';

export interface AgendaKpiMetrics {
  activeOnTrackCount: number;
  auditedCount: number;
  averageCompletion: number;
  averageWeighting: number | null;
  cancelledCount: number;
  completedCount: number;
  overdueCount: number;
  pendingAuditCount: number;
  productivityScore: number;
  totalCount: number;
  openCount: number;
}

interface AgendaKpiStripProps {
  copy?: AgendaTranslations['kpiStrip'];
  isLoading: boolean;
  metrics: AgendaKpiMetrics;
}


function buildInsight(metrics: AgendaKpiMetrics, copy: AgendaTranslations['kpiStrip']) {
  if (metrics.totalCount === 0) {
    return copy.insights.empty;
  }

  if (metrics.overdueCount > 0) {
    return copy.insights.overdue(metrics.overdueCount, metrics.averageCompletion, metrics.pendingAuditCount);
  }

  if (metrics.pendingAuditCount > 0) {
    return copy.insights.pendingAudit(metrics.pendingAuditCount, metrics.productivityScore);
  }

  if (metrics.productivityScore >= 85) {
    return copy.insights.healthy(metrics.completedCount, metrics.auditedCount, metrics.productivityScore);
  }

  return copy.insights.default(metrics.productivityScore, metrics.openCount, metrics.averageCompletion);
}

export function AgendaKpiStrip({
  copy = defaultAgendaTranslations.kpiStrip,
  isLoading,
  metrics,
}: AgendaKpiStripProps) {
  if (isLoading) {
    return (
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-36 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  const statusSegments = [
    {
      className: 'bg-blue-500',
      count: metrics.activeOnTrackCount,
      label: copy.segments.active,
    },
    {
      className: 'bg-emerald-500',
      count: metrics.pendingAuditCount,
      label: copy.segments.pendingAudit,
    },
    {
      className: 'bg-violet-500',
      count: metrics.auditedCount,
      label: copy.segments.audited,
    },
    {
      className: 'bg-rose-500',
      count: metrics.overdueCount,
      label: copy.segments.overdue,
    },
    {
      className: 'bg-slate-400',
      count: metrics.cancelledCount,
      label: copy.segments.cancelled,
    },
  ];

  return (
    <OperationalKpiArea
      className="mb-6"
      metrics={[
        { id: 'visible', icon: <Eye className="h-4 w-4" />, label: copy.labels.visible, value: metrics.totalCount },
        { id: 'open', icon: <Timer className="h-4 w-4" />, label: copy.labels.open, value: metrics.openCount, valueClassName: 'text-blue-600 dark:text-blue-300' },
        { id: 'overdue', icon: <AlertTriangle className="h-4 w-4" />, label: copy.labels.overdue, value: metrics.overdueCount, valueClassName: 'text-rose-600 dark:text-rose-300' },
        { id: 'audit', icon: <ClipboardCheck className="h-4 w-4" />, label: copy.labels.pendingAudit, value: metrics.pendingAuditCount, valueClassName: 'text-violet-600 dark:text-violet-300' },
      ]}
      alertChips={[
        ...(metrics.overdueCount > 0 ? [{ id: 'overdue', label: copy.badges.overdue(metrics.overdueCount), tone: 'danger' as const }] : []),
        ...(metrics.pendingAuditCount > 0 ? [{ id: 'audit', label: copy.badges.pendingAudit(metrics.pendingAuditCount), tone: 'info' as const }] : []),
        { id: 'productivity', label: copy.badges.productivity(metrics.productivityScore), tone: metrics.productivityScore >= 85 ? 'success' : metrics.productivityScore >= 65 ? 'warning' : 'danger' },
      ]}
      distributionSegments={statusSegments.map((segment, index) => ({ ...segment, id: `${segment.label}-${index}` }))}
      insight={buildInsight(metrics, copy)}
      insightIcon={<Gauge className="h-4 w-4" />}
    />
  );
}
