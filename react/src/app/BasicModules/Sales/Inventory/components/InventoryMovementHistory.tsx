import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ClipboardCheck } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../components/ui/utils';
import type { InventoryMovement } from '../types/inventoryTypes';
import type { InventoryTranslations } from '../translations';
import { formatInventoryCurrency, formatInventoryNumber } from '../utils/inventoryFormatters';

const movementIconMap = {
  stockIn: ArrowDownLeft,
  stockOut: ArrowUpRight,
  adjustment: ClipboardCheck,
  transfer: ArrowLeftRight,
};

export function InventoryMovementHistory({
  movements,
  t,
}: {
  movements: InventoryMovement[];
  t: InventoryTranslations;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-black text-slate-950">{t.movementHistory.title}</h3>
        <p className="mt-1 text-sm font-medium text-slate-500">{t.movementHistory.description}</p>
      </div>

      {movements.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
          {t.movementHistory.empty}
        </div>
      ) : (
        <div className="space-y-3">
          {movements.slice(0, 6).map((movement) => {
            const Icon = movementIconMap[movement.movementType];

            return (
              <article key={movement.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-black text-slate-950">{movement.productName}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {t.movementTypes[movement.movementType]} · {formatInventoryNumber(movement.quantity)}
                        {movement.unitCost ? ` · ${formatInventoryCurrency(movement.unitCost)}` : ''}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{movement.reason}</p>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-sm font-bold text-slate-700">{movement.movementDate}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{movement.responsibleName ?? t.common.notAvailable}</p>
                    <Badge className={cn(
                      'mt-2 rounded-full border px-2 py-1 text-xs font-bold',
                      movement.status === 'pendingSync'
                        ? 'border-[#F4C84A]/40 bg-[#F4C84A]/10 text-[#9a6b05]'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700',
                    )}>
                      {t.movementStatuses[movement.status]}
                    </Badge>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
