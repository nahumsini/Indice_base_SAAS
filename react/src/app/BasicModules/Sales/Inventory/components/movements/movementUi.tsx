import { ArrowDown, Ban, Pencil, Printer, Radar } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import type { InventoryMovementType, InventoryOperationalMovement } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { formatInventoryNumber } from '../../utils/inventoryFormatters';

export const movementTone: Record<InventoryMovementType, string> = {
  supplierReceipt: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  stockIn: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  transfer: 'border-blue-200 bg-blue-50 text-blue-700',
  storeReplenishment: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  sale: 'border-violet-200 bg-violet-50 text-violet-700',
  return: 'border-slate-200 bg-slate-50 text-slate-600',
  adjustment: 'border-amber-200 bg-amber-50 text-amber-700',
  writeOff: 'border-red-200 bg-red-50 text-red-700',
  stockOut: 'border-red-200 bg-red-50 text-red-700',
  wasteLoss: 'border-red-200 bg-red-50 text-red-700',
};

export const movementStatusTone = {
  draft: 'border-slate-200 bg-slate-50 text-slate-600',
  inTransit: 'border-blue-200 bg-blue-50 text-blue-700',
  received: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  cancelled: 'border-red-300 bg-red-100 text-red-800 shadow-sm shadow-red-200/60',
};

export function MovementFlow({ movement }: { movement: InventoryOperationalMovement }) {
  return (
    <div className="min-w-[260px] rounded-2xl border border-slate-200 bg-white p-3">
      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
        {movement.fromWarehouseName ?? 'System'}
      </span>
      <div className="my-2 flex items-center gap-2 pl-3 text-[#B63B32]">
        <ArrowDown className="h-4 w-4" />
        <span className="text-[10px] font-black uppercase tracking-[0.16em]">flow</span>
      </div>
      <span className="inline-flex rounded-full border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-3 py-1 text-xs font-black text-[#B63B32]">
        {movement.toWarehouseName ?? 'Inventory'}
      </span>
    </div>
  );
}

export function MovementProduct({ movement, t }: { movement: InventoryOperationalMovement; t: InventoryTranslations }) {
  return (
    <div className="flex min-w-[260px] items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-black uppercase text-slate-400">
        {movement.productImageUrl ? (
          <img src={movement.productImageUrl} alt={movement.productImageAlt ?? movement.productName} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          t.operational.columns.photo
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-slate-950">{movement.productName}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">SKU: {movement.productSku ?? t.common.notAvailable}</p>
        {movement.variantLabel ? <p className="text-xs font-semibold text-slate-400">{movement.variantLabel}</p> : null}
      </div>
    </div>
  );
}

export function MovementQuantity({ quantity }: { quantity: number }) {
  const isPositive = quantity >= 0;
  return (
    <span className={`text-lg font-black tabular-nums ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
      {isPositive ? '+' : ''}{formatInventoryNumber(quantity)}
    </span>
  );
}

export function MovementActions({
  movement,
  t,
  onEdit,
  onPrint,
  onTrack,
  onCancel,
}: {
  movement: InventoryOperationalMovement;
  t: InventoryTranslations;
  onEdit: (movement: InventoryOperationalMovement) => void;
  onPrint: (movement: InventoryOperationalMovement) => void;
  onTrack: (movement: InventoryOperationalMovement) => void;
  onCancel: (movement: InventoryOperationalMovement) => void;
}) {
  const isCancelled = movement.status === 'cancelled';
  const actions = [
    { icon: <Pencil className="h-4 w-4" />, title: t.operational.actions.edit, className: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50', onClick: () => onEdit(movement), disabled: isCancelled },
    { icon: <Printer className="h-4 w-4" />, title: t.operational.actions.print, className: 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100', onClick: () => onPrint(movement), disabled: false },
    { icon: <Radar className="h-4 w-4" />, title: t.operational.actions.track, className: 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100', onClick: () => onTrack(movement), disabled: false },
    { icon: <Ban className="h-4 w-4" />, title: t.operational.actions.cancelMovement, className: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50', onClick: () => onCancel(movement), disabled: isCancelled },
  ];

  return (
    <div className="flex justify-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-2">
      {actions.map((action) => (
        <Button key={action.title} size="icon" variant="ghost" className={`h-9 w-9 rounded-xl border ${action.className}`} title={action.title} disabled={action.disabled} onClick={action.onClick}>
          {action.icon}
        </Button>
      ))}
    </div>
  );
}

export function MovementNumber({ movement, t }: { movement: InventoryOperationalMovement; t: InventoryTranslations }) {
  return (
    <div className="min-w-[170px]">
      <p className="text-sm font-black text-slate-950">{movement.movementNumber ?? movement.id}</p>
      <span className={`mt-2 inline-flex rounded-md border px-2 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${movementTone[movement.movementType]}`}>
        {t.operational.movementTypes[movement.movementType]}
      </span>
      <p className="mt-2 text-xs font-semibold text-slate-500">{movement.movementDate}</p>
    </div>
  );
}
