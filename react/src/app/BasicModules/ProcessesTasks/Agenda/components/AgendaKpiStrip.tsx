import {
  AlertTriangle,
  ClipboardCheck,
  Eye,
  Gauge,
  Timer,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Skeleton } from '../../../../components/ui/skeleton';
import { cn } from '../../../../components/ui/utils';
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

interface AgendaKpiMetricProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  valueClassName?: string;
}

interface AgendaStatusSegment {
  className: string;
  count: number;
  label: string;
}

function segmentWidth(count: number, total: number) {
  if (total <= 0 || count <= 0) {
    return '0%';
  }

  return `${(count / total) * 100}%`;
}

function AgendaKpiMetric({
  icon,
  label,
  value,
  valueClassName = 'text-slate-900 dark:text-white',
}: AgendaKpiMetricProps) {
  return (
    <div className="flex min-w-fit items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
        {icon}
      </span>
      <span className={cn('font-medium', valueClassName)}>{value}</span>
      <span>{label}</span>
    </div>
  );
}

function AgendaStatusBar({ segments }: { segments: AgendaStatusSegment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div className="flex h-full">
          {segments.map((segment) => (
            <div
              key={segment.label}
              className={cn('transition-all duration-300', segment.className)}
              style={{ width: segmentWidth(segment.count, total) }}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        {segments.map((segment) => (
          <span key={segment.label} className="flex items-center gap-1">
            <span className={cn('h-2 w-2 rounded-full', segment.className)} />
            {segment.label}
          </span>
        ))}
      </div>
    </div>
  );
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

  const statusSegments: AgendaStatusSegment[] = [
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

  const productivityTone =
    metrics.productivityScore >= 85
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
      : metrics.productivityScore >= 65
        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
        : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300';

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex gap-x-4 gap-y-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          <AgendaKpiMetric icon={<Eye className="h-4 w-4" />} label={copy.labels.visible} value={metrics.totalCount} />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <AgendaKpiMetric
            icon={<Timer className="h-4 w-4" />}
            label={copy.labels.open}
            value={metrics.openCount}
            valueClassName="text-blue-600 dark:text-blue-300"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <AgendaKpiMetric
            icon={<AlertTriangle className="h-4 w-4" />}
            label={copy.labels.overdue}
            value={metrics.overdueCount}
            valueClassName="text-rose-600 dark:text-rose-300"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <AgendaKpiMetric
            icon={<ClipboardCheck className="h-4 w-4" />}
            label={copy.labels.pendingAudit}
            value={metrics.pendingAuditCount}
            valueClassName="text-violet-600 dark:text-violet-300"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {metrics.overdueCount > 0 ? (
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
              {copy.badges.overdue(metrics.overdueCount)}
            </span>
          ) : null}
          {metrics.pendingAuditCount > 0 ? (
            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300">
              {copy.badges.pendingAudit(metrics.pendingAuditCount)}
            </span>
          ) : null}
          <span className={cn('rounded-full border px-3 py-1 text-xs font-medium', productivityTone)}>
            {copy.badges.productivity(metrics.productivityScore)}
          </span>
        </div>
      </div>

      <AgendaStatusBar segments={statusSegments} />

      <div className="rounded-lg border border-[#F4C84A]/20 bg-[#F4C84A]/10 px-4 py-3 dark:border-[#F4C84A]/30 dark:bg-[#F4C84A]/15">
        <div className="flex items-start gap-3">
          <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-[#9A6B05]" />
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{buildInsight(metrics, copy)}</p>
        </div>
      </div>
    </div>
  );
}
