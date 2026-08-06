import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../lib/apiClient';

export type KpiMonetaryMetric =
  | 'CREDIT_SALES_TOTAL_PAYABLE'
  | 'CREDIT_SALES_MONTHLY_PAYMENT'
  | 'CREDIT_SALES_INTEREST'
  | 'EXPENSE_TOTAL'
  | 'EXPENSE_PAID'
  | 'EXPENSE_SUBTOTAL'
  | 'EXPENSE_TAX'
  | 'EXPENSE_BALANCE'
  | 'EXPENSE_OVERDUE_BALANCE'
  | 'EXPENSE_DUE_SOON_BALANCE'
  | 'BUDGET_PLANNED'
  | 'BUDGET_COMMITTED'
  | 'BUDGET_ACTUAL'
  | 'BUDGET_AVAILABLE'
  | 'RECEIVABLE_BALANCE'
  | 'RECEIVABLE_INSTALLMENT_BALANCE'
  | 'RECEIVABLE_PAYMENT_AMOUNT'
  | 'CREDIT_POLICY_LINE'
  | 'CREDIT_POLICY_AVAILABLE'
  | 'PETTY_CASH_BALANCE'
  | 'PETTY_CASH_LIMIT'
  | 'PETTY_CASH_STATEMENT_OPENING'
  | 'PETTY_CASH_STATEMENT_FUNDED'
  | 'PETTY_CASH_STATEMENT_ESTIMATED'
  | 'PETTY_CASH_STATEMENT_VERIFIED'
  | 'PETTY_CASH_STATEMENT_CLOSING'
  | 'PETTY_CASH_STATEMENT_PENDING'
  | 'PETTY_CASH_STATEMENT_SHORTAGE'
  | 'PETTY_CASH_MOVEMENT_AMOUNT'
  | 'PETTY_CASH_SETTLEMENT_AMOUNT'
  | 'PAYMENT_ACCOUNT_BALANCE'
  | 'HR_ASSET_VALUE'
  | 'HR_EMPLOYEE_MONTHLY_PAYROLL'
  | 'HR_INCENTIVE_AMOUNT'
  | 'PAYROLL_NET_AMOUNT'
  | 'POS_SALES_TOTAL'
  | 'POS_CLOSING_TOTAL'
  | 'POS_CLOSING_CASH_SALES'
  | 'POS_CLOSING_EXPECTED_CASH'
  | 'POS_CLOSING_COUNTED_CASH'
  | 'POS_CLOSING_DIFFERENCE'
  | 'PURCHASE_ORDER_TOTAL'
  | 'SUPPLIER_SUBMISSION_TOTAL'
  | 'SALES_TOTAL'
  | 'SALES_TAX'
  | 'SALES_COMMISSION'
  | 'SALES_OPPORTUNITY_PIPELINE'
  | 'SALES_OPPORTUNITY_WON'
  | 'SALES_OPPORTUNITY_LOST'
  | 'PRODUCT_INVENTORY_VALUE'
  | 'PRODUCT_ESTIMATED_PROFIT'
  | 'INVENTORY_BALANCE_VALUE'
  | 'INVENTORY_MOVEMENT_VALUE';

export type KpiMonetaryAggregate = {
  preferredCurrency: string;
  preferredTotal: number;
  nativeTotals: Array<{ currency: string; amount: number }>;
  exchangeRate: { mode: string; effectiveDate?: string; source?: string };
  partial: boolean;
  excludedRecords: number;
  excludedCurrencies: string[];
};

type Query = {
  metric: KpiMonetaryMetric;
  preferredCurrency: string;
  ids?: Array<string | number>;
  from?: string;
  to?: string;
};

export type KpiMonetaryBatchQuery = Query & { key: string };

export async function getKpiMonetaryAggregate(query: Query) {
  return apiClient<KpiMonetaryAggregate>('/api/v1/kpis/monetary-aggregate/query', {
    method: 'POST',
    body: JSON.stringify({
      ...query,
      ids: query.ids?.map((id) => Number(id)).filter((id) => Number.isSafeInteger(id) && id > 0) ?? [],
    }),
  });
}

export async function getKpiMonetaryAggregates(queries: KpiMonetaryBatchQuery[]) {
  const response = await apiClient<{ results: Record<string, KpiMonetaryAggregate> }>('/api/v1/kpis/monetary-aggregate/batch', {
    method: 'POST',
    body: JSON.stringify({
      queries: queries.map((query) => ({
        ...query,
        ids: query.ids?.map((id) => Number(id)).filter((id) => Number.isSafeInteger(id) && id > 0) ?? [],
      })),
    }),
  });
  return response.results;
}

export function useKpiMonetaryAggregate(query: Query) {
  const idsKey = useMemo(() => query.ids?.join(',') ?? '', [query.ids]);
  const [data, setData] = useState<KpiMonetaryAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getKpiMonetaryAggregate({ ...query, ids: idsKey ? idsKey.split(',') : [] })
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setData(null);
          setError(reason instanceof Error ? reason : new Error('KPI monetary aggregate failed'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [idsKey, query.from, query.metric, query.preferredCurrency, query.to]);

  return { data, error, loading };
}

export function useKpiMonetaryAggregates(queries: KpiMonetaryBatchQuery[]) {
  const queryKey = useMemo(() => JSON.stringify(queries.map((query) => ({
    ...query,
    ids: query.ids?.map(String),
  }))), [queries]);
  const [data, setData] = useState<Record<string, KpiMonetaryAggregate>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    const parsed = JSON.parse(queryKey) as KpiMonetaryBatchQuery[];
    if (parsed.length === 0) {
      setData({});
      setLoading(false);
      setError(null);
      return () => { active = false; };
    }
    setLoading(true);
    setError(null);
    getKpiMonetaryAggregates(parsed)
      .then((result) => { if (active) setData(result); })
      .catch((reason: unknown) => {
        if (active) {
          setData({});
          setError(reason instanceof Error ? reason : new Error('KPI monetary batch failed'));
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [queryKey]);

  return { data, error, loading };
}
