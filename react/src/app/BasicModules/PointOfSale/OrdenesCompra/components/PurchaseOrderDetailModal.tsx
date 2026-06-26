import { ExternalLink, X } from 'lucide-react';
import type { PurchaseOrder, SupplierInvoice } from '../types/purchaseOrder.types';
import {
  formatDate,
  formatMoney,
  purchaseOrderOriginLabels,
  purchaseOrderStatusLabels,
  statusClassName,
  supplierInvoiceStatusLabels,
} from '../utils/purchaseOrderFormat';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl dark:bg-slate-900">
        <header className="bg-orange-500 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/75">Orden de compra</p>
              <h3 className="mt-1 text-2xl font-bold">{order.folio}</h3>
              <p className="mt-1 text-sm font-medium text-white/85">{order.providerName} · {order.warehouseName}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-white/80 hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="grid flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 lg:grid-cols-[1fr_320px]">
          <main className="space-y-4 p-6">
            <section className="rounded-[20px] border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
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
                    <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:text-slate-400">
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

            <section className="rounded-[20px] border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
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
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{formatDate(invoice.invoiceDate)} · vence {formatDate(invoice.dueDate)}</p>
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
      </div>
    </div>
  );
}

function Summary({ highlight = false, label, value }: { highlight?: boolean; label: string; value: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? 'border-orange-200 bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/10' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'}`}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
