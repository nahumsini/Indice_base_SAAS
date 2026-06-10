import { useMemo, useState } from 'react';
import { AlertTriangle, ClipboardList, Eye, PackageCheck, Truck, X } from 'lucide-react';
import {
  isPurchaseOrderDelayed,
  purchaseOrders,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from '../shared/commercial/purchase-orders';

const statusLabels: Record<PurchaseOrderStatus, string> = {
  draft: 'Borrador',
  ordered: 'Ordenada',
  partiallyReceived: 'Parcial',
  received: 'Recibida',
  cancelled: 'Cancelada',
};

const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
}).format(amount);

export default function OrdenesCompra() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<PurchaseOrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  const filteredOrders = useMemo(() => purchaseOrders.filter((order) => {
    const text = `${order.folio} ${order.supplierName} ${order.businessUnitName} ${order.businessName}`.toLowerCase();
    return text.includes(query.trim().toLowerCase()) && (status === 'all' || order.status === status);
  }), [query, status]);

  const kpis = useMemo(() => ({
    open: purchaseOrders.filter((order) => order.status === 'draft' || order.status === 'ordered').length,
    expectedValue: purchaseOrders
      .filter((order) => order.status !== 'received' && order.status !== 'cancelled')
      .reduce((sum, order) => sum + order.total, 0),
    received: purchaseOrders.filter((order) => order.status === 'received').length,
    delayed: purchaseOrders.filter((order) => isPurchaseOrderDelayed(order)).length,
    partial: purchaseOrders.filter((order) => order.status === 'partiallyReceived').length,
  }), []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-orange-100 px-2.5 py-1 text-xs font-semibold uppercase text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
            <ClipboardList className="h-3.5 w-3.5" />
            Reabastecimiento retail
          </div>
          <h2 className="text-2xl font-black text-gray-950 dark:text-white">Ordenes de compra</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Planea compras a proveedor y revisa recepciones esperadas por sucursal.
          </p>
        </div>
        <button className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700">
          Nueva orden
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi icon={Truck} label="Abiertas" value={String(kpis.open)} />
        <Kpi icon={ClipboardList} label="Valor esperado" value={formatCurrency(kpis.expectedValue)} />
        <Kpi icon={PackageCheck} label="Recibidas" value={String(kpis.received)} tone="green" />
        <Kpi icon={AlertTriangle} label="Retrasadas" value={String(kpis.delayed)} tone="red" />
        <Kpi icon={Truck} label="Parciales" value={String(kpis.partial)} tone="blue" />
      </div>

      <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900 dark:border-orange-900/50 dark:bg-orange-900/20 dark:text-orange-100">
        Las recepciones son frontend-only; no actualizan inventario real hasta conectar backend.
      </div>

      <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:grid-cols-[1fr_220px]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar folio, proveedor o sucursal"
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as PurchaseOrderStatus | 'all')}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        >
          <option value="all">Todos los estados</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                {['Folio', 'Proveedor', 'Unidad', 'Sucursal', 'Productos', 'Esperado', 'Subtotal', 'Impuestos', 'Total', 'Estado', ''].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-3 font-bold text-gray-950 dark:text-white">{order.folio}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{order.supplierName}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{order.businessUnitName}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{order.businessName}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{order.items.length}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{formatDate(order.expectedDate)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{formatCurrency(order.subtotal)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{formatCurrency(order.taxes)}</td>
                  <td className="px-4 py-3 font-bold text-gray-950 dark:text-white">{formatCurrency(order.total)}</td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelectedOrder(order)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone = 'gray' }: { icon: typeof Truck; label: string; value: string; tone?: 'gray' | 'green' | 'red' | 'blue' }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  };
  return <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-5 w-5" /></span><div><p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</p><p className="text-lg font-black text-gray-950 dark:text-white">{value}</p></div></div></div>;
}

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const classes = status === 'received' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : status === 'partiallyReceived' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  return <span className={`rounded-md px-2 py-1 text-xs font-bold ${classes}`}>{statusLabels[status]}</span>;
}

function OrderDetail({ order, onClose }: { order: PurchaseOrder | null; onClose: () => void }) {
  if (!order) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div><h3 className="text-lg font-black text-gray-950 dark:text-white">{order.folio}</h3><p className="text-sm text-gray-500 dark:text-gray-400">{order.supplierName}</p></div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 p-5">
          {order.items.map((item) => (
            <div key={item.productId} className="grid grid-cols-[1fr_auto_auto] gap-3 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900/40">
              <span className="font-bold text-gray-950 dark:text-white">{item.name}</span>
              <span className="text-gray-600 dark:text-gray-300">{item.receivedQuantity}/{item.quantity}</span>
              <span className="font-bold text-gray-950 dark:text-white">{formatCurrency(item.lineTotal)}</span>
            </div>
          ))}
          <div className="text-right text-lg font-black text-gray-950 dark:text-white">Total {formatCurrency(order.total)}</div>
        </div>
      </div>
    </div>
  );
}

function formatDate(date: Date) {
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}
