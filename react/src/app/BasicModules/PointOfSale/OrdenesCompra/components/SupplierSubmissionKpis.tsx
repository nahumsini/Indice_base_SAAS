import { AlertTriangle, ArrowRight, Gauge, Inbox, Link2, ShieldCheck } from 'lucide-react';
import type {
  OperationalAlertChip,
  OperationalDistributionSegment,
  OperationalKpiMetric,
} from '../../../shared/operational';
import { OperationalKpiArea } from '../../../shared/operational';
import type { SupplierSubmission } from '../types/purchaseOrder.types';
import { formatMoney, numberFrom } from '../utils/purchaseOrderFormat';
import { useKpiMonetaryAggregate } from '../../../shared/kpiMonetaryApi';
import { usePreferredBusinessCurrency } from '../../../shared/BusinessCurrencyContext';
import { usePurchaseOrderTranslations } from '../hooks/usePurchaseOrderTranslations';

export function SupplierSubmissionKpis({ submissions }: { submissions: SupplierSubmission[] }) {
  const { copy, locale } = usePurchaseOrderTranslations();
  const { preferredCurrency } = usePreferredBusinessCurrency();
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
  const valueAggregate = useKpiMonetaryAggregate({
    metric: 'SUPPLIER_SUBMISSION_TOTAL',
    preferredCurrency,
    ids: submissions.map((submission) => submission.id),
  });
  const valueLabel = valueAggregate.data && !valueAggregate.loading
    ? formatMoney(valueAggregate.data.preferredTotal, preferredCurrency, locale)
    : '—';

  const metrics: OperationalKpiMetric[] = [
    {
      id: 'submissions',
      icon: <Inbox className="h-4 w-4" />,
      label: copy.submissionKpis.visible,
      value: submissions.length,
      iconClassName: 'text-[#B63B32]',
      valueClassName: 'text-[#FF6B5E]',
    },
    {
      id: 'pending-review',
      icon: <ShieldCheck className="h-4 w-4" />,
      label: copy.submissionKpis.toReview,
      value: pendingReview,
      iconClassName: 'text-[#9A6B05]',
      valueClassName: 'text-[#9A6B05]',
    },
    {
      id: 'convertible',
      icon: <ArrowRight className="h-4 w-4" />,
      label: copy.submissionKpis.ready,
      value: convertible,
      iconClassName: 'text-[#2563EB]',
      valueClassName: 'text-[#2563EB]',
    },
    {
      id: 'unresolved-items',
      icon: <Link2 className="h-4 w-4" />,
      label: copy.submissionKpis.unresolved,
      value: unresolvedItems,
      iconClassName: unresolvedItems > 0 ? 'text-rose-600' : 'text-slate-500',
      valueClassName: unresolvedItems > 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200',
    },
    {
      id: 'value',
      icon: <Inbox className="h-4 w-4" />,
      label: copy.submissionKpis.proposedValue,
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
      label: copy.submissionKpis.clarificationAlert(needsClarification),
      tone: 'warning',
    });
  }

  if (unresolvedItems > 0) {
    alertChips.push({
      id: 'unresolved-items',
      icon: <Link2 className="h-3.5 w-3.5" />,
      label: copy.submissionKpis.unresolvedAlert(unresolvedItems),
      tone: 'danger',
    });
  }

  if (convertible > 0) {
    alertChips.push({
      id: 'convertible',
      icon: <ArrowRight className="h-3.5 w-3.5" />,
      label: copy.submissionKpis.convertibleAlert(convertible),
      tone: 'success',
    });
  }

  if ((valueAggregate.data?.nativeTotals.length ?? 0) > 1) {
    alertChips.push({
      id: 'native-value-breakdown',
      icon: <Inbox className="h-3.5 w-3.5" />,
      label: copy.submissionKpis.nativeValue(valueAggregate.data?.nativeTotals.map(({ amount, currency }) => formatMoney(amount, currency, locale)).join(' / ') ?? ''),
      tone: 'info',
    });
  }

  const distributionSegments: OperationalDistributionSegment[] = [
    { id: 'submitted', label: copy.submissionKpis.distribution.submitted, count: submitted, className: 'bg-[#2563EB]' },
    { id: 'review', label: copy.submissionKpis.distribution.review, count: inReview, className: 'bg-[#F4C84A]' },
    { id: 'clarification', label: copy.submissionKpis.distribution.clarification, count: needsClarification, className: 'bg-[#FF6B5E]' },
    { id: 'approved', label: copy.submissionKpis.distribution.approved, count: approved, className: 'bg-emerald-500' },
    { id: 'converted', label: copy.submissionKpis.distribution.converted, count: converted, className: 'bg-violet-500' },
    { id: 'rejected', label: copy.submissionKpis.distribution.rejected, count: rejected, className: 'bg-rose-500' },
  ];

  const insight = unresolvedItems > 0
    ? copy.submissionKpis.unresolvedInsight(unresolvedItems)
    : convertible > 0
      ? copy.submissionKpis.convertibleInsight(convertible)
      : pendingReview > 0
      ? copy.submissionKpis.reviewInsight(pendingReview, preferredCurrency)
        : copy.submissionKpis.noAlerts;

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
