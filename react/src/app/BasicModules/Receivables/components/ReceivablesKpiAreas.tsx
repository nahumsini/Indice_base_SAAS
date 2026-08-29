import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Eye,
  FileCheck2,
  FileWarning,
  ShieldCheck,
  Timer,
  UsersRound,
} from 'lucide-react';
import {
  OperationalKpiArea,
  type OperationalAlertChip,
  type OperationalDistributionSegment,
  type OperationalKpiMetric,
} from '../../shared/operational';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import {
  formatBusinessCurrencyAmount,
  normalizeBusinessCurrencyCode,
} from '../../shared/businessCurrency';
import { useKpiMonetaryAggregate, useKpiMonetaryAggregates } from '../../shared/kpiMonetaryApi';
import type { ReceivablesTranslations } from '../translations';
import type { CreditPolicy, ReceivableInstallment, ReceivablePayment } from '../types';
import { formatPercent } from '../utils';

const moneyFormatOptions: Intl.NumberFormatOptions = {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
};

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function hasReceipt(payment: ReceivablePayment) {
  return Boolean(payment.receiptFileName || payment.receiptDataUrl || payment.receiptImageDataUrl);
}

export function AccountsReceivableKpiArea({
  activeStatus,
  copy,
  installments,
  onStatusChange,
  totalInstallments,
}: {
  activeStatus: string;
  copy: ReceivablesTranslations;
  installments: ReceivableInstallment[];
  onStatusChange: (status: string) => void;
  totalInstallments: number;
}) {
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const labels = copy.kpiEngine.accountsReceivable;
  const onTimeCount = installments.filter((installment) => installment.status === 'on_time').length;
  const dueSoonCount = installments.filter((installment) => installment.status === 'due_soon').length;
  const overdueCount = installments.filter((installment) => installment.status === 'overdue').length;
  const partialCount = installments.filter((installment) => installment.status === 'partial').length;
  const paidCount = installments.filter((installment) => installment.status === 'paid').length;
  const currencyCount = new Set(installments.map((installment) => normalizeBusinessCurrencyCode(installment.currency, preferredCurrency))).size;
  const aggregate = useKpiMonetaryAggregate({ metric: 'RECEIVABLE_INSTALLMENT_BALANCE', preferredCurrency, ids: installments.map((installment) => installment.id) });
  const openBalanceLabel = aggregate.data && !aggregate.loading ? formatBusinessCurrencyAmount(aggregate.data.preferredTotal, preferredCurrency, moneyFormatOptions) : '—';
  const nativeTotalLabel = aggregate.data?.nativeTotals.map(({ amount, currency }) => formatBusinessCurrencyAmount(amount, currency, moneyFormatOptions)).join(' / ') || preferredCurrency;
  const metrics: OperationalKpiMetric[] = [
    {
      id: 'openBalance',
      icon: <CircleDollarSign className="h-4 w-4" />,
      iconClassName: 'text-[#147514]',
      label: labels.labels.openBalance,
      value: openBalanceLabel,
      valueClassName: 'text-[#147514]',
    },
    {
      id: 'visibleInstallments',
      icon: <Eye className="h-4 w-4" />,
      label: labels.labels.visibleInstallments,
      value: formatCount(installments.length),
    },
    {
      id: 'overdue',
      icon: <AlertTriangle className="h-4 w-4" />,
      iconClassName: 'text-rose-600',
      label: labels.labels.overdue,
      value: formatCount(overdueCount),
      valueClassName: 'text-rose-600',
      active: activeStatus === 'overdue',
      onClick: () => onStatusChange('overdue'),
    },
    {
      id: 'dueSoon',
      icon: <Timer className="h-4 w-4" />,
      iconClassName: 'text-[#9A6B05]',
      label: labels.labels.dueSoon,
      value: formatCount(dueSoonCount),
      valueClassName: 'text-[#9A6B05]',
      active: activeStatus === 'due_soon',
      onClick: () => onStatusChange('due_soon'),
    },
  ];
  const alertChips: OperationalAlertChip[] = [];

  if (overdueCount > 0) {
    alertChips.push({
      id: 'overdue',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: labels.alerts.overdue(overdueCount),
      tone: 'danger',
      active: activeStatus === 'overdue',
      onClick: () => onStatusChange('overdue'),
    });
  }

  if (dueSoonCount > 0) {
    alertChips.push({
      id: 'dueSoon',
      icon: <Timer className="h-3.5 w-3.5" />,
      label: labels.alerts.dueSoon(dueSoonCount),
      tone: 'warning',
      active: activeStatus === 'due_soon',
      onClick: () => onStatusChange('due_soon'),
    });
  }

  if (installments.length > 0) {
    alertChips.push({
      id: 'nativeTotal',
      icon: <CircleDollarSign className="h-3.5 w-3.5" />,
      label: labels.alerts.nativeCurrencyTotal(nativeTotalLabel),
      tone: 'neutral',
    });
  }

  if (currencyCount > 1) {
    alertChips.push({
      id: 'multiCurrency',
      icon: <CreditCard className="h-3.5 w-3.5" />,
      label: labels.alerts.multiCurrency(currencyCount),
      tone: 'info',
    });
  }

  const distributionSegments: OperationalDistributionSegment[] = [
    { id: 'onTime', className: 'bg-[#147514]', count: onTimeCount, label: labels.segments.onTime, active: activeStatus === 'on_time', onClick: () => onStatusChange('on_time') },
    { id: 'dueSoon', className: 'bg-[#F4C84A]', count: dueSoonCount, label: labels.segments.dueSoon, active: activeStatus === 'due_soon', onClick: () => onStatusChange('due_soon') },
    { id: 'overdue', className: 'bg-rose-500', count: overdueCount, label: labels.segments.overdue, active: activeStatus === 'overdue', onClick: () => onStatusChange('overdue') },
    { id: 'partial', className: 'bg-blue-500', count: partialCount, label: labels.segments.partial, active: activeStatus === 'partial', onClick: () => onStatusChange('partial') },
    { id: 'paid', className: 'bg-emerald-500', count: paidCount, label: labels.segments.paid, active: activeStatus === 'paid', onClick: () => onStatusChange('paid') },
  ];

  return (
    <OperationalKpiArea
      alertChips={alertChips}
      className="mb-6"
      distributionSegments={distributionSegments}
      insight={labels.insight({
        dueSoon: dueSoonCount,
        nativeTotal: nativeTotalLabel,
        openBalance: openBalanceLabel,
        overdue: overdueCount,
        preferredCurrency,
        total: totalInstallments,
        visible: installments.length,
      })}
      insightIcon={<AlertTriangle className="h-4 w-4" />}
      metrics={metrics}
      currencyContext={{ preferredCurrency, nativeBreakdown: nativeTotalLabel, rateLabel: copy.kpiEngine.currency.dailyRate,
        effectiveDate: aggregate.data?.exchangeRate.effectiveDate, source: aggregate.data?.exchangeRate.source,
        isPartial: Boolean(aggregate.error || aggregate.data?.partial), excludedCount: aggregate.data?.excludedRecords ?? (aggregate.error ? installments.length : 0), labels: copy.kpiEngine.currency }}
    />
  );
}

export function PaymentsKpiArea({
  activeEvidence,
  activeMethod,
  copy,
  onEvidenceChange,
  onMethodChange,
  payments,
}: {
  activeEvidence: 'all' | 'with' | 'without';
  activeMethod: string;
  copy: ReceivablesTranslations;
  onEvidenceChange: (evidence: 'with' | 'without') => void;
  onMethodChange: (method: string) => void;
  payments: ReceivablePayment[];
}) {
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const labels = copy.kpiEngine.payments;
  const transferCount = payments.filter((payment) => payment.method === 'transfer').length;
  const cashCount = payments.filter((payment) => payment.method === 'cash').length;
  const cardCount = payments.filter((payment) => payment.method === 'card').length;
  const otherCount = payments.length - transferCount - cashCount - cardCount;
  const receiptCount = payments.filter(hasReceipt).length;
  const missingReceipts = Math.max(0, payments.length - receiptCount);
  const aggregate = useKpiMonetaryAggregate({ metric: 'RECEIVABLE_PAYMENT_AMOUNT', preferredCurrency, ids: payments.map((payment) => payment.id) });
  const totalPaidLabel = aggregate.data && !aggregate.loading ? formatBusinessCurrencyAmount(aggregate.data.preferredTotal, preferredCurrency, moneyFormatOptions) : '—';
  const nativeTotalLabel = aggregate.data?.nativeTotals.map(({ amount, currency }) => formatBusinessCurrencyAmount(amount, currency, moneyFormatOptions)).join(' / ') || preferredCurrency;
  const metrics: OperationalKpiMetric[] = [
    {
      id: 'totalPaid',
      icon: <CircleDollarSign className="h-4 w-4" />,
      iconClassName: 'text-[#147514]',
      label: labels.labels.totalPaid,
      value: totalPaidLabel,
      valueClassName: 'text-[#147514]',
    },
    {
      id: 'visiblePayments',
      icon: <Eye className="h-4 w-4" />,
      label: labels.labels.visiblePayments,
      value: formatCount(payments.length),
    },
    {
      id: 'withReceipt',
      icon: <FileCheck2 className="h-4 w-4" />,
      iconClassName: 'text-emerald-600',
      label: labels.labels.withReceipt,
      value: formatCount(receiptCount),
      valueClassName: 'text-emerald-600',
    },
    {
      id: 'missingReceipt',
      icon: <FileWarning className="h-4 w-4" />,
      iconClassName: 'text-amber-600',
      label: labels.labels.missingReceipt,
      value: formatCount(missingReceipts),
      valueClassName: missingReceipts > 0 ? 'text-amber-600' : 'text-slate-950 dark:text-white',
      active: activeEvidence === 'without',
      onClick: () => onEvidenceChange('without'),
    },
  ];
  const alertChips: OperationalAlertChip[] = [];

  if (receiptCount > 0) {
    alertChips.push({
      id: 'withReceipts',
      icon: <FileCheck2 className="h-3.5 w-3.5" />,
      label: labels.alerts.withReceipts(receiptCount),
      tone: 'success',
      active: activeEvidence === 'with',
      onClick: () => onEvidenceChange('with'),
    });
  }

  if (missingReceipts > 0) {
    alertChips.push({
      id: 'missingReceipts',
      icon: <FileWarning className="h-3.5 w-3.5" />,
      label: labels.alerts.missingReceipts(missingReceipts),
      tone: 'warning',
      active: activeEvidence === 'without',
      onClick: () => onEvidenceChange('without'),
    });
  }

  if (payments.length > 0) {
    alertChips.push({
      id: 'nativeTotal',
      icon: <CircleDollarSign className="h-3.5 w-3.5" />,
      label: labels.alerts.nativeCurrencyTotal(nativeTotalLabel),
      tone: 'neutral',
    });
  }

  const distributionSegments: OperationalDistributionSegment[] = [
    { id: 'transfer', className: 'bg-blue-500', count: transferCount, label: labels.segments.transfer, active: activeMethod === 'transfer', onClick: () => onMethodChange('transfer') },
    { id: 'cash', className: 'bg-[#F4C84A]', count: cashCount, label: labels.segments.cash, active: activeMethod === 'cash', onClick: () => onMethodChange('cash') },
    { id: 'card', className: 'bg-[#147514]', count: cardCount, label: labels.segments.card, active: activeMethod === 'card', onClick: () => onMethodChange('card') },
    { id: 'other', className: 'bg-slate-400', count: otherCount, label: labels.segments.other, active: activeMethod === 'other', onClick: () => onMethodChange('other') },
  ];

  return (
    <OperationalKpiArea
      alertChips={alertChips}
      className="mb-6"
      distributionSegments={distributionSegments}
      insight={labels.insight({
        missingReceipts,
        nativeTotal: nativeTotalLabel,
        preferredCurrency,
        totalPaid: totalPaidLabel,
        visible: payments.length,
        withReceipts: receiptCount,
      })}
      insightIcon={<FileWarning className="h-4 w-4" />}
      metrics={metrics}
      currencyContext={{ preferredCurrency, nativeBreakdown: nativeTotalLabel, rateLabel: copy.kpiEngine.currency.dailyRate,
        effectiveDate: aggregate.data?.exchangeRate.effectiveDate, source: aggregate.data?.exchangeRate.source,
        isPartial: Boolean(aggregate.error || aggregate.data?.partial), excludedCount: aggregate.data?.excludedRecords ?? (aggregate.error ? payments.length : 0), labels: copy.kpiEngine.currency }}
    />
  );
}

export function CreditCustomersKpiArea({
  activeStatus,
  copy,
  creditPolicies,
  onStatusChange,
}: {
  activeStatus: string;
  copy: ReceivablesTranslations;
  creditPolicies: CreditPolicy[];
  onStatusChange: (status: string) => void;
}) {
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const labels = copy.kpiEngine.creditCustomers;
  const activeCount = creditPolicies.filter((policy) => policy.status === 'active').length;
  const reviewCount = creditPolicies.filter((policy) => policy.status === 'review').length;
  const blockedCount = creditPolicies.filter((policy) => policy.status === 'blocked').length;
  const policyIds = creditPolicies.map((policy) => Number(policy.id)).filter((id) => Number.isSafeInteger(id) && id > 0);
  const policyMoney = useKpiMonetaryAggregates([
    { key: 'line', metric: 'CREDIT_POLICY_LINE', preferredCurrency, ids: policyIds },
    { key: 'available', metric: 'CREDIT_POLICY_AVAILABLE', preferredCurrency, ids: policyIds },
  ]);
  const lineAggregate = policyMoney.data.line;
  const availableAggregate = policyMoney.data.available;
  const totalLine = lineAggregate?.preferredTotal ?? 0;
  const totalAvailable = availableAggregate?.preferredTotal ?? 0;
  const utilization = totalLine > 0 ? ((totalLine - totalAvailable) / totalLine) * 100 : 0;
  const totalLineLabel = !policyMoney.loading && lineAggregate
    ? formatBusinessCurrencyAmount(totalLine, preferredCurrency, moneyFormatOptions)
    : '—';
  const totalAvailableLabel = !policyMoney.loading && availableAggregate
    ? formatBusinessCurrencyAmount(totalAvailable, preferredCurrency, moneyFormatOptions)
    : '—';
  const nativeTotalLabel = lineAggregate?.nativeTotals
    .map(({ amount, currency }) => formatBusinessCurrencyAmount(amount, currency, moneyFormatOptions))
    .join(' / ') || preferredCurrency;
  const metrics: OperationalKpiMetric[] = [
    {
      id: 'creditLine',
      icon: <CircleDollarSign className="h-4 w-4" />,
      iconClassName: 'text-[#147514]',
      label: labels.labels.creditLine,
      value: totalLineLabel,
      valueClassName: 'text-[#147514]',
    },
    {
      id: 'available',
      icon: <ShieldCheck className="h-4 w-4" />,
      iconClassName: 'text-emerald-600',
      label: labels.labels.available,
      value: totalAvailableLabel,
      valueClassName: 'text-emerald-600',
    },
    {
      id: 'utilization',
      icon: <UsersRound className="h-4 w-4" />,
      label: labels.labels.utilization,
      value: formatPercent(utilization),
    },
    {
      id: 'blocked',
      icon: <AlertTriangle className="h-4 w-4" />,
      iconClassName: 'text-rose-600',
      label: labels.labels.blocked,
      value: formatCount(blockedCount),
      valueClassName: blockedCount > 0 ? 'text-rose-600' : 'text-slate-950 dark:text-white',
      active: activeStatus === 'blocked',
      onClick: () => onStatusChange('blocked'),
    },
  ];
  const alertChips: OperationalAlertChip[] = [];

  if (activeCount > 0) {
    alertChips.push({
      id: 'active',
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: labels.alerts.active(activeCount),
      tone: 'success',
      active: activeStatus === 'active',
      onClick: () => onStatusChange('active'),
    });
  }

  if (reviewCount > 0) {
    alertChips.push({
      id: 'review',
      icon: <Timer className="h-3.5 w-3.5" />,
      label: labels.alerts.review(reviewCount),
      tone: 'warning',
      active: activeStatus === 'review',
      onClick: () => onStatusChange('review'),
    });
  }

  if (blockedCount > 0) {
    alertChips.push({
      id: 'blocked',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: labels.alerts.blocked(blockedCount),
      tone: 'danger',
      active: activeStatus === 'blocked',
      onClick: () => onStatusChange('blocked'),
    });
  }

  const distributionSegments: OperationalDistributionSegment[] = [
    { id: 'active', className: 'bg-[#147514]', count: activeCount, label: labels.segments.active, active: activeStatus === 'active', onClick: () => onStatusChange('active') },
    { id: 'review', className: 'bg-[#F4C84A]', count: reviewCount, label: labels.segments.review, active: activeStatus === 'review', onClick: () => onStatusChange('review') },
    { id: 'blocked', className: 'bg-rose-500', count: blockedCount, label: labels.segments.blocked, active: activeStatus === 'blocked', onClick: () => onStatusChange('blocked') },
  ];

  return (
    <OperationalKpiArea
      alertChips={alertChips}
      className="mb-6"
      distributionSegments={distributionSegments}
      insight={labels.insight({
        active: activeCount,
        available: totalAvailableLabel,
        blocked: blockedCount,
        creditLine: totalLineLabel,
        preferredCurrency,
        review: reviewCount,
        visible: creditPolicies.length,
      })}
      insightIcon={<AlertTriangle className="h-4 w-4" />}
      metrics={metrics}
      currencyContext={{
        preferredCurrency,
        nativeBreakdown: nativeTotalLabel,
        rateLabel: lineAggregate?.exchangeRate.mode === 'daily'
          ? copy.kpiEngine.currency.dailyRate
          : copy.kpiEngine.currency.unavailable,
        effectiveDate: lineAggregate?.exchangeRate.effectiveDate,
        source: lineAggregate?.exchangeRate.source,
        isPartial: Boolean(policyMoney.error || lineAggregate?.partial || availableAggregate?.partial),
        excludedCount: Math.max(
          lineAggregate?.excludedRecords ?? 0,
          availableAggregate?.excludedRecords ?? 0,
          policyMoney.error ? creditPolicies.length : 0,
        ),
        labels: copy.kpiEngine.currency,
      }}
    />
  );
}
