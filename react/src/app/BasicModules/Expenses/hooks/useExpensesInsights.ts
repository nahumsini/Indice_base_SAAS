import { useMemo } from 'react';
import { generateInsights } from '../services/insights.engine';
import type {
  ExpenseInsight,
  ExpenseInsightInput,
  ExpenseInsightThresholds,
} from '../types/insights.types';

export interface UseExpensesInsightsOptions {
  enabled?: boolean;
  thresholds?: Partial<ExpenseInsightThresholds>;
}

export const useExpensesInsights = (
  data: ExpenseInsightInput | null | undefined,
  options: UseExpensesInsightsOptions = {},
): ExpenseInsight[] => {
  const { enabled = true, thresholds } = options;

  return useMemo(() => {
    if (!enabled || !data) return [];

    return generateInsights(data, thresholds);
  }, [data, enabled, thresholds]);
};
