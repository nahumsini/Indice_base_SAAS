import {
  AlertTriangle,
  ClipboardList,
  FileText,
  Gauge,
  PackageCheck,
  Truck,
} from 'lucide-react';
import type {
  OperationalAlertChip,
  OperationalDistributionSegment,
  OperationalKpiMetric,
} from '../../../shared/operational';
import { OperationalKpiArea } from '../../../shared/operational';
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
  const draftOrders = orders.filter((order) => order.status === 'DRAFT').length;
  const inApproval = orders.filter((order) => ['REQUESTED', 'IN_REVIEW', 'NEEDS_CLARIFICATION', 'APPROVED'].includes(order.status)).length;
  const inTransit = orders.filter((order) => ['ISSUED', 'SENT', 'CONFIRMED'].includes(order.status)).length;
  const partiallyReceived = orders.filter((order) => order.status === 'PARTIALLY_RECEIVED').length;
  const receivedOrders = orders.filter((order) => order.status === 'RECEIVED').length;
  const closedOrders = orders.filter((order) => ['INVOICED', 'VALIDATED_FOR_PAYMENT', 'SCHEDULED_FOR_PAYMENT', 'PAID', 'CLOSED'].includes(order.status)).length;
  const cancelledOrders = orders.filter((order) => ['CANCELLED', 'REJECTED'].includes(order.status)).length;
  const openOrders = orders.filter((order) => !['RECEIVED', 'CANCELLED', 'REJECTED', 'CLOSED', 'PAID'].includes(order.status));
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

  const metrics: OperationalKpiMetric[] = [
    {
      id: 'open-orders',
      icon: <Truck className="h-4 w-4" />,
      label: 'compras abiertas',
      value: openOrders.length,
      iconClassName: 'text-[#B63B32]',
      valueClassName: 'text-[#FF6B5E]',
    },
    {
      id: 'pending-receive',
      icon: <PackageCheck className="h-4 w-4" />,
      label: 'unidades por recibir',
      value: pendingReceive,
      iconClassName: 'text-[#2563EB]',
      valueClassName: 'text-[#2563EB]',
    },
    {
      id: 'expected-value',
      icon: <ClipboardList className="h-4 w-4" />,
      label: 'valor comprometido',
      value: formatMoney(expectedValue, currency),
      iconClassName: 'text-[#9A6B05]',
      valueClassName: 'text-[#9A6B05]',
    },
    {
      id: 'pending-invoices',
      icon: <FileText className="h-4 w-4" />,
      label: 'facturas por conciliar',
      value: pendingInvoices,
      iconClassName: 'text-violet-600',
      valueClassName: 'text-violet-600',
    },
    {
      id: 'delayed',
      icon: <AlertTriangle className="h-4 w-4" />,
      label: 'retrasadas',
      value: delayed,
      iconClassName: delayed > 0 ? 'text-rose-600' : 'text-slate-500',
      valueClassName: delayed > 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200',
    },
  ];

  const alertChips: OperationalAlertChip[] = [];

  if (delayed > 0) {
    alertChips.push({
      id: 'delayed',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: `${delayed} compras retrasadas`,
      tone: 'danger',
    });
  }

  if (pendingReceive > 0) {
    alertChips.push({
      id: 'pending-receive',
      icon: <PackageCheck className="h-3.5 w-3.5" />,
      label: `${pendingReceive} unidades pendientes`,
      tone: 'info',
    });
  }

  if (pendingInvoices > 0) {
    alertChips.push({
      id: 'pending-invoices',
      icon: <FileText className="h-3.5 w-3.5" />,
      label: `${pendingInvoices} facturas por conciliar`,
      tone: 'warning',
    });
  }

  const distributionSegments: OperationalDistributionSegment[] = [
    { id: 'draft', label: 'Borrador', count: draftOrders, className: 'bg-slate-400' },
    { id: 'approval', label: 'Aprobacion', count: inApproval, className: 'bg-[#F4C84A]' },
    { id: 'transit', label: 'En proveedor', count: inTransit, className: 'bg-[#2563EB]' },
    { id: 'receiving', label: 'Recepcion parcial', count: partiallyReceived, className: 'bg-violet-500' },
    { id: 'received', label: 'Recibidas', count: receivedOrders, className: 'bg-emerald-500' },
    { id: 'closed', label: 'Pago/cierre', count: closedOrders, className: 'bg-cyan-500' },
    { id: 'cancelled', label: 'Canceladas', count: cancelledOrders, className: 'bg-rose-500' },
  ];

  const insight = delayed > 0
    ? `${delayed} compras requieren seguimiento con proveedor antes de que afecten disponibilidad en caja.`
    : pendingReceive > 0
      ? `Recibe ${pendingReceive} unidades pendientes para convertir compras abiertas en inventario vendible.`
      : pendingInvoices > 0
        ? `Concilia ${pendingInvoices} facturas para cerrar el ciclo de compra y pago.`
        : 'No hay alertas operativas en compras POS con los filtros actuales.';

  return (
    <OperationalKpiArea
      alertChips={alertChips}
      distributionSegments={distributionSegments}
      insight={insight}
      insightIcon={<Gauge className="h-4 w-4" />}
      metrics={metrics}
    />
  );
}
