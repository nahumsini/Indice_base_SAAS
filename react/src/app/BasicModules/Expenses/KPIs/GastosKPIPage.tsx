import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  LayoutGrid,
  RefreshCw,
  Printer,
  ReceiptText,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import type { Expense } from '../types/expenses.types';
import type { PeriodFilter } from '../types/expenseView.types';
import type { FinanceExpense } from '../types/finance-domain.types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
import { useKpisResolvedLocale, useKpisTranslations } from './hooks/useKpisTranslations';
import { downloadFinancialOverviewPdf } from './financialOverviewPdf';
import { useFinancialOverview } from './useFinancialOverview';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import {
  type KpiMonetaryAggregate,
  type KpiMonetaryBatchQuery,
} from '../../shared/kpiMonetaryApi';
import { getOperationalKpiCurrencyCopy, OperationalKpiCurrencyStrip } from '../../shared/operational';
import { useCompanyPrintIdentity } from '../../shared/print/useCompanyPrintIdentity';
import { useWorkspaceNavigationMemory } from '../../../hooks/useWorkspaceNavigationMemory';
import {
  IndiceFilterAdvancedSection,
  IndiceFilterBar,
  IndiceFilterDisclosureActions,
  IndiceFilterField,
  IndiceFilterSelect,
  IndiceTitleBar,
  IndiceWorkspaceNavigation,
  getIndiceFilterControlClassName,
} from '../../../components/frontend-os';
import { BudgetHealthStatus } from '../types/finance-status.types';
import type {
  FinancialOverviewBudgetHealthRow,
  FinancialOverviewCostDriver,
  FinancialOverviewCostDriverType,
  FinancialOverviewDataSet,
} from '../types/financial-overview.types';

import { useExpenseKpiAggregates, completeAmount } from './useExpenseKpiAggregates';
import { daysAfter, expenseTrendWindows, hasEvidence, isOpenExpense, isOverdueExpense, isRecognizedExpense, paymentPunctuality, resolveExpenseKpiView, type ExpenseKpiView } from './expenseKpiSelectors';
import { getExpenseWorkspaceCopy } from './translations/workspaceCopy';
import { ExpenseKpiAnalysis, ExpenseKpiUnits, ExpenseKpiControl } from './components/ExpenseKpiViews';
import { MetricCard } from './components/ExpenseKpiPrimitives';

interface GastosKPIPageProps {
  expenses: Expense[];
  providers: ProviderRecord[];
  refreshKey?: number;
}

type RankingRole = 'approved' | 'performed' | 'requested';

type KpiWorkspaceState = {
  activeView: ExpenseKpiView;
  search: string;
  accountingAccountId: string;
  businessId: string;
  customEndDate: string;
  customStartDate: string;
  paymentStatus: string;
  periodFilter: PeriodFilter;
  providerId: string;
  rankingCurrentPage: number;
  rankingPageSize: number;
  rankingRole: RankingRole;
  unitId: string;
};

const kpiWorkspaceDefaults: KpiWorkspaceState = {
  activeView: 'overview',
  search: '',
  accountingAccountId: 'all',
  businessId: 'all',
  customEndDate: '',
  customStartDate: '',
  paymentStatus: 'all',
  periodFilter: 'this_month',
  providerId: 'all',
  rankingCurrentPage: 1,
  rankingPageSize: 10,
  rankingRole: 'requested',
  unitId: 'all',
};

const kpiWorkspaceUrlFields: Partial<Record<keyof KpiWorkspaceState, string>> = {
  activeView: 'view',
  search: 'kpi_q',
  accountingAccountId: 'kpi_account',
  businessId: 'kpi_business',
  customEndDate: 'kpi_end',
  customStartDate: 'kpi_start',
  paymentStatus: 'kpi_status',
  periodFilter: 'kpi_period',
  providerId: 'kpi_provider',
  rankingCurrentPage: 'kpi_page',
  rankingPageSize: 'kpi_rows',
  rankingRole: 'kpi_rank',
  unitId: 'kpi_unit',
};

const getBudgetLineNumericId = (id: string) => {
  const candidate = /^budget-line-(\d+)$/.exec(id)?.[1] ?? id;
  const numericId = Number(candidate);
  return Number.isSafeInteger(numericId) && numericId > 0 ? numericId : null;
};

export default function GastosKPIPage({ expenses, providers, refreshKey = 0 }: GastosKPIPageProps) {
  const t = useKpisTranslations();
  const locale = useKpisResolvedLocale();
  const copy = getExpenseWorkspaceCopy(locale);
  const [activeView, setActiveView] = useState<ExpenseKpiView>('overview');
  const [search, setSearch] = useState('');
  const [localRefresh, setLocalRefresh] = useState(0);
  const currencyCopy = getOperationalKpiCurrencyCopy(locale);
  const { identity: companyPrintIdentity, isReady: isCompanyPrintIdentityReady } = useCompanyPrintIdentity();
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [unitId, setUnitId] = useState('all');
  const [businessId, setBusinessId] = useState('all');
  const [providerId, setProviderId] = useState('all');
  const [accountingAccountId, setAccountingAccountId] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [rankingRole, setRankingRole] = useState<RankingRole>('requested');
  const [rankingCurrentPage, setRankingCurrentPage] = useState(1);
  const [rankingPageSize, setRankingPageSize] = useState(10);
  const workspaceState = useMemo<KpiWorkspaceState>(() => ({
    activeView, search,
    accountingAccountId,
    businessId,
    customEndDate,
    customStartDate,
    paymentStatus,
    periodFilter,
    providerId,
    rankingCurrentPage,
    rankingPageSize,
    rankingRole,
    unitId,
  }), [
    activeView, search,
    accountingAccountId,
    businessId,
    customEndDate,
    customStartDate,
    paymentStatus,
    periodFilter,
    providerId,
    rankingCurrentPage,
    rankingPageSize,
    rankingRole,
    unitId,
  ]);
  const restoreWorkspaceState = useCallback((restoredState: KpiWorkspaceState) => {
    setActiveView(resolveExpenseKpiView(restoredState.activeView));
    setSearch(typeof restoredState.search === 'string' ? restoredState.search : '');
    setAccountingAccountId(restoredState.accountingAccountId);
    setBusinessId(restoredState.businessId);
    setCustomEndDate(restoredState.customEndDate);
    setCustomStartDate(restoredState.customStartDate);
    setPaymentStatus(restoredState.paymentStatus);
    setPeriodFilter(restoredState.periodFilter);
    setProviderId(restoredState.providerId);
    setRankingCurrentPage(restoredState.rankingCurrentPage);
    setRankingPageSize(restoredState.rankingPageSize);
    setRankingRole(['requested', 'approved', 'performed'].includes(restoredState.rankingRole) ? restoredState.rankingRole : 'requested');
    setUnitId(restoredState.unitId);
  }, []);
  const handleRankingPaginationChange = useCallback((nextState: { currentPage: number; pageSize: number }) => {
    setRankingCurrentPage(nextState.currentPage);
    setRankingPageSize(nextState.pageSize);
  }, []);

  useWorkspaceNavigationMemory({
    moduleKey: 'expenses',
    tabKey: 'kpis',
    state: workspaceState,
    defaults: kpiWorkspaceDefaults,
    urlFields: kpiWorkspaceUrlFields,
    onRestore: restoreWorkspaceState,
  });

  const overview = useFinancialOverview({
    accountingAccountId,
    alertCopy: t.kpis.alertCopy,
    businessId,
    customEndDate,
    customStartDate,
    fallbackExpenses: expenses,
    fallbackProviders: providers,
    locale,
    paymentStatus,
    periodFilter,
    providerId,
    refreshKey: refreshKey + localRefresh,
    search,
    unitId,
  });
  const { sources } = overview;
  const validPeriod = periodFilter !== 'custom' || Boolean(customStartDate && customEndDate && customStartDate <= customEndDate);
  const monetaryEnabled = !overview.isLoading && validPeriod;
  const expenseSourceReady = !overview.fallbackWarnings.some(source => source === 'expenses' || source === 'overview');
  const budgetSourceReady = !overview.fallbackWarnings.some(source => source === 'budget lines' || source === 'budgets' || source === 'overview');
  const scopeKey = JSON.stringify([accountingAccountId, businessId, customEndDate, customStartDate, paymentStatus, periodFilter, providerId, search, unitId]);
  useEffect(() => { setRankingCurrentPage(1); }, [scopeKey, rankingRole]);
  useEffect(() => { if (providerId !== 'all' || accountingAccountId !== 'all' || paymentStatus !== 'all' || periodFilter === 'custom') setIsAdvancedFiltersOpen(true); }, [providerId, accountingAccountId, paymentStatus, periodFilter]);
  const displayMoney = (amount: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: preferredCurrency }).format(amount);
  const asLocalDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const periodFrom = asLocalDate(overview.periodRange.start);
  const periodTo = asLocalDate(overview.periodRange.end);
  const paymentIds = overview.paymentExpenses.map((expense) => expense.id);
  const filteredIds = overview.filteredExpenses.map((expense) => expense.id);
  const comparisonIds = overview.comparisonExpenses.map((expense) => expense.id);
  const allBudgetLineIds = overview.filteredBudgetLines
    .map((row) => getBudgetLineNumericId(row.id)).filter((id): id is number => id !== null);
  const coreQueries: KpiMonetaryBatchQuery[] = [
    { key: 'total', metric: 'EXPENSE_TOTAL', preferredCurrency, ids: filteredIds },
    { key: 'recognized', metric: 'EXPENSE_ACTUAL', preferredCurrency, ids: filteredIds },
    { key: 'paid', metric: 'EXPENSE_PAID', preferredCurrency, ids: paymentIds, from: periodFrom, to: periodTo },
    { key: 'cohortPaid', metric: 'EXPENSE_PAID_TO_DATE', preferredCurrency, ids: filteredIds },
    { key: 'balance', metric: 'EXPENSE_BALANCE', preferredCurrency, ids: filteredIds },
    { key: 'overdue', metric: 'EXPENSE_OVERDUE_BALANCE', preferredCurrency, ids: filteredIds },
    { key: 'previousTotal', metric: 'EXPENSE_TOTAL', preferredCurrency, ids: comparisonIds },
    { key: 'previousRecognized', metric: 'EXPENSE_ACTUAL', preferredCurrency, ids: comparisonIds },
    { key: 'previousPaid', metric: 'EXPENSE_PAID', preferredCurrency, ids: paymentIds, from: asLocalDate(overview.comparisonRange.start), to: asLocalDate(overview.comparisonRange.end) },
    { key: 'subtotal', metric: 'EXPENSE_SUBTOTAL', preferredCurrency, ids: filteredIds },
    { key: 'tax', metric: 'EXPENSE_TAX', preferredCurrency, ids: filteredIds },
    { key: 'plannedBudget', metric: 'BUDGET_PLANNED', preferredCurrency, ids: allBudgetLineIds },
    { key: 'committedBudget', metric: 'BUDGET_COMMITTED', preferredCurrency, ids: allBudgetLineIds },
    { key: 'actualBudget', metric: 'BUDGET_ACTUAL', preferredCurrency, ids: allBudgetLineIds },
    { key: 'availableBudget', metric: 'BUDGET_AVAILABLE', preferredCurrency, ids: allBudgetLineIds },
  ];
  const coreAggregates = useExpenseKpiAggregates(coreQueries, sources, monetaryEnabled);
  const core = (key: string) => ({ data: coreAggregates.data[key] ?? null, loading: coreAggregates.loading, error: coreAggregates.error });
  const totalAggregate = core('total'), recognizedAggregate = core('recognized'), paidAggregate = core('paid');
  const cohortPaidAggregate = core('cohortPaid'), balanceAggregate = core('balance'), overdueAggregate = core('overdue');
  const previousTotalAggregate = core('previousTotal'), previousRecognizedAggregate = core('previousRecognized'), previousPaidAggregate = core('previousPaid');
  const subtotalAggregate = core('subtotal'), taxAggregate = core('tax');
  const plannedBudgetAggregate = core('plannedBudget'), committedBudgetAggregate = core('committedBudget'), actualBudgetAggregate = core('actualBudget'), availableBudgetAggregate = core('availableBudget');
  const totalManaged = totalAggregate.data?.preferredTotal ?? 0;
  const pendingPayments = balanceAggregate.data?.preferredTotal ?? 0;
  const overdueAmount = overdueAggregate.data?.preferredTotal ?? 0;
  const plannedBudget = plannedBudgetAggregate.data?.preferredTotal ?? 0;
  const committedBudget = committedBudgetAggregate.data?.preferredTotal ?? 0;
  const actualBudget = actualBudgetAggregate.data?.preferredTotal ?? 0;
  const availableBudget = availableBudgetAggregate.data?.preferredTotal ?? 0;
  const expenseCount = overview.filteredExpenses.length;
  const budgetLineCount = overview.filteredBudgetLines.length;
  const punctuality = useMemo(() => paymentPunctuality(overview.filteredExpenses), [overview.filteredExpenses]);

  const periodOptions = [
    { label: t.periods.thisMonth, value: 'this_month' },
    { label: t.periods.lastMonth, value: 'last_month' },
    { label: t.periods.twoMonthsAgo, value: 'two_months_ago' },
    { label: t.periods.thisYear, value: 'this_year' },
    { label: t.periods.lastYear, value: 'last_year' },
    { label: t.periods.custom, value: 'custom' },
  ];
  const allOption = { label: t.common.all, value: 'all' };
  const activeBusinesses = unitId === 'all' ? sources.referenceData.businesses : sources.referenceData.businesses.filter(item => item.unitId === unitId);
  const monetaryGroups = useMemo(() => {
    const byStatus = new Map<string, FinanceExpense[]>();
    const byDate = new Map<string, FinanceExpense[]>();
    const byUnit = new Map<string, FinanceExpense[]>();
    const byRankingUser = new Map<string, FinanceExpense[]>();
    const byAging = new Map<string, FinanceExpense[]>();
    const byForecast = new Map<string, FinanceExpense[]>();
    const byProvider = new Map<string, FinanceExpense[]>();
    const byAccountingAccount = new Map<string, FinanceExpense[]>();
    const byBusiness = new Map<string, FinanceExpense[]>();
    const byPaymentAccount = new Map<string, FinanceExpense[]>();
    const today = overview.asOfDate;
    overview.filteredExpenses.forEach((expense) => {
      byStatus.set(expense.paymentStatus, [...(byStatus.get(expense.paymentStatus) ?? []), expense]);
      const date = expense.expenseDate.slice(0, 10);
      byDate.set(date, [...(byDate.get(date) ?? []), expense]);
      const unit = expense.unitId ?? 'unassigned';
      byUnit.set(unit, [...(byUnit.get(unit) ?? []), expense]);
      const provider = expense.providerId ?? 'missing-provider';
      byProvider.set(provider, [...(byProvider.get(provider) ?? []), expense]);
      const accountingAccount = expense.accountingAccountId ?? 'missing-account';
      byAccountingAccount.set(accountingAccount, [...(byAccountingAccount.get(accountingAccount) ?? []), expense]);
      const business = expense.businessId ?? 'missing-business';
      byBusiness.set(business, [...(byBusiness.get(business) ?? []), expense]);
      const paymentAccount = expense.paymentAccountId ?? 'missing-payment-account';
      byPaymentAccount.set(paymentAccount, [...(byPaymentAccount.get(paymentAccount) ?? []), expense]);
      const user = rankingRole === 'approved'
        ? expense.approvedByUserId ?? expense.approvedBy ?? 'unassigned'
        : rankingRole === 'performed'
          ? expense.performedByUserId ?? expense.performedBy ?? 'unassigned'
          : expense.requestedByUserId ?? expense.requestedBy ?? 'unassigned';
      byRankingUser.set(user, [...(byRankingUser.get(user) ?? []), expense]);
      if (isOpenExpense(expense) && today) {
        if (!expense.dueDate) {
          byAging.set('none', [...(byAging.get('none') ?? []), expense]);
        } else {
          const pastDays = daysAfter(today, expense.dueDate);
          const agingKey = pastDays <= 0 ? 'future' : pastDays <= 30 ? '1-30' : pastDays <= 60 ? '31-60' : pastDays <= 90 ? '61-90' : '91+';
          byAging.set(agingKey, [...(byAging.get(agingKey) ?? []), expense]);
          const futureDays = -pastDays;
          if (futureDays >= 0) [7, 15, 30, 60].forEach((days) => {
            if (futureDays <= days) byForecast.set(String(days), [...(byForecast.get(String(days)) ?? []), expense]);
          });
        }
      }
    });
    const topDates = expenseTrendWindows(overview.periodRange.start, overview.periodRange.end);
    const topUnits = Array.from(byUnit.entries());
    const topUsers = Array.from(byRankingUser.entries());
    return {
      byAccountingAccount,
      byAging,
      byBusiness,
      byDate,
      byForecast,
      byPaymentAccount,
      byProvider,
      byRankingUser,
      byStatus,
      byUnit,
      topDates,
      topUnits,
      topUsers,
    };
  }, [overview.filteredExpenses, overview.periodRange, overview.asOfDate, rankingRole]);
  const groupQueries = useMemo<KpiMonetaryBatchQuery[]>(() => {
    const queries: KpiMonetaryBatchQuery[] = [];
    monetaryGroups.byStatus.forEach((rows, status) => queries.push({ key: `status-${status}`, metric: 'EXPENSE_TOTAL', preferredCurrency, ids: rows.map((row) => row.id) }));
    monetaryGroups.topDates.forEach((window) => {
      const ids = overview.filteredExpenses.filter(row => row.expenseDate.slice(0, 10) >= window.from && row.expenseDate.slice(0, 10) <= window.to).map(row => row.id);
      queries.push({ key: `date-total-${window.from}`, metric: 'EXPENSE_TOTAL', preferredCurrency, ids });
      queries.push({ key: `date-paid-${window.from}`, metric: 'EXPENSE_PAID', preferredCurrency, ids: paymentIds, from: window.from, to: window.to });
    });
    monetaryGroups.topUnits.forEach(([unit, rows]) => queries.push({ key: `unit-${unit}`, metric: 'EXPENSE_TOTAL', preferredCurrency, ids: rows.map((row) => row.id) }));
    monetaryGroups.topUsers.forEach(([user, rows]) => {
      const ids = rows.map((row) => row.id);
      queries.push({ key: `user-total-${user}`, metric: 'EXPENSE_TOTAL', preferredCurrency, ids });
      queries.push({ key: `user-paid-${user}`, metric: 'EXPENSE_PAID_TO_DATE', preferredCurrency, ids });
      queries.push({ key: `user-overdue-${user}`, metric: 'EXPENSE_OVERDUE_BALANCE', preferredCurrency, ids });
    });
    monetaryGroups.byAging.forEach((rows, bucket) => queries.push({ key: `aging-${bucket}`, metric: 'EXPENSE_BALANCE', preferredCurrency, ids: rows.map((row) => row.id) }));
    monetaryGroups.byForecast.forEach((rows, bucket) => queries.push({ key: `forecast-${bucket}`, metric: 'EXPENSE_BALANCE', preferredCurrency, ids: rows.map((row) => row.id) }));
    return queries;
  }, [monetaryGroups, preferredCurrency, paymentIds]);
  const groupAggregates = useExpenseKpiAggregates(groupQueries, sources, monetaryEnabled);

  const driverGroups = useMemo(() => ({
    ACCOUNTING_ACCOUNT: Array.from(monetaryGroups.byAccountingAccount.entries()).sort((left, right) => right[1].length - left[1].length),
    BUSINESS: Array.from(monetaryGroups.byBusiness.entries()).sort((left, right) => right[1].length - left[1].length),
    PAYMENT_ACCOUNT: Array.from(monetaryGroups.byPaymentAccount.entries()).sort((left, right) => right[1].length - left[1].length),
    PROVIDER: Array.from(monetaryGroups.byProvider.entries()).sort((left, right) => right[1].length - left[1].length),
    UNIT: Array.from(monetaryGroups.byUnit.entries()).sort((left, right) => right[1].length - left[1].length),
  }), [monetaryGroups.byAccountingAccount, monetaryGroups.byBusiness, monetaryGroups.byPaymentAccount, monetaryGroups.byProvider, monetaryGroups.byUnit]);
  const driverQueries = useMemo<KpiMonetaryBatchQuery[]>(() => (
    (Object.entries(driverGroups) as Array<[keyof typeof driverGroups, Array<[string, FinanceExpense[]]>]>).flatMap(([type, groups]) => (
      groups.map(([id, rows]) => ({
        key: `driver-${type}-${id}`,
        metric: 'EXPENSE_TOTAL' as const,
        preferredCurrency,
        ids: rows.map((row) => row.id),
      }))
    ))
  ), [driverGroups, preferredCurrency]);
  const driverAggregates = useExpenseKpiAggregates(driverQueries, sources, monetaryEnabled);
  const driverNameMaps = useMemo(() => ({
    ACCOUNTING_ACCOUNT: new Map(sources.accountingAccounts.map((item) => [item.id, `${item.code} · ${item.name}`])),
    BUSINESS: new Map(sources.referenceData.businesses.map((item) => [item.id, item.name])),
    PAYMENT_ACCOUNT: new Map(sources.paymentAccounts.map((item) => [item.id, item.name])),
    PROVIDER: new Map(sources.providers.map((item) => [item.id, item.name])),
    UNIT: new Map(sources.referenceData.units.map((item) => [item.id, item.name])),
  }), [sources.accountingAccounts, sources.paymentAccounts, sources.providers, sources.referenceData.businesses, sources.referenceData.units]);
  const driverRows = useMemo<Record<FinancialOverviewCostDriverType, FinancialOverviewCostDriver[]>>(() => (
    Object.fromEntries((Object.entries(driverGroups) as Array<[FinancialOverviewCostDriverType, Array<[string, FinanceExpense[]]>]>).map(([type, groups]) => [
      type,
      groups.map(([id, rows]) => {
        const total = driverAggregates.data[`driver-${type}-${id}`]?.preferredTotal ?? 0;
        return {
          count: rows.length,
          currency: preferredCurrency,
          driverType: type,
          id,
          name: driverNameMaps[type].get(id) ?? t.common.unassigned,
          percentage: totalManaged > 0 ? (total / totalManaged) * 100 : 0,
          total,
        };
      }).filter((row) => row.total > 0).sort((left, right) => right.total - left.total),
    ])) as Record<FinancialOverviewCostDriverType, FinancialOverviewCostDriver[]>
  ), [driverAggregates.data, driverGroups, driverNameMaps, preferredCurrency, t.common.unassigned, totalManaged]);

  const visibleBudgetLines = overview.filteredBudgetLines;
  const budgetLineQueries = useMemo<KpiMonetaryBatchQuery[]>(() => visibleBudgetLines.flatMap((row) => {
    const id = getBudgetLineNumericId(row.id);
    if (id === null) return [];
    return [
      { key: `budget-planned-${row.id}`, metric: 'BUDGET_PLANNED', preferredCurrency, ids: [id] },
      { key: `budget-committed-${row.id}`, metric: 'BUDGET_COMMITTED', preferredCurrency, ids: [id] },
      { key: `budget-actual-${row.id}`, metric: 'BUDGET_ACTUAL', preferredCurrency, ids: [id] },
      { key: `budget-available-${row.id}`, metric: 'BUDGET_AVAILABLE', preferredCurrency, ids: [id] },
    ] satisfies KpiMonetaryBatchQuery[];
  }), [preferredCurrency, visibleBudgetLines]);
  const budgetLineAggregates = useExpenseKpiAggregates(budgetLineQueries, sources, monetaryEnabled);

  const paymentMix = useMemo(() => {
    const rows = [
      { color: '#147514', key: 'PAID', name: t.statuses.paid, value: 0 },
      { color: '#0ea5e9', key: 'PARTIALLY_PAID', name: t.statuses.partial, value: 0 },
      { color: '#f59e0b', key: 'UNPAID', name: t.statuses.pending, value: 0 },
      { color: '#f43f5e', key: 'OVERDUE', name: t.statuses.overdue, value: 0 },
    ];
    rows.forEach((row) => { row.value = groupAggregates.data[`status-${row.key}`]?.preferredTotal ?? 0; });
    return rows.filter(row => row.value > 0);
  }, [groupAggregates.data, t.statuses.overdue, t.statuses.paid, t.statuses.partial, t.statuses.pending]);

  const trendData = useMemo(() => {
    return monetaryGroups.topDates.map((window) => ({
      amount: groupAggregates.data[`date-total-${window.from}`]?.preferredTotal ?? 0,
      paid: groupAggregates.data[`date-paid-${window.from}`]?.preferredTotal ?? 0,
      date: new Intl.DateTimeFormat(locale, window.grain === 'day' ? { day: '2-digit', month: 'short' } : window.grain === 'month' ? { month: 'short', year: 'numeric' } : { year: 'numeric' }).format(new Date(`${window.from}T12:00:00`)),
    }));
  }, [groupAggregates.data, locale, monetaryGroups.topDates]);

  const unitNames = new Map(sources.referenceData.units.map((unit) => [unit.id, unit.name]));
  const unitData = monetaryGroups.topUnits.map(([unit, rows]) => ({ id: unit, name: unitNames.get(unit) ?? t.common.unassigned, count: rows.length, evidence: rows.filter(hasEvidence).length, open: rows.filter(isOpenExpense).length, total: completeAmount(groupAggregates.data[`unit-${unit}`]) })).sort((a, b) => (b.total ?? -Infinity) - (a.total ?? -Infinity));
  const budgetHealthRows = useMemo<FinancialOverviewBudgetHealthRow[]>(() => visibleBudgetLines.map((row) => {
    const planned = budgetLineAggregates.data[`budget-planned-${row.id}`]?.preferredTotal ?? 0;
    const committed = budgetLineAggregates.data[`budget-committed-${row.id}`]?.preferredTotal ?? 0;
    const actual = budgetLineAggregates.data[`budget-actual-${row.id}`]?.preferredTotal ?? 0;
    const available = budgetLineAggregates.data[`budget-available-${row.id}`]?.preferredTotal ?? 0;
    const consumed = planned - available;
    return {
      actual,
      available,
      budgetId: row.budgetId,
      committed,
      currency: preferredCurrency,
      healthStatus: row.healthStatus,
      id: row.id,
      name: row.name,
      planned,
      usagePercent: planned > 0 ? Math.max(0, (consumed / planned) * 100) : 0,
    };
  }).sort((left, right) => right.usagePercent - left.usagePercent), [budgetLineAggregates.data, preferredCurrency, visibleBudgetLines]);
  const agingData = useMemo(() => {
    return [
      { color: 'bg-emerald-500', key: 'future', label: 'Por vencer' },
      { color: 'bg-amber-400', key: '1-30', label: '1–30 días' },
      { color: 'bg-orange-500', key: '31-60', label: '31–60 días' },
      { color: 'bg-rose-500', key: '61-90', label: '61–90 días' },
      { color: 'bg-rose-700', key: '91+', label: 'Más de 90' },
      { color: 'bg-slate-400', key: 'none', label: 'Sin vencimiento' },
    ].map((bucket) => ({ ...bucket, total: groupAggregates.data[`aging-${bucket.key}`]?.preferredTotal ?? 0 }));
  }, [groupAggregates.data]);

  const cashForecast = useMemo(() => {
    return [7, 15, 30, 60].map((days) => ({ days, name: `${days} días`, total: groupAggregates.data[`forecast-${days}`]?.preferredTotal ?? 0 }));
  }, [groupAggregates.data]);

  const taxSummary = useMemo(() => {
    const subtotal = subtotalAggregate.data?.preferredTotal ?? 0;
    const taxes = taxAggregate.data?.preferredTotal ?? 0;
    return { effectiveRate: subtotal > 0 ? (taxes / subtotal) * 100 : 0, subtotal, taxes };
  }, [subtotalAggregate.data, taxAggregate.data]);

  const rankingRows = useMemo(() => {
    const usersById = new Map(sources.referenceData.users.map(user => [user.id, user.name]));
    const grouped = new Map<string, {
      count: number;
      evidence: number;
      name: string;
      overdue: number;
      paid: number;
      total: number;
    }>();
    overview.filteredExpenses.forEach((expense) => {
      const roleIdentity = rankingRole === 'approved'
        ? { id: expense.approvedByUserId, name: expense.approvedBy }
        : rankingRole === 'performed'
          ? { id: expense.performedByUserId, name: expense.performedBy }
          : { id: expense.requestedByUserId, name: expense.requestedBy };
      const key = roleIdentity.id || roleIdentity.name || 'unassigned';
      const row = grouped.get(key) ?? {
        count: 0,
        evidence: 0,
        name: usersById.get(roleIdentity.id ?? '') || roleIdentity.name || t.common.unassigned,
        overdue: 0,
        paid: 0,
        total: 0,
      };
      row.count += 1;
      row.evidence += (expense.attachmentCount ?? expense.attachments.length) > 0 ? 1 : 0;
      grouped.set(key, row);
    });
    const visibleUserIds = new Set(monetaryGroups.topUsers.map(([id]) => id));
    return Array.from(grouped.entries()).filter(([id]) => visibleUserIds.has(id)).map(([id, row]) => {
      const total = groupAggregates.data[`user-total-${id}`]?.preferredTotal ?? 0;
      const paid = groupAggregates.data[`user-paid-${id}`]?.preferredTotal ?? 0;
      const overdue = groupAggregates.data[`user-overdue-${id}`]?.preferredTotal ?? 0;
      const paidRatio = total > 0 ? paid / total : 0;
      const overdueRatio = total > 0 ? overdue / total : 0;
      const evidenceRatio = row.count > 0 ? row.evidence / row.count : 0;
      return {
        ...row,
        overdue,
        paid,
        total,
        evidenceRatio: evidenceRatio * 100,
        id,
        paymentRatio: paidRatio * 100,

      };
    }).sort((left, right) => right.overdue - left.overdue || right.total - left.total).map((row, index) => ({ ...row, position: index + 1 }));
  }, [groupAggregates.data, monetaryGroups.topUsers, overview.filteredExpenses, rankingRole, sources.referenceData.users]);

  const aggregateRequests = [
    totalAggregate,
    paidAggregate,
    cohortPaidAggregate,
    balanceAggregate,
    overdueAggregate,
    previousTotalAggregate,
    previousPaidAggregate,
    recognizedAggregate,
    previousRecognizedAggregate,
    subtotalAggregate,
    taxAggregate,
    plannedBudgetAggregate,
    committedBudgetAggregate,
    actualBudgetAggregate,
    availableBudgetAggregate,
  ];
  const monetaryDataLoading = aggregateRequests.some(request => request.loading)
    || groupAggregates.loading
    || driverAggregates.loading
    || budgetLineAggregates.loading;
  const monetaryDataError = aggregateRequests.some(request => Boolean(request.error))
    || Boolean(groupAggregates.error)
    || Boolean(driverAggregates.error)
    || Boolean(budgetLineAggregates.error);
  const monetaryDataPartial = aggregateRequests.some(request => Boolean(request.data?.partial))
    || [groupAggregates, driverAggregates, budgetLineAggregates].some(request => Object.values(request.data).some(item => item.partial));
  const displayAggregateMoney = (aggregate: { data: KpiMonetaryAggregate | null; error: Error | null; loading: boolean }, sourceReady = true) => (
    !sourceReady || aggregate.loading || aggregate.error || completeAmount(aggregate.data) === null ? '—' : displayMoney(aggregate.data!.preferredTotal)
  );
  const openExpenseCount = overview.filteredExpenses.filter(isOpenExpense).length;
  const overdueExpenseCount = overview.filteredExpenses.filter(expense => isOverdueExpense(expense, overview.asOfDate)).length;
  const resetFilters = () => {
    setSearch('');
    setPeriodFilter('this_month');
    setCustomStartDate('');
    setCustomEndDate('');
    setUnitId('all');
    setBusinessId('all');
    setProviderId('all');
    setAccountingAccountId('all');
    setPaymentStatus('all');
    setRankingCurrentPage(1);
    setIsAdvancedFiltersOpen(false);
  };
  const periodLabel = periodFilter === 'custom'
    ? `${customStartDate || '...'} - ${customEndDate || '...'}`
    : periodOptions.find(option => option.value === periodFilter)?.label ?? periodFilter;
  const activeAdvancedFilterCount = Number(providerId !== 'all') + Number(accountingAccountId !== 'all') + Number(paymentStatus !== 'all');
  const hasActiveFilters = Boolean(search) || periodFilter !== 'this_month'
    || unitId !== 'all'
    || businessId !== 'all'
    || paymentStatus !== 'all'
    || activeAdvancedFilterCount > 0;

  const comparison = (current: KpiMonetaryAggregate | null, previous: KpiMonetaryAggregate | null) => {
    const value = completeAmount(current), base = completeAmount(previous);
    if (value === null || base === null || base === 0) return copy.noBaseline;
    const change = (value - base) / Math.abs(base) * 100;
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1, signDisplay: 'always' }).format(change)}% ${copy.previous}`;
  };
  const groupReady = monetaryEnabled && expenseSourceReady && !groupAggregates.loading && !groupAggregates.error && !Object.values(groupAggregates.data).some(row => row.partial);
  const budgetReady = monetaryEnabled && budgetSourceReady && !budgetLineAggregates.loading && !budgetLineAggregates.error && !Object.values(budgetLineAggregates.data).some(row => row.partial);
  const driversReady = monetaryEnabled && expenseSourceReady && !driverAggregates.loading && !driverAggregates.error && !Object.values(driverAggregates.data).some(row => row.partial);
  const showControl = () => setActiveView('control');
  const metricCards = [
    { title: copy.captured, description: copy.capturedHelp, helper: `${expenseSourceReady ? expenseCount : '—'} ${copy.records} · ${expenseSourceReady ? comparison(totalAggregate.data, previousTotalAggregate.data) : copy.unavailable}`, value: displayAggregateMoney(totalAggregate, expenseSourceReady), icon: <CircleDollarSign />, onAction: showControl },
    { title: copy.recognized, description: copy.recognizedHelp, helper: `${expenseSourceReady ? overview.filteredExpenses.filter(isRecognizedExpense).length : '—'} ${copy.records} · ${expenseSourceReady ? comparison(recognizedAggregate.data, previousRecognizedAggregate.data) : copy.unavailable}`, value: displayAggregateMoney(recognizedAggregate, expenseSourceReady), icon: <ReceiptText />, onAction: showControl },
    { title: copy.paid, description: copy.paidHelp, helper: expenseSourceReady ? comparison(paidAggregate.data, previousPaidAggregate.data) : copy.unavailable, value: displayAggregateMoney(paidAggregate, expenseSourceReady), icon: <CheckCircle2 />, onAction: () => setActiveView('analysis') },
    { title: copy.outstanding, description: copy.outstandingHelp, helper: `${expenseSourceReady ? openExpenseCount : '—'} ${copy.records} · ${copy.current}`, value: displayAggregateMoney(balanceAggregate, expenseSourceReady), icon: <WalletCards />, onAction: () => { setPaymentStatus('OPEN'); showControl(); } },
    { title: copy.overdue, description: copy.overdueHelp, helper: `${expenseSourceReady && overview.asOfDate ? overdueExpenseCount : '—'} ${copy.records} · ${copy.current}`, value: displayAggregateMoney(overdueAggregate, expenseSourceReady && Boolean(overview.asOfDate)), icon: <AlertTriangle />, onAction: () => { setPaymentStatus('OVERDUE'); showControl(); } },
    { title: copy.punctuality, description: copy.punctualityHelp, helper: expenseSourceReady ? `${punctuality.onTime} / ${punctuality.count} ${copy.comparable}` : copy.unavailable, value: !expenseSourceReady ? '—' : punctuality.percent === null ? copy.noSample : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(punctuality.percent)}%`, progress: expenseSourceReady ? punctuality.percent ?? undefined : undefined, icon: <ClipboardCheck /> },
    { title: copy.available, description: copy.availableHelp, helper: `${budgetSourceReady ? budgetLineCount : '—'} ${copy.records} · ${t.kpis.planned}: ${displayAggregateMoney(plannedBudgetAggregate, budgetSourceReady)}`, value: !budgetSourceReady ? '—' : budgetLineCount ? displayAggregateMoney(availableBudgetAggregate) : copy.noData, icon: <Banknote />, onAction: () => setActiveView('analysis') },
    { title: copy.due30, description: copy.dueHelp, helper: `7 ${copy.days}: ${groupReady && overview.asOfDate ? displayMoney(cashForecast[0]?.total ?? 0) : '—'}`, value: groupReady && overview.asOfDate ? displayMoney(cashForecast[2]?.total ?? 0) : '—', icon: <CalendarClock />, onAction: () => setActiveView('analysis') },
  ];

  const pdfAlerts = useMemo<FinancialOverviewDataSet['alerts']>(() => {
    const alerts: FinancialOverviewDataSet['alerts'] = [];
    if (overdueExpenseCount > 0) {
      alerts.push({ id: 'overdue', tone: 'critical', ...t.kpis.alertCopy.overduePayments(overdueExpenseCount, displayMoney(overdueAmount)) });
    }
    if (openExpenseCount > 0) {
      alerts.push({ id: 'open', tone: 'warning', ...t.kpis.alertCopy.unpaidExpenses(openExpenseCount) });
    }
    const exceededBudgets = budgetHealthRows.filter(row => row.healthStatus === BudgetHealthStatus.EXCEEDED).length;
    const warningBudgets = budgetHealthRows.filter(row => row.healthStatus === BudgetHealthStatus.WARNING).length;
    if (exceededBudgets > 0) alerts.push({ id: 'budget-exceeded', tone: 'critical', ...t.kpis.alertCopy.budgetExceeded(exceededBudgets) });
    else if (warningBudgets > 0) alerts.push({ id: 'budget-warning', tone: 'warning', ...t.kpis.alertCopy.budgetWarning(warningBudgets) });
    if (totalAggregate.data?.partial && totalAggregate.data.excludedCurrencies.length > 0) {
      alerts.push({ id: 'currency-partial', tone: 'warning', ...t.kpis.alertCopy.multiCurrency(totalAggregate.data.excludedCurrencies.join(', '), preferredCurrency) });
    }
    if (budgetLineCount === 0 && (completeAmount(recognizedAggregate.data) ?? 0) > 0) {
      alerts.push({ id: 'no-budget', tone: 'warning', ...t.kpis.alertCopy.noBudget });
    }
    if (alerts.length === 0 && expenseSourceReady && expenseCount > 0) alerts.push({ id: 'healthy', tone: 'success', ...t.kpis.alertCopy.healthy });
    return alerts;
  }, [budgetHealthRows, budgetLineCount, displayMoney, expenseCount, expenseSourceReady, openExpenseCount, overdueAmount, overdueExpenseCount, preferredCurrency, recognizedAggregate.data, t.kpis.alertCopy, totalAggregate.data]);
  const concentrationRisks = useMemo<FinancialOverviewDataSet['concentrationRisks']>(() => (
    (['PROVIDER', 'ACCOUNTING_ACCOUNT', 'UNIT'] as const).flatMap(type => driverRows[type].slice(0, 1).map(row => ({
      driverType: type,
      id: row.id,
      name: row.name,
      percentage: row.percentage,
      tone: row.percentage >= 50 ? 'critical' as const : row.percentage >= 35 ? 'warning' as const : 'info' as const,
      total: row.total,
    }))).filter(row => row.percentage >= 25)
  ), [driverRows]);
  const overviewForPdf = useMemo<FinancialOverviewDataSet>(() => ({
    ...overview,
    alerts: pdfAlerts,
    budgetHealthRows,
    cashRequirements: [
      { amount: cashForecast[0]?.total ?? 0, count: monetaryGroups.byForecast.get('7')?.length ?? 0, description: t.kpis.cashRequirementCopy.due7.description, id: 'due7', label: t.kpis.cashRequirementCopy.due7.label, tone: 'warning' },
      { amount: cashForecast[2]?.total ?? 0, count: monetaryGroups.byForecast.get('30')?.length ?? 0, description: t.kpis.cashRequirementCopy.due30.description, id: 'due30', label: t.kpis.cashRequirementCopy.due30.label, tone: 'info' },
      { amount: overdueAmount, count: overdueExpenseCount, description: t.kpis.cashRequirementCopy.overdue.description, id: 'overdue', label: t.kpis.cashRequirementCopy.overdue.label, tone: 'critical' },
      { amount: pendingPayments, count: openExpenseCount, description: t.kpis.cashRequirementCopy.pending.description, id: 'pending', label: t.kpis.cashRequirementCopy.pending.label, tone: 'info' },
    ],
    concentrationRisks,
    costDrivers: driverRows,
    currency: preferredCurrency,
    metrics: {
      ...overview.metrics,
      actual: actualBudget,
      actualFallbackUsed: false,
      available: availableBudget,
      budgetLineCount,
      committed: committedBudget,
      dueIn7Days: cashForecast[0]?.total ?? 0,
      dueIn30Days: cashForecast[2]?.total ?? 0,
      expenseCount,
      overdueAmount,
      overdueExpenseCount,
      pendingPayments,
      planned: plannedBudget,
      unpaidExpenseCount: openExpenseCount,
    },
  }), [
    actualBudget,
    availableBudget,
    budgetHealthRows,
    budgetLineCount,
    cashForecast,
    committedBudget,
    concentrationRisks,
    driverRows,
    expenseCount,
    monetaryGroups.byForecast,
    openExpenseCount,
    overdueAmount,
    overdueExpenseCount,
    overview,
    pdfAlerts,
    pendingPayments,
    plannedBudget,
    preferredCurrency,
    t.kpis.cashRequirementCopy,
  ]);

  const printBlocked = !validPeriod || !isCompanyPrintIdentityReady || overview.isLoading || monetaryDataLoading || monetaryDataError || monetaryDataPartial || overview.fallbackWarnings.length > 0 || !overview.asOfDate;
  const providerNames = new Map(sources.providers.map(row => [row.id, row.name]));
  const statusLabels = { PAID: t.statuses.paid, PARTIALLY_PAID: t.statuses.partial, UNPAID: t.statuses.pending, OVERDUE: t.statuses.overdue };
  const reportTables = [
    { title: copy.overview, columns: [copy.details, copy.nativeAmount, copy.controls], rows: metricCards.map(row => [row.title, row.value, `${row.helper}. ${row.description}`]) },
    { title: copy.responsible, columns: [copy.responsible, copy.records, copy.captured, copy.paymentProgress, copy.evidence, copy.overdue], rows: rankingRows.map(row => [row.name, String(row.count), displayMoney(row.total), row.total > 0 ? `${row.paymentRatio.toFixed(1)}%` : '—', `${row.evidenceRatio.toFixed(1)}%`, displayMoney(row.overdue)]) },
    { title: copy.expenses, columns: [copy.folio, copy.dueDate, copy.nativeAmount, copy.balance, copy.status], rows: overview.filteredExpenses.map(row => [row.folio || row.concept || row.description, row.dueDate || '—', new Intl.NumberFormat(locale, { style: 'currency', currency: row.currency, currencyDisplay: 'code' }).format(row.total), new Intl.NumberFormat(locale, { style: 'currency', currency: row.currency, currencyDisplay: 'code' }).format(row.balance), statusLabels[row.paymentStatus]]) },
  ];
  const titleActions = <>
    <button type="button" disabled={overview.isLoading || monetaryDataLoading} onClick={() => setLocalRefresh(value => value + 1)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#147514]/20 bg-white px-4 text-sm font-medium text-[#147514] disabled:opacity-50 dark:bg-slate-900 dark:text-emerald-300"><RefreshCw className="h-4 w-4" />{copy.refresh}</button>
    <button type="button" disabled={printBlocked} title={copy.report} onClick={() => void downloadFinancialOverviewPdf({ companyIdentity: companyPrintIdentity, copy: t, locale, overview: overviewForPdf, periodLabel, workspaceTables: reportTables, scopeNotes: `${copy.context} ${copy.budgetScope} ${copy.cutoff}: ${overview.asOfDate} (${overview.timeZone}). ${copy.responsibilityHelp}` })} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#147514] px-4 text-sm font-medium text-white disabled:opacity-50"><Printer className="h-4 w-4" />{t.kpis.printPdf}</button>
  </>;
  return <div className="grid min-w-0 grid-cols-1 gap-6">
    <IndiceTitleBar actions={titleActions} icon={<BarChart3 className="h-5 w-5" />} subtitle={t.kpis.headerSubtitle} title={t.kpis.headerTitle} tone="green" className="mb-0" />
    <IndiceWorkspaceNavigation variant="views" tone="green" ariaLabel={copy.views} value={activeView} onValueChange={id => setActiveView(resolveExpenseKpiView(id))} items={[
      { id: 'overview', label: copy.overview, icon: <LayoutGrid className="h-4 w-4" /> },
      { id: 'analysis', label: copy.analysis, icon: <TrendingUp className="h-4 w-4" /> },
      { id: 'units', label: copy.units, icon: <Building2 className="h-4 w-4" /> },
      { id: 'control', label: copy.control, icon: <ClipboardCheck className="h-4 w-4" /> },
    ]} />
    <IndiceFilterBar gridClassName="lg:grid-cols-4" title={t.filters.title} summary={<IndiceFilterDisclosureActions activeAdvancedCount={activeAdvancedFilterCount} advancedLabel={isAdvancedFiltersOpen ? t.common.hideMoreFilters : t.common.moreFilters} clearLabel={t.common.clearFilters} hasActiveFilters={hasActiveFilters} isAdvancedOpen={isAdvancedFiltersOpen} onClear={resetFilters} onToggleAdvanced={() => setIsAdvancedFiltersOpen(value => !value)} tone="green" />}>
      <IndiceFilterField label={copy.search}><input value={search} onChange={event => setSearch(event.target.value)} placeholder={copy.searchHelp} className={getIndiceFilterControlClassName('green')} /></IndiceFilterField>
      <IndiceFilterSelect label={t.filters.unit} value={unitId} onValueChange={value => { setUnitId(value); setBusinessId('all'); }} options={[allOption, ...sources.referenceData.units.map(item => ({ label: item.name, value: item.id }))]} tone="green" />
      <IndiceFilterSelect label={t.filters.business} value={businessId} onValueChange={setBusinessId} options={[allOption, ...activeBusinesses.map(item => ({ label: item.name, value: item.id }))]} tone="green" />
      <IndiceFilterSelect label={t.filters.period} value={periodFilter} onValueChange={value => { setPeriodFilter(value as PeriodFilter); if (value === 'custom') { setCustomStartDate(customStartDate || periodFrom); setCustomEndDate(customEndDate || periodTo); } }} options={periodOptions} tone="green" />
      {isAdvancedFiltersOpen ? <IndiceFilterAdvancedSection className="md:col-span-2 lg:col-span-4" gridClassName="xl:grid-cols-3">
        <IndiceFilterSelect label={t.filters.status} value={paymentStatus} onValueChange={setPaymentStatus} options={[allOption, { label: t.kpis.pending, value: 'OPEN' }, { label: t.statuses.paid, value: 'PAID' }, { label: t.statuses.partial, value: 'PARTIALLY_PAID' }, { label: t.statuses.pending, value: 'UNPAID' }, { label: t.statuses.overdue, value: 'OVERDUE' }]} tone="green" />
        <IndiceFilterSelect label={t.filters.provider} value={providerId} onValueChange={setProviderId} options={[allOption, ...sources.providers.map(item => ({ label: item.name, value: item.id }))]} tone="green" />
        <IndiceFilterSelect label={t.budgets.filters.accountingAccount} value={accountingAccountId} onValueChange={setAccountingAccountId} options={[allOption, ...sources.accountingAccounts.map(item => ({ label: `${item.code} · ${item.name}`, value: item.id }))]} tone="green" />
        {periodFilter === 'custom' ? <>
          <IndiceFilterField label={copy.from}><input type="date" value={customStartDate} onChange={event => setCustomStartDate(event.target.value)} className={getIndiceFilterControlClassName('green')} /></IndiceFilterField>
          <IndiceFilterField label={copy.to}><input type="date" value={customEndDate} onChange={event => setCustomEndDate(event.target.value)} className={getIndiceFilterControlClassName('green')} /></IndiceFilterField>
        </> : null}
      </IndiceFilterAdvancedSection> : null}
    </IndiceFilterBar>
    {!validPeriod ? <p role="status" className="text-sm text-amber-700 dark:text-amber-300">{copy.invalidPeriod}</p> : null}
    <div className="space-y-2 text-xs leading-5 text-slate-500 dark:text-slate-400"><p>{copy.context}</p>{overview.asOfDate ? <p>{copy.cutoff}: {overview.asOfDate} · {overview.timeZone} · {periodLabel}</p> : null}<details><summary className="cursor-pointer">{copy.budget}</summary><p>{copy.budgetScope}</p></details></div>
    {overview.errorMessage || overview.fallbackWarnings.length > 0 || monetaryDataError ? <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{copy.sourceWarning}</div> : null}
    {!overview.isLoading && !overview.asOfDate ? <p role="status" className="text-sm text-amber-700 dark:text-amber-300">{copy.cutoffMissing}</p> : null}
    <OperationalKpiCurrencyStrip context={{ preferredCurrency,
      nativeBreakdown: totalAggregate.data?.nativeTotals.map(({ amount, currency }) => new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'code' }).format(amount)).join(' / ') || overview.currencies.join(' / ') || preferredCurrency,
      rateLabel: totalAggregate.data?.exchangeRate.mode === 'daily' || totalAggregate.data?.exchangeRate.mode === 'configured' ? currencyCopy.dailyRate : currencyCopy.unavailable,
      effectiveDate: totalAggregate.data?.exchangeRate.effectiveDate, source: totalAggregate.data?.exchangeRate.source,
      isPartial: monetaryDataPartial || monetaryDataError, excludedCount: (totalAggregate.data?.excludedRecords ?? 0) + (plannedBudgetAggregate.data?.excludedRecords ?? 0), labels: currencyCopy,
    }} />
    {overview.isLoading ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">{Array.from({ length: activeView === 'overview' ? 8 : 4 }, (_, index) => <div key={index} className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}</div> : null}
    {activeView === 'overview' && !overview.isLoading ? <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{metricCards.map(card => <MetricCard key={card.title} {...card} actionLabel={copy.details} />)}</section> : null}
    <div hidden={activeView !== 'analysis' || overview.isLoading}>
      <ExpenseKpiAnalysis active={activeView === 'analysis' && !overview.isLoading} copy={copy} money={displayMoney} groupReady={groupReady} budgetReady={budgetReady} taxReady={expenseSourceReady && monetaryEnabled && !coreAggregates.loading && !coreAggregates.error && completeAmount(taxAggregate.data) !== null && completeAmount(subtotalAggregate.data) !== null} driverReady={driversReady} hasCutoff={Boolean(overview.asOfDate)} paymentMix={paymentMix} trend={trendData} budgetRows={budgetHealthRows} budgetLabels={{ planned: t.kpis.planned, committed: t.kpis.committed, actual: t.kpis.actual, available: t.kpis.available }} aging={agingData} forecast={cashForecast} tax={taxSummary} drivers={[
        { key: 'provider', title: t.kpis.topCostDrivers.providers, rows: driverRows.PROVIDER },
        { key: 'account', title: t.kpis.topCostDrivers.accountingAccounts, rows: driverRows.ACCOUNTING_ACCOUNT },
        { key: 'business', title: t.kpis.topCostDrivers.businesses, rows: driverRows.BUSINESS },
      ]} onDriver={(key, id) => { if (key === 'provider') setProviderId(id); else if (key === 'account') setAccountingAccountId(id); else setBusinessId(id); setIsAdvancedFiltersOpen(true); }} />
    </div>
    <div hidden={activeView !== 'units' || overview.isLoading}><ExpenseKpiUnits active={activeView === 'units' && !overview.isLoading} rows={unitData} ready={groupReady} money={displayMoney} copy={copy} resetKey={scopeKey} onSelect={id => { setUnitId(id); setBusinessId('all'); }} /></div>
    <div hidden={activeView !== 'control' || overview.isLoading}><ExpenseKpiControl expenses={overview.filteredExpenses} responsibleRows={rankingRows} responsibleReady={groupReady} copy={copy} money={displayMoney} locale={locale} asOfDate={overview.asOfDate} resetKey={scopeKey} role={rankingRole} setRole={setRankingRole} paginationState={{ currentPage: rankingCurrentPage, pageSize: rankingPageSize }} onPaginationChange={handleRankingPaginationChange} providerNames={providerNames} statusLabels={statusLabels} /></div>
  </div>;

}
