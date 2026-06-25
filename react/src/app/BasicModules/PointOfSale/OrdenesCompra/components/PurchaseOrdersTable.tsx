import { CheckCircle2, Eye, PackageCheck, Send, ShieldCheck, XCircle } from 'lucide-react';
import type { PurchaseOrder, SupplierInvoice } from '../types/purchaseOrder.types';
import {
  formatDate,
  formatMoney,
  numberFrom,
  purchaseOrderStatusLabels,
  statusClassName,
} from '../utils/purchaseOrderFormat';

export function PurchaseOrdersTable({
  disabled,
  invoices,
  onAction,
  onReceive,
  onSelect,
  orders,
}: {
  disabled: boolean;
  invoices: SupplierInvoice[];
  onAction: (order: PurchaseOrder, action: 'request' | 'approve' | 'send' | 'cancel') => void;
  onReceive: (order: PurchaseOrder) => void;
  onSelect: (order: PurchaseOrder) => void;
  orders: PurchaseOrder[];
}) {
  if (orders.length === 0) {
    return (
      <section className="rounded-[24px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-lg font-semibold text-slate-950 dark:text-white">No hay ordenes de compra con estos filtros.</p>
        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          Crea una orden ligada a proveedor, producto y almacen para iniciar el reabastecimiento.
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
              {['Folio', 'Proveedor', 'Almacen', 'Esperado', 'Partidas', 'Recepcion', 'Facturas', 'Total', 'Estado', 'Acciones'].map((header) => (
                <th key={header} className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {orders.map((order) => {
              const orderInvoices = invoices.filter((invoice) => invoice.purchaseOrderId === order.id);
              const pendingQuantity = order.items.reduce((sum, item) => sum + numberFrom(item.pendingQuantity), 0);
              const receivedQuantity = order.items.reduce((sum, item) => sum + numberFrom(item.receivedQuantity), 0);
              return (
                <tr key={order.id} className="align-top transition hover:bg-orange-50/50 dark:hover:bg-orange-500/5">
                  <td className="px-5 py-5">
                    <button type="button" onClick={() => onSelect(order)} className="font-bold text-slate-950 underline-offset-4 hover:underline dark:text-white">
                      {order.folio}
                    </button>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{formatDate(order.createdAt?.slice(0, 10))}</p>
                  </td>
                  <td className="px-5 py-5">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{order.providerName}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{order.providerEmail || 'Sin email'}</p>
                  </td>
                  <td className="px-5 py-5 font-semibold text-slate-700 dark:text-slate-200">{order.warehouseName}</td>
                  <td className="px-5 py-5 font-semibold text-slate-700 dark:text-slate-200">{formatDate(order.expectedDate)}</td>
                  <td className="px-5 py-5 font-semibold text-slate-700 dark:text-slate-200">{order.items.length}</td>
                  <td className="px-5 py-5">
                    <p className="font-bold text-slate-950 dark:text-white">{receivedQuantity} recibidas</p>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{pendingQuantity} pendientes</p>
                  </td>
                  <td className="px-5 py-5">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {orderInvoices.length}
                    </span>
                  </td>
                  <td className="px-5 py-5">
                    <p className="font-bold text-slate-950 dark:text-white">{formatMoney(order.totalAmount, order.currencyCode)}</p>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{order.currencyCode}</p>
                  </td>
                  <td className="px-5 py-5">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClassName(order.status)}`}>
                      {purchaseOrderStatusLabels[order.status]}
                    </span>
                  </td>
                  <td className="px-5 py-5">
                    <div className="flex flex-wrap gap-2">
                      <IconAction label="Ver" onClick={() => onSelect(order)} icon={Eye} disabled={disabled} />
                      {order.status === 'DRAFT' && <IconAction label="Solicitar" onClick={() => onAction(order, 'request')} icon={CheckCircle2} disabled={disabled} />}
                      {(order.status === 'DRAFT' || order.status === 'REQUESTED') && <IconAction label="Aprobar" onClick={() => onAction(order, 'approve')} icon={ShieldCheck} disabled={disabled} />}
                      {(order.status === 'REQUESTED' || order.status === 'APPROVED') && <IconAction label="Enviar" onClick={() => onAction(order, 'send')} icon={Send} disabled={disabled} />}
                      {['APPROVED', 'SENT', 'PARTIALLY_RECEIVED'].includes(order.status) && <IconAction label="Recibir" onClick={() => onReceive(order)} icon={PackageCheck} disabled={disabled} />}
                      {!['RECEIVED', 'CANCELLED'].includes(order.status) && <IconAction label="Cancelar" onClick={() => onAction(order, 'cancel')} icon={XCircle} disabled={disabled} danger />}
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
  danger = false,
  disabled,
  icon: Icon,
  label,
  onClick,
}: {
  danger?: boolean;
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
      className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        danger
          ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
