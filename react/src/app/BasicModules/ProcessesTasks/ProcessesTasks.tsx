import { Activity, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { IndiceModuleShell } from '../../components/frontend-os';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { LearningModeHeaderActionsProvider } from '../../learningMode';
import { useProcessesTasksTranslations } from './hooks/useProcessesTasksTranslations';
import {
  OperationalModuleGuide,
  useProcessesTasksGuidanceTranslations,
} from './operationalGuidance';

const Agenda = lazy(() => import('./Agenda'));
const Projects = lazy(() => import('./Projects'));
const Processes = lazy(() => import('./Processes'));
const KPIs = lazy(() => import('./KPIs'));

interface ProcessesTasksProps {
  learningModeActive?: boolean;
  onNavigate: (page?: string) => void;
}

const processTaskTabIds = [
  'calendar',
  'projects',
  'processes',
  'kpis',
] as const;

type ProcessTaskTabId = (typeof processTaskTabIds)[number];

const legacyProcessTaskTabAliases: Partial<Record<string, ProcessTaskTabId>> = {
  agenda: 'calendar',
  tasks: 'calendar',
  tareas: 'calendar',
  proyectos: 'projects',
  procesos: 'processes',
  'org-chart': 'calendar',
  organigrama: 'calendar',
};

export default function ProcessesTasks({ learningModeActive = false, onNavigate }: ProcessesTasksProps) {
  const t = useProcessesTasksTranslations();
  const guidanceCopy = useProcessesTasksGuidanceTranslations();
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const tabScrollPositionsRef = useRef(new Map<ProcessTaskTabId, number>());
  const [visitedTabIds, setVisitedTabIds] = useState<Set<ProcessTaskTabId>>(
    () => new Set(['calendar']),
  );
  const { activeTab, isTabLoading, setActiveTab } = useRoutedModuleTab<ProcessTaskTabId>(
    'calendar',
    processTaskTabIds,
    legacyProcessTaskTabAliases,
  );

  const tabs = [
    { id: 'calendar', label: t.shell.tabs.agenda, emoji: t.headers.agenda.emoji, component: Agenda },
    { id: 'projects', label: t.shell.tabs.projects, emoji: t.headers.projects.emoji, component: Projects },
    { id: 'processes', label: t.shell.tabs.processes, emoji: t.headers.processes.emoji, component: Processes },
    { id: 'kpis', label: t.shell.tabs.kpis, emoji: t.headers.kpis.emoji, component: KPIs },
  ];

  useEffect(() => {
    setVisitedTabIds((currentTabIds) => {
      if (currentTabIds.has(activeTab)) return currentTabIds;
      return new Set(currentTabIds).add(activeTab);
    });

    const savedScrollPosition = tabScrollPositionsRef.current.get(activeTab);
    if (savedScrollPosition === undefined) return;
    const animationFrame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: savedScrollPosition, behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [activeTab]);

  const handleTabChange = (tabId: ProcessTaskTabId) => {
    if (tabId === activeTab) return;
    tabScrollPositionsRef.current.set(activeTab, window.scrollY);
    setVisitedTabIds((currentTabIds) => new Set(currentTabIds).add(tabId));
    setActiveTab(tabId);
  };

  const handleGuidePrimaryAction = () => {
    mainContentRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <LearningModeHeaderActionsProvider active={learningModeActive}>
      <IndiceModuleShell
        activeTab={activeTab}
        backLabel={t.shell.back}
        contentRef={mainContentRef}
        currentModule="processes-tasks"
        guide={learningModeActive ? (
          <OperationalModuleGuide
            copy={guidanceCopy}
            activeTabId={activeTab}
            onJourneyChange={handleTabChange}
            onPrimaryAction={handleGuidePrimaryAction}
          />
        ) : undefined}
        loadingOverlay={<LoadingBarOverlay
          isVisible={isTabLoading}
          title={t.shell.loading.title}
          description={t.shell.loading.description}
        />}
        onNavigate={onNavigate}
        onTabChange={handleTabChange}
        subtitle={t.shell.subtitle}
        tabs={tabs.map(tab => ({ id: tab.id as ProcessTaskTabId, label: tab.label, icon: tab.emoji }))}
        title={t.shell.title}
        tone="yellow"
      >
        {tabs
          .filter((tab) => tab.id === activeTab || visitedTabIds.has(tab.id as ProcessTaskTabId))
          .map((tab) => {
            const TabComponent = tab.component;
            return (
              <Activity
                key={tab.id}
                mode={tab.id === activeTab ? 'visible' : 'hidden'}
                name={`processes-tasks-${tab.id}`}
              >
                <Suspense fallback={<LoadingBarOverlay isVisible title={t.shell.loading.fallbackTitle} description={t.shell.loading.fallbackDescription} />}>
                  <TabComponent learningModeActive={learningModeActive} />
                </Suspense>
              </Activity>
            );
          })}
      </IndiceModuleShell>
    </LearningModeHeaderActionsProvider>
  );
}
