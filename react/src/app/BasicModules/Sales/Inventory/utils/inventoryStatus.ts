import type { InventoryStatus, InventoryStockItem } from '../types/inventoryTypes';

export const inventoryStatusTone: Record<InventoryStatus, string> = {
  healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  lowStock: 'border-[#F4C84A]/50 bg-[#F4C84A]/15 text-[#9a6b05]',
  outOfStock: 'border-[#FF6B5E]/35 bg-[#FF6B5E]/10 text-[#B63B32]',
  needsReview: 'border-blue-200 bg-blue-50 text-blue-700',
  inactive: 'border-slate-200 bg-slate-50 text-slate-500',
  notTracked: 'border-slate-200 bg-slate-100 text-slate-600',
};

export const inventoryStatusBarTone: Record<InventoryStatus, string> = {
  healthy: 'bg-emerald-500',
  lowStock: 'bg-[#F4C84A]',
  outOfStock: 'bg-[#FF6B5E]',
  needsReview: 'bg-blue-500',
  inactive: 'bg-slate-300',
  notTracked: 'bg-slate-400',
};

export function getInventoryStatus(item: Pick<InventoryStockItem, 'usesInventory' | 'availableStock' | 'minimumStock'>): InventoryStatus {
  if (!item.usesInventory) return 'notTracked';
  if (item.availableStock <= 0) return 'outOfStock';
  if (item.availableStock <= item.minimumStock) return 'lowStock';
  return 'healthy';
}
