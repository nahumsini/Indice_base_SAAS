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
import type { PayrollTranslations } from '../translations/types';

type PayrollOperationRun = PayrollRunSummary & {
  jurisdictionLabel: string;
  nativeBreakdownLabel: string;
  preferredNetAmount: number;
  unitLabel: string;
  businessLabel: string;
};

type PayrollOperationsPanelProps = {
  copy: PayrollTranslations;
  runs: PayrollOperationRun[];
  formatMoney: (value: number) => string;
};

const statusStyleConfig = {
  draft: {
    dotClassName: 'bg-blue-500',
    textClassName: 'text-blue-700 dark:text-blue-300',
    barClassName: 'bg-blue-500',
  },
  review: {
    dotClassName: 'bg-amber-500',
    textClassName: 'text-amber-700 dark:text-amber-300',
    barClassName: 'bg-amber-500',
  },
  approved: {
    dotClassName: 'bg-indigo-500',
    textClassName: 'text-indigo-700 dark:text-indigo-300',
    barClassName: 'bg-indigo-500',
  },
  paid: {
    dotClassName: 'bg-emerald-500',
    textClassName: 'text-emerald-700 dark:text-emerald-300',
    barClassName: 'bg-emerald-500',
  },
  cancelled: {
    dotClassName: 'bg-slate-400',
    textClassName: 'text-slate-600 dark:text-slate-300',
    barClassName: 'bg-slate-400',
  },
  blocked: {
    dotClassName: 'bg-rose-500',
    textClassName: 'text-rose-700 dark:text-rose-300',
    barClassName: 'bg-rose-500',
  },
} as const;

const isBlockedRun = (run: PayrollRunSummary) => (
  run.users_count === 0 && run.status !== 'paid' && run.status !== 'cancelled'
);

const getSegmentWidth = (count: number, total: number) => {
  if (total <= 0 || count <= 0) {
    return '0%';
  }

  return `${(count / total) * 100}%`;
};

export function PayrollOperationsPanel({
  copy,
  runs,
  formatMoney,
}: PayrollOperationsPanelProps) {
  const operations = copy.operations;
  const formatRunCount = (value: number) => (
    `${value} ${value === 1 ? operations.words.payrollRun : operations.words.payrollRuns}`
  );
  const blockedCount = runs.filter(isBlockedRun).length;
  const draftCount = runs.filter((run) => run.status === 'draft' && !isBlockedRun(run)).length;
  const reviewCount = runs.filter((run) => run.status === 'processed' && !isBlockedRun(run)).length;
  const approvedCount = runs.filter((run) => run.status === 'approved' && !isBlockedRun(run)).length;
  const paidCount = runs.filter((run) => run.status === 'paid').length;
  const cancelledCount = runs.filter((run) => run.status === 'cancelled').length;
  const payoutTotal = runs
    .filter((run) => run.status !== 'cancelled')
    .reduce((total, run) => total + run.preferredNetAmount, 0);
  const jurisdictionCount = new Set(
    runs
      .map((run) => run.jurisdictionLabel)
      .filter((label) => label && label !== copy.labels.automatic && label !== copy.labels.noJurisdiction),
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
    ? `${formatRunCount(blockedCount)} ${blockedCount === 1 ? operations.words.is : operations.words.are} ${operations.insight.blocked}`
    : approvedCount > 0
      ? `${formatRunCount(approvedCount)} ${approvedCount === 1 ? operations.words.is : operations.words.are} ${operations.insight.approved}`
      : reviewCount > 0
        ? `${formatRunCount(reviewCount)} ${reviewCount === 1 ? operations.words.requires : operations.words.require} ${operations.insight.review}`
        : runs.length > 0
          ? `${operations.insight.groupedPrefix} ${Math.max(jurisdictionCount, 1)} ${Math.max(jurisdictionCount, 1) === 1 ? operations.words.jurisdictionSignal : operations.words.jurisdictionSignals} ${operations.insight.groupedAnd} ${Math.max(operationalStructureCount, 1)} ${Math.max(operationalStructureCount, 1) === 1 ? operations.words.operationalStructure : operations.words.operationalStructures}.`
          : operations.insight.empty;

  const metrics = [
    {
      label: operations.metrics.payrollRuns,
      value: runs.length,
      Icon: ClipboardCheck,
      valueClassName: 'text-[#59C3A5]',
    },
    {
      label: operations.metrics.pendingReview,
      value: reviewCount + draftCount,
      Icon: FileClock,
      valueClassName: reviewCount + draftCount > 0 ? 'text-amber-600' : 'text-[#59C3A5]',
    },
    {
      label: operations.metrics.pendingPayment,
      value: approvedCount,
      Icon: CreditCard,
      valueClassName: approvedCount > 0 ? 'text-indigo-600' : 'text-[#59C3A5]',
    },
    {
      label: operations.metrics.blocked,
      value: blockedCount,
      Icon: AlertTriangle,
      valueClassName: blockedCount > 0 ? 'text-rose-600' : 'text-[#59C3A5]',
    },
    {
      label: operations.metrics.processed,
      value: reviewCount,
      Icon: CheckCircle2,
      valueClassName: 'text-[#59C3A5]',
    },
    {
      label: operations.metrics.payoutTotal,
      value: formatMoney(payoutTotal),
      Icon: Wallet,
      valueClassName: 'text-[#59C3A5]',
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
                <span className={`font-medium ${metric.valueClassName}`}>{metric.value}</span>
                <span>{metric.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {blockedCount > 0 ? (
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
              {blockedCount} {operations.badges.blocked}
            </span>
          ) : null}
          {approvedCount > 0 ? (
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300">
              {approvedCount} {operations.badges.pendingPayment}
            </span>
          ) : null}
          <span className="rounded-full border border-[#59C3A5]/15 bg-[#59C3A5]/5 px-3 py-1 text-xs font-medium text-[#59C3A5] dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300">
            {paidRate} {operations.badges.paidRate}
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
                  className={`${statusStyleConfig[item.key].barClassName} transition-all duration-300`}
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
              <span className={`h-2 w-2 rounded-full ${statusStyleConfig[item.key].dotClassName}`} />
              {operations.statuses[item.key]}
              <span className="font-medium text-slate-500 dark:text-slate-400">{item.count}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#59C3A5]/15 bg-[#59C3A5]/5 px-4 py-3 dark:border-[#59C3A5]/25 dark:bg-[#59C3A5]/15">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#59C3A5] dark:text-blue-300" />
          <p className="text-sm leading-relaxed text-[#59C3A5] dark:text-blue-200">
            {insightMessage}
          </p>
        </div>
      </div>
    </section>
  );
}
