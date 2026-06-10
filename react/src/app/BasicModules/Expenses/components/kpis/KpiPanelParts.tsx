import type { ReactNode } from 'react';
import type { KPIAlert } from '../../types/kpi.types';
import { formatCurrency } from '../../utils/expenses.utils';

export function KPIStatCard({
  helper,
  icon,
  label,
  tone,
  value,
}: {
  helper: string;
  icon: ReactNode;
  label: string;
  tone: 'amber' | 'blue' | 'green' | 'red';
  value: string;
}) {
  const toneClasses = {
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    green: 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  };

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">{helper}</p>
        </div>
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${toneClasses[tone]}`}>{icon}</span>
      </div>
    </article>
  );
}

export function PanelCard({
  children,
  icon,
  subtitle,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-5 flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#147514]/10 text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300">{icon}</span>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function BreakdownRow({
  label,
  meta,
  percentage,
  value,
}: {
  label: string;
  meta?: string;
  percentage: number;
  value: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
          {meta && <p className="text-xs font-semibold text-amber-600 dark:text-amber-300">{meta}</p>}
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(value)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{percentage.toFixed(1)}%</p>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        <div className="h-full rounded-full bg-[#147514]" style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
    </div>
  );
}

export function AlertItem({ alert }: { alert: KPIAlert }) {
  const alertClass = {
    critical: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300',
    info: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300',
    warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
  }[alert.type];

  return (
    <div className={`rounded-2xl border p-4 ${alertClass}`}>
      <p className="text-sm font-bold">{alert.title}</p>
      <p className="mt-1 text-sm opacity-90">{alert.message}</p>
      <p className="mt-2 text-xs font-semibold opacity-90">{alert.recommendation}</p>
    </div>
  );
}

export function ProjectionMetric({ helper, label, value }: { helper: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/60">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helper}</p>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
      {message}
    </div>
  );
}
