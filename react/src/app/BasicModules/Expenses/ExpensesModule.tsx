import { lazy, Suspense, useState } from 'react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useGastosTranslations } from '../../hooks/useGastosTranslations';
import { useDeferredTabChange } from '../../hooks/useDeferredTabChange';
import { mockExpenses } from './data/expenses.mock';
import type { Expense } from './types/expenses.types';
import { generateProjectedBudgetEntries } from './Budgets/budgetUtils';
import { mockProviderRecords, type ProviderRecord } from './Providers/useProveedoresLogic';

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

export default function ExpensesModule({ onNavigate }: ExpensesModuleProps) {
  const t = useGastosTranslations();
  const [activeTab, setActiveTab] = useState<TabId>('expenses');
  const [providers, setProviders] = useState<ProviderRecord[]>(mockProviderRecords);
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    [
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
    ],
  );
  const { changeTab, isTabLoading } = useDeferredTabChange<TabId>(activeTab, setActiveTab);

  const tabs = [
    { id: 'expenses' as TabId, label: t.tabs.gastos, emoji: '💰' },
    { id: 'budgets' as TabId, label: t.tabs.presupuestos, emoji: '📋' },
    { id: 'providers' as TabId, label: t.tabs.proveedores, emoji: '🏢' },
    { id: 'accounting' as TabId, label: t.tabs.accountingAccounts, emoji: '📊' },
    { id: 'payment_accounts' as TabId, label: t.tabs.paymentAccounts, emoji: '💳' },
    { id: 'kpis' as TabId, label: t.tabs.kpis, emoji: '📊' },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'budgets':
        return <Budgets expenses={expenses} onExpensesChange={setExpenses} />;
      case 'providers':
        return <Providers providers={providers} onProvidersChange={setProviders} />;
      case 'kpis':
        return <KPIs expenses={expenses} providers={providers} />;
      case 'accounting':
        return <AccountingAccounts />;
      case 'payment_accounts':
        return <PaymentAccounts onNavigate={onNavigate} />;
      case 'expenses':
      default:
        return <Expenses expenses={expenses} onExpensesChange={setExpenses} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <LoadingBarOverlay
        isVisible={isTabLoading}
        title="Loading expenses tab"
        description="Opening the selected expenses workspace."
      />

      {/* Module Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Favorites Bar */}
          <FavoritesBar 
            onNavigate={(page) => {
              if (page === 'gastos') return; // Already here
              onNavigate(page);
            }} 
            currentModule="gastos" 
          />
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {t.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t.subtitle}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => onNavigate()}
              className="text-sm gap-2"
            >
              <span className="text-lg">🏠</span> {t.back}
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => changeTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
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
      <div className="max-w-[1600px] mx-auto px-8 py-6">
        <Suspense
          fallback={(
            <LoadingBarOverlay
              isVisible
              title="Loading expenses tab"
              description="Downloading only the selected expenses workspace."
            />
          )}
        >
          {renderActiveTab()}
        </Suspense>
      </div>
    </div>
  );
}
