import { lazy, Suspense, useRef, type ComponentType, type ReactNode } from 'react';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { IndiceModuleShell } from '../../components/frontend-os';
import { useKpisTranslations } from '../../hooks/useKpisTranslations';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { getCachedAuthSession } from '../../api/authSessionStore';
import { canAccessModuleTab } from '../../access/tabScopeCatalog';
import { useAuthorizationRevision } from '../../hooks/useAuthorizationRevision';
import {
  LearningModeHeaderActionsProvider,
  learningModeGuideThemes,
  SimpleModuleLearningGuide,
} from '../../learningMode';
import {
  kpisLearningControls,
  kpisLearningLabels,
} from './operationalGuidance/kpisLearningControls';

const KPIs = lazy(() => import('./KPIs/KPIs'));
const InformesContables = lazy(() => import('./InformesContables'));
const InformesAutomatizados = lazy(() => import('./InformesAutomatizados'));

interface KpisProps {
  learningModeActive?: boolean;
  onNavigate: (page?: string) => void;
}

const kpiTabIds = [
  'kpis',
  'accounting-reports',
  'automated-reports',
] as const;

type KpiTabId = (typeof kpiTabIds)[number];

type KpiTab = {
  id: KpiTabId;
  label: string;
  icon: ReactNode;
  component: ComponentType<{ onNavigate?: (page?: string) => void }>;
};

const legacyKpiTabAliases: Partial<Record<string, KpiTabId>> = {
  informesAutomatizados: 'automated-reports',
  informesContables: 'accounting-reports',
};

export default function Kpis({ learningModeActive = false, onNavigate }: KpisProps) {
  useAuthorizationRevision();
  const t = useKpisTranslations();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const { activeTab, isTabLoading, setActiveTab } = useRoutedModuleTab<KpiTabId>(
    'kpis',
    kpiTabIds,
    legacyKpiTabAliases,
  );

  const allTabs: KpiTab[] = [
    {
      id: 'kpis',
      label: t.tabs.kpis,
      icon: '🧩',
      component: KPIs,
    },
    {
      id: 'accounting-reports',
      label: t.tabs.informesContables,
      icon: '📑',
      component: InformesContables,
    },
    {
      id: 'automated-reports',
      label: t.tabs.informesAutomatizados,
      icon: '⚙️',
      component: InformesAutomatizados,
    },
  ];
  const cachedSession = getCachedAuthSession();
  const tabs = cachedSession === undefined
    ? allTabs
    : allTabs.filter((tab) => canAccessModuleTab('kpis', tab.id, cachedSession));

  const activeTabConfig = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const ActiveComponent = activeTabConfig?.component ?? KPIs;

  return (
    <LearningModeHeaderActionsProvider active={learningModeActive}>
      <IndiceModuleShell
        activeTab={activeTab}
        contentRef={mainContentRef}
        currentModule="kpis"
        guide={learningModeActive ? (
            <SimpleModuleLearningGuide
              activeContextLabel={kpisLearningLabels[activeTab]}
              controls={kpisLearningControls[activeTab]}
              guideId="kpis-learning-guide"
              moduleTitle="Guía para convertir información en decisiones"
              onPrimaryAction={() => mainContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              scopeId={`kpis-${activeTab}`}
              theme={learningModeGuideThemes.analytics}
            />
        ) : undefined}
        loadingOverlay={<LoadingBarOverlay isVisible={isTabLoading} title={t.loadingTitle} description={t.loadingDescription} />}
        onNavigate={onNavigate}
        onTabChange={setActiveTab}
        subtitle={t.subtitle}
        tabs={tabs.map((tab) => ({ id: tab.id, label: tab.label, icon: tab.icon }))}
        title={t.title}
        tone="blue"
      >
        <Suspense
          fallback={(
            <LoadingBarOverlay
              isVisible
              title={t.loadingTitle}
              description={t.loadingDescription}
            />
          )}
        >
          <ActiveComponent onNavigate={onNavigate} />
        </Suspense>
      </IndiceModuleShell>
    </LearningModeHeaderActionsProvider>
  );
}
