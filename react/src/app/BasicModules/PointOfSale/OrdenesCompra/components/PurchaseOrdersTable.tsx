import {
  CheckCircle2,
  ExternalLink,
  Eye,
  FileText,
  PackageCheck,
  Send,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useTablePagination } from '../../../../hooks/useTablePagination';
import { PointOfSaleTablePagination } from '../../shared/components/PointOfSaleTablePagination';
import type { PurchaseOrder, SupplierInvoice, SupplierInvoiceStatus } from '../types/purchaseOrder.types';
import { formatDate, formatMoney, numberFrom, statusClassName } from '../utils/purchaseOrderFormat';
import { usePurchaseOrderTranslations } from '../hooks/usePurchaseOrderTranslations';

export function PurchaseOrdersTable({
  disabled,
  invoices,
  onAction,
  onInvoiceReview,
  onReceive,
  onSelect,
  orders,
}: {
  disabled: boolean;
  invoices: SupplierInvoice[];
  onAction: (order: PurchaseOrder, action: 'request' | 'approve' | 'send' | 'cancel') => void;
  onInvoiceReview: (invoiceId: number, status: SupplierInvoiceStatus) => void;
  onReceive: (order: PurchaseOrder) => void;
  onSelect: (order: PurchaseOrder) => void;
  orders: PurchaseOrder[];
}) {
  const { copy, locale } = usePurchaseOrderTranslations();
  const openOrders = orders.filter((order) => !['RECEIVED', 'CANCELLED', 'REJECTED', 'CLOSED', 'PAID'].includes(order.status)).length;
  const pendingInvoices = orders.reduce((count, order) => {
    const orderInvoices = invoices.filter((invoice) => invoice.purchaseOrderId === order.id);
    return count + orderInvoices.filter((invoice) => invoice.status === 'SUBMITTED' || invoice.status === 'MATCHED').length;
  }, 0);
  const ordersPagination = useTablePagination({
    resetKey: orders.map((order) => order.id).join('|'),
    rows: orders,
  });

  if (orders.length === 0) {
    return (
      <section className="rounded-[24px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-lg font-medium text-slate-950 dark:text-white">{copy.orderTable.emptyTitle}</p>
        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          {copy.orderTable.emptyDescription}
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <h3 className="text-lg font-medium text-slate-950 dark:text-white">{copy.orderTable.title}</h3>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">
            {copy.orderTable.summary(orders.length, openOrders, pendingInvoices)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
            {copy.orderTable.integrationBadge}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/60">
            <tr>
              {copy.orderTable.columns.map((header) => (
                <th key={header} className="px-5 py-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {ordersPagination.paginatedRows.map((order) => {
              const orderInvoices = invoices.filter((invoice) => invoice.purchaseOrderId === order.id);
              const primaryInvoice = orderInvoices[0] ?? null;
              const pendingQuantity = order.items.reduce((sum, item) => sum + numberFrom(item.pendingQuantity), 0);
              const receivedQuantity = order.items.reduce((sum, item) => sum + numberFrom(item.receivedQuantity), 0);
              const inventoryStatus = pendingQuantity <= 0 && receivedQuantity > 0
                ? { label: copy.orderTable.inventoryReceived, className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200' }
                : receivedQuantity > 0
                  ? { label: copy.orderTable.inventoryPartial, className: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200' }
                  : { label: copy.orderTable.inventoryPending, className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200' };
              const paymentStatus = primaryInvoice
                ? copy.invoiceStatus[primaryInvoice.status]
                : copy.orderTable.noInvoice;
              return (
                <tr key={order.id} className="align-top transition hover:bg-[#FF6B5E]/5 dark:hover:bg-[#FF6B5E]/10">
                  <td className="px-5 py-5">
                    <button type="button" onClick={() => onSelect(order)} className="font-medium text-slate-950 underline-offset-4 hover:underline dark:text-white">
                      {order.folio}
                    </button>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-2.5 py-1 text-xs font-medium text-[#B63B32] dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/15 dark:text-[#FFB0AA]">
                        {copy.origin[order.origin ?? 'POS_REPLENISHMENT']}
                      </span>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{formatDate(order.createdAt?.slice(0, 10), locale, copy.common.noDate)}</span>
                    </div>
                    <p className="mt-3 font-medium text-slate-900 dark:text-slate-100">{order.providerName}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{order.providerEmail || copy.common.noEmail}</p>
                  </td>
                  <td className="px-5 py-5">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{order.warehouseName}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{copy.orderTable.expected(formatDate(order.expectedDate, locale, copy.common.noDate))}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{copy.orderTable.lineCount(order.items.length)}</p>
                    {order.sourceSubmissionId ? (
                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{copy.orderTable.sourceProposal(order.sourceSubmissionId)}</p>
                    ) : null}
                  </td>
                  <td className="px-5 py-5">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${inventoryStatus.className}`}>
                      {inventoryStatus.label}
                    </span>
                    <p className="mt-2 font-medium text-slate-950 dark:text-white">{copy.orderTable.receivedUnits(receivedQuantity)}</p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.orderTable.pendingUnits(pendingQuantity)}</p>
                  </td>
                  <td className="px-5 py-5">
                    {primaryInvoice ? (
                      <div>
                        <p className="max-w-[220px] truncate font-medium text-slate-950 dark:text-white">{primaryInvoice.invoiceNumber}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {formatMoney(primaryInvoice.totalAmount, primaryInvoice.currencyCode, locale)}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClassName(primaryInvoice.status)}`}>
                            {paymentStatus}
                          </span>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.orderTable.due(formatDate(primaryInvoice.dueDate, locale, copy.common.noDate))}</span>
                        </div>
                        {orderInvoices.length > 1 ? (
                          <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                            {copy.orderTable.moreInvoices(orderInvoices.length - 1)}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {copy.orderTable.noInvoice}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-5">
                    <p className="font-medium text-slate-950 dark:text-white">{formatMoney(order.totalAmount, order.currencyCode, locale)}</p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{order.currencyCode}</p>
                  </td>
                  <td className="px-5 py-5">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClassName(order.status)}`}>
                      {copy.orderStatus[order.status]}
                    </span>
                  </td>
                  <td className="px-5 py-5">
                    <div className="flex max-w-[360px] flex-wrap justify-end gap-2">
                      <IconAction label={copy.common.view} onClick={() => onSelect(order)} icon={Eye} disabled={disabled} />
                      {order.status === 'DRAFT' && <IconAction label={copy.orderTable.request} onClick={() => onAction(order, 'request')} icon={CheckCircle2} disabled={disabled} />}
                      {(order.status === 'DRAFT' || order.status === 'REQUESTED') && <IconAction label={copy.orderTable.approve} onClick={() => onAction(order, 'approve')} icon={ShieldCheck} disabled={disabled} />}
                      {(order.status === 'REQUESTED' || order.status === 'APPROVED') && <IconAction label={copy.orderTable.send} onClick={() => onAction(order, 'send')} icon={Send} disabled={disabled} />}
                      {['APPROVED', 'SENT', 'PARTIALLY_RECEIVED'].includes(order.status) && <IconAction label={copy.orderTable.receive} onClick={() => onReceive(order)} icon={PackageCheck} disabled={disabled} />}
                      {primaryInvoice ? (
                        <>
                          {primaryInvoice.documentUrl ? (
                            <a href={primaryInvoice.documentUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
                              <ExternalLink className="h-4 w-4" />
                              {copy.common.invoice}
                            </a>
                          ) : null}
                          {primaryInvoice.status === 'SUBMITTED' && (
                            <IconAction label={copy.orderTable.reconcile} onClick={() => onInvoiceReview(primaryInvoice.id, 'MATCHED')} icon={FileText} disabled={disabled} info />
                          )}
                          {(primaryInvoice.status === 'SUBMITTED' || primaryInvoice.status === 'MATCHED') && (
                            <IconAction label={copy.orderTable.approvePayment} onClick={() => onInvoiceReview(primaryInvoice.id, 'APPROVED_FOR_PAYMENT')} icon={ShieldCheck} disabled={disabled} success />
                          )}
                        </>
                      ) : null}
                      {!['RECEIVED', 'CANCELLED'].includes(order.status) && <IconAction label={copy.orderTable.cancel} onClick={() => onAction(order, 'cancel')} icon={XCircle} disabled={disabled} danger />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <PointOfSaleTablePagination {...ordersPagination} itemLabel={copy.orderTable.itemLabel} />
    </section>
  );
}

function IconAction({
  danger = false,
  disabled,
  icon: Icon,
  info = false,
  label,
  onClick,
  success = false,
}: {
  danger?: boolean;
  info?: boolean;
  disabled: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  success?: boolean;
}) {
  const toneClass = danger
    ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
    : success
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
      : info
        ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200'
        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
