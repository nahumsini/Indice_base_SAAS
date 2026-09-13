import { useSearchParams } from 'react-router';
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
import { readKioskAdminNavigationTarget } from '../../components/kiosk-engine/kioskAdminNavigation';
import {
  LearningModeHeaderActionsProvider,
  learningModeGuideThemes,
  SimpleModuleLearningGuide,
  type LearningModeJourneyStep,
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

const pettyCashLearningJourneyEmoji: Record<PettyCashTabId, string> = {
  cash: '🗃️',
  control: '🧾',
  statements: '📋',
  kpis: '📊',
};

const pettyCashLearningSignals: Record<PettyCashTabId, string> = {
  cash: 'Crea el fondo, define responsable y límite; así el efectivo pequeño también tiene reglas claras.',
  control: 'Registra entregas, comprobantes y devoluciones para explicar cuánto efectivo sigue disponible.',
  statements: 'Cierra periodos con una declaración verificable y conserva la evidencia de cada movimiento.',
  kpis: 'Detecta fondos sin comprobar, diferencias y hábitos de gasto antes de que se vuelvan recurrentes.',
};

const legacyPettyCashTabAliases: Partial<Record<string, PettyCashTabId>> = {
  caja: 'cash',
};

export default function CajaChica({ learningModeActive = false, onNavigate }: CajaChicaProps) {
  const copy = usePettyCashTranslations();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const [focusedFundId, setFocusedFundId] = useState('');
  const kioskAdminTarget = readKioskAdminNavigationTarget(searchParams.toString());
  const initialKioskFundId = kioskAdminTarget?.kioskType === 'receipt_capture'
    ? String(kioskAdminTarget.referenceId ?? '')
    : '';
  const linkedFundId = searchParams.get('fundId') ?? '';
  const requestedFundId = /^\d+$/.test(linkedFundId) ? linkedFundId : '';
  const {
    pettyCashFunds,
    pettyCashMovements,
    pettyCashSettlementLines,
    pettyCashStatements,
    setPettyCashFunds,
    setPettyCashMovements,
    setPettyCashSettlementLines,
    setPettyCashStatements,
    workspaceLoaded,
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
  const learningJourney: readonly LearningModeJourneyStep[] = pettyCashTabIds.map((journeyId) => ({
    emoji: pettyCashLearningJourneyEmoji[journeyId],
    id: journeyId,
    label: tabs.find((tab) => tab.id === journeyId)?.label ?? journeyId,
  }));

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'control':
        return (
          <PettyCashReconciliationWorkspace
            dataReady={workspaceLoaded}
            funds={pettyCashFunds}
            initialFundId={focusedFundId || requestedFundId}
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
            dataReady={workspaceLoaded}
            funds={pettyCashFunds}
            movements={pettyCashMovements}
            settlementLines={pettyCashSettlementLines}
            statements={pettyCashStatements}
          />
        );
      case 'statements':
        return (
          <PettyCashStatementsWorkspace
            dataReady={workspaceLoaded}
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
            dataReady={workspaceLoaded}
            funds={pettyCashFunds}
            initialKioskFundId={initialKioskFundId}
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
            activeJourneyId={activeTab}
            contextSignal={pettyCashLearningSignals[activeTab]}
            controls={pettyCashLearningControls[activeTab]}
            guideId="petty-cash-learning-guide"
            journey={learningJourney}
            moduleTitle={copy.shell.title}
            onJourneyChange={(journeyId) => setActiveTab(journeyId as PettyCashTabId)}
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
