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
import { useKpiMonetaryAggregate } from '../../../shared/kpiMonetaryApi';
import { usePreferredBusinessCurrency } from '../../../shared/BusinessCurrencyContext';
import { usePurchaseOrderTranslations } from '../hooks/usePurchaseOrderTranslations';

export function PurchaseOrderKpis({
  currency,
  invoices,
  orders,
}: {
  currency: string;
  invoices: SupplierInvoice[];
  orders: PurchaseOrder[];
}) {
  const { copy, locale } = usePurchaseOrderTranslations();
  const { preferredCurrency } = usePreferredBusinessCurrency();
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
  const expectedAggregate = useKpiMonetaryAggregate({ metric: 'PURCHASE_ORDER_TOTAL', preferredCurrency, ids: openOrders.map((order) => order.id) });
  const expectedValueLabel = expectedAggregate.data && !expectedAggregate.loading
    ? formatMoney(expectedAggregate.data.preferredTotal, preferredCurrency, locale) : '—';
  const nativeValueLabel = expectedAggregate.data?.nativeTotals.map(({ amount, currency: nativeCurrency }) => formatMoney(amount, nativeCurrency, locale)).join(' / ') || currency;
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
      label: copy.orderKpis.openOrders,
      value: openOrders.length,
      iconClassName: 'text-[#B63B32]',
      valueClassName: 'text-[#FF6B5E]',
    },
    {
      id: 'pending-receive',
      icon: <PackageCheck className="h-4 w-4" />,
      label: copy.orderKpis.pendingUnits,
      value: pendingReceive,
      iconClassName: 'text-[#2563EB]',
      valueClassName: 'text-[#2563EB]',
    },
    {
      id: 'expected-value',
      icon: <ClipboardList className="h-4 w-4" />,
      label: copy.orderKpis.committedValue,
      value: expectedValueLabel,
      iconClassName: 'text-[#9A6B05]',
      valueClassName: 'text-[#9A6B05]',
    },
    {
      id: 'pending-invoices',
      icon: <FileText className="h-4 w-4" />,
      label: copy.orderKpis.pendingInvoices,
      value: pendingInvoices,
      iconClassName: 'text-violet-600',
      valueClassName: 'text-violet-600',
    },
    {
      id: 'delayed',
      icon: <AlertTriangle className="h-4 w-4" />,
      label: copy.orderKpis.delayed,
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
      label: copy.orderKpis.delayedAlert(delayed),
      tone: 'danger',
    });
  }

  if (pendingReceive > 0) {
    alertChips.push({
      id: 'pending-receive',
      icon: <PackageCheck className="h-3.5 w-3.5" />,
      label: copy.orderKpis.pendingUnitsAlert(pendingReceive),
      tone: 'info',
    });
  }

  if (pendingInvoices > 0) {
    alertChips.push({
      id: 'pending-invoices',
      icon: <FileText className="h-3.5 w-3.5" />,
      label: copy.orderKpis.pendingInvoicesAlert(pendingInvoices),
      tone: 'warning',
    });
  }

  if (openOrders.length > 0 && expectedAggregate.data?.nativeTotals.some(({ currency: nativeCurrency }) => nativeCurrency !== preferredCurrency)) {
    alertChips.push({
      id: 'native-value',
      icon: <ClipboardList className="h-3.5 w-3.5" />,
      label: copy.orderKpis.nativeValue(nativeValueLabel),
      tone: 'info',
    });
  }

  const distributionSegments: OperationalDistributionSegment[] = [
    { id: 'draft', label: copy.orderKpis.distribution.draft, count: draftOrders, className: 'bg-slate-400' },
    { id: 'approval', label: copy.orderKpis.distribution.approval, count: inApproval, className: 'bg-[#F4C84A]' },
    { id: 'transit', label: copy.orderKpis.distribution.supplier, count: inTransit, className: 'bg-[#2563EB]' },
    { id: 'receiving', label: copy.orderKpis.distribution.partial, count: partiallyReceived, className: 'bg-violet-500' },
    { id: 'received', label: copy.orderKpis.distribution.received, count: receivedOrders, className: 'bg-emerald-500' },
    { id: 'closed', label: copy.orderKpis.distribution.closed, count: closedOrders, className: 'bg-cyan-500' },
    { id: 'cancelled', label: copy.orderKpis.distribution.cancelled, count: cancelledOrders, className: 'bg-rose-500' },
  ];

  const insight = delayed > 0
    ? copy.orderKpis.delayedInsight(delayed)
    : pendingReceive > 0
      ? copy.orderKpis.pendingInsight(pendingReceive, preferredCurrency)
      : pendingInvoices > 0
        ? copy.orderKpis.invoicesInsight(pendingInvoices)
        : copy.orderKpis.noAlerts;

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
