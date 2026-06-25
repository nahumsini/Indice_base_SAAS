import { CheckCircle2, ExternalLink, ShieldCheck, XCircle } from 'lucide-react';
import type { SupplierInvoice, SupplierInvoiceStatus } from '../types/purchaseOrder.types';
import {
  formatDate,
  formatMoney,
  statusClassName,
  supplierInvoiceStatusLabels,
} from '../utils/purchaseOrderFormat';

export function SupplierInvoicesPanel({
  disabled,
  invoices,
  onReview,
}: {
  disabled: boolean;
  invoices: SupplierInvoice[];
  onReview: (invoiceId: number, status: SupplierInvoiceStatus) => void;
}) {
  const pending = invoices.filter((invoice) => invoice.status === 'SUBMITTED' || invoice.status === 'MATCHED');

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Facturas de proveedor</h3>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Cola operativa para conciliar facturas y dejarlas listas para pago.
          </p>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {pending.length} pendientes
        </span>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {invoices.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500 dark:bg-slate-950 dark:text-slate-300">
            No hay facturas registradas.
          </p>
        ) : invoices.slice(0, 6).map((invoice) => (
          <article key={invoice.id} className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-950 dark:text-white">{invoice.invoiceNumber}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {invoice.providerName} · {invoice.purchaseOrderFolio ?? 'Sin orden'}
                </p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClassName(invoice.status)}`}>
                {supplierInvoiceStatusLabels[invoice.status]}
              </span>
            </div>
            <div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
              <InvoiceMetric label="Total" value={formatMoney(invoice.totalAmount, invoice.currencyCode)} />
              <InvoiceMetric label="Factura" value={formatDate(invoice.invoiceDate)} />
              <InvoiceMetric label="Vence" value={formatDate(invoice.dueDate)} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {invoice.documentUrl ? (
                <a href={invoice.documentUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <ExternalLink className="h-4 w-4" />
                  Ver documento
                </a>
              ) : null}
              {invoice.status === 'SUBMITTED' && (
                <button type="button" disabled={disabled} onClick={() => onReview(invoice.id, 'MATCHED')} className="inline-flex h-9 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 disabled:opacity-60 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
                  <CheckCircle2 className="h-4 w-4" />
                  Conciliar
                </button>
              )}
              {(invoice.status === 'SUBMITTED' || invoice.status === 'MATCHED') && (
                <>
                  <button type="button" disabled={disabled} onClick={() => onReview(invoice.id, 'APPROVED_FOR_PAYMENT')} className="inline-flex h-9 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 disabled:opacity-60 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                    <ShieldCheck className="h-4 w-4" />
                    Aprobar pago
                  </button>
                  <button type="button" disabled={disabled} onClick={() => onReview(invoice.id, 'REJECTED')} className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 disabled:opacity-60 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                    <XCircle className="h-4 w-4" />
                    Rechazar
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function InvoiceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
