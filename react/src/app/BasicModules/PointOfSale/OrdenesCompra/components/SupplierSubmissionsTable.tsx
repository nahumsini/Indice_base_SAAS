import { ArrowRight, Eye, ShieldCheck } from 'lucide-react';
import type { SupplierSubmission } from '../types/purchaseOrder.types';
import {
  formatDate,
  formatMoney,
  numberFrom,
  statusClassName,
  supplierSubmissionStatusLabels,
} from '../utils/purchaseOrderFormat';

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
  if (submissions.length === 0) {
    return (
      <section className="rounded-[24px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-lg font-semibold text-slate-950 dark:text-white">No hay propuestas de proveedor con estos filtros.</p>
        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          Cuando el kiosko o un usuario registre propuestas, apareceran aqui para revisar antes de crear una orden formal.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/60">
            <tr>
              {['Propuesta', 'Proveedor', 'Enviado por', 'Partidas', 'Revision', 'Total', 'Estado', 'Acciones'].map((header) => (
                <th key={header} className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {submissions.map((submission) => {
              const unresolvedItems = submission.items.filter((item) => !item.productId).length;
              const canConvert = ['APPROVED', 'PARTIALLY_APPROVED'].includes(submission.status)
                && !submission.convertedPurchaseOrderId;
              return (
                <tr key={submission.id} className="align-top transition hover:bg-orange-50/50 dark:hover:bg-orange-500/5">
                  <td className="px-5 py-5">
                    <button type="button" onClick={() => onSelect(submission)} className="font-bold text-slate-950 underline-offset-4 hover:underline dark:text-white">
                      {submission.submissionNumber}
                    </button>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {formatDate(submission.createdAt?.slice(0, 10))}
                    </p>
                  </td>
                  <td className="px-5 py-5">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{submission.providerName}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{submission.providerEmail || 'Sin email'}</p>
                  </td>
                  <td className="px-5 py-5">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{submission.submittedByName || 'Proveedor'}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{submission.submittedByEmail || 'Sin contacto'}</p>
                  </td>
                  <td className="px-5 py-5">
                    <p className="font-bold text-slate-950 dark:text-white">{submission.items.length} partidas</p>
                    <p className={`text-xs font-semibold ${unresolvedItems > 0 ? 'text-amber-700 dark:text-amber-200' : 'text-emerald-700 dark:text-emerald-200'}`}>
                      {unresolvedItems > 0 ? `${unresolvedItems} sin producto ligado` : 'Productos ligados'}
                    </p>
                  </td>
                  <td className="px-5 py-5">
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{submission.reviewedAt ? formatDate(submission.reviewedAt.slice(0, 10)) : 'Sin revision'}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{submission.reviewNote || 'Sin nota'}</p>
                  </td>
                  <td className="px-5 py-5">
                    <p className="font-bold text-slate-950 dark:text-white">{formatMoney(submission.totalAmount, submission.currencyCode)}</p>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Impuesto {formatMoney(submission.taxAmount, submission.currencyCode)}
                    </p>
                  </td>
                  <td className="px-5 py-5">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClassName(submission.status)}`}>
                      {supplierSubmissionStatusLabels[submission.status]}
                    </span>
                    {submission.convertedPurchaseOrderId ? (
                      <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                        OC #{submission.convertedPurchaseOrderId}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-5 py-5">
                    <div className="flex flex-wrap gap-2">
                      <IconAction label="Ver" onClick={() => onSelect(submission)} icon={Eye} disabled={disabled} />
                      <IconAction label="Revisar" onClick={() => onStartReview(submission)} icon={ShieldCheck} disabled={disabled} />
                      <IconAction
                        label="Convertir"
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
      className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
