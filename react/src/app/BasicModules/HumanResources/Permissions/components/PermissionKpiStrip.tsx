import { BadgeDollarSign, CheckCircle2, Clock3, Eye, FileCheck2, WalletCards, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PermissionsTranslations } from '../translations';

interface PermissionKpiStripProps {
  approved: number;
  copy: PermissionsTranslations;
  paid: number;
  pending: number;
  rejected: number;
  total: number;
  unpaid: number;
  visible: number;
}

function Metric({ icon, label, value, valueClassName = 'text-[#59C3A5]' }: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <span className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-[#59C3A5] shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {icon}
      </span>
      <span className={`text-base font-medium ${valueClassName}`}>{value}</span>
      <span>{label}</span>
    </span>
  );
}

export function PermissionKpiStrip({ approved, copy, paid, pending, rejected, total, unpaid, visible }: PermissionKpiStripProps) {
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
        <span className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-[#59C3A5] dark:bg-slate-800 dark:text-blue-100">
          {copy.kpis.approvalRate(approvalRate)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <BadgeDollarSign className="h-4 w-4" />
          {paid} {copy.kpis.paid}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <WalletCards className="h-4 w-4" />
          {unpaid} {copy.kpis.unpaid}
        </span>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="flex h-full">
            <div className="bg-emerald-500" style={{ width: `${approvedPercent}%` }} />
            <div className="bg-amber-500" style={{ width: `${pendingPercent}%` }} />
            <div className="bg-rose-500" style={{ width: `${rejectedPercent}%` }} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <LegendItem color="bg-emerald-500" label={copy.kpis.approved} />
          <LegendItem color="bg-amber-500" label={copy.kpis.pending} />
          <LegendItem color="bg-rose-500" label={copy.kpis.rejected} />
        </div>
      </div>

      <div className="rounded-xl border border-[#59C3A5]/15 bg-[#59C3A5]/5 px-4 py-3 text-sm font-medium text-[#177d66] dark:border-[#59C3A5]/25 dark:bg-[#59C3A5]/15 dark:text-[#8DE1CB]">
        {copy.kpis.summary(approved, pending, rejected, visible, total)}
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
