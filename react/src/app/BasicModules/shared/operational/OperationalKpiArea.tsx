import type { ReactNode } from 'react';
import { cn } from '../../../components/ui/utils';
import { useLearningModeHeaderActions } from '../../../learningMode';

export type OperationalKpiTone = 'danger' | 'warning' | 'info' | 'success' | 'neutral' | 'brand';

export type OperationalKpiMetric = {
  id: string;
  icon: ReactNode;
  label: string;
  value: string | number;
  iconClassName?: string;
  valueClassName?: string;
};

export type OperationalAlertChip = {
  id: string;
  label: string;
  icon?: ReactNode;
  tone?: OperationalKpiTone;
};

export type OperationalDistributionSegment = {
  id: string;
  label: string;
  count: number;
  className: string;
};

const alertToneClassNames: Record<OperationalKpiTone, string> = {
  danger: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300',
  warning: 'border-[#F4C84A]/35 bg-[#F4C84A]/15 text-[#9A6B05] dark:border-[#F4C84A]/35 dark:bg-[#F4C84A]/15 dark:text-[#F4C84A]',
  info: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
  neutral: 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  brand: 'border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] dark:border-[#FF6B5E]/25 dark:bg-[#FF6B5E]/15 dark:text-[#FFB0AA]',
};

function getSegmentWidth(count: number, total: number) {
  if (total <= 0 || count <= 0) {
    return '0%';
  }

  return `${(count / total) * 100}%`;
}

export function OperationalKpiMetricItem({
  icon,
  iconClassName = 'text-slate-500 dark:text-slate-300',
  label,
  value,
  valueClassName = 'text-slate-950 dark:text-white',
}: OperationalKpiMetric) {
  return (
    <div className="flex min-w-fit items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700',
          iconClassName,
        )}
      >
        {icon}
      </span>
      <span className={cn('font-black', valueClassName)}>{value}</span>
      <span>{label}</span>
    </div>
  );
}

export function OperationalAlertChipItem({
  icon,
  label,
  tone = 'warning',
}: OperationalAlertChip) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black', alertToneClassNames[tone])}>
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span>{label}</span>
    </span>
  );
}

export function OperationalDistributionBar({
  segments,
}: {
  segments: OperationalDistributionSegment[];
}) {
  const total = segments.reduce((sum, segment) => sum + Math.max(segment.count, 0), 0);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div className="flex h-full">
          {segments.map((segment) => (
            <div
              key={segment.id}
              className={cn('transition-all duration-300', segment.className)}
              style={{ width: getSegmentWidth(segment.count, total) }}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
        {segments.map((segment) => (
          <span key={segment.id} className="flex items-center gap-1">
            <span className={cn('h-2 w-2 rounded-full', segment.className)} />
            <span>{segment.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function OperationalInsightBar({
  icon,
  message,
}: {
  icon: ReactNode;
  message: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#F4C84A]/20 bg-[#F4C84A]/10 px-4 py-3 shadow-sm shadow-[#F4C84A]/5 dark:border-[#F4C84A]/30 dark:bg-[#F4C84A]/15">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-[#9A6B05] dark:text-[#F4C84A]">{icon}</span>
        <p className="text-sm font-semibold leading-relaxed text-slate-700 dark:text-slate-200">{message}</p>
      </div>
    </div>
  );
}

export function OperationalKpiArea({
  alertChips = [],
  className,
  distributionSegments,
  insight,
  insightIcon,
  metrics,
}: {
  alertChips?: OperationalAlertChip[];
  className?: string;
  distributionSegments: OperationalDistributionSegment[];
  insight: string;
  insightIcon: ReactNode;
  metrics: OperationalKpiMetric[];
}) {
  const learningModeActive = useLearningModeHeaderActions()?.active ?? false;

  if (learningModeActive) {
    return null;
  }

  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex gap-x-4 gap-y-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {metrics.map((metric, index) => (
            <div key={metric.id} className="flex items-center gap-4">
              {index > 0 ? <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">|</span> : null}
              <OperationalKpiMetricItem {...metric} />
            </div>
          ))}
        </div>

        {alertChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {alertChips.map((chip) => (
              <OperationalAlertChipItem key={chip.id} {...chip} />
            ))}
          </div>
        ) : null}
      </div>

      <OperationalDistributionBar segments={distributionSegments} />
      <OperationalInsightBar icon={insightIcon} message={insight} />
    </section>
  );
}
