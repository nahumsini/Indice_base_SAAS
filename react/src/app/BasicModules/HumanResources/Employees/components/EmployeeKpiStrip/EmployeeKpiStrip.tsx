import {
  AlertTriangle,
  CalendarClock,
  Coins,
  Eye,
  FileText,
  Info,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { Skeleton } from '../../../../../components/ui/skeleton';
import { OperationalKpiArea, type OperationalAlertChip } from '../../../../shared/operational';

interface EmployeeKpiStripLabels {
  active: string;
  activeRate: string;
  documentsPending: string;
  documentsPendingAlert: (count: number) => string;
  inactive: string;
  noSchedule: string;
  noScheduleAlert: (count: number) => string;
  payroll: string;
  payrollMultiCurrencyAlert: (count: number) => string;
  payrollNative: string;
  statusReview: (count: number) => string;
  summaryInsight: (params: {
    activeCount: number;
    activeRate: string;
    missingDocumentsCount: number;
    noScheduleCount: number;
    payroll: string;
    statusReviewCount: number;
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
  missingDocumentsCount: number;
  monthlyPayroll: string;
  nativePayroll: string;
  noScheduleCount: number;
  payrollCurrencyCount: number;
  terminatedCount: number;
  totalCount: number;
  visibleCount: number;
}

export function EmployeeKpiStrip({
  activeCount,
  inactiveCount,
  isLoading,
  labels,
  missingDocumentsCount,
  monthlyPayroll,
  nativePayroll,
  noScheduleCount,
  payrollCurrencyCount,
  terminatedCount,
  totalCount,
  visibleCount,
}: EmployeeKpiStripProps) {
  const inactiveAndTerminatedCount = inactiveCount + terminatedCount;
  const activeRate = totalCount > 0 ? `${Math.round((activeCount / totalCount) * 100)}%` : '0%';
  const alertChips: OperationalAlertChip[] = [];

  if (noScheduleCount > 0) {
    alertChips.push({
        id: 'no-schedule',
        icon: <CalendarClock className="h-3.5 w-3.5" />,
        label: labels.noScheduleAlert(noScheduleCount),
        tone: 'warning',
    });
  }

  if (missingDocumentsCount > 0) {
    alertChips.push({
        id: 'documents',
        icon: <FileText className="h-3.5 w-3.5" />,
        label: labels.documentsPendingAlert(missingDocumentsCount),
        tone: 'info',
    });
  }

  if (inactiveAndTerminatedCount > 0) {
    alertChips.push({
        id: 'status',
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        label: labels.statusReview(inactiveAndTerminatedCount),
        tone: 'brand',
    });
  }

  if (payrollCurrencyCount > 1) {
    alertChips.push({
        id: 'payroll-currencies',
        icon: <Coins className="h-3.5 w-3.5" />,
        label: labels.payrollMultiCurrencyAlert(payrollCurrencyCount),
        tone: 'info',
    });
  }

  if (nativePayroll) {
    alertChips.push({
        id: 'payroll-native',
        icon: <Wallet className="h-3.5 w-3.5" />,
        label: `${labels.payrollNative}: ${nativePayroll}`,
        tone: 'neutral',
    });
  }

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
    <OperationalKpiArea
      alertChips={alertChips}
      className="mb-6"
      distributionSegments={[
        {
          id: 'active',
          label: labels.active,
          count: activeCount,
          className: 'bg-emerald-500',
        },
        {
          id: 'inactive',
          label: labels.inactive,
          count: inactiveCount,
          className: 'bg-amber-500',
        },
        {
          id: 'terminated',
          label: labels.terminated,
          count: terminatedCount,
          className: 'bg-rose-500',
        },
      ]}
      insight={labels.summaryInsight({
        activeCount,
        activeRate,
        missingDocumentsCount,
        noScheduleCount,
        payroll: monthlyPayroll,
        statusReviewCount: inactiveAndTerminatedCount,
        totalCount,
        visibleCount,
      })}
      insightIcon={<Info className="h-4 w-4" />}
      metrics={[
        {
          id: 'total',
          icon: <Users className="h-4 w-4" />,
          label: labels.total,
          value: totalCount,
        },
        {
          id: 'active',
          icon: <UserCheck className="h-4 w-4" />,
          label: labels.active,
          value: activeCount,
          valueClassName: 'text-emerald-600 dark:text-emerald-400',
        },
        {
          id: 'visible',
          icon: <Eye className="h-4 w-4" />,
          label: labels.visible,
          value: visibleCount,
          valueClassName: 'text-[#59C3A5] dark:text-blue-300',
        },
        {
          id: 'no-schedule',
          icon: <CalendarClock className="h-4 w-4" />,
          label: labels.noSchedule,
          value: noScheduleCount,
          valueClassName: noScheduleCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-950 dark:text-white',
        },
        {
          id: 'documents',
          icon: <FileText className="h-4 w-4" />,
          label: labels.documentsPending,
          value: missingDocumentsCount,
          valueClassName: missingDocumentsCount > 0 ? 'text-blue-600 dark:text-blue-300' : 'text-slate-950 dark:text-white',
        },
        {
          id: 'payroll',
          icon: <Wallet className="h-4 w-4" />,
          label: labels.payroll,
          value: monthlyPayroll,
          valueClassName: 'text-[#59C3A5] dark:text-blue-300',
        },
      ]}
    />
  );
}

export type { EmployeeKpiStripLabels };
