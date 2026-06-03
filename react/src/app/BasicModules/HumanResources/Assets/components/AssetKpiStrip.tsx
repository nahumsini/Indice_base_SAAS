import { Archive, CheckCircle2, CircleDollarSign, Eye, PackageCheck, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AssetKpiCopy } from '../translations';

interface AssetKpiStripProps {
  assignedCount: number;
  availableCount: number;
  copy: AssetKpiCopy;
  locale: string;
  maintenanceCount: number;
  selectedCount?: number;
  totalCount: number;
  totalValueAmount: number;
  visibleCount: number;
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
      <span className={`text-base font-bold ${valueClassName}`}>{value}</span>
      <span>{label}</span>
    </span>
  );
}

export function AssetKpiStrip({
  assignedCount,
  availableCount,
  copy,
  locale,
  maintenanceCount,
  selectedCount = 0,
  totalCount,
  totalValueAmount,
  visibleCount,
}: AssetKpiStripProps) {
  const availablePercent = totalCount > 0 ? (availableCount / totalCount) * 100 : 0;
  const assignedPercent = totalCount > 0 ? (assignedCount / totalCount) * 100 : 0;
  const maintenancePercent = totalCount > 0 ? (maintenanceCount / totalCount) * 100 : 0;
  const formattedValue = new Intl.NumberFormat(locale, {
    currency: 'USD',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(totalValueAmount);

  return (
    <div className="mb-5 space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Metric icon={<Archive className="h-4 w-4" />} label={copy.cards.total} value={totalCount} />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<PackageCheck className="h-4 w-4" />} label={copy.cards.assigned} value={assignedCount} valueClassName="text-emerald-600" />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<CheckCircle2 className="h-4 w-4" />} label={copy.cards.available} value={availableCount} valueClassName="text-blue-600" />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<Wrench className="h-4 w-4" />} label={copy.cards.maintenance} value={maintenanceCount} valueClassName="text-amber-600" />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<Eye className="h-4 w-4" />} label={copy.kpis.visibleAfterFilters} value={visibleCount} valueClassName="text-[#59C3A5]" />
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Metric icon={<CircleDollarSign className="h-4 w-4" />} label={copy.kpis.assetValue} value={formattedValue} valueClassName="text-[#59C3A5]" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="flex h-full">
            <div className="bg-emerald-500" style={{ width: `${assignedPercent}%` }} />
            <div className="bg-blue-500" style={{ width: `${availablePercent}%` }} />
            <div className="bg-amber-500" style={{ width: `${maintenancePercent}%` }} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <LegendItem color="bg-emerald-500" label={copy.cards.assigned} />
          <LegendItem color="bg-blue-500" label={copy.cards.available} />
          <LegendItem color="bg-amber-500" label={copy.cards.maintenance} />
        </div>
      </div>

      <div className="rounded-lg border border-[#59C3A5]/15 bg-[#59C3A5]/5 px-4 py-3 text-sm font-medium text-[#59C3A5] dark:border-[#59C3A5]/25 dark:bg-[#59C3A5]/15 dark:text-blue-100">
        {copy.kpis.summary(assignedCount, availableCount, maintenanceCount, selectedCount, visibleCount, totalCount)}
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
