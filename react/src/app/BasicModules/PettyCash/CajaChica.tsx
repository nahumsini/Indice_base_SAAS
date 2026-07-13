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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <LoadingBarOverlay
        isVisible={isTabLoading}
        title={copy.shell.loadingTitle}
        description={copy.shell.loadingDescription}
      />

      <div className="border-b border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-900 sm:px-8">
        <div className="mx-auto max-w-[1600px]">
          <FavoritesBar
            onNavigate={(page) => {
              if (page === 'petty-cash') return;
              onNavigate(page);
            }}
            currentModule="petty-cash"
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-slate-950 dark:text-white">
                {copy.shell.title}
              </h1>
              <p className="max-w-3xl text-sm font-medium text-slate-600 dark:text-slate-400">
                {copy.shell.subtitle}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => onNavigate()}
              className="gap-2 rounded-lg text-sm"
            >
              <Home className="h-4 w-4" /> {copy.shell.back}
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex h-10 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-bold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-[#147514] text-white shadow-md'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-[#147514]/25 hover:bg-[#147514]/5 hover:text-[#147514] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8">
        {renderActiveTab()}
      </div>
    </div>
  );
}
