import { ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import { IndiceModalSummary } from '../../../../../components/indice-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import type { InventoryWarehouse } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { formatInventoryCurrency, formatInventoryNumber } from '../../utils/inventoryFormatters';
import { InventoryModalField, inventoryModalControlClassName, sortInventoryOptions } from '../InventoryModalPrimitives';

export function WarehouseDeleteView({
  warehouse,
  totalUnits,
  storedItems,
  estimatedValue,
  targetWarehouseId,
  warehouses,
  t,
  onTargetChange,
}: {
  warehouse: InventoryWarehouse;
  totalUnits: number;
  storedItems: number;
  estimatedValue: number;
  targetWarehouseId: string;
  warehouses: InventoryWarehouse[];
  t: InventoryTranslations;
  onTargetChange: (warehouseId: string) => void;
}) {
  const hasStock = totalUnits > 0;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <IndiceModalSummary
        columns={3}
        items={[
          { id: 'warehouse', label: t.operational.columns.warehouse, value: warehouse.name },
          { id: 'items', label: t.operational.columns.storedItems, value: formatInventoryNumber(storedItems) },
          { id: 'stock', label: t.operational.columns.totalUnits, value: formatInventoryNumber(totalUnits) },
          { id: 'value', label: t.operational.columns.estimatedValue, value: formatInventoryCurrency(estimatedValue) },
        ]}
        variant="accent"
      />
      {hasStock ? (
        <section className="rounded-xl border border-cyan-200 bg-cyan-50 p-5">
          <div className="mb-4 flex items-start gap-3 text-cyan-800">
            <ArrowRightLeft className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm font-normal leading-6">{t.operational.modals.activeWarehousesDescription}</p>
          </div>
          <InventoryModalField label={t.operational.modals.transferStockTo}>
            <Select value={targetWarehouseId || 'none'} onValueChange={(value) => onTargetChange(value === 'none' ? '' : value)}>
              <SelectTrigger className={inventoryModalControlClassName}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t.operational.modals.selectDestinationWarehouse}</SelectItem>
                {sortInventoryOptions(warehouses.filter((item) => item.id !== warehouse.id && item.status === 'active').map((target) => ({ value: target.id, label: target.name }))).map((target) => (
                  <SelectItem key={target.value} value={target.value}>{target.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InventoryModalField>
        </section>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-normal text-emerald-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {t.operational.modals.warehouseReadyToDelete}
        </div>
      )}
    </div>
  );
}
