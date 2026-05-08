import { Archive, CheckCircle2, CircleDollarSign, Eye, PackageCheck, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';

interface AssetKpiStripProps {
  assignedCount: number;
  availableCount: number;
  maintenanceCount: number;
  selectedCount?: number;
  totalCount: number;
  totalValueAmount: number;
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

export function AssetKpiStrip({
  assignedCount,
  availableCount,
  maintenanceCount,
  selectedCount = 0,
  totalCount,
  totalValueAmount,
  visibleCount,
}: AssetKpiStripProps) {
  const availablePercent = totalCount > 0 ? (availableCount / totalCount) * 100 : 0;
  const assignedPercent = totalCount > 0 ? (assignedCount / totalCount) * 100 : 0;
  const maintenancePercent = totalCount > 0 ? (maintenanceCount / totalCount) * 100 : 0;
  const formattedValue = new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(totalValueAmount);

  return (
    <div className="mb-5 space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Metric icon={<Archive className="h-4 w-4" />} label="Total assets" value={totalCount} />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<PackageCheck className="h-4 w-4" />} label="Assigned" value={assignedCount} valueClassName="text-emerald-600" />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Available" value={availableCount} valueClassName="text-blue-600" />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<Wrench className="h-4 w-4" />} label="Maintenance" value={maintenanceCount} valueClassName="text-amber-600" />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<Eye className="h-4 w-4" />} label="visible after filters" value={visibleCount} valueClassName="text-[#143675]" />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<CircleDollarSign className="h-4 w-4" />} label="asset value" value={formattedValue} valueClassName="text-[#143675]" />
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="flex h-full">
          <div className="bg-emerald-500" style={{ width: `${assignedPercent}%` }} />
          <div className="bg-blue-500" style={{ width: `${availablePercent}%` }} />
          <div className="bg-amber-500" style={{ width: `${maintenancePercent}%` }} />
        </div>
      </div>

      <div className="rounded-lg border border-[#143675]/15 bg-[#143675]/5 px-4 py-3 text-sm font-medium text-[#143675] dark:border-[#4a7bc8]/25 dark:bg-[#143675]/15 dark:text-blue-100">
        Asset summary: {assignedCount} assigned · {availableCount} available · {maintenanceCount} in maintenance · {selectedCount} selected · showing {visibleCount} of {totalCount}.
      </div>
    </div>
  );
}
