import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { FailureToast } from '../../components/FailureToast';
import { FavoritesBar } from '../../components/FavoritesBar';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { mockExpenses } from './data/expenses.mock';
import { mockProviderRecords } from './data/providerRecords.mock';
import { budgetLinesService, expensesService, providersService, toFinanceApiErrorMessage } from './services';
import { useExpensesModuleTranslations } from './hooks/useExpensesModuleTranslations';
import type { Expense } from './types/expenses.types';
import { generateProjectedBudgetEntries } from './Budgets/budgetUtils';
import type { ProviderRecord } from './Providers/useProveedoresLogic';

const Expenses = lazy(() => import('./Expenses'));
const Budgets = lazy(() => import('./Budgets'));
const Providers = lazy(() => import('./Providers'));
const KPIs = lazy(() => import('./KPIs'));
const AccountingAccounts = lazy(() => import('./AccountingAccounts'));
const PaymentAccounts = lazy(() => import('./PaymentAccounts'));

interface ExpensesModuleProps {
  onNavigate: (page?: string) => void;
}

type TabId = 'expenses' | 'budgets' | 'providers' | 'kpis' | 'accounting' | 'payment_accounts';

const expenseTabIds = [
  'expenses',
  'budgets',
  'providers',
  'accounting',
  'payment_accounts',
  'kpis',
] as const satisfies readonly TabId[];

const legacyExpenseTabAliases: Partial<Record<string, TabId>> = {
  gastos: 'expenses',
  presupuestos: 'budgets',
  proveedores: 'providers',
  contabilidad: 'accounting',
  cuentas_contables: 'accounting',
  cuentasPago: 'payment_accounts',
  cuentas_pago: 'payment_accounts',
};

const createInitialExpenseState = () => [
  ...mockExpenses.map(expense => ({
    ...expense,
    projected: expense.projected ?? false,
    type: expense.type ?? 'real',
  })),
  ...generateProjectedBudgetEntries({
    businessUnit: 'Operations',
    business: 'Restaurante',
    concept: 'Monthly cleaning supplies budget',
    description: 'Projected recurring spend for cleaning and hygiene supplies.',
    duration: 4,
    frequency: 'monthly',
    amount: 2750,
    providerId: 'provider-6',
    providerName: 'Clean & Shine Services',
    startDate: new Date(2026, 5, 1),
    taxes: 450,
    total: 3200,
  }, mockExpenses.length),
  ...generateProjectedBudgetEntries({
    businessUnit: 'IT',
    business: 'Hotel',
    concept: 'Quarterly software renewals budget',
    description: 'Forecast for SaaS tools and operational subscriptions.',
    duration: 3,
    frequency: 'quarterly',
    amount: 3900,
    providerId: 'provider-2',
    providerName: 'Tech Solutions LLC',
    startDate: new Date(2026, 6, 15),
    taxes: 600,
    total: 4500,
  }, mockExpenses.length + 4),
];

export default function ExpensesModule({ onNavigate }: ExpensesModuleProps) {
  const t = useExpensesModuleTranslations();
  const { activeTab, isTabLoading, setActiveTab } = useRoutedModuleTab<TabId>(
    'expenses',
    expenseTabIds,
    legacyExpenseTabAliases,
  );
  const [providers, setProviders] = useState<ProviderRecord[]>(mockProviderRecords);
  const [expenses, setExpenses] = useState<Expense[]>(createInitialExpenseState);
  const [isFinanceDataLoading, setIsFinanceDataLoading] = useState(false);
  const [financeRefreshKey, setFinanceRefreshKey] = useState(0);
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const tabs = [
    { id: 'expenses' as TabId, label: t.module.tabs.expenses, emoji: '💰' },
    { id: 'budgets' as TabId, label: t.module.tabs.budgets, emoji: '📋' },
    { id: 'providers' as TabId, label: t.module.tabs.providers, emoji: '🏢' },
    { id: 'accounting' as TabId, label: t.module.tabs.accountingAccounts, emoji: '📊' },
    { id: 'payment_accounts' as TabId, label: t.module.tabs.paymentAccounts, emoji: '💳' },
    { id: 'kpis' as TabId, label: t.module.tabs.kpis, emoji: '📊' },
  ];

  useEffect(() => {
    let isMounted = true;
    const fallbackExpenses = createInitialExpenseState();

    const loadFinanceData = async () => {
      setIsFinanceDataLoading(true);
      let nextProviders = mockProviderRecords;
      let nextFailureMessage = '';

      try {
        nextProviders = await providersService.getProviderRecords();
      } catch (error) {
        nextFailureMessage = toFinanceApiErrorMessage(error);
      }

      const [expenseResult, budgetResult] = await Promise.allSettled([
        expensesService.getExpenses(nextProviders),
        budgetLinesService.getBudgetExpenses(),
      ]);

      if (!isMounted) return;

      const nextRealExpenses = expenseResult.status === 'fulfilled'
        ? expenseResult.value
        : fallbackExpenses.filter(expense => expense.type !== 'budget');
      const nextBudgetExpenses = budgetResult.status === 'fulfilled'
        ? budgetResult.value
        : fallbackExpenses.filter(expense => expense.type === 'budget');

      if (expenseResult.status === 'rejected') {
        nextFailureMessage = toFinanceApiErrorMessage(expenseResult.reason);
      } else if (budgetResult.status === 'rejected') {
        nextFailureMessage = toFinanceApiErrorMessage(budgetResult.reason);
      }

      setProviders(nextProviders);
      setExpenses([...nextRealExpenses, ...nextBudgetExpenses]);
      setFailureToastMessage(nextFailureMessage);
      setIsFinanceDataLoading(false);
    };

    loadFinanceData().catch((error) => {
      if (!isMounted) return;
      setFailureToastMessage(toFinanceApiErrorMessage(error));
      setIsFinanceDataLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const requestFinanceDataRefresh = useCallback(() => {
    setFinanceRefreshKey(currentKey => currentKey + 1);
  }, []);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'budgets':
        return <Budgets expenses={expenses} providers={providers} onExpensesChange={setExpenses} />;
      case 'providers':
        return <Providers providers={providers} onProvidersChange={setProviders} />;
      case 'kpis':
        return <KPIs expenses={expenses} providers={providers} refreshKey={financeRefreshKey} />;
      case 'accounting':
        return <AccountingAccounts />;
      case 'payment_accounts':
        return <PaymentAccounts onNavigate={onNavigate} refreshKey={financeRefreshKey} />;
      case 'expenses':
      default:
        return (
          <Expenses
            expenses={expenses}
            providers={providers}
            onExpensesChange={setExpenses}
            onFinanceDataChanged={requestFinanceDataRefresh}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <LoadingBarOverlay
        isVisible={isTabLoading}
        title={t.module.loadingTabTitle}
        description={t.module.loadingTabDescription}
      />
      <LoadingBarOverlay
        isVisible={isFinanceDataLoading}
        title={t.module.loadingFinanceTitle}
        description={t.module.loadingFinanceDescription}
      />
      <FailureToast
        isVisible={Boolean(failureToastMessage)}
        message={failureToastMessage}
        onClose={() => setFailureToastMessage('')}
      />

      {/* Module Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-5 dark:border-gray-700 dark:bg-gray-800 sm:px-6 lg:px-8 lg:py-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Favorites Bar */}
          <FavoritesBar 
            onNavigate={(page) => {
              if (page === 'expenses') return;
              onNavigate(page);
            }} 
            currentModule="expenses" 
          />
          
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                {t.module.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t.module.subtitle}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => onNavigate()}
              className="w-full gap-2 text-sm sm:w-auto"
            >
              <span className="text-lg">🏠</span> {t.module.back}
            </Button>
          </div>

          {/* Tabs */}
          <div className="-mx-4 mt-4 flex snap-x items-center gap-2 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex snap-start items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-[#147514] text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Tab Content */}
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <Suspense
          fallback={(
            <LoadingBarOverlay
              isVisible
              title={t.module.loadingTabTitle}
              description={t.module.loadingTabDescription}
            />
          )}
        >
          {renderActiveTab()}
        </Suspense>
      </div>
    </div>
  );
}
