import { AlertTriangle, ArrowRight, Gauge, Inbox, Link2, ShieldCheck } from 'lucide-react';
import type {
  OperationalAlertChip,
  OperationalDistributionSegment,
  OperationalKpiMetric,
} from '../../../shared/operational';
import { OperationalKpiArea } from '../../../shared/operational';
import type { SupplierSubmission } from '../types/purchaseOrder.types';
import { formatMoney, numberFrom } from '../utils/purchaseOrderFormat';

export function SupplierSubmissionKpis({ submissions }: { submissions: SupplierSubmission[] }) {
  const submitted = submissions.filter((submission) => submission.status === 'SUBMITTED').length;
  const inReview = submissions.filter((submission) => submission.status === 'IN_REVIEW').length;
  const needsClarification = submissions.filter((submission) => submission.status === 'NEEDS_CLARIFICATION').length;
  const approved = submissions.filter((submission) => ['APPROVED', 'PARTIALLY_APPROVED'].includes(submission.status)).length;
  const converted = submissions.filter((submission) => submission.status === 'CONVERTED_TO_PURCHASE_ORDER').length;
  const rejected = submissions.filter((submission) => submission.status === 'REJECTED').length;
  const pendingReview = submitted + inReview + needsClarification;
  const convertible = submissions.filter((submission) => (
    ['APPROVED', 'PARTIALLY_APPROVED'].includes(submission.status)
    && !submission.convertedPurchaseOrderId
    && submission.items.every((item) => item.productId)
    && numberFrom(submission.totalAmount) > 0
  )).length;
  const unresolvedItems = submissions.reduce((sum, submission) => (
    sum + submission.items.filter((item) => !item.productId).length
  ), 0);
  const valueByCurrency = Array.from(
    submissions.reduce((map, submission) => {
      const currency = submission.currencyCode || 'MXN';
      map.set(currency, (map.get(currency) ?? 0) + numberFrom(submission.totalAmount));
      return map;
    }, new Map<string, number>()),
  );
  const valueLabel = valueByCurrency.length === 0
    ? '$0'
    : valueByCurrency.map(([currency, total]) => formatMoney(total, currency)).join(' / ');

  const metrics: OperationalKpiMetric[] = [
    {
      id: 'submissions',
      icon: <Inbox className="h-4 w-4" />,
      label: 'propuestas visibles',
      value: submissions.length,
      iconClassName: 'text-[#B63B32]',
      valueClassName: 'text-[#FF6B5E]',
    },
    {
      id: 'pending-review',
      icon: <ShieldCheck className="h-4 w-4" />,
      label: 'por revisar',
      value: pendingReview,
      iconClassName: 'text-[#9A6B05]',
      valueClassName: 'text-[#9A6B05]',
    },
    {
      id: 'convertible',
      icon: <ArrowRight className="h-4 w-4" />,
      label: 'listas para compra',
      value: convertible,
      iconClassName: 'text-[#2563EB]',
      valueClassName: 'text-[#2563EB]',
    },
    {
      id: 'unresolved-items',
      icon: <Link2 className="h-4 w-4" />,
      label: 'partidas sin ligar',
      value: unresolvedItems,
      iconClassName: unresolvedItems > 0 ? 'text-rose-600' : 'text-slate-500',
      valueClassName: unresolvedItems > 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200',
    },
    {
      id: 'value',
      icon: <Inbox className="h-4 w-4" />,
      label: 'valor propuesto',
      value: valueLabel,
      iconClassName: 'text-violet-600',
      valueClassName: 'text-violet-600',
    },
  ];

  const alertChips: OperationalAlertChip[] = [];

  if (needsClarification > 0) {
    alertChips.push({
      id: 'needs-clarification',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: `${needsClarification} requieren aclaracion`,
      tone: 'warning',
    });
  }

  if (unresolvedItems > 0) {
    alertChips.push({
      id: 'unresolved-items',
      icon: <Link2 className="h-3.5 w-3.5" />,
      label: `${unresolvedItems} partidas sin producto`,
      tone: 'danger',
    });
  }

  if (convertible > 0) {
    alertChips.push({
      id: 'convertible',
      icon: <ArrowRight className="h-3.5 w-3.5" />,
      label: `${convertible} listas para convertir`,
      tone: 'success',
    });
  }

  const distributionSegments: OperationalDistributionSegment[] = [
    { id: 'submitted', label: 'Enviadas', count: submitted, className: 'bg-[#2563EB]' },
    { id: 'review', label: 'En revision', count: inReview, className: 'bg-[#F4C84A]' },
    { id: 'clarification', label: 'Aclaracion', count: needsClarification, className: 'bg-orange-500' },
    { id: 'approved', label: 'Aprobadas', count: approved, className: 'bg-emerald-500' },
    { id: 'converted', label: 'Convertidas', count: converted, className: 'bg-violet-500' },
    { id: 'rejected', label: 'Rechazadas', count: rejected, className: 'bg-rose-500' },
  ];

  const insight = unresolvedItems > 0
    ? `Liga ${unresolvedItems} partidas a productos POS antes de convertir propuestas en compras.`
    : convertible > 0
      ? `Convierte ${convertible} propuestas aprobadas para iniciar reabastecimiento de tienda.`
      : pendingReview > 0
        ? `Revisa ${pendingReview} propuestas de proveedor para decidir si se convierten en compra POS.`
        : 'No hay propuestas de proveedor que requieran accion con los filtros actuales.';

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
