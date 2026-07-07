import type { ReactNode } from 'react';
import { BarChart3, ClipboardCheck, Home, WalletCards } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { PettyCashFinancialViewWorkspace } from './components/PettyCashFinancialViewWorkspace';
import { PettyCashFundsWorkspace } from './components/PettyCashFundsWorkspace';
import { PettyCashReconciliationWorkspace } from './components/PettyCashReconciliationWorkspace';
import { usePettyCash } from './context/PettyCashContext';
import { usePettyCashTranslations } from './hooks/usePettyCashTranslations';

interface CajaChicaProps {
  onNavigate: (page?: string) => void;
}

const pettyCashTabIds = [
  'cash',
  'control',
  'kpis',
] as const;

type PettyCashTabId = (typeof pettyCashTabIds)[number];

const legacyPettyCashTabAliases: Partial<Record<string, PettyCashTabId>> = {
  caja: 'cash',
};

export default function CajaChica({ onNavigate }: CajaChicaProps) {
  const copy = usePettyCashTranslations();
  const {
    pettyCashFunds,
    pettyCashMovements,
    pettyCashSettlementLines,
    pettyCashStatements,
    setPettyCashFunds,
    setPettyCashMovements,
    setPettyCashSettlementLines,
    setPettyCashStatements,
  } = usePettyCash();
  const { activeTab, isTabLoading, setActiveTab } = useRoutedModuleTab<PettyCashTabId>(
    'cash',
    pettyCashTabIds,
    legacyPettyCashTabAliases,
  );

  const tabs: Array<{ id: PettyCashTabId; label: string; icon: ReactNode }> = [
    { id: 'cash', label: copy.shell.tabs.cash, icon: <WalletCards className="h-4 w-4" /> },
    { id: 'control', label: copy.shell.tabs.control, icon: <ClipboardCheck className="h-4 w-4" /> },
    { id: 'kpis', label: copy.shell.tabs.kpis, icon: <BarChart3 className="h-4 w-4" /> },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'control':
        return (
          <PettyCashReconciliationWorkspace
            funds={pettyCashFunds}
            movements={pettyCashMovements}
            onFundsChange={setPettyCashFunds}
            onMovementsChange={setPettyCashMovements}
            onSettlementLinesChange={setPettyCashSettlementLines}
            onStatementsChange={setPettyCashStatements}
            settlementLines={pettyCashSettlementLines}
            statements={pettyCashStatements}
          />
        );
      case 'kpis':
        return (
          <PettyCashFinancialViewWorkspace
            funds={pettyCashFunds}
            movements={pettyCashMovements}
            settlementLines={pettyCashSettlementLines}
            statements={pettyCashStatements}
          />
        );
      case 'cash':
      default:
        return (
          <PettyCashFundsWorkspace
            funds={pettyCashFunds}
            onFundsChange={setPettyCashFunds}
            statements={pettyCashStatements}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <LoadingBarOverlay
        isVisible={isTabLoading}
        title={copy.shell.loadingTitle}
        description={copy.shell.loadingDescription}
      />

      <div className="border-b border-gray-200 bg-white px-8 py-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-[1600px]">
          <FavoritesBar
            onNavigate={(page) => {
              if (page === 'petty-cash') return;
              onNavigate(page);
            }}
            currentModule="petty-cash"
          />

          <div className="flex items-start justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
                {copy.shell.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {copy.shell.subtitle}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => onNavigate()}
              className="gap-2 text-sm"
            >
              <Home className="h-4 w-4" /> {copy.shell.back}
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-[#147514] text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-8 py-6">
        {renderActiveTab()}
      </div>
    </div>
  );
}
