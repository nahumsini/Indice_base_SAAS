import { useCallback, useEffect, useState } from 'react';
import { useAuthorizationRevision } from '../../../hooks/useAuthorizationRevision';
import { getKpiMonetaryAggregates, type KpiMonetaryBatchQuery } from '../../shared/kpiMonetaryApi';
import type { ExpenseFundGroup, FundMoney, FundMoneyField } from '../utils/expenseFundGroups';

const metrics = {
  total: 'EXPENSE_TOTAL', taxes: 'EXPENSE_TAX', amount: 'EXPENSE_SUBTOTAL',
  amountPaid: 'EXPENSE_PAID_TO_DATE', balance: 'EXPENSE_BALANCE',
} as const;

// Keep sorting and parent print-snapshot effects stable while a request is pending.
const EMPTY_FUND_TOTALS: Record<string, FundMoney> = Object.freeze({});

export async function loadExpenseFundTotals(groups: ExpenseFundGroup[], signal?: AbortSignal): Promise<Record<string, FundMoney>> {
  const queries: KpiMonetaryBatchQuery[] = groups.flatMap(group => {
    if (group.expenses.length > 10000) throw new Error('Fund selection exceeds the monetary query limit');
    return Object.entries(metrics).map(([field, metric]) => ({
      key: `${group.key}:${field}`, metric, preferredCurrency: group.currency,
      ids: group.expenses.map(expense => expense.id),
    }));
  });
  const results: Awaited<ReturnType<typeof getKpiMonetaryAggregates>> = {};
  // Respect the existing owner's 100-query limit, even on annual views with many funds.
  for (let start = 0; start < queries.length; start += 100) {
    signal?.throwIfAborted();
    Object.assign(results, await getKpiMonetaryAggregates(queries.slice(start, start + 100), signal));
  }
  return Object.fromEntries(groups.map(group => [group.key, Object.fromEntries(Object.keys(metrics).map(field => {
    const result = results[`${group.key}:${field}`];
    if (!result || result.partial || result.excludedRecords || result.nativeTotals.some(total => total.currency !== group.currency)) {
      throw new Error('Incomplete fund monetary summary');
    }
    // An authorized paid fund expense has a positive native total; an empty result can indicate changed scope/data.
    if (field === 'total' && result.nativeTotals.length === 0) throw new Error('Fund expenses are no longer available');
    return [field, result.nativeTotals.find(total => total.currency === group.currency)?.amount ?? 0];
  })) as Record<FundMoneyField, number>]));
}

export function useExpenseFundTotals(groups: ExpenseFundGroup[]) {
  const authorizationRevision = useAuthorizationRevision();
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ key: string; data: Record<string, FundMoney>; error: boolean }>();
  // Same IDs can have changed money/version, so invalidate on both data and authorization changes.
  const key = JSON.stringify([authorizationRevision, retry, groups.map(group => [group.key,
    group.expenses.map(expense => [expense.id, expense.version, expense.total, expense.amountPaid, expense.taxes, expense.updatedAt])])]);
  useEffect(() => {
    const controller = new AbortController();
    loadExpenseFundTotals(groups, controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ key, data, error: false });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ key, data: EMPTY_FUND_TOTALS, error: true });
    });
    return () => controller.abort();
    // The complete request identity is encoded above; row objects need not trigger redundant requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const refresh = useCallback(() => setRetry(value => value + 1), []);
  const current = state?.key === key;
  return { data: current ? state.data : EMPTY_FUND_TOTALS, loading: groups.length > 0 && !current, error: current && state.error, refresh };
}
