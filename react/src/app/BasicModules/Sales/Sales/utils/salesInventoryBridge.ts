import type { InventoryMovementStatus } from '../types/salesTypes';
import type { SalesRecordsTranslations } from '../translations';

export const SALES_INVENTORY_MOVEMENT_TYPE = 'outbound_sale' as const;

export const inventoryMovementStatusClasses: Record<InventoryMovementStatus, string> = {
  not_generated: 'border-slate-300 bg-slate-100 text-slate-500',
  pending: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
  approved: 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8]',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export function getInventoryMovementTooltip(
  status: InventoryMovementStatus,
  t: SalesRecordsTranslations,
) {
  return t.movementTooltips[status];
}
