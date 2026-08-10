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
} from '../utils/purchaseOrderFormat';
import { usePurchaseOrderTranslations } from '../hooks/usePurchaseOrderTranslations';

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
  const { copy, locale } = usePurchaseOrderTranslations();
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
      modalType="operational-workspace"
      onClose={onClose}
      closeLabel={copy.submissionDetail.closeLabel}
      title={submission.submissionNumber}
      subtitle={`${submission.providerName} · ${formatMoney(submission.totalAmount, submission.currencyCode, locale)}`}
      eyebrow={copy.submissionDetail.eyebrow}
      icon={<FileText className="h-6 w-6" />}
      tone="coral"
      size="xl"
      bodyClassName="p-0"
      footerClassName={posModalModuleFooterClassName}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-white/85">
            {copy.submissionDetail.footerSummary(submission.items.length, formatMoney(submission.totalAmount, submission.currencyCode, locale))}
          </p>
          <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
            {copy.submissionDetail.close}
          </button>
        </div>
      }
    >
        <div className="grid min-h-0 bg-slate-50 dark:bg-slate-950 lg:grid-cols-[1fr_340px]">
          <main className="space-y-4 p-6">
            <section className="rounded-[20px] border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-lg font-medium text-slate-950 dark:text-white">{copy.submissionDetail.itemsTitle}</h4>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {copy.submissionDetail.itemsSubtitle}
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClassName(submission.status)}`}>
                  {copy.submissionStatus[submission.status]}
                </span>
              </div>

              {unresolvedItems > 0 ? (
                <div className="mt-4 flex gap-3 rounded-[16px] border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {copy.submissionDetail.unresolvedWarning(unresolvedItems)}
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
                        <h5 className="font-medium text-slate-950 dark:text-white">{item.productName}</h5>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.productId ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'}`}>
                          {item.productId ? copy.submissionDetail.linkedProduct(item.productId) : copy.submissionDetail.newProduct}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{item.providerSku || copy.submissionDetail.noSupplierSku}</p>
                      {item.productDescription ? (
                        <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">{item.productDescription}</p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.quantity} {copy.common.units}</p>
                      <p className="mt-1 font-medium text-slate-700 dark:text-slate-200">{copy.submissionDetail.unitCost(formatMoney(item.unitCost, submission.currencyCode, locale))}</p>
                      <p className="mt-2 text-lg font-medium text-slate-950 dark:text-white">{formatMoney(item.lineTotal, submission.currencyCode, locale)}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </main>

          <aside className="space-y-4 border-l border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <Summary label={copy.submissionDetail.provider} value={submission.providerName} />
            <Summary label={copy.submissionDetail.submittedBy} value={submission.submittedByName || copy.submissionDetail.supplierFallback} />
            <Summary label={copy.common.date} value={formatDate(submission.submittedAt?.slice(0, 10) ?? submission.createdAt?.slice(0, 10), locale, copy.common.noDate)} />
            <Summary label={copy.common.subtotal} value={formatMoney(submission.subtotalAmount, submission.currencyCode, locale)} />
            <Summary label={copy.common.tax} value={formatMoney(submission.taxAmount, submission.currencyCode, locale)} />
            <Summary label={copy.common.total} value={formatMoney(submission.totalAmount, submission.currencyCode, locale)} highlight />

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <h4 className="font-medium text-slate-950 dark:text-white">{copy.submissionDetail.internalReview}</h4>
              <select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as SupplierSubmissionStatus)} className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                {reviewStatuses.map((status) => (
                  <option key={status} value={status}>{copy.submissionStatus[status]}</option>
                ))}
              </select>
              <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder={copy.submissionDetail.reviewNote} className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
              <button type="button" disabled={saving} onClick={() => void submitReview()} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-slate-950">
                <CheckCircle2 className="h-4 w-4" />
                {copy.submissionDetail.saveReview}
              </button>
            </section>

            <section className="rounded-2xl border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 p-4 dark:border-[#FF6B5E]/30 dark:bg-[#FF6B5E]/10">
              <h4 className="font-medium text-slate-950 dark:text-white">{copy.submissionDetail.convertTitle}</h4>
              <select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} className="mt-3 h-11 w-full rounded-xl border border-[#FF6B5E]/25 bg-white px-3 text-sm font-medium text-slate-950 dark:border-[#FF6B5E]/30 dark:bg-slate-900 dark:text-white">
                {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
              </select>
              <input type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} className="mt-3 h-11 w-full rounded-xl border border-[#FF6B5E]/25 bg-white px-3 text-sm font-medium text-slate-950 dark:border-[#FF6B5E]/30 dark:bg-slate-900 dark:text-white" />
              <textarea value={convertNote} onChange={(event) => setConvertNote(event.target.value)} placeholder={copy.submissionDetail.convertNote} className="mt-3 min-h-20 w-full rounded-xl border border-[#FF6B5E]/25 bg-white px-3 py-2 text-sm font-medium text-slate-950 dark:border-[#FF6B5E]/30 dark:bg-slate-900 dark:text-white" />
              <button type="button" disabled={saving || !canConvert || numberFrom(submission.totalAmount) <= 0} onClick={() => void submitConvert()} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B5E] px-4 text-sm font-medium text-[#222831] disabled:cursor-not-allowed disabled:opacity-60">
                <ArrowRight className="h-4 w-4" />
                {copy.submissionDetail.convert}
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
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-medium text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
