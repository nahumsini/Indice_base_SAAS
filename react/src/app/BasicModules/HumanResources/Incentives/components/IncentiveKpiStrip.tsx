import { Bot, CheckCircle2, Eye, Gift, HandCoins, Users } from 'lucide-react';
import type { ReactNode } from 'react';

interface IncentiveKpiStripProps {
  activeCount: number;
  automatedCount: number;
  eligibleCount: number;
  manualCount: number;
  pausedCount: number;
  scheduledCount: number;
  selectedCount: number;
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

export function IncentiveKpiStrip({
  activeCount,
  automatedCount,
  eligibleCount,
  manualCount,
  pausedCount,
  scheduledCount,
  selectedCount,
  totalCount,
  visibleCount,
}: IncentiveKpiStripProps) {
  const activePercent = totalCount > 0 ? (activeCount / totalCount) * 100 : 0;
  const scheduledPercent = totalCount > 0 ? (scheduledCount / totalCount) * 100 : 0;
  const pausedPercent = totalCount > 0 ? (pausedCount / totalCount) * 100 : 0;

  return (
    <div className="mb-5 space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Metric icon={<Gift className="h-4 w-4" />} label="Total incentives" value={totalCount} />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Active" value={activeCount} valueClassName="text-emerald-600" />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<Bot className="h-4 w-4" />} label="Automated" value={automatedCount} valueClassName="text-blue-600" />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<HandCoins className="h-4 w-4" />} label="Manual" value={manualCount} valueClassName="text-amber-600" />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<Eye className="h-4 w-4" />} label="visible after filters" value={visibleCount} />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<Users className="h-4 w-4" />} label="eligible employees" value={eligibleCount} />
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="flex h-full">
          <div className="bg-emerald-500" style={{ width: `${activePercent}%` }} />
          <div className="bg-blue-500" style={{ width: `${scheduledPercent}%` }} />
          <div className="bg-slate-400" style={{ width: `${pausedPercent}%` }} />
        </div>
      </div>

      <div className="rounded-lg border border-[#143675]/15 bg-[#143675]/5 px-4 py-3 text-sm font-medium text-[#143675] dark:border-[#4a7bc8]/25 dark:bg-[#143675]/15 dark:text-blue-100">
        Incentives summary: {activeCount} active · {scheduledCount} scheduled · {pausedCount} paused · {selectedCount} selected · showing {visibleCount} of {totalCount}.
      </div>
    </div>
  );
}
