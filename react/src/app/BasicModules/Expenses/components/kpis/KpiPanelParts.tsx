import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';
import { BudgetHealthStatus } from '../../types/finance-status.types';
import type {
  FinancialOverviewAlert,
  FinancialOverviewBudgetHealthRow,
  FinancialOverviewCashRequirement,
  FinancialOverviewCostDriver,
} from '../../types/financial-overview.types';
import type { FinanceCurrency } from '../../types/finance-domain.types';
import { formatKpiCurrency, formatKpiPercent } from '../../KPIs/kpiUtils';
import type { FinanceLocale } from '../../translations';

const toneClasses = {
  critical: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
  info: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
};

const healthClasses = {
  [BudgetHealthStatus.EXCEEDED]: toneClasses.critical,
  [BudgetHealthStatus.ON_TRACK]: toneClasses.success,
  [BudgetHealthStatus.WARNING]: toneClasses.warning,
};

interface OverviewMetricProps {
  helper?: string;
  icon: ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}

export function OverviewMetric({
  helper,
  icon,
  label,
  value,
  valueClassName = 'text-slate-900 dark:text-white',
}: OverviewMetricProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#147514] shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-emerald-300 dark:ring-slate-700">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className={cn('truncate text-sm font-extrabold', valueClassName)}>{value}</p>
          {helper ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{helper}</span> : null}
        </div>
        <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export function KpiPanel({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#147514]/10 text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300">
          {icon}
        </span>
        <h3 className="text-lg font-bold text-slate-950 dark:text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function FinancialStatusBar({
  segments,
}: {
  segments: Array<{ colorClassName: string; label: string; value: number }>;
}) {
  const total = segments.reduce((amount, segment) => amount + Math.max(segment.value, 0), 0);

  return (
    <div className="space-y-3">
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div className="flex h-full">
          {segments.map(segment => (
            <div
              key={segment.label}
              className={cn('transition-all duration-300', segment.colorClassName)}
              style={{ width: total > 0 ? `${(Math.max(segment.value, 0) / total) * 100}%` : '0%' }}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
        {segments.map(segment => (
          <span key={segment.label} className="flex items-center gap-1">
            <span className={cn('h-2 w-2 rounded-full', segment.colorClassName)} />
            {segment.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CashRequirementGrid({
  countLabel,
  currency,
  items,
  locale = 'en-CA',
}: {
  countLabel: string;
  currency: FinanceCurrency;
  items: FinancialOverviewCashRequirement[];
  locale?: FinanceLocale;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map(item => (
        <article key={item.id} className={cn('rounded-xl border p-4', toneClasses[item.tone])}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold">{item.label}</p>
              <p className="mt-1 text-xs opacity-80">{item.description}</p>
            </div>
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-900/40 dark:text-slate-100">
              {item.count} {countLabel}
            </span>
          </div>
          <p className="mt-3 text-xl font-bold">{formatKpiCurrency(item.amount, currency, locale)}</p>
        </article>
      ))}
    </div>
  );
}

export function BudgetHealthTable({
  currency,
  healthLabels,
  labels,
  locale = 'en-CA',
  rows,
}: {
  currency: FinanceCurrency;
  healthLabels: Record<BudgetHealthStatus, string>;
  labels: {
    actual: string;
    available: string;
    committed: string;
    consumption: string;
    empty: string;
    health: string;
    line: string;
    planned: string;
    used: string;
  };
  locale?: FinanceLocale;
  rows: FinancialOverviewBudgetHealthRow[];
}) {
  if (rows.length === 0) return <KpiEmptyState message={labels.empty} />;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
            <th className="px-5 py-4">{labels.line}</th>
            <th className="px-5 py-4 text-right">{labels.planned}</th>
            <th className="px-5 py-4 text-right">{labels.committed}</th>
            <th className="px-5 py-4 text-right">{labels.actual}</th>
            <th className="px-5 py-4 text-right">{labels.available}</th>
            <th className="px-5 py-4 text-center">{labels.consumption}</th>
            <th className="px-5 py-4 text-center">{labels.health}</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 7).map(row => (
            <tr key={row.id} className="border-b border-slate-100 last:border-b-0 dark:border-slate-700">
              <td className="max-w-[260px] px-6 py-4 font-semibold text-slate-900 dark:text-white">
                <span className="block truncate">{row.name}</span>
                <span className="text-xs font-medium text-slate-500">
                  {row.budgetName ? `${row.budgetName} - ` : null}{formatKpiPercent(row.usagePercent)} {labels.used}
                </span>
              </td>
              <td className="px-6 py-4 text-right font-semibold text-slate-700 dark:text-slate-200">{formatKpiCurrency(row.planned, currency, locale)}</td>
              <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-300">{formatKpiCurrency(row.committed, currency, locale)}</td>
              <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-300">{formatKpiCurrency(row.actual, currency, locale)}</td>
              <td className="px-6 py-4 text-right font-semibold text-[#147514] dark:text-emerald-300">{formatKpiCurrency(row.available, currency, locale)}</td>
              <td className="px-6 py-4">
                <div className="mx-auto w-28">
                  <div className="mb-1 text-center text-xs font-bold text-slate-600 dark:text-slate-300">{formatKpiPercent(row.usagePercent)}</div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div className={cn('h-full rounded-full', row.usagePercent >= 100 ? 'bg-rose-500' : row.usagePercent >= 80 ? 'bg-amber-500' : 'bg-[#147514]')} style={{ width: `${Math.min(row.usagePercent, 100)}%` }} />
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-center">
                <span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-semibold', healthClasses[row.healthStatus])}>
                  {healthLabels[row.healthStatus]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CostDriverList({
  currency,
  drivers,
  emptyMessage,
  locale = 'en-CA',
  recordsLabel,
}: {
  currency: FinanceCurrency;
  drivers: FinancialOverviewCostDriver[];
  emptyMessage: string;
  locale?: FinanceLocale;
  recordsLabel: string;
}) {
  if (drivers.length === 0) return <KpiEmptyState message={emptyMessage} />;

  return (
    <div className="space-y-4">
      {drivers.map(driver => (
        <div key={driver.id}>
          <div className="mb-2 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{driver.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{driver.count} {recordsLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{formatKpiCurrency(driver.total, currency, locale)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{formatKpiPercent(driver.percentage)}</p>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div className="h-full rounded-full bg-[#147514]" style={{ width: `${Math.min(driver.percentage, 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AlertList({ alerts }: { alerts: FinancialOverviewAlert[] }) {
  return (
    <div className="space-y-3">
      {alerts.map(alert => (
        <article key={alert.id} className={cn('rounded-xl border p-4', toneClasses[alert.tone])}>
          <div className="flex items-start gap-3">
            {alert.tone === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
            <div>
              <p className="text-sm font-bold">{alert.title}</p>
              <p className="mt-1 text-sm opacity-90">{alert.message}</p>
              <p className="mt-2 text-xs font-semibold opacity-90">{alert.recommendation}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function KpiEmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
      {message}
    </div>
  );
}
