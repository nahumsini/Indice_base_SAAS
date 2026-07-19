import { useRef, useState, type ReactNode } from 'react';
import { IndiceModuleShell } from '../../components/frontend-os';
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
      <IndiceModuleShell
        activeTab={activeTab}
        backLabel={copy.shell.back}
        contentRef={mainContentRef}
        currentModule="petty-cash"
        guide={learningModeActive ? (
          <SimpleModuleLearningGuide
            activeContextLabel={pettyCashLearningLabels[activeTab]}
            controls={pettyCashLearningControls[activeTab]}
            guideId="petty-cash-learning-guide"
            moduleTitle={copy.shell.title}
            onPrimaryAction={() => mainContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            scopeId={`petty-cash-${activeTab}`}
            theme={learningModeGuideThemes.finance}
          />
        ) : undefined}
        loadingOverlay={<LoadingBarOverlay isVisible={isTabLoading} title={copy.shell.loadingTitle} description={copy.shell.loadingDescription} />}
        onNavigate={onNavigate}
        onTabChange={setActiveTab}
        subtitle={copy.shell.subtitle}
        tabs={tabs}
        title={copy.shell.title}
        tone="green"
      >
        {renderActiveTab()}
      </IndiceModuleShell>
    </LearningModeHeaderActionsProvider>
  );
}
