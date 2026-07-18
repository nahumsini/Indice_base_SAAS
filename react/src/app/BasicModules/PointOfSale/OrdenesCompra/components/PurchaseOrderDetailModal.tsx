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
  purchaseOrderOriginLabels,
  purchaseOrderStatusLabels,
  statusClassName,
  supplierInvoiceStatusLabels,
} from '../utils/purchaseOrderFormat';
import { printPurchaseOrder } from '../../shared/pointOfSalePrintDocuments';

export function PurchaseOrderDetailModal({
  invoices,
  onClose,
  order,
}: {
  invoices: SupplierInvoice[];
  onClose: () => void;
  order: PurchaseOrder | null;
}) {
  if (!order) return null;
  const orderInvoices = invoices.filter((invoice) => invoice.purchaseOrderId === order.id);

  return (
    <PosModalFrame
      modalType="operational-workspace"
      onClose={onClose}
      closeLabel="Cerrar detalle de orden"
      title={order.folio}
      subtitle={`${order.providerName} - ${order.warehouseName}`}
      eyebrow="Orden de compra"
      icon={<FileText className="h-6 w-6" />}
      tone="coral"
      size="lg"
      bodyClassName="p-0"
      footerClassName={posModalModuleFooterClassName}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-white/85">
            {order.items.length} partidas - Total {formatMoney(order.totalAmount, order.currencyCode)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => printPurchaseOrder(order)} className={posModalSecondaryActionClassName}>
              <Printer className="h-4 w-4" />
              Imprimir orden
            </button>
            <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
              Cerrar
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
                <h4 className="text-lg font-bold text-slate-950 dark:text-white">Partidas</h4>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Recepcion acumulada por producto.</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClassName(order.status)}`}>
                {purchaseOrderStatusLabels[order.status]}
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-normal text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th className="py-3 pr-4">Producto</th>
                    <th className="py-3 pr-4">Cantidad</th>
                    <th className="py-3 pr-4">Recibido</th>
                    <th className="py-3 pr-4">Pendiente</th>
                    <th className="py-3 pr-4">Costo</th>
                    <th className="py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 pr-4">
                        <p className="font-bold text-slate-950 dark:text-white">{item.productName}</p>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.sku || 'Sin SKU'}</p>
                      </td>
                      <td className="py-3 pr-4 font-semibold text-slate-700 dark:text-slate-200">{item.quantity}</td>
                      <td className="py-3 pr-4 font-semibold text-emerald-700 dark:text-emerald-200">{item.receivedQuantity}</td>
                      <td className="py-3 pr-4 font-semibold text-amber-700 dark:text-amber-200">{item.pendingQuantity}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-700 dark:text-slate-200">{formatMoney(item.unitCost, order.currencyCode)}</td>
                      <td className="py-3 text-right font-bold text-slate-950 dark:text-white">{formatMoney(item.lineTotal, order.currencyCode)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h4 className="text-lg font-bold text-slate-950 dark:text-white">Facturas vinculadas</h4>
            <div className="mt-3 space-y-2">
              {orderInvoices.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  No hay facturas registradas para esta orden.
                </p>
              ) : orderInvoices.map((invoice) => (
                <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div>
                    <p className="font-bold text-slate-950 dark:text-white">{invoice.invoiceNumber}</p>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {formatDate(invoice.invoiceDate)} - vence {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClassName(invoice.status)}`}>
                      {supplierInvoiceStatusLabels[invoice.status]}
                    </span>
                    <span className="font-bold text-slate-950 dark:text-white">{formatMoney(invoice.totalAmount, invoice.currencyCode)}</span>
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
          <Summary label="Origen" value={purchaseOrderOriginLabels[order.origin ?? 'POS_REPLENISHMENT']} />
          {order.sourceSubmissionId ? <Summary label="Propuesta proveedor" value={`#${order.sourceSubmissionId}`} /> : null}
          <Summary label="Proveedor" value={order.providerName} />
          <Summary label="Almacen" value={order.warehouseName} />
          <Summary label="Esperado" value={formatDate(order.expectedDate)} />
          <Summary label="Subtotal" value={formatMoney(order.subtotalAmount, order.currencyCode)} />
          <Summary label="Impuesto" value={formatMoney(order.taxAmount, order.currencyCode)} />
          <Summary label="Total" value={formatMoney(order.totalAmount, order.currencyCode)} highlight />
        </aside>
      </div>
    </PosModalFrame>
  );
}

function Summary({ highlight = false, label, value }: { highlight?: boolean; label: string; value: string }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? 'border-[#FF6B5E]/25 bg-[#FF6B5E]/10 dark:border-[#FF6B5E]/30 dark:bg-[#FF6B5E]/10' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'}`}>
      <p className="text-xs font-bold uppercase tracking-normal text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
