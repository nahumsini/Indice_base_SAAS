import { CheckCircle2, Clock3, Eye, FileCheck2, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PermissionsTranslations } from '../translations';

interface PermissionKpiStripProps {
  approved: number;
  copy: PermissionsTranslations;
  pending: number;
  rejected: number;
  total: number;
  visible: number;
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

export function PermissionKpiStrip({ approved, copy, pending, rejected, total, visible }: PermissionKpiStripProps) {
  const approvedPercent = total > 0 ? (approved / total) * 100 : 0;
  const pendingPercent = total > 0 ? (pending / total) * 100 : 0;
  const rejectedPercent = total > 0 ? (rejected / total) * 100 : 0;
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Metric icon={<FileCheck2 className="h-4 w-4" />} label={copy.kpis.total} value={total} />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<Clock3 className="h-4 w-4" />} label={copy.kpis.pending} value={pending} valueClassName="text-amber-600" />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<CheckCircle2 className="h-4 w-4" />} label={copy.kpis.approved} value={approved} valueClassName="text-emerald-600" />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<XCircle className="h-4 w-4" />} label={copy.kpis.rejected} value={rejected} valueClassName="text-rose-600" />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<Eye className="h-4 w-4" />} label={copy.kpis.visibleAfterFilters} value={visible} />
        <span className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-[#143675] dark:bg-slate-800 dark:text-blue-100">
          {copy.kpis.approvalRate(approvalRate)}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="flex h-full">
          <div className="bg-emerald-500" style={{ width: `${approvedPercent}%` }} />
          <div className="bg-amber-500" style={{ width: `${pendingPercent}%` }} />
          <div className="bg-rose-500" style={{ width: `${rejectedPercent}%` }} />
        </div>
      </div>

      <div className="rounded-lg border border-[#143675]/15 bg-[#143675]/5 px-4 py-3 text-sm font-medium text-[#143675] dark:border-[#4a7bc8]/25 dark:bg-[#143675]/15 dark:text-blue-100">
        {copy.kpis.summary(approved, pending, rejected, visible, total)}
      </div>
    </div>
  );
}
