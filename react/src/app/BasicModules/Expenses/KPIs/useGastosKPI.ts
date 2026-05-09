import { useMemo } from 'react';
import type { Expense } from '../types/expenses.types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
import {
  buildCategorySpend,
  buildKPIAlerts,
  buildMonthlyBudgetComparison,
  buildProviderSpend,
  calculateFinancialSummary,
  calculateProjection,
} from './kpiUtils';

interface UseGastosKPIParams {
  currentDate?: Date;
  expenses: Expense[];
  providers: ProviderRecord[];
}

export function useGastosKPI({
  currentDate,
  expenses,
  providers,
}: UseGastosKPIParams) {
  const referenceDate = currentDate ?? new Date();

  return useMemo(() => {
    const summary = calculateFinancialSummary(expenses, referenceDate);
    const monthlyComparison = buildMonthlyBudgetComparison(expenses, referenceDate);
    const categorySpend = buildCategorySpend(expenses, referenceDate);
    const providerSpend = buildProviderSpend(expenses, providers, referenceDate);
    const projection = calculateProjection(expenses, referenceDate);
    const alerts = buildKPIAlerts({
      categorySpend,
      projection,
      providerSpend,
      summary,
    });

    return {
      alerts,
      categorySpend,
      monthlyComparison,
      projection,
      providerSpend,
      summary,
    };
  }, [expenses, providers, referenceDate]);
}
