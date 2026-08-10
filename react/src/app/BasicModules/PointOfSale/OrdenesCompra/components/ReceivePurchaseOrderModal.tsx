import { useMemo, useState } from 'react';
import { PackageCheck, Printer } from 'lucide-react';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from '../../Sale/components/PosModalFrame';
import type { PurchaseOrder, PurchaseOrderReceivePayload } from '../types/purchaseOrder.types';
import { formatMoney, numberFrom } from '../utils/purchaseOrderFormat';
import { printPurchaseOrderReceipt } from '../../shared/pointOfSalePrintDocuments';
import { usePurchaseOrderTranslations } from '../hooks/usePurchaseOrderTranslations';

export function ReceivePurchaseOrderModal({
  onClose,
  onSubmit,
  order,
  saving,
}: {
  onClose: () => void;
  onSubmit: (orderId: number, payload: PurchaseOrderReceivePayload) => Promise<PurchaseOrder>;
  order: PurchaseOrder | null;
  saving: boolean;
}) {
  const { copy, locale } = usePurchaseOrderTranslations();
  const [notes, setNotes] = useState('');
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const receivableItems = useMemo(() => (
    order?.items.filter((item) => numberFrom(item.pendingQuantity) > 0) ?? []
  ), [order]);

  if (!order) return null;

  const submit = async (printAfterSave = false) => {
    const items = receivableItems
      .map((item) => ({
        orderItemId: item.id,
        receivedQuantity: Math.min(Math.max(quantities[item.id] ?? 0, 0), numberFrom(item.pendingQuantity)),
      }))
      .filter((item) => item.receivedQuantity > 0);
    if (items.length === 0) return;
    try {
      const payload = { notes: notes || null, items };
      const resultingOrder = await onSubmit(order.id, payload);
      if (printAfterSave) {
        printPurchaseOrderReceipt({ locale, notes, order, payload, resultingOrder });
      }
      onClose();
    } catch {
      // The parent workspace displays the backend error without losing captured quantities.
    }
  };

  return (
    <PosModalFrame
      modalType="standard-form"
      onClose={onClose}
      closeLabel={copy.receive.closeLabel}
      title={copy.receive.title}
      subtitle={`${order.folio} - ${order.warehouseName}`}
      eyebrow={copy.receive.eyebrow}
      icon={<PackageCheck className="h-6 w-6" />}
      tone="coral"
      size="md"
      footerClassName={posModalModuleFooterClassName}
      footerLeading={
        <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
          {copy.common.cancel}
        </button>
      }
      footerSummary={copy.orderTable.pendingUnits(receivableItems.length)}
      footer={(
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={saving || receivableItems.length === 0}
            onClick={() => void submit(true)}
            className={posModalSecondaryActionClassName}
          >
            <Printer className="h-4 w-4" />
            {copy.receive.save} + {copy.detail.print}
          </button>
          <button
            type="button"
            disabled={saving || receivableItems.length === 0}
            onClick={() => void submit(false)}
            className={posModalPrimaryActionClassName}
          >
            {copy.receive.save}
          </button>
        </div>
      )}
    >
      <main className="space-y-4">
        {receivableItems.length === 0 ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            {copy.receive.noPending}
          </p>
        ) : receivableItems.map((item) => (
          <div key={item.id} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-[1fr_130px_130px]">
            <div>
              <p className="font-medium text-slate-950 dark:text-white">{item.productName}</p>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                {copy.receive.pending} {item.pendingQuantity} · {formatMoney(item.unitCost, order.currencyCode, locale)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 dark:bg-slate-950 dark:text-slate-200">
              {copy.receive.ordered}: {item.quantity}
            </div>
            <label className="space-y-1">
              <span className="text-xs font-medium tracking-normal text-slate-500">{copy.receive.receive}</span>
              <input
                type="number"
                min="0"
                max={numberFrom(item.pendingQuantity)}
                value={quantities[item.id] ?? ''}
                onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Number(event.target.value) }))}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
          </div>
        ))}
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.receive.notes}</span>
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
