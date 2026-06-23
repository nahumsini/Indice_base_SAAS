import type { PurchaseOrderStatus, SupplierInvoiceStatus } from '../types/purchaseOrder.types';

export const numberFrom = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatMoney = (amount: unknown, currency = 'MXN') => (
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(numberFrom(amount))
);

export const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const purchaseOrderStatusLabels: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Borrador',
  REQUESTED: 'Solicitada',
  APPROVED: 'Aprobada',
  SENT: 'Enviada',
  PARTIALLY_RECEIVED: 'Parcial',
  RECEIVED: 'Recibida',
  CANCELLED: 'Cancelada',
};

export const supplierInvoiceStatusLabels: Record<SupplierInvoiceStatus, string> = {
  SUBMITTED: 'En revision',
  MATCHED: 'Conciliada',
  APPROVED_FOR_PAYMENT: 'Lista para pago',
  REJECTED: 'Rechazada',
};

export const statusClassName = (status: PurchaseOrderStatus | SupplierInvoiceStatus) => {
  if (status === 'RECEIVED' || status === 'APPROVED_FOR_PAYMENT') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200';
  }
  if (status === 'CANCELLED' || status === 'REJECTED') {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200';
  }
  if (status === 'PARTIALLY_RECEIVED' || status === 'SENT' || status === 'MATCHED') {
    return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200';
  }
  if (status === 'REQUESTED' || status === 'APPROVED' || status === 'SUBMITTED') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200';
  }
  return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
};
