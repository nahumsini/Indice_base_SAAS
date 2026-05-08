import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileClock,
  Info,
  Wallet,
} from 'lucide-react';
import type { PayrollRunSummary } from '../../../../api/humanResources';

type PayrollOperationRun = PayrollRunSummary & {
  jurisdictionLabel: string;
  unitLabel: string;
  businessLabel: string;
};

type PayrollOperationsPanelProps = {
  runs: PayrollOperationRun[];
  formatMoney: (value: number) => string;
};

const statusConfig = {
  draft: {
    label: 'Draft',
    dotClassName: 'bg-blue-500',
    textClassName: 'text-blue-700 dark:text-blue-300',
    barClassName: 'bg-blue-500',
  },
  review: {
    label: 'Review',
    dotClassName: 'bg-amber-500',
    textClassName: 'text-amber-700 dark:text-amber-300',
    barClassName: 'bg-amber-500',
  },
  approved: {
    label: 'Approved',
    dotClassName: 'bg-indigo-500',
    textClassName: 'text-indigo-700 dark:text-indigo-300',
    barClassName: 'bg-indigo-500',
  },
  paid: {
    label: 'Paid',
    dotClassName: 'bg-emerald-500',
    textClassName: 'text-emerald-700 dark:text-emerald-300',
    barClassName: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Cancelled',
    dotClassName: 'bg-slate-400',
    textClassName: 'text-slate-600 dark:text-slate-300',
    barClassName: 'bg-slate-400',
  },
  blocked: {
    label: 'Blocked',
    dotClassName: 'bg-rose-500',
    textClassName: 'text-rose-700 dark:text-rose-300',
    barClassName: 'bg-rose-500',
  },
} as const;

const isBlockedRun = (run: PayrollRunSummary) => (
  run.employees_count === 0 && run.status !== 'paid' && run.status !== 'cancelled'
);

const formatCount = (value: number, singular: string, plural: string) => (
  `${value} ${value === 1 ? singular : plural}`
);

const getSegmentWidth = (count: number, total: number) => {
  if (total <= 0 || count <= 0) {
    return '0%';
  }

  return `${(count / total) * 100}%`;
};

export function PayrollOperationsPanel({
  runs,
  formatMoney,
}: PayrollOperationsPanelProps) {
  const blockedCount = runs.filter(isBlockedRun).length;
  const draftCount = runs.filter((run) => run.status === 'draft' && !isBlockedRun(run)).length;
  const reviewCount = runs.filter((run) => run.status === 'processed' && !isBlockedRun(run)).length;
  const approvedCount = runs.filter((run) => run.status === 'approved' && !isBlockedRun(run)).length;
  const paidCount = runs.filter((run) => run.status === 'paid').length;
  const cancelledCount = runs.filter((run) => run.status === 'cancelled').length;
  const payoutTotal = runs
    .filter((run) => run.status !== 'cancelled')
    .reduce((total, run) => total + run.net_amount, 0);
  const jurisdictionCount = new Set(
    runs
      .map((run) => run.jurisdictionLabel)
      .filter((label) => label && label !== 'Automatic' && label !== 'From employee profile'),
  ).size;
  const operationalStructureCount = new Set(
    runs.map((run) => `${run.unitLabel}-${run.businessLabel}`),
  ).size;

  const statusDistribution = [
    { key: 'draft', count: draftCount },
    { key: 'review', count: reviewCount },
    { key: 'approved', count: approvedCount },
    { key: 'paid', count: paidCount },
    { key: 'cancelled', count: cancelledCount },
    { key: 'blocked', count: blockedCount },
  ] as const;
  const totalStatusCount = statusDistribution.reduce((total, item) => total + item.count, 0);
  const paidRate = runs.length > 0 ? `${Math.round((paidCount / runs.length) * 100)}%` : '0%';
  const insightMessage = blockedCount > 0
    ? `${formatCount(blockedCount, 'payroll run is', 'payroll runs are')} blocked by missing operational data.`
    : approvedCount > 0
      ? `${formatCount(approvedCount, 'payroll run is', 'payroll runs are')} approved and waiting for payment.`
      : reviewCount > 0
        ? `${formatCount(reviewCount, 'payroll run requires', 'payroll runs require')} approval before payment.`
        : runs.length > 0
          ? `Payroll is grouped automatically across ${Math.max(jurisdictionCount, 1)} jurisdiction signal${Math.max(jurisdictionCount, 1) === 1 ? '' : 's'} and ${Math.max(operationalStructureCount, 1)} operational structure${Math.max(operationalStructureCount, 1) === 1 ? '' : 's'}.`
          : 'Generate payroll to see runs grouped by pay period, structure, and jurisdiction.';

  const metrics = [
    {
      label: 'Payroll runs',
      value: runs.length,
      Icon: ClipboardCheck,
      valueClassName: 'text-[#143675]',
    },
    {
      label: 'Pending review',
      value: reviewCount + draftCount,
      Icon: FileClock,
      valueClassName: reviewCount + draftCount > 0 ? 'text-amber-600' : 'text-[#143675]',
    },
    {
      label: 'Pending payment',
      value: approvedCount,
      Icon: CreditCard,
      valueClassName: approvedCount > 0 ? 'text-indigo-600' : 'text-[#143675]',
    },
    {
      label: 'Blocked',
      value: blockedCount,
      Icon: AlertTriangle,
      valueClassName: blockedCount > 0 ? 'text-rose-600' : 'text-[#143675]',
    },
    {
      label: 'Processed',
      value: reviewCount,
      Icon: CheckCircle2,
      valueClassName: 'text-[#143675]',
    },
    {
      label: 'Payout total',
      value: formatMoney(payoutTotal),
      Icon: Wallet,
      valueClassName: 'text-[#143675]',
    },
  ];

  return (
    <section className="mb-6 space-y-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {metrics.map((metric, index) => (
            <div key={metric.label} className="flex items-center gap-4">
              {index > 0 ? <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span> : null}
              <div className="flex min-w-fit items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                  <metric.Icon className="h-4 w-4" />
                </span>
                <span className={`font-semibold ${metric.valueClassName}`}>{metric.value}</span>
                <span>{metric.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {blockedCount > 0 ? (
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
              {blockedCount} blocked
            </span>
          ) : null}
          {approvedCount > 0 ? (
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300">
              {approvedCount} pending payment
            </span>
          ) : null}
          <span className="rounded-full border border-[#143675]/15 bg-[#143675]/5 px-3 py-1 text-xs font-semibold text-[#143675] dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300">
            {paidRate} paid rate
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div className="flex h-full">
            {totalStatusCount > 0 ? (
              statusDistribution.map((item) => (
                <div
                  key={item.key}
                  className={`${statusConfig[item.key].barClassName} transition-all duration-300`}
                  style={{ width: getSegmentWidth(item.count, totalStatusCount) }}
                />
              ))
            ) : (
              <div className="w-full bg-slate-200 dark:bg-slate-700" />
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          {statusDistribution.map((item) => (
            <span key={item.key} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${statusConfig[item.key].dotClassName}`} />
              {statusConfig[item.key].label}
              <span className="font-semibold text-slate-500 dark:text-slate-400">{item.count}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[#143675]/15 bg-[#143675]/5 px-4 py-3 dark:border-blue-400/20 dark:bg-blue-400/10">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#143675] dark:text-blue-300" />
          <p className="text-sm leading-relaxed text-[#143675] dark:text-blue-200">
            {insightMessage}
          </p>
        </div>
      </div>
    </section>
  );
}
