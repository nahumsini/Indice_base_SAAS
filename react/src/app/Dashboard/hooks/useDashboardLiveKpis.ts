import { useEffect, useMemo, useState } from 'react';
import type { DashboardKpiCardData } from '../dashboardData';
import type { MainDashboardTranslations } from '../translations';
import { usePreferredBusinessCurrency } from '../../BasicModules/shared/BusinessCurrencyContext';
import { getKpiMonetaryAggregate } from '../../BasicModules/shared/kpiMonetaryApi';

type DashboardLiveKpiMap = Partial<Record<string, DashboardKpiCardData>>;

const toLocalIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getCurrentMonthRange = () => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: toLocalIsoDate(from),
    to: toLocalIsoDate(to),
  };
};

const formatNumber = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);

const formatCurrency = (value: number, locale: string, currency = 'USD') => {
  try {
    return new Intl.NumberFormat(locale, {
      currency,
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(value);
  } catch {
    return `${currency} ${formatNumber(value, locale)}`;
  }
};

const formatPercent = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    style: 'percent',
  }).format(value / 100);

const numericKpiValue = (source: Record<string, unknown>, key: string) => {
  const value = source[key];

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

export function useDashboardLiveKpis(copy: MainDashboardTranslations, locale: string) {
  const {
    exchangeRateMetadata,
    exchangeRatesPerUsd,
    preferredCurrency,
  } = usePreferredBusinessCurrency();
  const [liveKpis, setLiveKpis] = useState<DashboardLiveKpiMap>({});
  const today = useMemo(() => toLocalIsoDate(new Date()), []);

  useEffect(() => {
    let isMounted = true;

    const loadLiveKpis = async () => {
      const monthRange = getCurrentMonthRange();
      const [{ humanResourcesApi }, { listProcessTaskKpis }, { loadFinanceDashboardOverview }, { salesApi }] = await Promise.all([
        import('../../api/humanResources'),
        import('../../BasicModules/ProcessesTasks/KPIs/kpisApi'),
        import('../../BasicModules/Expenses/KPIs/financeDashboardOverview'),
        import('../../BasicModules/Sales/salesApi'),
      ]);
      const [hrUsersResult, attendanceResult, processTasksResult, financeOverviewResult, salesKpisResult, monthlyExpensesResult, pendingExpensesResult, overdueExpensesResult, budgetAvailableResult, cashDueResult] = await Promise.allSettled([
        humanResourcesApi.listHrUsers(),
        humanResourcesApi.getAttendanceControlOverview(today),
        listProcessTaskKpis({
          from: monthRange.from,
          to: monthRange.to,
          includeOverdueBacklog: true,
        }),
        loadFinanceDashboardOverview({
          currentDate: new Date(),
          locale,
          periodFilter: 'this_month',
        }),
        salesApi.kpis(preferredCurrency),
        getKpiMonetaryAggregate({ metric: 'EXPENSE_TOTAL', preferredCurrency, from: monthRange.from, to: monthRange.to }),
        getKpiMonetaryAggregate({ metric: 'EXPENSE_BALANCE', preferredCurrency }),
        getKpiMonetaryAggregate({ metric: 'EXPENSE_OVERDUE_BALANCE', preferredCurrency }),
        getKpiMonetaryAggregate({ metric: 'BUDGET_AVAILABLE', preferredCurrency }),
        getKpiMonetaryAggregate({ metric: 'EXPENSE_DUE_SOON_BALANCE', preferredCurrency }),
      ]);

      if (!isMounted) {
        return;
      }

      const preferredRate = exchangeRatesPerUsd[preferredCurrency as keyof typeof exchangeRatesPerUsd] ?? 1;
      const preferredSource = exchangeRateMetadata.sourceDetails?.find(
        (source) => source.currencyCode === preferredCurrency,
      );
      const sourceLabel = preferredSource?.status === 'official'
        ? preferredSource.institution
        : copy.kpis.dailyExchangeRate.fallback;
      const sourceDate = preferredSource?.observedDate || exchangeRateMetadata.sourceDate;
      const formattedRate = new Intl.NumberFormat(locale, {
        maximumFractionDigits: preferredCurrency === 'COP' ? 2 : 4,
      }).format(preferredRate);
      const nextKpis: DashboardLiveKpiMap = {
        dailyExchangeRate: {
          title: copy.kpis.dailyExchangeRate.title,
          value: `1 USD = ${formattedRate} ${preferredCurrency}`,
          change: [sourceLabel, sourceDate].filter(Boolean).join(' · '),
          isPositive: true,
          tone: 'neutral',
        },
      };

      if (hrUsersResult.status === 'fulfilled') {
        const summary = hrUsersResult.value.summary;
        const activeEmployees = summary?.active_count ?? hrUsersResult.value.items.filter((employee) => employee.status === 'active').length;
        const currentMonth = today.slice(0, 7);
        const newHires = hrUsersResult.value.items.filter((employee) => employee.hire_date?.startsWith(currentMonth)).length;
        const payrollCost = summary?.total_payroll_amount_monthly ?? 0;

        nextKpis.activeEmployees = {
          title: copy.kpis.activeEmployees.title,
          value: formatNumber(activeEmployees, locale),
          change: copy.kpis.activeEmployees.change,
          isPositive: true,
        };
        nextKpis.newHires = {
          title: copy.kpis.newHires.title,
          value: formatNumber(newHires, locale),
          change: copy.kpis.newHires.change,
          isPositive: true,
        };
        nextKpis.payrollCost = {
          title: copy.kpis.payrollCost.title,
          value: formatCurrency(payrollCost, locale),
          change: copy.kpis.payrollCost.change,
          isPositive: false,
        };
      }

      if (attendanceResult.status === 'fulfilled') {
        const assignments = attendanceResult.value.assignments ?? [];
        const denominator = Math.max(assignments.length, attendanceResult.value.summary.users_count ?? 0);
        const absent = assignments.filter((assignment) => assignment.today_status === 'absence').length;
        const absenteeismRate = denominator > 0 ? (absent / denominator) * 100 : 0;

        nextKpis.absenteeismRate = {
          title: copy.kpis.absenteeismRate.title,
          value: formatPercent(absenteeismRate, locale),
          change: copy.kpis.absenteeismRate.change,
          isPositive: absenteeismRate <= 3,
        };
      }

      if (processTasksResult.status === 'fulfilled') {
        const { summary } = processTasksResult.value;

        nextKpis.pendingTasks = {
          title: copy.kpis.pendingTasks.title,
          value: formatNumber(summary.openTasks, locale),
          change: copy.kpis.pendingTasks.change,
          isPositive: summary.openTasks === 0,
        };
        nextKpis.completedTasks = {
          title: copy.kpis.completedTasks.title,
          value: formatNumber(summary.completedTasks, locale),
          change: copy.kpis.completedTasks.change,
          isPositive: true,
        };
        nextKpis.taskCompletionRate = {
          title: copy.kpis.taskCompletionRate.title,
          value: formatPercent(summary.completionRate, locale),
          change: copy.kpis.taskCompletionRate.change,
          isPositive: summary.completionRate >= 80,
        };
        nextKpis.overdueTasks = {
          title: copy.kpis.overdueTasks.title,
          value: formatNumber(summary.overdueTasks, locale),
          change: copy.kpis.overdueTasks.change,
          isPositive: summary.overdueTasks === 0,
        };
      }

      if (financeOverviewResult.status === 'fulfilled') {
        const { metrics } = financeOverviewResult.value;
        const consumed = metrics.planned - metrics.available;
        const budgetUtilization = metrics.planned > 0
          ? Math.max(0, (consumed / metrics.planned) * 100)
          : 0;

        nextKpis.monthlyExpenses = {
          title: copy.kpis.monthlyExpenses.title,
          value: monthlyExpensesResult.status === 'fulfilled' ? formatCurrency(monthlyExpensesResult.value.preferredTotal, locale, preferredCurrency) : '—',
          change: copy.kpis.monthlyExpenses.change,
          isPositive: metrics.planned <= 0 || metrics.actual <= metrics.planned,
        };
        nextKpis.pendingExpenses = {
          title: copy.kpis.pendingExpenses.title,
          value: pendingExpensesResult.status === 'fulfilled' ? formatCurrency(pendingExpensesResult.value.preferredTotal, locale, preferredCurrency) : '—',
          change: copy.kpis.pendingExpenses.change,
          isPositive: metrics.pendingPayments <= 0,
        };
        nextKpis.overdueExpenses = {
          title: copy.kpis.overdueExpenses.title,
          value: overdueExpensesResult.status === 'fulfilled' ? formatCurrency(overdueExpensesResult.value.preferredTotal, locale, preferredCurrency) : '—',
          change: copy.kpis.overdueExpenses.change,
          isPositive: metrics.overdueAmount <= 0,
        };
        nextKpis.budgetAvailable = {
          title: copy.kpis.budgetAvailable.title,
          value: budgetAvailableResult.status === 'fulfilled' ? formatCurrency(budgetAvailableResult.value.preferredTotal, locale, preferredCurrency) : '—',
          change: copy.kpis.budgetAvailable.change,
          isPositive: metrics.available >= 0,
        };
        nextKpis.budgetUtilization = {
          title: copy.kpis.budgetUtilization.title,
          value: formatPercent(budgetUtilization, locale),
          change: copy.kpis.budgetUtilization.change,
          isPositive: budgetUtilization <= 85,
        };
        nextKpis.cashDue7Days = {
          title: copy.kpis.cashDue7Days.title,
          value: cashDueResult.status === 'fulfilled' ? formatCurrency(cashDueResult.value.preferredTotal, locale, preferredCurrency) : '—',
          change: copy.kpis.cashDue7Days.change,
          isPositive: metrics.dueIn7Days <= 0,
        };
      }

      if (salesKpisResult.status === 'fulfilled') {
        const salesKpis = salesKpisResult.value;
        const contacts = numericKpiValue(salesKpis, 'contacts');
        const salesCount = numericKpiValue(salesKpis, 'monthlySales');
        const monthlySalesValue = numericKpiValue(salesKpis, 'monthlySalesValue');
        const weeklySalesValue = numericKpiValue(salesKpis, 'weeklySalesValue');
        const quotes = numericKpiValue(salesKpis, 'quotes');
        const approvedQuotes = numericKpiValue(salesKpis, 'approvedQuotes');
        const conversionRate = quotes > 0 ? (approvedQuotes / quotes) * 100 : 0;
        const averageTicket = salesCount > 0 ? monthlySalesValue / salesCount : 0;

        nextKpis.activeClients = {
          title: copy.kpis.activeClients.title,
          value: formatNumber(contacts, locale),
          change: copy.kpis.activeClients.change,
          isPositive: contacts > 0,
        };
        nextKpis.monthlyRevenue = {
          title: copy.kpis.monthlyRevenue.title,
          value: formatCurrency(monthlySalesValue, locale, preferredCurrency),
          change: copy.kpis.monthlyRevenue.change,
          isPositive: monthlySalesValue > 0,
        };
        nextKpis.weeklyRevenue = {
          title: copy.kpis.weeklyRevenue.title,
          value: formatCurrency(weeklySalesValue, locale, preferredCurrency),
          change: copy.kpis.weeklyRevenue.change,
          isPositive: weeklySalesValue > 0,
        };
        nextKpis.averageTicket = {
          title: copy.kpis.averageTicket.title,
          value: formatCurrency(averageTicket, locale, preferredCurrency),
          change: copy.kpis.averageTicket.change,
          isPositive: averageTicket > 0,
        };
        nextKpis.salesConversion = {
          title: copy.kpis.salesConversion.title,
          value: formatPercent(conversionRate, locale),
          change: copy.kpis.salesConversion.change,
          isPositive: conversionRate >= 30,
        };
      }

      setLiveKpis(nextKpis);
    };

    void loadLiveKpis();

    return () => {
      isMounted = false;
    };
  }, [copy, exchangeRateMetadata, exchangeRatesPerUsd, locale, preferredCurrency, today]);

  return liveKpis;
}
