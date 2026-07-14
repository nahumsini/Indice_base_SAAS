import { useMemo, useState } from 'react';
import { PackageCheck } from 'lucide-react';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from '../../Sale/components/PosModalFrame';
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
    <PosModalFrame
      onClose={onClose}
      closeLabel="Cerrar recepcion"
      title="Recibir mercancia"
      subtitle={`${order.folio} - ${order.warehouseName}`}
      eyebrow="Recepcion POS"
      icon={<PackageCheck className="h-6 w-6" />}
      tone="coral"
      size="md"
      footerClassName={posModalModuleFooterClassName}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-white/85">{receivableItems.length} partidas pendientes por recibir</p>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving || receivableItems.length === 0}
              onClick={() => void submit()}
              className={posModalPrimaryActionClassName}
            >
              Guardar recepcion
            </button>
          </div>
        </div>
      }
    >
      <main className="space-y-4">
        {receivableItems.length === 0 ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            Esta orden no tiene cantidades pendientes por recibir.
          </p>
        ) : receivableItems.map((item) => (
          <div key={item.id} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-[1fr_130px_130px]">
            <div>
              <p className="font-bold text-slate-950 dark:text-white">{item.productName}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Pendiente {item.pendingQuantity} - costo {formatMoney(item.unitCost, order.currencyCode)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 dark:bg-slate-950 dark:text-slate-200">
              Ordenado: {item.quantity}
            </div>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-normal text-slate-500">Recibir</span>
              <input
                type="number"
                min="0"
                max={numberFrom(item.pendingQuantity)}
                value={quantities[item.id] ?? ''}
                onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Number(event.target.value) }))}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
          </div>
        ))}
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notas de recepcion</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-950 outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </label>
      </main>
    </PosModalFrame>
  );
}
