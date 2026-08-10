import { ExternalLink, FileText, Printer } from 'lucide-react';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalSecondaryActionClassName,
} from '../../Sale/components/PosModalFrame';
import type { PurchaseOrder, SupplierInvoice } from '../types/purchaseOrder.types';
import {
  formatDate,
  formatMoney,
  statusClassName,
} from '../utils/purchaseOrderFormat';
import { printPurchaseOrder } from '../../shared/pointOfSalePrintDocuments';
import { usePurchaseOrderTranslations } from '../hooks/usePurchaseOrderTranslations';

export function PurchaseOrderDetailModal({
  invoices,
  onClose,
  order,
}: {
  invoices: SupplierInvoice[];
  onClose: () => void;
  order: PurchaseOrder | null;
}) {
  const { copy, locale } = usePurchaseOrderTranslations();
  if (!order) return null;
  const orderInvoices = invoices.filter((invoice) => invoice.purchaseOrderId === order.id);

  return (
    <PosModalFrame
      modalType="operational-workspace"
      onClose={onClose}
      closeLabel={copy.detail.closeLabel}
      title={order.folio}
      subtitle={`${order.providerName} - ${order.warehouseName}`}
      eyebrow={copy.detail.eyebrow}
      icon={<FileText className="h-6 w-6" />}
      tone="coral"
      size="lg"
      bodyClassName="p-0"
      footerClassName={posModalModuleFooterClassName}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-white/85">
            {copy.detail.footerSummary(order.items.length, formatMoney(order.totalAmount, order.currencyCode, locale))}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => printPurchaseOrder(order, locale)} className={posModalSecondaryActionClassName}>
              <Printer className="h-4 w-4" />
              {copy.detail.print}
            </button>
            <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
              {copy.detail.close}
            </button>
          </div>
        </div>
      }
    >
      <div className="grid min-h-0 bg-slate-50 dark:bg-slate-950 lg:grid-cols-[1fr_320px]">
        <main className="space-y-4 p-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-lg font-medium text-slate-950 dark:text-white">{copy.detail.items}</h4>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{copy.detail.itemsSubtitle}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClassName(order.status)}`}>
                {copy.orderStatus[order.status]}
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium tracking-normal text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    {copy.detail.columns.map((column, index) => (
                      <th key={column} className={index === copy.detail.columns.length - 1 ? 'py-3 text-right' : 'py-3 pr-4'}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-slate-950 dark:text-white">{item.productName}</p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.sku || copy.common.noSku}</p>
                      </td>
                      <td className="py-3 pr-4 font-medium text-slate-700 dark:text-slate-200">{item.quantity}</td>
                      <td className="py-3 pr-4 font-medium text-emerald-700 dark:text-emerald-200">{item.receivedQuantity}</td>
                      <td className="py-3 pr-4 font-medium text-amber-700 dark:text-amber-200">{item.pendingQuantity}</td>
                      <td className="py-3 pr-4 font-medium text-slate-700 dark:text-slate-200">{formatMoney(item.unitCost, order.currencyCode, locale)}</td>
                      <td className="py-3 text-right font-medium text-slate-950 dark:text-white">{formatMoney(item.lineTotal, order.currencyCode, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h4 className="text-lg font-medium text-slate-950 dark:text-white">{copy.detail.linkedInvoices}</h4>
            <div className="mt-3 space-y-2">
              {orderInvoices.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  {copy.detail.noLinkedInvoices}
                </p>
              ) : orderInvoices.map((invoice) => (
                <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div>
                    <p className="font-medium text-slate-950 dark:text-white">{invoice.invoiceNumber}</p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {formatDate(invoice.invoiceDate, locale, copy.common.noDate)} · {copy.orderTable.due(formatDate(invoice.dueDate, locale, copy.common.noDate))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClassName(invoice.status)}`}>
                      {copy.invoiceStatus[invoice.status]}
                    </span>
                    <span className="font-medium text-slate-950 dark:text-white">{formatMoney(invoice.totalAmount, invoice.currencyCode, locale)}</span>
                    {invoice.documentUrl ? (
                      <a href={invoice.documentUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-4 border-l border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <Summary label={copy.detail.origin} value={copy.origin[order.origin ?? 'POS_REPLENISHMENT']} />
          {order.sourceSubmissionId ? <Summary label={copy.detail.supplierProposal} value={`#${order.sourceSubmissionId}`} /> : null}
          <Summary label={copy.detail.provider} value={order.providerName} />
          <Summary label={copy.detail.warehouse} value={order.warehouseName} />
          <Summary label={copy.detail.expected} value={formatDate(order.expectedDate, locale, copy.common.noDate)} />
          <Summary label={copy.common.subtotal} value={formatMoney(order.subtotalAmount, order.currencyCode, locale)} />
          <Summary label={copy.common.tax} value={formatMoney(order.taxAmount, order.currencyCode, locale)} />
          <Summary label={copy.common.total} value={formatMoney(order.totalAmount, order.currencyCode, locale)} highlight />
        </aside>
      </div>
    </PosModalFrame>
  );
}

function Summary({ highlight = false, label, value }: { highlight?: boolean; label: string; value: string }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? 'border-[#FF6B5E]/25 bg-[#FF6B5E]/10 dark:border-[#FF6B5E]/30 dark:bg-[#FF6B5E]/10' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'}`}>
      <p className="text-xs font-medium tracking-normal text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-medium text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
