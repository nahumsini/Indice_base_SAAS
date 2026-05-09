import {
  Activity,
  AlertTriangle,
  Clock3,
  LogIn,
  LogOut,
  UserX,
} from 'lucide-react';
import { Skeleton } from '../../../../../components/ui/skeleton';
import { ControlInsightStrip } from './ControlInsightStrip';
import { ControlKpiMetric } from './ControlKpiMetric';
import { ControlOperationBar } from './ControlOperationBar';

interface ControlKpiStripLabels {
  absences: string;
  activeShifts: string;
  checkIns: string;
  checkOuts: string;
  late: string;
  noRecords: string;
  operationRate: string;
  reviewBadge: (count: number) => string;
  statusLabels: {
    absence: string;
    late: string;
    noRecord: string;
    onTrack: string;
    other: string;
  };
  summaryInsight: (params: {
    activeShiftCount: number;
    checkInsCount: number;
    operationRate: string;
    reviewCount: number;
    totalCount: number;
  }) => string;
}

interface ControlKpiStripProps {
  absencesCount: number;
  activeShiftCount: number;
  checkInsCount: number;
  checkOutsCount: number;
  isLoading: boolean;
  labels: ControlKpiStripLabels;
  lateCount: number;
  noRecordCount: number;
  onTrackCount: number;
  otherStatusCount: number;
  totalCount: number;
}

export function ControlKpiStrip({
  absencesCount,
  activeShiftCount,
  checkInsCount,
  checkOutsCount,
  isLoading,
  labels,
  lateCount,
  noRecordCount,
  onTrackCount,
  otherStatusCount,
  totalCount,
}: ControlKpiStripProps) {
  const reviewCount = lateCount + noRecordCount + absencesCount;
  const operationRate = totalCount > 0 ? `${Math.round((checkInsCount / totalCount) * 100)}%` : '0%';

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
          <ControlKpiMetric
            icon={<LogIn className="h-4 w-4" />}
            label={labels.checkIns}
            value={checkInsCount}
            valueClassName="text-emerald-600 dark:text-emerald-400"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <ControlKpiMetric
            icon={<LogOut className="h-4 w-4" />}
            label={labels.checkOuts}
            value={checkOutsCount}
            valueClassName="text-sky-600 dark:text-sky-300"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <ControlKpiMetric
            icon={<Activity className="h-4 w-4" />}
            label={labels.activeShifts}
            value={activeShiftCount}
            valueClassName="text-[#143675] dark:text-blue-300"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <ControlKpiMetric
            icon={<Clock3 className="h-4 w-4" />}
            label={labels.noRecords}
            value={noRecordCount}
            valueClassName="text-blue-600 dark:text-blue-300"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <ControlKpiMetric
            icon={<AlertTriangle className="h-4 w-4" />}
            label={labels.late}
            value={lateCount}
            valueClassName="text-amber-600 dark:text-amber-400"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <ControlKpiMetric
            icon={<UserX className="h-4 w-4" />}
            label={labels.absences}
            value={absencesCount}
            valueClassName="text-rose-600 dark:text-rose-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {reviewCount > 0 ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              {labels.reviewBadge(reviewCount)}
            </span>
          ) : null}
          <span className="rounded-full border border-[#143675]/15 bg-[#143675]/5 px-3 py-1 text-xs font-semibold text-[#143675] dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300">
            {operationRate} {labels.operationRate}
          </span>
        </div>
      </div>

      <ControlOperationBar
        absencesCount={absencesCount}
        lateCount={lateCount}
        noRecordCount={noRecordCount}
        onTrackCount={onTrackCount}
        otherCount={otherStatusCount}
        labels={labels.statusLabels}
      />

      <ControlInsightStrip
        message={labels.summaryInsight({
          activeShiftCount,
          checkInsCount,
          operationRate,
          reviewCount,
          totalCount,
        })}
      />
    </div>
  );
}

export type { ControlKpiStripLabels };
