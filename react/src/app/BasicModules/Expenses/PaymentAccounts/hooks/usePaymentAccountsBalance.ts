import { useEffect, useMemo, useState } from 'react';
import { getKpiMonetaryAggregate, type KpiMonetaryAggregate } from '../../../shared/kpiMonetaryApi';
import type { PaymentAccount } from '../types';

// The owner metric covers active payment accounts. Virtual Petty Cash rows keep their own owner.
export function usePaymentAccountsBalance(accounts: PaymentAccount[], preferredCurrency: string, enabled = true) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; data: KpiMonetaryAggregate | null; error: boolean } | null>(null);
  const eligible = accounts.filter(account => account.isActive && account.source !== 'petty_cash');
  const ids = [...new Set(eligible.map(account => Number(account.id)).filter(id => Number.isSafeInteger(id) && id > 0))];
  const invalidIds = eligible.some(account => !Number.isSafeInteger(Number(account.id)) || Number(account.id) <= 0);
  // Balance updates on unchanged IDs must refresh too; never display an earlier scope/currency result.
  const key = JSON.stringify([enabled, preferredCurrency, revision, eligible.map(account => [account.id, account.balance, account.lastTransaction])]);
  const query = useMemo(() => ({ metric: 'PAYMENT_ACCOUNT_BALANCE' as const, preferredCurrency, ids }), [key]);

  useEffect(() => {
    if (!enabled) return;
    let current = true;
    if (invalidIds) {
      setResult({ key, data: null, error: true });
    } else if (query.ids.length === 0) {
      setResult({ key, error: false, data: {
        preferredCurrency, preferredTotal: 0, nativeTotals: [], exchangeRate: { mode: 'none' },
        partial: false, excludedRecords: 0, excludedCurrencies: [],
      } });
    } else {
      getKpiMonetaryAggregate(query)
        .then(data => {
          if (current) setResult({ key, data: data.preferredCurrency === preferredCurrency ? data : null, error: data.preferredCurrency !== preferredCurrency });
        })
        .catch(() => { if (current) setResult({ key, data: null, error: true }); });
    }
    return () => { current = false; };
  }, [key, query, enabled, invalidIds, preferredCurrency]);

  const currentResult = enabled && result?.key === key ? result : null;
  return {
    data: currentResult?.data ?? null,
    error: currentResult?.error ?? false,
    loading: enabled && currentResult === null,
    refresh: () => setRevision(value => value + 1),
  };
}
