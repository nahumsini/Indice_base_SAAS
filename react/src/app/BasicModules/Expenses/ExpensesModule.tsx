import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { FailureToast } from '../../components/FailureToast';
import { IndiceModuleShell } from '../../components/frontend-os';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { mockExpenses } from './data/expenses.mock';
import { mockProviderRecords } from './data/providerRecords.mock';
import { budgetLinesService, expensesService, providersService, toFinanceApiErrorMessage } from './services';
import { useExpensesModuleTranslations } from './hooks/useExpensesModuleTranslations';
import type { Expense } from './types/expenses.types';
import { generateProjectedBudgetEntries } from './Budgets/budgetUtils';
import type { ProviderRecord } from './Providers/useProveedoresLogic';
import {
  LearningModeHeaderActionsProvider,
  learningModeGuideThemes,
  SimpleModuleLearningGuide,
} from '../../learningMode';
import {
  expensesLearningControls,
  expensesLearningLabels,
} from './operationalGuidance/expensesLearningControls';

const Expenses = lazy(() => import('./Expenses'));
const Budgets = lazy(() => import('./Budgets'));
const Providers = lazy(() => import('./Providers'));
const KPIs = lazy(() => import('./KPIs'));
const AccountingAccounts = lazy(() => import('./AccountingAccounts'));
const PaymentAccounts = lazy(() => import('./PaymentAccounts'));

interface ExpensesModuleProps {
  learningModeActive?: boolean;
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

export default function ExpensesModule({ learningModeActive = false, onNavigate }: ExpensesModuleProps) {
  const t = useExpensesModuleTranslations();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const { activeTab, isTabLoading, setActiveTab } = useRoutedModuleTab<TabId>(
    'expenses',
    expenseTabIds,
    legacyExpenseTabAliases,
  );
  const [providers, setProviders] = useState<ProviderRecord[]>(mockProviderRecords);
  const [expenses, setExpenses] = useState<Expense[]>(createInitialExpenseState);
  const [budgetLoadError, setBudgetLoadError] = useState('');
  const [isFinanceDataLoading, setIsFinanceDataLoading] = useState(false);
  const [financeRefreshKey, setFinanceRefreshKey] = useState(0);
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const tabs = [
    { id: 'expenses' as TabId, label: t.module.tabs.expenses, emoji: '💸' },
    { id: 'budgets' as TabId, label: t.module.tabs.budgets, emoji: '📋' },
    { id: 'providers' as TabId, label: t.module.tabs.providers, emoji: '🏢' },
    { id: 'accounting' as TabId, label: t.module.tabs.accountingAccounts, emoji: '📚' },
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
      const nextBudgetLoadError = budgetResult.status === 'rejected'
        ? toFinanceApiErrorMessage(budgetResult.reason)
        : '';

      if (expenseResult.status === 'rejected') {
        nextFailureMessage = toFinanceApiErrorMessage(expenseResult.reason);
      } else if (budgetResult.status === 'rejected') {
        nextFailureMessage = toFinanceApiErrorMessage(budgetResult.reason);
      }

      setProviders(nextProviders);
      setExpenses([...nextRealExpenses, ...nextBudgetExpenses]);
      setBudgetLoadError(nextBudgetLoadError);
      setFailureToastMessage(nextFailureMessage);
      setIsFinanceDataLoading(false);
    };

    loadFinanceData().catch((error) => {
      if (!isMounted) return;
      const message = toFinanceApiErrorMessage(error);
      setBudgetLoadError(message);
      setFailureToastMessage(message);
      setIsFinanceDataLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [financeRefreshKey]);

  const requestFinanceDataRefresh = useCallback(() => {
    setFinanceRefreshKey(currentKey => currentKey + 1);
  }, []);

  const handleGuidePrimaryAction = () => {
    mainContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'budgets':
        return (
          <Budgets
            expenses={expenses}
            loadError={budgetLoadError}
            onProvidersChange={setProviders}
            providers={providers}
            onExpensesChange={setExpenses}
            onRetryLoad={requestFinanceDataRefresh}
          />
        );
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
            onProvidersChange={setProviders}
            providers={providers}
            onExpensesChange={setExpenses}
            onFinanceDataChanged={requestFinanceDataRefresh}
          />
        );
    }
  };

  return (
    <LearningModeHeaderActionsProvider active={learningModeActive}>
      <IndiceModuleShell
        activeTab={activeTab}
        backLabel={t.module.back}
        contentRef={mainContentRef}
        currentModule="expenses"
        guide={learningModeActive ? (
          <SimpleModuleLearningGuide
            activeContextLabel={expensesLearningLabels[activeTab]}
            controls={expensesLearningControls[activeTab]}
            guideId="expenses-learning-guide"
            moduleTitle={t.module.title}
            onPrimaryAction={handleGuidePrimaryAction}
            scopeId={`expenses-${activeTab}`}
            theme={learningModeGuideThemes.finance}
          />
        ) : undefined}
        loadingOverlay={(
          <>
            <LoadingBarOverlay isVisible={isTabLoading} title={t.module.loadingTabTitle} description={t.module.loadingTabDescription} />
            <LoadingBarOverlay isVisible={isFinanceDataLoading} title={t.module.loadingFinanceTitle} description={t.module.loadingFinanceDescription} />
            <FailureToast isVisible={Boolean(failureToastMessage)} message={failureToastMessage} onClose={() => setFailureToastMessage('')} />
          </>
        )}
        onNavigate={onNavigate}
        onTabChange={setActiveTab}
        subtitle={t.module.subtitle}
        tabs={tabs.map(tab => ({ id: tab.id, label: tab.label, icon: tab.emoji }))}
        title={t.module.title}
        tone="green"
      >
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
      </IndiceModuleShell>
    </LearningModeHeaderActionsProvider>
  );
}
