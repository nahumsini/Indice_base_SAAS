import { AlertTriangle, CheckCircle2, Clock3, Eye, FileText, SearchCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import type { RecordKpiCopy } from '../translations';

interface RecordKpiStripProps {
  copy: RecordKpiCopy;
  highSeverityCount: number;
  pendingCount: number;
  resolvedCount: number;
  reviewedCount: number;
  totalCount: number;
  visibleCount: number;
}

function Metric({ icon, label, value, valueClassName = 'text-[#143675]' }: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <span className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-[#143675] shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {icon}
      </span>
      <span className={`text-base font-bold ${valueClassName}`}>{value}</span>
      <span>{label}</span>
    </span>
  );
}

export function RecordKpiStrip({
  copy,
  highSeverityCount,
  pendingCount,
  resolvedCount,
  reviewedCount,
  totalCount,
  visibleCount,
}: RecordKpiStripProps) {
  const pendingPercent = totalCount > 0 ? (pendingCount / totalCount) * 100 : 0;
  const reviewedPercent = totalCount > 0 ? (reviewedCount / totalCount) * 100 : 0;
  const resolvedPercent = totalCount > 0 ? (resolvedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Metric icon={<FileText className="h-4 w-4" />} label={copy.total} value={totalCount} />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<Clock3 className="h-4 w-4" />} label={copy.pending} value={pendingCount} valueClassName="text-amber-600" />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<SearchCheck className="h-4 w-4" />} label={copy.reviewed} value={reviewedCount} valueClassName="text-blue-600" />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<CheckCircle2 className="h-4 w-4" />} label={copy.resolved} value={resolvedCount} valueClassName="text-emerald-600" />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<AlertTriangle className="h-4 w-4" />} label={copy.highSeverity} value={highSeverityCount} valueClassName="text-rose-600" />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<Eye className="h-4 w-4" />} label={copy.visibleAfterFilters} value={visibleCount} />
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="flex h-full">
          <div className="bg-amber-500" style={{ width: `${pendingPercent}%` }} />
          <div className="bg-blue-500" style={{ width: `${reviewedPercent}%` }} />
          <div className="bg-emerald-500" style={{ width: `${resolvedPercent}%` }} />
        </div>
      </div>

      <div className="rounded-lg border border-[#143675]/15 bg-[#143675]/5 px-4 py-3 text-sm font-medium text-[#143675] dark:border-[#4a7bc8]/25 dark:bg-[#143675]/15 dark:text-blue-100">
        {copy.summary(pendingCount, reviewedCount, resolvedCount, highSeverityCount, visibleCount, totalCount)}
      </div>
    </div>
  );
}
