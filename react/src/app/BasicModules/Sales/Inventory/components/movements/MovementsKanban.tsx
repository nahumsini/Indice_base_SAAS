import type { InventoryOperationalMovement } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { formatInventoryNumber } from '../../utils/inventoryFormatters';
import { MovementFlow, movementStatusTone, movementTone } from './movementUi';

const kanbanColumns = [
  { id: 'draft', label: 'Draft', description: 'Pending inventory events' },
  { id: 'inTransit', label: 'In Transit', description: 'Stock moving between locations' },
  { id: 'received', label: 'Received', description: 'Receipts waiting final close' },
  { id: 'completed', label: 'Completed', description: 'Finished inventory flow' },
] as const;

type KanbanStatus = typeof kanbanColumns[number]['id'];

function getColumnStatus(status: InventoryOperationalMovement['status']): KanbanStatus {
  return status === 'cancelled' ? 'completed' : status;
}

export function MovementsKanban({
  movements,
  t,
}: {
  movements: InventoryOperationalMovement[];
  t: InventoryTranslations;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto bg-slate-50/70 p-4">
        <div className="grid min-w-[1120px] grid-cols-4 gap-4">
          {kanbanColumns.map((column) => {
            const columnMovements = movements.filter((movement) => getColumnStatus(movement.status) === column.id);

            return (
              <section key={column.id} className="min-h-[520px] rounded-2xl border border-slate-200 bg-white/75 p-3">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full border ${movementStatusTone[column.id]}`} />
                      <h3 className="text-sm font-black text-slate-900">{column.label}</h3>
                    </div>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{column.description}</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-600 shadow-sm ring-1 ring-slate-200">
                    {columnMovements.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {columnMovements.length === 0 ? (
                    <div className="flex min-h-[140px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 text-center text-sm font-semibold text-slate-400">
                      {t.operational.emptyStates.movementsDescription}
                    </div>
                  ) : columnMovements.map((movement) => (
                    <article key={movement.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#FF6B5E]/50 hover:shadow-md">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700">{movement.movementNumber ?? movement.id}</span>
                        <span className={`rounded-md border px-2 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${movementTone[movement.movementType]}`}>
                          {t.operational.movementTypes[movement.movementType]}
                        </span>
                      </div>
                      <div className="mt-3">
                        <MovementFlow movement={movement} />
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-[9px] font-black text-slate-400">
                          {movement.productImageUrl ? <img src={movement.productImageUrl} alt={movement.productImageAlt ?? movement.productName} className="h-full w-full object-cover" loading="lazy" /> : t.operational.columns.photo}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950">{movement.productName}</p>
                          <p className="text-xs font-semibold text-slate-500">{movement.productSku ?? t.common.notAvailable}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-semibold text-slate-500">
                        <div>
                          <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{t.operational.columns.quantity}</span>
                          <span className={movement.quantity >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {movement.quantity >= 0 ? '+' : ''}{formatInventoryNumber(movement.quantity)} Units
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{t.operational.columns.date}</span>
                          <span>{movement.movementDate}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{t.operational.columns.responsible}</span>
                          <span>{movement.responsibleName}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
