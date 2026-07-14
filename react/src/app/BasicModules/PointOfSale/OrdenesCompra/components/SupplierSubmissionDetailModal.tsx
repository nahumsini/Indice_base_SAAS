import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, FileText, ImageIcon } from 'lucide-react';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalSecondaryActionClassName,
} from '../../Sale/components/PosModalFrame';
import type { PosWarehouseSummary } from '../../Sale/services/posBackendApi';
import type {
  PurchaseOrder,
  SupplierSubmission,
  SupplierSubmissionConvertPayload,
  SupplierSubmissionReviewPayload,
  SupplierSubmissionStatus,
} from '../types/purchaseOrder.types';
import {
  formatDate,
  formatMoney,
  numberFrom,
  statusClassName,
  supplierSubmissionStatusLabels,
} from '../utils/purchaseOrderFormat';

const reviewStatuses: SupplierSubmissionStatus[] = [
  'IN_REVIEW',
  'NEEDS_CLARIFICATION',
  'APPROVED',
  'PARTIALLY_APPROVED',
  'REJECTED',
];

export function SupplierSubmissionDetailModal({
  onConvert,
  onClose,
  onReview,
  saving,
  submission,
  warehouses,
}: {
  onConvert: (submissionId: number, payload: SupplierSubmissionConvertPayload) => Promise<PurchaseOrder>;
  onClose: () => void;
  onReview: (submissionId: number, payload: SupplierSubmissionReviewPayload) => Promise<SupplierSubmission>;
  saving: boolean;
  submission: SupplierSubmission | null;
  warehouses: PosWarehouseSummary[];
}) {
  const [reviewStatus, setReviewStatus] = useState<SupplierSubmissionStatus>('IN_REVIEW');
  const [reviewNote, setReviewNote] = useState('');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ? String(warehouses[0].id) : '');
  const [expectedDate, setExpectedDate] = useState('');
  const [convertNote, setConvertNote] = useState('');

  useEffect(() => {
    if (submission?.status) {
      const nextStatus = reviewStatuses.includes(submission.status)
        ? submission.status
        : submission.status === 'CONVERTED_TO_PURCHASE_ORDER'
          ? 'APPROVED'
          : 'IN_REVIEW';
      setReviewStatus(nextStatus);
    }
    setReviewNote('');
    setConvertNote('');
  }, [submission?.id, submission?.status]);

  useEffect(() => {
    if (!warehouseId && warehouses[0]?.id) {
      setWarehouseId(String(warehouses[0].id));
    }
  }, [warehouseId, warehouses]);

  const unresolvedItems = useMemo(() => (
    submission?.items.filter((item) => !item.productId).length ?? 0
  ), [submission]);
  const canConvert = Boolean(
    submission
      && ['APPROVED', 'PARTIALLY_APPROVED'].includes(submission.status)
      && !submission.convertedPurchaseOrderId
      && unresolvedItems === 0
      && warehouses.length > 0
  );

  if (!submission) return null;

  const submitReview = async () => {
    const payload: SupplierSubmissionReviewPayload = {
      status: reviewStatus,
      reviewNote: reviewNote || null,
    };
    const updated = await onReview(submission.id, payload);
    setReviewStatus(updated.status === 'CONVERTED_TO_PURCHASE_ORDER' ? 'APPROVED' : updated.status);
    setReviewNote('');
  };

  const submitConvert = async () => {
    if (!warehouseId) return;
    const payload: SupplierSubmissionConvertPayload = {
      warehouseId: Number(warehouseId),
      expectedDate: expectedDate || null,
      notes: convertNote || null,
    };
    await onConvert(submission.id, payload);
  };

  return (
    <PosModalFrame
      onClose={onClose}
      closeLabel="Cerrar propuesta de proveedor"
      title={submission.submissionNumber}
      subtitle={`${submission.providerName} - ${formatMoney(submission.totalAmount, submission.currencyCode)}`}
      eyebrow="Propuesta proveedor"
      icon={<FileText className="h-6 w-6" />}
      tone="coral"
      size="xl"
      bodyClassName="p-0"
      footerClassName={posModalModuleFooterClassName}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-white/85">
            {submission.items.length} partidas - Total {formatMoney(submission.totalAmount, submission.currencyCode)}
          </p>
          <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
            Cerrar
          </button>
        </div>
      }
    >
        <div className="grid min-h-0 bg-slate-50 dark:bg-slate-950 lg:grid-cols-[1fr_340px]">
          <main className="space-y-4 p-6">
            <section className="rounded-[20px] border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-lg font-bold text-slate-950 dark:text-white">Partidas propuestas</h4>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    El proveedor propone; Indice revisa, liga productos y decide que se convierte en compra formal.
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClassName(submission.status)}`}>
                  {supplierSubmissionStatusLabels[submission.status]}
                </span>
              </div>

              {unresolvedItems > 0 ? (
                <div className="mt-4 flex gap-3 rounded-[16px] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {unresolvedItems} partida(s) no estan ligadas al catalogo de productos. Deben revisarse antes de convertir a orden de compra.
                </div>
              ) : null}

              <div className="mt-4 space-y-3">
                {submission.items.map((item) => (
                  <article key={item.id} className="grid gap-4 rounded-[18px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950 md:grid-cols-[92px_1fr_auto]">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white text-slate-400 dark:bg-slate-900">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-8 w-8" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="font-bold text-slate-950 dark:text-white">{item.productName}</h5>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${item.productId ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'}`}>
                          {item.productId ? `Producto #${item.productId}` : 'Producto nuevo'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{item.providerSku || 'Sin SKU proveedor'}</p>
                      {item.productDescription ? (
                        <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">{item.productDescription}</p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{item.quantity} uds</p>
                      <p className="mt-1 font-semibold text-slate-700 dark:text-slate-200">{formatMoney(item.unitCost, submission.currencyCode)} c/u</p>
                      <p className="mt-2 text-lg font-bold text-slate-950 dark:text-white">{formatMoney(item.lineTotal, submission.currencyCode)}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </main>

          <aside className="space-y-4 border-l border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <Summary label="Proveedor" value={submission.providerName} />
            <Summary label="Enviado por" value={submission.submittedByName || 'Proveedor'} />
            <Summary label="Fecha" value={formatDate(submission.submittedAt?.slice(0, 10) ?? submission.createdAt?.slice(0, 10))} />
            <Summary label="Subtotal" value={formatMoney(submission.subtotalAmount, submission.currencyCode)} />
            <Summary label="Impuesto" value={formatMoney(submission.taxAmount, submission.currencyCode)} />
            <Summary label="Total" value={formatMoney(submission.totalAmount, submission.currencyCode)} highlight />

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <h4 className="font-bold text-slate-950 dark:text-white">Revision interna</h4>
              <select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as SupplierSubmissionStatus)} className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                {reviewStatuses.map((status) => (
                  <option key={status} value={status}>{supplierSubmissionStatusLabels[status]}</option>
                ))}
              </select>
              <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Nota de revision" className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
              <button type="button" disabled={saving} onClick={() => void submitReview()} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-60 dark:bg-white dark:text-slate-950">
                <CheckCircle2 className="h-4 w-4" />
                Guardar revision
              </button>
            </section>

            <section className="rounded-2xl border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 p-4 dark:border-[#FF6B5E]/30 dark:bg-[#FF6B5E]/10">
              <h4 className="font-bold text-slate-950 dark:text-white">Convertir a OC</h4>
              <select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} className="mt-3 h-11 w-full rounded-xl border border-[#FF6B5E]/25 bg-white px-3 text-sm font-bold text-slate-950 dark:border-[#FF6B5E]/30 dark:bg-slate-900 dark:text-white">
                {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
              </select>
              <input type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} className="mt-3 h-11 w-full rounded-xl border border-[#FF6B5E]/25 bg-white px-3 text-sm font-bold text-slate-950 dark:border-[#FF6B5E]/30 dark:bg-slate-900 dark:text-white" />
              <textarea value={convertNote} onChange={(event) => setConvertNote(event.target.value)} placeholder="Nota para la orden" className="mt-3 min-h-20 w-full rounded-xl border border-[#FF6B5E]/25 bg-white px-3 py-2 text-sm font-medium text-slate-950 dark:border-[#FF6B5E]/30 dark:bg-slate-900 dark:text-white" />
              <button type="button" disabled={saving || !canConvert || numberFrom(submission.totalAmount) <= 0} onClick={() => void submitConvert()} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B5E] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
                <ArrowRight className="h-4 w-4" />
                Convertir a orden
              </button>
            </section>
          </aside>
        </div>
    </PosModalFrame>
  );
}

function Summary({ highlight = false, label, value }: { highlight?: boolean; label: string; value: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? 'border-[#FF6B5E]/25 bg-[#FF6B5E]/10 dark:border-[#FF6B5E]/30 dark:bg-[#FF6B5E]/10' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'}`}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
