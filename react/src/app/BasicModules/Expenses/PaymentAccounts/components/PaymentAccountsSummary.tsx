import { Banknote, CheckCircle2, CircleSlash, CreditCard, Info, RefreshCw, Wallet } from 'lucide-react';
import { usePreferredBusinessCurrency } from '../../../shared/BusinessCurrencyContext';
import { getOperationalKpiCurrencyCopy, OperationalKpiArea } from '../../../shared/operational';
import { usePaymentAccountsResolvedLocale, usePaymentAccountsTranslations } from '../hooks/usePaymentAccountsTranslations';
import { usePaymentAccountsBalance } from '../hooks/usePaymentAccountsBalance';
import { filterPaymentAccounts } from '../paymentAccounts.utils';
import type { PaymentAccount } from '../types';

type PaymentAccountsSummaryProps = {
  accounts: PaymentAccount[];
  statusFilter: string;
  tone?: 'green' | 'coral';
  loading?: boolean;
  loadFailed?: boolean;
  onRetry?: () => void;
  onStatusChange: (status: string) => void;
};

export function PaymentAccountsSummary({ accounts, onStatusChange, statusFilter, tone = 'green', loading = false, loadFailed = false, onRetry }: PaymentAccountsSummaryProps) {
  const t = usePaymentAccountsTranslations();
  const copy = t.paymentAccounts.summary;
  const locale = usePaymentAccountsResolvedLocale();
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const currencyCopy = getOperationalKpiCurrencyCopy(locale);
  const visibleAccounts = filterPaymentAccounts(accounts, '', 'all', statusFilter);
  const balance = usePaymentAccountsBalance(visibleAccounts, preferredCurrency, !loading && !loadFailed);
  const totalCount = accounts.length;
  const activeCount = accounts.filter(account => account.isActive).length;
  const inactiveCount = totalCount - activeCount;
  const internalCashCount = visibleAccounts.filter(account => account.source === 'petty_cash').length;
  const unavailable = loading || loadFailed;
  const count = (value: number) => unavailable ? '—' : value;
  const iconClassName = tone === 'coral' ? 'text-[#E8564B]' : 'text-[#147514] dark:text-emerald-300';
  const statusAction = (status: string) => unavailable ? undefined : () => onStatusChange(statusFilter === status ? 'all' : status);
  const data = balance.data;
  const formatMoney = (amount: number, currency: string) => new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'code' }).format(amount);
  const monetaryValue = unavailable || balance.loading || !data ? '—' : formatMoney(data.preferredTotal, preferredCurrency);
  const insight = loading ? copy.loading : loadFailed ? copy.loadFailed : totalCount === 0 ? copy.empty
    : `${copy.showing(visibleAccounts.length, totalCount)} ${copy.balanceScope}`;

  return (
    <div role="region" aria-label={copy.title} aria-busy={loading || balance.loading} className="space-y-3">
      <OperationalKpiArea
        insight={insight}
        insightIcon={<Info className="h-4 w-4" />}
        currencyContext={data && !unavailable ? {
          preferredCurrency,
          nativeBreakdown: data.nativeTotals.map(item => formatMoney(item.amount, item.currency)).join(' / '),
          rateLabel: data.exchangeRate.mode === 'daily' ? currencyCopy.dailyRate : data.exchangeRate.mode === 'none' ? copy.noConversion : currencyCopy.unavailable,
          effectiveDate: data.exchangeRate.effectiveDate,
          source: data.exchangeRate.source,
          isPartial: data.partial,
          excludedCount: data.excludedRecords,
          labels: currencyCopy,
        } : undefined}
        metrics={[
          { id: 'balance', icon: <Wallet className="h-4 w-4" />, iconClassName, label: data?.partial ? copy.partialBalance : copy.activeBalance,
            ariaLabel: copy.balanceScope, value: monetaryValue,
            valueClassName: (data?.preferredTotal ?? 0) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[#147514] dark:text-emerald-300' },
          { id: 'total', icon: <CreditCard className="h-4 w-4" />, iconClassName, label: copy.total, value: count(totalCount), active: statusFilter === 'all', onClick: statusAction('all') },
          { id: 'active', icon: <CheckCircle2 className="h-4 w-4" />, iconClassName, label: copy.active, value: count(activeCount), valueClassName: 'text-[#147514] dark:text-emerald-300', active: statusFilter === 'active', onClick: statusAction('active') },
          { id: 'inactive', icon: <CircleSlash className="h-4 w-4" />, iconClassName, label: copy.inactive, value: count(inactiveCount), valueClassName: 'text-rose-600 dark:text-rose-400', active: statusFilter === 'inactive', onClick: statusAction('inactive') },
          { id: 'petty-cash', icon: <Banknote className="h-4 w-4" />, iconClassName, label: copy.pettyCash, value: count(internalCashCount), valueClassName: 'text-amber-600 dark:text-amber-400' },
        ]}
        distributionSegments={[
          { id: 'active', label: copy.active, count: unavailable ? 0 : activeCount, className: 'bg-[#147514]', active: statusFilter === 'active', onClick: statusAction('active') },
          { id: 'inactive', label: copy.inactive, count: unavailable ? 0 : inactiveCount, className: 'bg-rose-500', active: statusFilter === 'inactive', onClick: statusAction('inactive') },
        ]}
      />
      {(loadFailed || balance.error) && !loading && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
        <span>{loadFailed ? copy.loadFailed : copy.balanceFailed}</span>
        <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-current px-3 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={loadFailed ? onRetry : balance.refresh}><RefreshCw className="h-4 w-4" />{copy.retry}</button>
      </div>}
    </div>
  );
}
