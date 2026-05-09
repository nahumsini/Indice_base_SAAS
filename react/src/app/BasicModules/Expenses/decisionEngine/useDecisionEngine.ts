import { useMemo } from 'react';
import type { Expense } from '../types/expenses.types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
import { generateDecisions } from './decisionRules';
import {
  buildDecisionMetrics,
  summarizeDecisions,
  type DecisionEngineOptions,
  type DecisionThresholds,
} from './decisionUtils';

interface UseDecisionEngineParams {
  budgets?: Expense[];
  expectedBalance?: number;
  expenses: Expense[];
  providers: ProviderRecord[];
  referenceDate?: Date;
  thresholds?: Partial<DecisionThresholds>;
}

const normalizeRecords = (expenses: Expense[], budgets?: Expense[]) => {
  if (!budgets) return expenses;

  return [
    ...expenses.map(expense => ({
      ...expense,
      type: expense.type ?? 'real',
    })),
    ...budgets.map(budget => ({
      ...budget,
      type: 'budget' as const,
    })),
  ];
};

export function useDecisionEngine({
  budgets,
  expectedBalance,
  expenses,
  providers,
  referenceDate,
  thresholds,
}: UseDecisionEngineParams) {
  const referenceTime = referenceDate?.getTime();

  return useMemo(() => {
    const options: DecisionEngineOptions = {
      expectedBalance,
      referenceDate: referenceDate ?? new Date(),
      thresholds,
    };
    const records = normalizeRecords(expenses, budgets);
    const metrics = buildDecisionMetrics(records, providers, options);
    const decisions = generateDecisions(metrics, thresholds);
    const summary = summarizeDecisions(decisions);

    return {
      decisions,
      metrics,
      summary,
    };
  }, [budgets, expectedBalance, expenses, providers, referenceTime, referenceDate, thresholds]);
}
