import { useCallback, useEffect, useState } from 'react';
import type { BudgetMasterDraft } from '../adapters/budget.adapter';
import { budgetsService } from '../services';
import type { FinanceBudget } from '../types/finance-domain.types';
import { useBudgetsTranslations } from './hooks/useBudgetsTranslations';

export function useBudgetMasters(onError: (message: string) => void) {
  const t = useBudgetsTranslations();
  const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingBudgets(true);
    budgetsService.getBudgets()
      .then(nextBudgets => {
        if (isMounted) setBudgets(nextBudgets);
      })
      .catch(() => {
        if (isMounted) onError(t.budgets.messages.loadErrorTitle);
      })
      .finally(() => {
        if (isMounted) setIsLoadingBudgets(false);
      });

    return () => {
      isMounted = false;
    };
  }, [onError, t.budgets.messages.loadErrorTitle]);

  const createBudget = useCallback(async (draft: BudgetMasterDraft) => {
    const budget = await budgetsService.createBudget(draft);
    setBudgets(currentBudgets => [budget, ...currentBudgets]);
    return budget;
  }, []);

  return { budgets, createBudget, isLoadingBudgets };
}
