import { ArrowRight, Eye, ShieldCheck } from 'lucide-react';
import { useTablePagination } from '../../../../hooks/useTablePagination';
import { PointOfSaleTablePagination } from '../../shared/components/PointOfSaleTablePagination';
import type { SupplierSubmission } from '../types/purchaseOrder.types';
import {
  formatDate,
  formatMoney,
  numberFrom,
  statusClassName,
} from '../utils/purchaseOrderFormat';
import { usePurchaseOrderTranslations } from '../hooks/usePurchaseOrderTranslations';

export function SupplierSubmissionsTable({
  disabled,
  onConvert,
  onSelect,
  onStartReview,
  submissions,
}: {
  disabled: boolean;
  onConvert: (submission: SupplierSubmission) => void;
  onSelect: (submission: SupplierSubmission) => void;
  onStartReview: (submission: SupplierSubmission) => void;
  submissions: SupplierSubmission[];
}) {
  const { copy, locale } = usePurchaseOrderTranslations();
  const submissionsPagination = useTablePagination({
    resetKey: submissions.map((submission) => submission.id).join('|'),
    rows: submissions,
  });

  if (submissions.length === 0) {
    return (
      <section className="rounded-[24px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-lg font-medium text-slate-950 dark:text-white">{copy.submissionTable.emptyTitle}</p>
        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          {copy.submissionTable.emptyDescription}
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/60">
            <tr>
              {copy.submissionTable.columns.map((header, index) => (
                <th key={header} className={`whitespace-nowrap px-4 py-3.5 text-xs font-medium text-slate-500 dark:text-slate-400 ${index === copy.submissionTable.columns.length - 1 ? 'text-right' : 'text-left'}`}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {submissionsPagination.paginatedRows.map((submission) => {
              const unresolvedItems = submission.items.filter((item) => !item.productId).length;
              const canConvert = ['APPROVED', 'PARTIALLY_APPROVED'].includes(submission.status)
                && !submission.convertedPurchaseOrderId;
              return (
                <tr key={submission.id} className="align-middle transition hover:bg-[#FF6B5E]/5 dark:hover:bg-[#FF6B5E]/10">
                  <td className="px-4 py-4">
                    <button type="button" onClick={() => onSelect(submission)} className="font-medium text-slate-950 underline-offset-4 hover:underline dark:text-white">
                      {submission.submissionNumber}
                    </button>
                    <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {formatDate(submission.createdAt?.slice(0, 10), locale, copy.common.noDate)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{submission.providerName}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{submission.providerEmail || copy.common.noEmail}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{submission.submittedByName || copy.common.provider}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{submission.submittedByEmail || copy.submissionTable.noContact}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-950 dark:text-white">{copy.submissionTable.itemCount(submission.items.length)}</p>
                    <p className={`text-xs font-medium ${unresolvedItems > 0 ? 'text-amber-700 dark:text-amber-200' : 'text-emerald-700 dark:text-emerald-200'}`}>
                      {unresolvedItems > 0 ? copy.submissionTable.unresolved(unresolvedItems) : copy.submissionTable.linkedProducts}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-700 dark:text-slate-200">{submission.reviewedAt ? formatDate(submission.reviewedAt.slice(0, 10), locale, copy.common.noDate) : copy.submissionTable.noReview}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{submission.reviewNote || copy.submissionTable.noNote}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-950 dark:text-white">{formatMoney(submission.totalAmount, submission.currencyCode, locale)}</p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {copy.submissionTable.tax} {formatMoney(submission.taxAmount, submission.currencyCode, locale)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClassName(submission.status)}`}>
                      {copy.submissionStatus[submission.status]}
                    </span>
                    {submission.convertedPurchaseOrderId ? (
                      <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-200">
                        {copy.submissionTable.convertedOrder(submission.convertedPurchaseOrderId)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    <div className="ml-auto flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                      <IconAction label={copy.submissionTable.view} onClick={() => onSelect(submission)} icon={Eye} disabled={disabled} />
                      <IconAction label={copy.submissionTable.review} onClick={() => onStartReview(submission)} icon={ShieldCheck} disabled={disabled} />
                      <IconAction
                        label={copy.submissionTable.convert}
                        onClick={() => onConvert(submission)}
                        icon={ArrowRight}
                        disabled={disabled || !canConvert || unresolvedItems > 0 || numberFrom(submission.totalAmount) <= 0}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <PointOfSaleTablePagination {...submissionsPagination} itemLabel={copy.submissionTable.itemLabel} />
    </section>
  );
}

function IconAction({
  disabled,
  icon: Icon,
  label,
  onClick,
}: {
  disabled: boolean;
  icon: typeof Eye;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
