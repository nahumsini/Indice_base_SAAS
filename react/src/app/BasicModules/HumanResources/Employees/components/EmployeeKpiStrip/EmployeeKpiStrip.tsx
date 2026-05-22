import {
  Eye,
  MousePointer2,
  UserCheck,
  UserMinus,
  Users,
  Wallet,
} from 'lucide-react';
import { Skeleton } from '../../../../../components/ui/skeleton';
import { EmployeeInsightStrip } from './EmployeeInsightStrip';
import { EmployeeKpiMetric } from './EmployeeKpiMetric';
import { EmployeeStatusBar } from './EmployeeStatusBar';

interface EmployeeKpiStripLabels {
  active: string;
  activeRate: string;
  inactive: string;
  payroll: string;
  selected: string;
  selectedBadge: (count: number) => string;
  statusReview: (count: number) => string;
  summaryInsight: (params: {
    activeCount: number;
    activeRate: string;
    payroll: string;
    totalCount: number;
    visibleCount: number;
  }) => string;
  terminated: string;
  total: string;
  visible: string;
}

interface EmployeeKpiStripProps {
  activeCount: number;
  inactiveCount: number;
  isLoading: boolean;
  labels: EmployeeKpiStripLabels;
  monthlyPayroll: string;
  selectedCount: number;
  terminatedCount: number;
  totalCount: number;
  visibleCount: number;
}

export function EmployeeKpiStrip({
  activeCount,
  inactiveCount,
  isLoading,
  labels,
  monthlyPayroll,
  selectedCount,
  terminatedCount,
  totalCount,
  visibleCount,
}: EmployeeKpiStripProps) {
  const inactiveAndTerminatedCount = inactiveCount + terminatedCount;
  const activeRate = totalCount > 0 ? `${Math.round((activeCount / totalCount) * 100)}%` : '0%';

  if (isLoading) {
    return (
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-36 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <EmployeeKpiMetric
            icon={<Users className="h-4 w-4" />}
            label={labels.total}
            value={totalCount}
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <EmployeeKpiMetric
            icon={<UserCheck className="h-4 w-4" />}
            label={labels.active}
            value={activeCount}
            valueClassName="text-emerald-600 dark:text-emerald-400"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <EmployeeKpiMetric
            icon={<UserMinus className="h-4 w-4" />}
            label={labels.inactive}
            value={inactiveAndTerminatedCount}
            valueClassName="text-amber-600 dark:text-amber-400"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <EmployeeKpiMetric
            icon={<Eye className="h-4 w-4" />}
            label={labels.visible}
            value={visibleCount}
            valueClassName="text-[#59C3A5] dark:text-blue-300"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <EmployeeKpiMetric
            icon={<MousePointer2 className="h-4 w-4" />}
            label={labels.selected}
            value={selectedCount}
            valueClassName="text-blue-600 dark:text-blue-300"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <EmployeeKpiMetric
            icon={<Wallet className="h-4 w-4" />}
            label={labels.payroll}
            value={monthlyPayroll}
            valueClassName="text-[#59C3A5] dark:text-blue-300"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {inactiveAndTerminatedCount > 0 ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              {labels.statusReview(inactiveAndTerminatedCount)}
            </span>
          ) : null}
          {selectedCount > 0 ? (
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
              {labels.selectedBadge(selectedCount)}
            </span>
          ) : null}
          <span className="rounded-full border border-[#59C3A5]/15 bg-[#59C3A5]/5 px-3 py-1 text-xs font-semibold text-[#59C3A5] dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300">
            {activeRate} {labels.activeRate}
          </span>
        </div>
      </div>

      <EmployeeStatusBar
        activeCount={activeCount}
        inactiveCount={inactiveCount}
        terminatedCount={terminatedCount}
        labels={{
          active: labels.active,
          inactive: labels.inactive,
          terminated: labels.terminated,
        }}
      />

      <EmployeeInsightStrip
        message={labels.summaryInsight({
          activeCount,
          activeRate,
          payroll: monthlyPayroll,
          totalCount,
          visibleCount,
        })}
      />
    </div>
  );
}

export type { EmployeeKpiStripLabels };

