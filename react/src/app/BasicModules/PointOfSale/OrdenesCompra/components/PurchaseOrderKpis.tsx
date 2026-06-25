import { AlertTriangle, ClipboardList, FileText, PackageCheck, Truck } from 'lucide-react';
import type { PurchaseOrder, SupplierInvoice } from '../types/purchaseOrder.types';
import { formatMoney, numberFrom } from '../utils/purchaseOrderFormat';

export function PurchaseOrderKpis({
  currency,
  invoices,
  orders,
}: {
  currency: string;
  invoices: SupplierInvoice[];
  orders: PurchaseOrder[];
}) {
  const openOrders = orders.filter((order) => !['RECEIVED', 'CANCELLED'].includes(order.status));
  const receivedOrders = orders.filter((order) => order.status === 'RECEIVED');
  const pendingReceive = openOrders.reduce((sum, order) => (
    sum + order.items.reduce((itemSum, item) => itemSum + numberFrom(item.pendingQuantity), 0)
  ), 0);
  const expectedValue = openOrders.reduce((sum, order) => sum + numberFrom(order.totalAmount), 0);
  const pendingInvoices = invoices.filter((invoice) => invoice.status === 'SUBMITTED' || invoice.status === 'MATCHED').length;
  const delayed = openOrders.filter((order) => {
    if (!order.expectedDate) return false;
    const expected = new Date(`${order.expectedDate}T23:59:59`);
    return expected.getTime() < Date.now();
  }).length;

  return (
    <section className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Kpi icon={Truck} label="Abiertas" value={String(openOrders.length)} />
        <Kpi icon={ClipboardList} label="Valor por recibir" value={formatMoney(expectedValue, currency)} />
        <Kpi icon={PackageCheck} label="Unidades pendientes" value={String(pendingReceive)} tone="blue" />
        <Kpi icon={FileText} label="Facturas pendientes" value={String(pendingInvoices)} tone="amber" />
        <Kpi icon={AlertTriangle} label="Retrasadas" value={String(delayed)} tone={delayed > 0 ? 'red' : 'gray'} />
      </div>
      <div className="rounded-[20px] border border-orange-100 bg-orange-50 px-5 py-4 text-sm font-semibold text-orange-900 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-100">
        {receivedOrders.length} ordenes recibidas · {openOrders.length} abiertas · {pendingReceive} unidades aun pendientes de entrar a inventario.
      </div>
    </section>
  );
}

function Kpi({
  icon: Icon,
  label,
  tone = 'gray',
  value,
}: {
  icon: typeof Truck;
  label: string;
  tone?: 'gray' | 'blue' | 'amber' | 'red';
  value: string;
}) {
  const tones = {
    gray: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200',
    red: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200',
  };
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className="truncate text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
