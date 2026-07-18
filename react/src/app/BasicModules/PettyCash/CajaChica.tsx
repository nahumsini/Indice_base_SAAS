import { useRef, useState, type ReactNode } from 'react';
import { Home } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { PettyCashFinancialViewWorkspace } from './components/PettyCashFinancialViewWorkspace';
import { PettyCashFundsWorkspace } from './components/PettyCashFundsWorkspace';
import { PettyCashReconciliationWorkspace } from './components/PettyCashReconciliationWorkspace';
import { PettyCashStatementsWorkspace } from './components/PettyCashStatementsWorkspace';
import { usePettyCash } from './context/PettyCashContext';
import { usePettyCashTranslations } from './hooks/usePettyCashTranslations';
import {
  LearningModeHeaderActionsProvider,
  learningModeGuideThemes,
  SimpleModuleLearningGuide,
} from '../../learningMode';
import {
  pettyCashLearningControls,
  pettyCashLearningLabels,
} from './operationalGuidance/pettyCashLearningControls';

interface CajaChicaProps {
  learningModeActive?: boolean;
  onNavigate: (page?: string) => void;
}

const pettyCashTabIds = [
  'cash',
  'control',
  'statements',
  'kpis',
] as const;

type PettyCashTabId = (typeof pettyCashTabIds)[number];

const legacyPettyCashTabAliases: Partial<Record<string, PettyCashTabId>> = {
  caja: 'cash',
};

export default function CajaChica({ learningModeActive = false, onNavigate }: CajaChicaProps) {
  const copy = usePettyCashTranslations();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [focusedFundId, setFocusedFundId] = useState('');
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
    { id: 'cash', label: copy.shell.tabs.cash, icon: <span aria-hidden="true">🗃️</span> },
    { id: 'control', label: copy.shell.tabs.control, icon: <span aria-hidden="true">🧾</span> },
    { id: 'statements', label: copy.shell.tabs.statements, icon: <span aria-hidden="true">📋</span> },
    { id: 'kpis', label: copy.shell.tabs.kpis, icon: <span aria-hidden="true">📊</span> },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'control':
        return (
          <PettyCashReconciliationWorkspace
            funds={pettyCashFunds}
            initialFundId={focusedFundId}
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
      case 'statements':
        return (
          <PettyCashStatementsWorkspace
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
            onViewReceipts={(fundId) => {
              setFocusedFundId(fundId);
              setActiveTab('control');
            }}
            statements={pettyCashStatements}
          />
        );
    }
  };

  return (
    <LearningModeHeaderActionsProvider active={learningModeActive}>
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

          <div className="-mx-4 mt-4 flex snap-x items-center gap-2 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex snap-start items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
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

          {learningModeActive ? (
            <div className="mt-4">
              <SimpleModuleLearningGuide
                activeContextLabel={pettyCashLearningLabels[activeTab]}
                controls={pettyCashLearningControls[activeTab]}
                guideId="petty-cash-learning-guide"
                moduleTitle="Guía para administrar la caja chica"
                onPrimaryAction={() => mainContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                scopeId={`petty-cash-${activeTab}`}
                theme={learningModeGuideThemes.finance}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div ref={mainContentRef} className="mx-auto max-w-[1600px] scroll-mt-24 px-4 py-6 sm:px-8">
        {renderActiveTab()}
      </div>
    </div>
    </LearningModeHeaderActionsProvider>
  );
}
