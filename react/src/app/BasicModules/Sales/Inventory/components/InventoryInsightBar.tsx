import { AlertCircle } from 'lucide-react';
import type {
  InventoryKpiMetrics,
  InventoryMetrics,
  InventoryMovementMetrics,
  InventoryOperationalView,
  InventoryWarehouseMetrics,
} from '../types/inventoryTypes';
import type { InventoryTranslations } from '../translations';

export function InventoryInsightBar({
  activeView,
  metrics,
  monetaryValueLabel = 'No disponible',
  t,
}: {
  activeView?: InventoryOperationalView;
  metrics: InventoryKpiMetrics | InventoryWarehouseMetrics | InventoryMovementMetrics | InventoryMetrics;
  monetaryValueLabel?: string;
  t: InventoryTranslations;
}) {
  const copy = (() => {
    if (!activeView && 'trackedItems' in metrics) {
      return t.insight.summary(
        metrics.trackedItems,
        metrics.lowStockItems,
        metrics.outOfStockItems,
        monetaryValueLabel,
      );
    }

    if (activeView === 'warehouses') {
      const warehouseMetrics = metrics as InventoryWarehouseMetrics;
      return t.operational.insight.warehouses(
        warehouseMetrics.activeWarehouses,
        warehouseMetrics.storedItems,
        warehouseMetrics.attentionWarehouses,
      );
    }

    if (activeView === 'movements') {
      const movementMetrics = metrics as InventoryMovementMetrics;
      return t.operational.insight.traceability(
        movementMetrics.totalMovements,
        movementMetrics.transfers,
        movementMetrics.supplierReceipts,
        movementMetrics.inTransit,
        monetaryValueLabel,
      );
    }

    const stockMetrics = metrics as InventoryKpiMetrics;
    return t.operational.insight.stock(
      stockMetrics.totalItems,
      stockMetrics.totalUnits,
      stockMetrics.lowStockItems + stockMetrics.outOfStockItems,
      monetaryValueLabel,
    );
  })();

  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-5 py-4 text-sm font-medium text-slate-700 shadow-sm shadow-[#FF6B5E]/5 dark:border-[#FF6B5E]/25 dark:bg-[#FF6B5E]/15 dark:text-slate-200">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#B63B32] dark:text-[#FFB0AA]" />
      <p>{copy}</p>
    </div>
  );
}
