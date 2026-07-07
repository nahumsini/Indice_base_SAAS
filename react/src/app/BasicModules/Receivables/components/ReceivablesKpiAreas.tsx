import {
  AlertTriangle,
  Banknote,
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
  convertBusinessCurrencyAmount,
  formatBusinessCurrencyAmount,
  normalizeBusinessCurrencyCode,
} from '../../shared/businessCurrency';
import type { ReceivablesTranslations } from '../translations';
import type { CreditPolicy, ReceivableAccount, ReceivableInstallment, ReceivablePayment } from '../types';
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

function formatNativeBreakdown<Row>(
  rows: Row[],
  getAmount: (row: Row) => number,
  getCurrency: (row: Row) => string | undefined,
  fallbackCurrency: string,
) {
  const totalsByCurrency = rows.reduce<Map<string, number>>((totals, row) => {
    const currency = normalizeBusinessCurrencyCode(getCurrency(row), fallbackCurrency);
    totals.set(currency, (totals.get(currency) ?? 0) + getAmount(row));
    return totals;
  }, new Map());

  if (totalsByCurrency.size === 0) {
    return formatBusinessCurrencyAmount(0, fallbackCurrency, moneyFormatOptions);
  }

  return Array.from(totalsByCurrency.entries())
    .map(([currency, total]) => formatBusinessCurrencyAmount(total, currency, moneyFormatOptions))
    .join(' / ');
}

function getPreferredTotal<Row>(
  rows: Row[],
  preferredCurrency: string,
  exchangeRatesPerUsd: ReturnType<typeof usePreferredBusinessCurrency>['exchangeRatesPerUsd'],
  getAmount: (row: Row) => number,
  getCurrency: (row: Row) => string | undefined,
) {
  return rows.reduce((total, row) => (
    total + convertBusinessCurrencyAmount(
      getAmount(row),
      getCurrency(row),
      preferredCurrency,
      exchangeRatesPerUsd,
    )
  ), 0);
}

export function AccountsReceivableKpiArea({
  copy,
  installments,
  totalInstallments,
}: {
  copy: ReceivablesTranslations;
  installments: ReceivableInstallment[];
  totalInstallments: number;
}) {
  const { exchangeRatesPerUsd, preferredCurrency } = usePreferredBusinessCurrency();
  const labels = copy.kpiEngine.accountsReceivable;
  const onTimeCount = installments.filter((installment) => installment.status === 'on_time').length;
  const dueSoonCount = installments.filter((installment) => installment.status === 'due_soon').length;
  const overdueCount = installments.filter((installment) => installment.status === 'overdue').length;
  const partialCount = installments.filter((installment) => installment.status === 'partial').length;
  const paidCount = installments.filter((installment) => installment.status === 'paid').length;
  const currencyCount = new Set(installments.map((installment) => normalizeBusinessCurrencyCode(installment.currency, preferredCurrency))).size;
  const openBalanceTotal = getPreferredTotal(
    installments,
    preferredCurrency,
    exchangeRatesPerUsd,
    (installment) => installment.balance,
    (installment) => installment.currency,
  );
  const openBalanceLabel = formatBusinessCurrencyAmount(openBalanceTotal, preferredCurrency, moneyFormatOptions);
  const nativeTotalLabel = formatNativeBreakdown(
    installments,
    (installment) => installment.balance,
    (installment) => installment.currency,
    preferredCurrency,
  );
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
    },
    {
      id: 'dueSoon',
      icon: <Timer className="h-4 w-4" />,
      iconClassName: 'text-[#9A6B05]',
      label: labels.labels.dueSoon,
      value: formatCount(dueSoonCount),
      valueClassName: 'text-[#9A6B05]',
    },
    {
      id: 'paid',
      icon: <CheckCircle2 className="h-4 w-4" />,
      iconClassName: 'text-emerald-600',
      label: labels.labels.paid,
      value: formatCount(paidCount),
      valueClassName: 'text-emerald-600',
    },
    {
      id: 'partial',
      icon: <Banknote className="h-4 w-4" />,
      iconClassName: 'text-blue-600',
      label: labels.labels.partial,
      value: formatCount(partialCount),
      valueClassName: 'text-blue-600',
    },
  ];
  const alertChips: OperationalAlertChip[] = [];

  if (overdueCount > 0) {
    alertChips.push({
      id: 'overdue',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: labels.alerts.overdue(overdueCount),
      tone: 'danger',
    });
  }

  if (dueSoonCount > 0) {
    alertChips.push({
      id: 'dueSoon',
      icon: <Timer className="h-3.5 w-3.5" />,
      label: labels.alerts.dueSoon(dueSoonCount),
      tone: 'warning',
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
    { id: 'onTime', className: 'bg-[#147514]', count: onTimeCount, label: labels.segments.onTime },
    { id: 'dueSoon', className: 'bg-[#F4C84A]', count: dueSoonCount, label: labels.segments.dueSoon },
    { id: 'overdue', className: 'bg-rose-500', count: overdueCount, label: labels.segments.overdue },
    { id: 'partial', className: 'bg-blue-500', count: partialCount, label: labels.segments.partial },
    { id: 'paid', className: 'bg-emerald-500', count: paidCount, label: labels.segments.paid },
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
    />
  );
}

export function PaymentsKpiArea({
  accounts,
  copy,
  payments,
}: {
  accounts: ReceivableAccount[];
  copy: ReceivablesTranslations;
  payments: ReceivablePayment[];
}) {
  const { exchangeRatesPerUsd, preferredCurrency } = usePreferredBusinessCurrency();
  const labels = copy.kpiEngine.payments;
  const accountCurrencyById = new Map(accounts.map((account) => [account.id, account.currency]));
  const getCurrency = (payment: ReceivablePayment) => payment.currency ?? accountCurrencyById.get(payment.receivableId) ?? preferredCurrency;
  const transferCount = payments.filter((payment) => payment.method === 'transfer').length;
  const cashCount = payments.filter((payment) => payment.method === 'cash').length;
  const cardCount = payments.filter((payment) => payment.method === 'card').length;
  const otherCount = payments.length - transferCount - cashCount - cardCount;
  const receiptCount = payments.filter(hasReceipt).length;
  const missingReceipts = Math.max(0, payments.length - receiptCount);
  const totalPaid = getPreferredTotal(
    payments,
    preferredCurrency,
    exchangeRatesPerUsd,
    (payment) => payment.amount,
    getCurrency,
  );
  const totalPaidLabel = formatBusinessCurrencyAmount(totalPaid, preferredCurrency, moneyFormatOptions);
  const nativeTotalLabel = formatNativeBreakdown(
    payments,
    (payment) => payment.amount,
    getCurrency,
    preferredCurrency,
  );
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
      id: 'transfer',
      icon: <Banknote className="h-4 w-4" />,
      iconClassName: 'text-blue-600',
      label: labels.labels.transfer,
      value: formatCount(transferCount),
      valueClassName: 'text-blue-600',
    },
    {
      id: 'cash',
      icon: <Banknote className="h-4 w-4" />,
      iconClassName: 'text-[#9A6B05]',
      label: labels.labels.cash,
      value: formatCount(cashCount),
      valueClassName: 'text-[#9A6B05]',
    },
    {
      id: 'card',
      icon: <CreditCard className="h-4 w-4" />,
      iconClassName: 'text-slate-500',
      label: labels.labels.card,
      value: formatCount(cardCount),
    },
  ];
  const alertChips: OperationalAlertChip[] = [];

  if (receiptCount > 0) {
    alertChips.push({
      id: 'withReceipts',
      icon: <FileCheck2 className="h-3.5 w-3.5" />,
      label: labels.alerts.withReceipts(receiptCount),
      tone: 'success',
    });
  }

  if (missingReceipts > 0) {
    alertChips.push({
      id: 'missingReceipts',
      icon: <FileWarning className="h-3.5 w-3.5" />,
      label: labels.alerts.missingReceipts(missingReceipts),
      tone: 'warning',
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
    { id: 'transfer', className: 'bg-blue-500', count: transferCount, label: labels.segments.transfer },
    { id: 'cash', className: 'bg-[#F4C84A]', count: cashCount, label: labels.segments.cash },
    { id: 'card', className: 'bg-[#147514]', count: cardCount, label: labels.segments.card },
    { id: 'other', className: 'bg-slate-400', count: otherCount, label: labels.segments.other },
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
    />
  );
}

export function CreditCustomersKpiArea({
  copy,
  creditPolicies,
}: {
  copy: ReceivablesTranslations;
  creditPolicies: CreditPolicy[];
}) {
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const labels = copy.kpiEngine.creditCustomers;
  const activeCount = creditPolicies.filter((policy) => policy.status === 'active').length;
  const reviewCount = creditPolicies.filter((policy) => policy.status === 'review').length;
  const blockedCount = creditPolicies.filter((policy) => policy.status === 'blocked').length;
  const totalLine = creditPolicies.reduce((sum, policy) => sum + policy.creditLine, 0);
  const totalAvailable = creditPolicies.reduce((sum, policy) => sum + policy.availableCredit, 0);
  const utilization = totalLine > 0 ? ((totalLine - totalAvailable) / totalLine) * 100 : 0;
  const totalLineLabel = formatBusinessCurrencyAmount(totalLine, preferredCurrency, moneyFormatOptions);
  const totalAvailableLabel = formatBusinessCurrencyAmount(totalAvailable, preferredCurrency, moneyFormatOptions);
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
      id: 'visibleCustomers',
      icon: <UsersRound className="h-4 w-4" />,
      label: labels.labels.visibleCustomers,
      value: formatCount(creditPolicies.length),
    },
    {
      id: 'active',
      icon: <CheckCircle2 className="h-4 w-4" />,
      iconClassName: 'text-blue-600',
      label: labels.labels.active,
      value: formatCount(activeCount),
      valueClassName: 'text-blue-600',
    },
    {
      id: 'review',
      icon: <Timer className="h-4 w-4" />,
      iconClassName: 'text-[#9A6B05]',
      label: labels.labels.review,
      value: formatCount(reviewCount),
      valueClassName: 'text-[#9A6B05]',
    },
    {
      id: 'blocked',
      icon: <AlertTriangle className="h-4 w-4" />,
      iconClassName: 'text-rose-600',
      label: labels.labels.blocked,
      value: `${formatCount(blockedCount)} · ${formatPercent(utilization)}`,
      valueClassName: blockedCount > 0 ? 'text-rose-600' : 'text-slate-950 dark:text-white',
    },
  ];
  const alertChips: OperationalAlertChip[] = [];

  if (activeCount > 0) {
    alertChips.push({
      id: 'active',
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: labels.alerts.active(activeCount),
      tone: 'success',
    });
  }

  if (reviewCount > 0) {
    alertChips.push({
      id: 'review',
      icon: <Timer className="h-3.5 w-3.5" />,
      label: labels.alerts.review(reviewCount),
      tone: 'warning',
    });
  }

  if (blockedCount > 0) {
    alertChips.push({
      id: 'blocked',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: labels.alerts.blocked(blockedCount),
      tone: 'danger',
    });
  }

  const distributionSegments: OperationalDistributionSegment[] = [
    { id: 'active', className: 'bg-[#147514]', count: activeCount, label: labels.segments.active },
    { id: 'review', className: 'bg-[#F4C84A]', count: reviewCount, label: labels.segments.review },
    { id: 'blocked', className: 'bg-rose-500', count: blockedCount, label: labels.segments.blocked },
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
    />
  );
}
