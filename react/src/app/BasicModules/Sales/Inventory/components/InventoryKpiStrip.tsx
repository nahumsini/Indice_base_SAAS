import { Children, type ReactNode } from 'react';
import { AlertTriangle, Archive, CircleDollarSign, PackageCheck, RotateCw, Warehouse } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';
import type {
  InventoryKpiMetrics,
  InventoryMetrics,
  InventoryMovementMetrics,
  InventoryOperationalView,
  InventoryWarehouseMetrics,
} from '../types/inventoryTypes';
import type { InventoryTranslations } from '../translations';
import { formatInventoryCurrency, formatInventoryNumber } from '../utils/inventoryFormatters';
import { useLearningModeHeaderActions } from '../../../../learningMode';

function InventoryMetricCard({
  icon,
  value,
  label,
  valueClassName = 'text-slate-950 dark:text-white',
}: {
  icon: ReactNode;
  value: string;
  label: string;
  valueClassName?: string;
}) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        {icon}
      </span>
      <span className="text-sm font-medium">
        <span className={cn('mr-2 font-medium', valueClassName)}>{value}</span>
        <span className="font-medium text-slate-600 dark:text-slate-300">{label}</span>
      </span>
    </span>
  );
}

function InventoryMetricGroup({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-sm text-slate-600 dark:text-slate-300">
      {items.map((child, index) => (
        <div key={index} className="flex items-center gap-4">
          {index > 0 ? (
            <span className="hidden h-5 w-px rounded-full bg-slate-200 dark:bg-slate-700 sm:block" aria-hidden="true" />
          ) : null}
          {child}
        </div>
      ))}
    </div>
  );
}

export function InventoryKpiStrip({
  activeView,
  metrics,
  t,
}: {
  activeView?: InventoryOperationalView;
  metrics: InventoryKpiMetrics | InventoryWarehouseMetrics | InventoryMovementMetrics | InventoryMetrics;
  t: InventoryTranslations;
}) {
  const learningModeActive = useLearningModeHeaderActions()?.active ?? false;

  if (learningModeActive) {
    return null;
  }

  if (!activeView && 'trackedItems' in metrics) {
    return (
      <InventoryMetricGroup>
        <InventoryMetricCard icon={<PackageCheck className="h-4 w-4" />} value={formatInventoryNumber(metrics.trackedItems)} label={t.metrics.trackedItems} valueClassName="text-[#FF6B5E]" />
        <InventoryMetricCard icon={<AlertTriangle className="h-4 w-4" />} value={formatInventoryNumber(metrics.lowStockItems)} label={t.metrics.lowStockItems} valueClassName="text-[#9a6b05]" />
        <InventoryMetricCard icon={<Archive className="h-4 w-4" />} value={formatInventoryNumber(metrics.outOfStockItems)} label={t.metrics.outOfStockItems} valueClassName="text-[#B63B32]" />
        <InventoryMetricCard icon={<CircleDollarSign className="h-4 w-4" />} value={formatInventoryCurrency(metrics.totalStockValue)} label={t.metrics.totalStockValue} valueClassName="text-[#2563EB]" />
        <InventoryMetricCard icon={<RotateCw className="h-4 w-4" />} value={formatInventoryNumber(metrics.recentMovements)} label={t.metrics.recentMovements} valueClassName="text-[#177d66]" />
      </InventoryMetricGroup>
    );
  }

  if (activeView === 'warehouses') {
    const warehouseMetrics = metrics as InventoryWarehouseMetrics;

    return (
      <InventoryMetricGroup>
        <InventoryMetricCard icon={<Warehouse className="h-4 w-4" />} value={formatInventoryNumber(warehouseMetrics.activeWarehouses)} label={t.operational.kpis.activeWarehouses} valueClassName="text-[#FF6B5E]" />
        <InventoryMetricCard icon={<Archive className="h-4 w-4" />} value={formatInventoryNumber(warehouseMetrics.storedItems)} label={t.operational.kpis.storedItems} />
        <InventoryMetricCard icon={<PackageCheck className="h-4 w-4" />} value={formatInventoryNumber(warehouseMetrics.totalUnits)} label={t.operational.kpis.totalUnits} valueClassName="text-[#2563EB]" />
        <InventoryMetricCard icon={<AlertTriangle className="h-4 w-4" />} value={formatInventoryNumber(warehouseMetrics.attentionWarehouses)} label={t.operational.kpis.attentionWarehouses} valueClassName="text-[#9a6b05]" />
        <InventoryMetricCard icon={<CircleDollarSign className="h-4 w-4" />} value={formatInventoryCurrency(warehouseMetrics.estimatedValue)} label={t.operational.kpis.estimatedValue} valueClassName="text-[#177d66]" />
      </InventoryMetricGroup>
    );
  }

  if (activeView === 'movements') {
    const movementMetrics = metrics as InventoryMovementMetrics;

    return (
      <InventoryMetricGroup>
        <InventoryMetricCard icon={<RotateCw className="h-4 w-4" />} value={formatInventoryNumber(movementMetrics.totalMovements)} label={t.operational.kpis.totalMovements} valueClassName="text-[#FF6B5E]" />
        <InventoryMetricCard icon={<PackageCheck className="h-4 w-4" />} value={formatInventoryNumber(movementMetrics.supplierReceipts)} label={t.operational.kpis.supplierReceipts} valueClassName="text-[#177d66]" />
        <InventoryMetricCard icon={<Warehouse className="h-4 w-4" />} value={formatInventoryNumber(movementMetrics.transfers)} label={t.operational.kpis.transfers} valueClassName="text-[#2563EB]" />
        <InventoryMetricCard icon={<Archive className="h-4 w-4" />} value={formatInventoryNumber(movementMetrics.adjustments)} label={t.operational.kpis.adjustments} />
        <InventoryMetricCard icon={<AlertTriangle className="h-4 w-4" />} value={formatInventoryNumber(movementMetrics.inTransit)} label={t.operational.kpis.inTransit} valueClassName="text-[#9a6b05]" />
        <InventoryMetricCard icon={<PackageCheck className="h-4 w-4" />} value={formatInventoryNumber(movementMetrics.completed)} label={t.operational.kpis.completed} valueClassName="text-emerald-600" />
        <InventoryMetricCard icon={<CircleDollarSign className="h-4 w-4" />} value={formatInventoryCurrency(movementMetrics.inventoryValueInTransit)} label={t.operational.kpis.inventoryValueInTransit} valueClassName="text-[#B63B32]" />
      </InventoryMetricGroup>
    );
  }

  const stockMetrics = metrics as InventoryKpiMetrics;

  return (
    <InventoryMetricGroup>
      <InventoryMetricCard icon={<PackageCheck className="h-4 w-4" />} value={formatInventoryNumber(stockMetrics.totalItems)} label={t.operational.kpis.totalItems} valueClassName="text-[#FF6B5E]" />
      <InventoryMetricCard icon={<Archive className="h-4 w-4" />} value={formatInventoryNumber(stockMetrics.totalUnits)} label={t.operational.kpis.totalUnits} />
      <InventoryMetricCard icon={<AlertTriangle className="h-4 w-4" />} value={formatInventoryNumber(stockMetrics.lowStockItems)} label={t.operational.kpis.lowStockItems} valueClassName="text-[#9a6b05]" />
      <InventoryMetricCard icon={<RotateCw className="h-4 w-4" />} value={formatInventoryNumber(stockMetrics.outOfStockItems)} label={t.operational.kpis.outOfStockItems} valueClassName="text-[#B63B32]" />
      <InventoryMetricCard icon={<CircleDollarSign className="h-4 w-4" />} value={formatInventoryCurrency(stockMetrics.estimatedValue)} label={t.operational.kpis.estimatedValue} valueClassName="text-[#2563EB]" />
    </InventoryMetricGroup>
  );
}
