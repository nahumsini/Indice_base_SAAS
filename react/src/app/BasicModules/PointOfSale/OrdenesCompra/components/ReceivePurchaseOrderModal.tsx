import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { PurchaseOrder, PurchaseOrderReceivePayload } from '../types/purchaseOrder.types';
import { formatMoney, numberFrom } from '../utils/purchaseOrderFormat';

export function ReceivePurchaseOrderModal({
  onClose,
  onSubmit,
  order,
  saving,
}: {
  onClose: () => void;
  onSubmit: (orderId: number, payload: PurchaseOrderReceivePayload) => Promise<unknown>;
  order: PurchaseOrder | null;
  saving: boolean;
}) {
  const [notes, setNotes] = useState('');
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const receivableItems = useMemo(() => (
    order?.items.filter((item) => numberFrom(item.pendingQuantity) > 0) ?? []
  ), [order]);

  if (!order) return null;

  const submit = async () => {
    const items = receivableItems
      .map((item) => ({
        orderItemId: item.id,
        receivedQuantity: Math.min(Math.max(quantities[item.id] ?? 0, 0), numberFrom(item.pendingQuantity)),
      }))
      .filter((item) => item.receivedQuantity > 0);
    if (items.length === 0) return;
    try {
      await onSubmit(order.id, { notes: notes || null, items });
      onClose();
    } catch {
      // The parent workspace displays the backend error without losing captured quantities.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-[24px] bg-white shadow-2xl dark:bg-slate-900">
        <header className="bg-orange-500 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold">Recibir mercancia</h3>
              <p className="mt-1 text-sm font-medium text-white/85">{order.folio} · {order.warehouseName}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-white/80 hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="max-h-[70vh] space-y-4 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-950">
          {receivableItems.length === 0 ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
              Esta orden no tiene cantidades pendientes por recibir.
            </p>
          ) : receivableItems.map((item) => (
            <div key={item.id} className="grid gap-3 rounded-[18px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-[1fr_130px_130px]">
              <div>
                <p className="font-bold text-slate-950 dark:text-white">{item.productName}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Pendiente {item.pendingQuantity} · costo {formatMoney(item.unitCost, order.currencyCode)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 dark:bg-slate-950 dark:text-slate-200">
                Ordenado: {item.quantity}
              </div>
              <label className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Recibir</span>
                <input
                  type="number"
                  min="0"
                  max={numberFrom(item.pendingQuantity)}
                  value={quantities[item.id] ?? ''}
                  onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Number(event.target.value) }))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
            </div>
          ))}
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notas de recepcion</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
        </main>

        <footer className="flex justify-end gap-3 bg-orange-500 px-6 py-4">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-white/30 px-5 text-sm font-bold text-white hover:bg-white/10">Cancelar</button>
          <button type="button" disabled={saving || receivableItems.length === 0} onClick={() => void submit()} className="h-11 rounded-xl bg-white px-5 text-sm font-bold text-orange-700 disabled:cursor-not-allowed disabled:opacity-60">Guardar recepcion</button>
        </footer>
      </div>
    </div>
  );
}
