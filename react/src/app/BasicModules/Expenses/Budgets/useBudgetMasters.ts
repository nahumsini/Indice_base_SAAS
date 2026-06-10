import { useCallback, useEffect, useMemo, useState } from 'react';
import { toBudgetOptionLabel, type BudgetMasterDraft } from '../adapters/budget.adapter';
import { budgetsService } from '../services';
import type { FinanceBudget } from '../types/finance-domain.types';
import { BudgetStatus } from '../types/finance-status.types';

export const NEW_BUDGET_VALUE = 'new';

export type BudgetOption = {
  label: string;
  value: string;
};

export function useBudgetMasters(onError: (message: string) => void) {
  const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState('');

  useEffect(() => {
    let isMounted = true;
    setIsLoadingBudgets(true);
    budgetsService.getBudgets()
      .then(nextBudgets => {
        if (!isMounted) return;
        setBudgets(nextBudgets);
        const activeBudgets = nextBudgets.filter(budget => budget.status === BudgetStatus.ACTIVE);
        if (activeBudgets.length === 1) {
          setSelectedBudgetId(activeBudgets[0].id);
        } else if (nextBudgets.length === 0) {
          setSelectedBudgetId(NEW_BUDGET_VALUE);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setSelectedBudgetId(NEW_BUDGET_VALUE);
        onError('No se pudieron cargar los presupuestos de Finance.');
      })
      .finally(() => {
        if (isMounted) setIsLoadingBudgets(false);
      });

    return () => {
      isMounted = false;
    };
  }, [onError]);

  const budgetOptions = useMemo<BudgetOption[]>(() => [
    ...budgets.map(budget => ({ value: budget.id, label: toBudgetOptionLabel(budget) })),
    { value: NEW_BUDGET_VALUE, label: 'Crear presupuesto nuevo' },
  ], [budgets]);

  const createBudget = useCallback(async (draft: BudgetMasterDraft) => {
    const budget = await budgetsService.createBudget(draft);
    setBudgets(currentBudgets => [budget, ...currentBudgets]);
    setSelectedBudgetId(budget.id);
    return budget;
  }, []);

  return {
    budgetOptions,
    budgets,
    createBudget,
    isLoadingBudgets,
    selectedBudgetId,
    setSelectedBudgetId,
  };
}
