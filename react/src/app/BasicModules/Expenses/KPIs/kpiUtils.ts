import type { Expense } from '../types/expenses.types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
import type {
  CategorySpend,
  ExpenseProjection,
  FinancialSummary,
  KPIAlert,
  MonthlyBudgetComparison,
  ProviderSpend,
} from '../types/kpi.types';

export const formatCompactCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    compactDisplay: 'short',
    currency,
    maximumFractionDigits: 1,
    notation: Math.abs(amount) >= 100000 ? 'compact' : 'standard',
    style: 'currency',
  }).format(amount);
};

export const formatPercent = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return 'Sin presupuesto';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
};

export const getExpenseTotal = (expense: Expense) => {
  return Number(expense.total ?? expense.amount ?? 0);
};

export const getExpensePaid = (expense: Expense) => {
  return Math.max(0, Number(expense.amountPaid ?? 0));
};

export const getExpensePending = (expense: Expense) => {
  return Math.max(getExpenseTotal(expense) - getExpensePaid(expense), 0);
};

export const isRealExpense = (expense: Expense) => {
  return expense.type !== 'budget';
};

export const isBudgetExpense = (expense: Expense) => {
  return expense.type === 'budget';
};

export const getMonthRange = (referenceDate: Date) => {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59, 999);

  return { end, start };
};

export const getNextMonthRange = (referenceDate: Date) => {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 2, 0, 23, 59, 59, 999);

  return { end, start };
};

export const isDateInRange = (date: Date, start: Date, end: Date) => {
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
};

export const isSameMonth = (date: Date, referenceDate: Date) => {
  return date.getFullYear() === referenceDate.getFullYear() && date.getMonth() === referenceDate.getMonth();
};

export const sumExpenses = (expenses: Expense[]) => {
  return expenses.reduce((total, expense) => total + getExpenseTotal(expense), 0);
};

export const calculateDeviationPercent = (real: number, budget: number) => {
  if (budget === 0) return real === 0 ? 0 : null;
  return ((real - budget) / budget) * 100;
};

export const calculateFinancialSummary = (expenses: Expense[], referenceDate = new Date()): FinancialSummary => {
  const currentMonthExpenses = expenses.filter(expense => isSameMonth(expense.date, referenceDate));
  const currentRealExpenses = currentMonthExpenses.filter(isRealExpense);
  const currentBudgetExpenses = currentMonthExpenses.filter(isBudgetExpense);
  const currentSpent = sumExpenses(currentRealExpenses);
  const currentBudgeted = sumExpenses(currentBudgetExpenses);
  const totalPaid = currentRealExpenses.reduce((total, expense) => total + getExpensePaid(expense), 0);
  const totalPending = currentRealExpenses.reduce((total, expense) => total + getExpensePending(expense), 0);
  const overdueExpenses = currentRealExpenses.filter(expense =>
    expense.status === 'overdue' || (getExpensePending(expense) > 0 && expense.dueDate < referenceDate),
  );
  const totalOverdue = overdueExpenses.reduce((total, expense) => total + getExpensePending(expense), 0);

  return {
    budgetDeviationPercent: calculateDeviationPercent(currentSpent, currentBudgeted),
    budgetVariance: currentSpent - currentBudgeted,
    currentBudgeted,
    currentSpent,
    overdueCount: overdueExpenses.length,
    totalOverdue,
    totalPaid,
    totalPending,
  };
};

export const buildMonthlyBudgetComparison = (
  expenses: Expense[],
  referenceDate = new Date(),
  monthsBack = 2,
  monthsForward = 4,
): MonthlyBudgetComparison[] => {
  const formatter = new Intl.DateTimeFormat('es-MX', { month: 'short' });
  const monthCount = monthsBack + monthsForward + 1;

  return Array.from({ length: monthCount }, (_, index) => {
    const monthDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - monthsBack + index, 1);
    const monthExpenses = expenses.filter(expense => isSameMonth(expense.date, monthDate));
    const real = sumExpenses(monthExpenses.filter(isRealExpense));
    const budget = sumExpenses(monthExpenses.filter(isBudgetExpense));

    return {
      budget,
      deviation: real - budget,
      deviationPercent: calculateDeviationPercent(real, budget),
      month: formatter.format(monthDate).replace('.', ''),
      real,
    };
  });
};

export const buildCategorySpend = (expenses: Expense[], referenceDate = new Date()): CategorySpend[] => {
  const currentRealExpenses = expenses.filter(expense => isRealExpense(expense) && isSameMonth(expense.date, referenceDate));
  const totalSpent = sumExpenses(currentRealExpenses);
  const byAccount = currentRealExpenses.reduce<Record<string, number>>((result, expense) => {
    const account = expense.accountingAccount || expense.category?.name || 'Sin cuenta contable';
    result[account] = (result[account] ?? 0) + getExpenseTotal(expense);
    return result;
  }, {});

  return Object.entries(byAccount)
    .map(([account, total]) => ({
      account,
      percentage: totalSpent === 0 ? 0 : (total / totalSpent) * 100,
      total,
    }))
    .sort((left, right) => right.total - left.total);
};

export const buildProviderSpend = (
  expenses: Expense[],
  providers: ProviderRecord[],
  referenceDate = new Date(),
): ProviderSpend[] => {
  const currentRealExpenses = expenses.filter(expense => isRealExpense(expense) && isSameMonth(expense.date, referenceDate));
  const totalSpent = sumExpenses(currentRealExpenses);
  const providersById = new Map(providers.map(provider => [provider.id, provider]));
  const byProvider = currentRealExpenses.reduce<Record<string, ProviderSpend>>((result, expense) => {
    const providerId = expense.providerId ?? 'without-provider';
    const provider = providersById.get(providerId);
    const providerName = expense.providerName || provider?.name || 'Sin proveedor';

    if (!result[providerId]) {
      result[providerId] = {
        percentage: 0,
        providerId: expense.providerId,
        providerName,
        providerStatus: provider?.status,
        total: 0,
      };
    }

    result[providerId].total += getExpenseTotal(expense);
    return result;
  }, {});

  return Object.values(byProvider)
    .map(providerSpend => ({
      ...providerSpend,
      percentage: totalSpent === 0 ? 0 : (providerSpend.total / totalSpent) * 100,
    }))
    .sort((left, right) => right.total - left.total)
    .slice(0, 5);
};

export const calculateProjection = (expenses: Expense[], referenceDate = new Date()): ExpenseProjection => {
  const { end, start } = getNextMonthRange(referenceDate);
  const currentPending = expenses
    .filter(expense => isRealExpense(expense) && isSameMonth(expense.date, referenceDate))
    .reduce((total, expense) => total + getExpensePending(expense), 0);
  const nextMonthBudgets = expenses.filter(expense =>
    isBudgetExpense(expense) && isDateInRange(expense.date, start, end),
  );
  const expectedNextMonth = sumExpenses(nextMonthBudgets);

  return {
    estimatedCashFlow: expectedNextMonth + currentPending,
    expectedNextMonth,
    nextMonthBudgetCount: nextMonthBudgets.length,
    pendingCarryOver: currentPending,
  };
};

export const buildKPIAlerts = ({
  categorySpend,
  providerSpend,
  projection,
  summary,
}: {
  categorySpend: CategorySpend[];
  projection: ExpenseProjection;
  providerSpend: ProviderSpend[];
  summary: FinancialSummary;
}): KPIAlert[] => {
  const alerts: KPIAlert[] = [];
  const topCategory = categorySpend[0];
  const inactiveProviderWithSpend = providerSpend.find(provider => provider.providerStatus === 'inactive');

  if (summary.overdueCount > 0) {
    alerts.push({
      id: 'overdue-expenses',
      message: `${summary.overdueCount} gastos vencidos suman ${formatCompactCurrency(summary.totalOverdue)}.`,
      recommendation: 'Prioriza pagos vencidos antes de comprometer nuevos presupuestos.',
      title: 'Gastos vencidos detectados',
      type: 'critical',
    });
  }

  if (topCategory && topCategory.percentage >= 40) {
    alerts.push({
      id: 'category-concentration',
      message: `${topCategory.account} concentra ${topCategory.percentage.toFixed(1)}% del gasto del mes.`,
      recommendation: 'Revisa si esta concentración responde a una compra extraordinaria o a una tendencia.',
      title: 'Alta concentración por categoría',
      type: 'warning',
    });
  }

  if (summary.budgetDeviationPercent === null && summary.currentSpent > 0) {
    alerts.push({
      id: 'missing-budget',
      message: 'Hay gasto real este mes, pero no hay presupuesto registrado para comparar.',
      recommendation: 'Crea presupuestos mensuales para poder medir desviaciones reales.',
      title: 'Presupuesto mensual ausente',
      type: 'warning',
    });
  } else if (summary.budgetDeviationPercent !== null && Math.abs(summary.budgetDeviationPercent) >= 20) {
    alerts.push({
      id: 'budget-variance',
      message: `La desviación contra presupuesto es de ${formatPercent(summary.budgetDeviationPercent)}.`,
      recommendation: 'Analiza las cuentas con mayor diferencia antes del cierre del mes.',
      title: 'Desviación fuerte vs presupuesto',
      type: Math.abs(summary.budgetDeviationPercent) >= 50 ? 'critical' : 'warning',
    });
  }

  if (inactiveProviderWithSpend) {
    alerts.push({
      id: 'inactive-provider-spend',
      message: `${inactiveProviderWithSpend.providerName} tiene gasto registrado pero está inactivo.`,
      recommendation: 'Valida si debe reactivarse o sustituirse antes de nuevas órdenes.',
      title: 'Proveedor inactivo con gasto',
      type: 'info',
    });
  }

  if (projection.expectedNextMonth === 0) {
    alerts.push({
      id: 'missing-projection',
      message: 'No hay gasto presupuestado para el próximo mes.',
      recommendation: 'Carga presupuestos futuros para anticipar flujo de caja.',
      title: 'Proyección incompleta',
      type: 'info',
    });
  }

  return alerts;
};
