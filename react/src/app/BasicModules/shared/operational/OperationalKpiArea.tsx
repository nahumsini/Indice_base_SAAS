import type { ReactNode } from 'react';
import { cn } from '../../../components/ui/utils';
import { useLearningModeHeaderActions } from '../../../learningMode';

export type OperationalKpiTone = 'danger' | 'warning' | 'info' | 'success' | 'neutral' | 'brand';

export type OperationalKpiMetric = {
  id: string;
  icon: ReactNode;
  label: string;
  value: string | number;
  active?: boolean;
  ariaLabel?: string;
  iconClassName?: string;
  onClick?: () => void;
  valueClassName?: string;
};

export type OperationalAlertChip = {
  id: string;
  label: string;
  icon?: ReactNode;
  tone?: OperationalKpiTone;
  active?: boolean;
  ariaLabel?: string;
  onClick?: () => void;
};

export type OperationalDistributionSegment = {
  id: string;
  label: string;
  count: number;
  className: string;
  active?: boolean;
  ariaLabel?: string;
  onClick?: () => void;
};

export type OperationalKpiCurrencyContext = {
  preferredCurrency: string;
  nativeBreakdown: string;
  rateLabel: string;
  effectiveDate?: string;
  source?: string;
  isPartial?: boolean;
  excludedCount?: number;
  labels: {
    consolidatedIn: string;
    nativeOrigin: string;
    partialTotal: string;
    excludedRecords: (count: number) => string;
  };
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
  active = false,
  ariaLabel,
  icon,
  iconClassName = 'text-slate-500 dark:text-slate-300',
  label,
  onClick,
  value,
  valueClassName = 'text-slate-950 dark:text-white',
}: OperationalKpiMetric) {
  const content = (
    <>
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700',
          iconClassName,
        )}
      >
        {icon}
      </span>
      <span className={cn('font-medium tabular-nums', valueClassName)}>{value}</span>
      <span>{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        aria-label={ariaLabel ?? label}
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          'flex min-w-fit items-center gap-2 rounded-xl px-1 py-0.5 text-left text-sm text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147514]/40 dark:text-slate-300 dark:hover:bg-slate-800',
          active && 'bg-emerald-50 ring-1 ring-[#147514]/25 dark:bg-emerald-950/20',
        )}
      >
        {content}
      </button>
    );
  }

  return <div className="flex min-w-fit items-center gap-2 px-1 py-0.5 text-sm text-slate-600 dark:text-slate-300">{content}</div>;
}

export function OperationalAlertChipItem({
  active = false,
  ariaLabel,
  icon,
  label,
  onClick,
  tone = 'warning',
}: OperationalAlertChip) {
  const content = (
    <>
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span>{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        aria-label={ariaLabel ?? label}
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147514]/40',
          alertToneClassNames[tone],
          active && 'ring-2 ring-[#147514]/25',
        )}
      >
        {content}
      </button>
    );
  }

  return <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium', alertToneClassNames[tone])}>{content}</span>;
}

export function OperationalDistributionBar({
  segments,
}: {
  segments: OperationalDistributionSegment[];
}) {
  const total = segments.reduce((sum, segment) => sum + Math.max(segment.count, 0), 0);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="h-2 min-h-2 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700 lg:flex-1">
        <div className="flex h-full">
          {segments.map((segment) => segment.onClick ? (
            <button
              key={segment.id}
              type="button"
              aria-label={segment.ariaLabel ?? segment.label}
              aria-pressed={segment.active}
              onClick={segment.onClick}
              className={cn('transition-all duration-300 hover:brightness-90 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white', segment.className)}
              style={{ width: getSegmentWidth(segment.count, total) }}
              title={segment.label}
            />
          ) : (
            <div
              key={segment.id}
              className={cn('transition-all duration-300', segment.className)}
              style={{ width: getSegmentWidth(segment.count, total) }}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
        {segments.map((segment) => segment.onClick ? (
          <button
            key={segment.id}
            type="button"
            aria-label={segment.ariaLabel ?? segment.label}
            aria-pressed={segment.active}
            onClick={segment.onClick}
            className={cn(
              'flex items-center gap-1 rounded-full px-1.5 py-1 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147514]/40 dark:hover:bg-slate-800',
              segment.active && 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white',
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', segment.className)} />
            <span>{segment.label}</span>
          </button>
        ) : (
          <span key={segment.id} className="flex items-center gap-1 px-1.5 py-1">
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
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{message}</p>
      </div>
    </div>
  );
}

export function OperationalKpiArea({
  alertChips = [],
  className,
  currencyContext,
  distributionSegments,
  insight,
  insightIcon,
  metrics,
}: {
  alertChips?: OperationalAlertChip[];
  className?: string;
  currencyContext?: OperationalKpiCurrencyContext;
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

      {currencyContext ? <OperationalKpiCurrencyStrip context={currencyContext} /> : null}

      <OperationalDistributionBar segments={distributionSegments} />
      <OperationalInsightBar icon={insightIcon} message={insight} />
    </section>
  );
}

export function OperationalStatusNavigator({
  className,
  metrics,
  segments,
}: {
  className?: string;
  metrics: OperationalKpiMetric[];
  segments: OperationalDistributionSegment[];
}) {
  const learningModeActive = useLearningModeHeaderActions()?.active ?? false;

  if (learningModeActive) {
    return null;
  }

  return (
    <section className={cn('rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800', className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex gap-x-3 gap-y-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {metrics.map((metric, index) => (
            <div key={metric.id} className="flex items-center gap-3">
              {index > 0 ? <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">|</span> : null}
              <OperationalKpiMetricItem {...metric} />
            </div>
          ))}
        </div>
        <div className="min-w-[220px] flex-1 xl:max-w-md">
          <OperationalDistributionBar segments={segments} />
        </div>
      </div>
    </section>
  );
}

export function OperationalKpiCurrencyStrip({ context }: { context: OperationalKpiCurrencyContext }) {
  const excludedCount = context.excludedCount ?? 0;

  return (
    <div className={cn(
      'flex flex-col gap-2 rounded-2xl border px-4 py-3 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4',
      context.isPartial
        ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100'
        : 'border-blue-200 bg-blue-50/70 text-slate-700 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-slate-200',
    )}>
      <span className="font-medium">
        {context.isPartial ? `${context.labels.partialTotal} · ` : ''}
        {context.labels.consolidatedIn}: {context.preferredCurrency}
      </span>
      <span>{context.labels.nativeOrigin}: {context.nativeBreakdown || context.preferredCurrency}</span>
      <span>{context.rateLabel}{context.effectiveDate ? ` · ${context.effectiveDate}` : ''}</span>
      {context.source ? <span className="text-slate-500 dark:text-slate-400">{context.source}</span> : null}
      {excludedCount > 0 ? <span className="font-medium">{context.labels.excludedRecords(excludedCount)}</span> : null}
    </div>
  );
}
