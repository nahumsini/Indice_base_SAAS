import { Activity, lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IndiceModuleShell } from '../../components/frontend-os';
import './humanResourcesWorkspace.css';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { HumanResourcesTabErrorBoundary } from './components/HumanResourcesTabErrorBoundary';
import { useHumanResourcesAccess } from './hooks/useHumanResourcesAccess';
import { useHumanResourcesTranslations } from './hooks/useHumanResourcesTranslations';
import type { HumanResourcesTabId } from '../../access/accessRules';
import {
  emptyHumanResourcesLearningSignals,
  OperationalModuleGuide,
  useHumanResourcesLearningProgress,
  useHumanResourcesGuidanceTranslations,
} from './operationalGuidance';
import type { EmployeeLearningActions } from './Employees/Employees';

const Employees = lazy(() => import('./Employees'));
const Attendance = lazy(() => import('./Attendance/Attendance'));
const Control = lazy(() => import('./Control'));
const Payroll = lazy(() => import('./Payroll'));
const Announcements = lazy(() => import('./Announcements'));
const Assets = lazy(() => import('./Assets'));
const Records = lazy(() => import('./Records'));
const Permissions = lazy(() => import('./Permissions'));
const Incentives = lazy(() => import('./Incentives'));
const KPIs = lazy(() => import('./KPIs'));

interface HumanResourcesProps {
  learningModeActive?: boolean;
  onNavigate: (page?: string) => void;
}

const humanResourcesTabIds = [
  'collaborators',
  'attendance',
  'control',
  'payroll',
  'announcements',
  'assets',
  'records',
  'permissions',
  'incentives',
  'kpis',
] as const;

const legacyHumanResourcesTabAliases: Partial<Record<string, HumanResourcesTabId>> = {
  colaboradores: 'collaborators',
  asistencia: 'attendance',
  nomina: 'payroll',
  comunicados: 'announcements',
  activos: 'assets',
  actas: 'records',
  permisos: 'permissions',
  incentivos: 'incentives',
};

export default function HumanResources({ learningModeActive = false, onNavigate }: HumanResourcesProps) {
  const t = useHumanResourcesTranslations();
  const guidanceCopy = useHumanResourcesGuidanceTranslations();
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const employeeLearningActionsRef = useRef<EmployeeLearningActions | null>(null);
  const tabScrollPositionsRef = useRef(new Map<HumanResourcesTabId, number>());
  const restoringTabRef = useRef<HumanResourcesTabId | null>(null);
  const [learningSignals, setLearningSignals] = useState(emptyHumanResourcesLearningSignals);
  const learningProgress = useHumanResourcesLearningProgress(learningModeActive);
  const [visitedTabIds, setVisitedTabIds] = useState<Set<HumanResourcesTabId>>(
    () => new Set(['collaborators']),
  );
  const { canAccessTab, isAccessLoaded } = useHumanResourcesAccess();
  const { activeTab, setActiveTab } = useRoutedModuleTab<HumanResourcesTabId>(
    'collaborators',
    humanResourcesTabIds,
    legacyHumanResourcesTabAliases,
  );

  const allTabs = [
    { id: 'collaborators', label: t.tabs.collaborators, emoji: '👥', component: Employees },
    { id: 'attendance', label: t.tabs.attendance, emoji: '📅', component: Attendance },
    { id: 'control', label: t.tabs.control, emoji: '⏱️', component: Control },
    { id: 'payroll', label: t.tabs.payroll, emoji: '💰', component: Payroll },
    { id: 'announcements', label: t.tabs.announcements, emoji: '📢', component: Announcements },
    { id: 'assets', label: t.tabs.assets, emoji: '💼', component: Assets },
    { id: 'records', label: t.tabs.records, emoji: '📋', component: Records },
    { id: 'permissions', label: t.tabs.permissions, emoji: '✅', component: Permissions },
    { id: 'incentives', label: t.tabs.incentives, emoji: '🎁', component: Incentives },
    { id: 'kpis', label: t.tabs.kpis, emoji: '📊', component: KPIs },
  ] satisfies Array<{
    id: HumanResourcesTabId;
    label: string;
    emoji: string;
    component: typeof Employees;
  }>;

  const tabs = isAccessLoaded
    ? allTabs.filter((tab) => canAccessTab(tab.id))
    : [];

  useEffect(() => {
    if (!isAccessLoaded || canAccessTab(activeTab)) {
      return;
    }

    if (tabs[0]) {
      setActiveTab(tabs[0].id);
    }
  }, [activeTab, canAccessTab, isAccessLoaded, setActiveTab, tabs]);

  useEffect(() => {
    if (!isAccessLoaded || !canAccessTab(activeTab)) {
      return;
    }

    setVisitedTabIds((currentTabIds) => {
      if (currentTabIds.has(activeTab)) {
        return currentTabIds;
      }

      const nextTabIds = new Set(currentTabIds);
      nextTabIds.add(activeTab);
      return nextTabIds;
    });
  }, [activeTab, canAccessTab, isAccessLoaded]);

  // The canonical module body owns scrolling; never move the document or app frame.
  useLayoutEffect(() => {
    if (!isAccessLoaded) return;
    const content = mainContentRef.current;
    const viewport = content?.closest('main');
    if (!content || !viewport) return;
    const savedScrollPosition = window.matchMedia('(max-width: 767px)').matches
      ? 0 : tabScrollPositionsRef.current.get(activeTab) ?? 0;
    restoringTabRef.current = activeTab;
    let frame: number | undefined;
    const finishRestoring = () => {
      restoringTabRef.current = null;
      observer.disconnect();
    };
    const remember = () => {
      if (restoringTabRef.current !== activeTab) tabScrollPositionsRef.current.set(activeTab, viewport.scrollTop);
    };
    const restore = () => {
      frame = undefined;
      if (restoringTabRef.current !== activeTab) return;
      viewport.scrollTo({ top: savedScrollPosition, left: 0, behavior: 'instant' });
      if (Math.abs(viewport.scrollTop - savedScrollPosition) < 1) finishRestoring();
    };
    // A retained tab may show a short loading state before its data returns.
    // Retry only after size changes; the user's own input always takes precedence.
    const observer = new ResizeObserver(() => {
      if (frame === undefined && restoringTabRef.current === activeTab) frame = window.requestAnimationFrame(restore);
    });
    const onIntent = () => { finishRestoring(); remember(); };
    const intentEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
    viewport.addEventListener('scroll', remember, { passive: true });
    intentEvents.forEach(event => viewport.addEventListener(event, onIntent, { passive: true }));
    observer.observe(content);
    observer.observe(viewport);
    restore();
    return () => {
      viewport.removeEventListener('scroll', remember);
      intentEvents.forEach(event => viewport.removeEventListener(event, onIntent));
      observer.disconnect();
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, [activeTab, isAccessLoaded]);

  const handleTabClick = (tabId: HumanResourcesTabId) => {
    if (tabId === activeTab) {
      return;
    }
    if (!canAccessTab(tabId)) {
      return;
    }

    if (restoringTabRef.current !== activeTab) {
      tabScrollPositionsRef.current.set(activeTab, mainContentRef.current?.closest('main')?.scrollTop ?? 0);
    }
    setVisitedTabIds((currentTabIds) => new Set(currentTabIds).add(tabId));
    setActiveTab(tabId);
  };

  const handleGuidePrimaryAction = () => {
    const content = mainContentRef.current;
    const viewport = content?.closest('main');
    if (!content || !viewport) return;
    viewport.scrollTo({
      top: viewport.scrollTop + content.getBoundingClientRect().top - viewport.getBoundingClientRect().top,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };

  const handleLearningActionsReady = useCallback((actions: EmployeeLearningActions | null) => {
    employeeLearningActionsRef.current = actions;
  }, []);

  const handleLearningAreaNavigation = (areaId: HumanResourcesTabId) => {
    learningProgress.selectArea(areaId);
    if (areaId !== activeTab) {
      handleTabClick(areaId);
    }
  };

  const showCollaboratorTool = (action: 'create' | 'edit', employeeId?: number) => {
    handleLearningAreaNavigation('collaborators');
    window.requestAnimationFrame(() => {
      if (action === 'create') {
        employeeLearningActionsRef.current?.createEmployee();
      } else if (employeeId !== undefined) {
        employeeLearningActionsRef.current?.editEmployee(employeeId);
      }
    });
  };

  useEffect(() => {
    if (!learningModeActive || learningProgress.progress.activeAreaId === activeTab) {
      return;
    }

    learningProgress.selectArea(activeTab);
  }, [activeTab, learningModeActive, learningProgress]);

  return (
    <IndiceModuleShell
        activeTab={activeTab}
        backLabel={t.back}
        contentRef={mainContentRef}
        currentModule="human-resources"
        guide={learningModeActive ? (
          <OperationalModuleGuide
            copy={guidanceCopy}
            activeTabId={activeTab}
            availableTabIds={tabs.map((tab) => tab.id)}
            learningProgress={learningProgress.progress}
            learningSignals={learningSignals}
            onCreateEmployee={() => showCollaboratorTool('create')}
            onEditEmployee={(employeeId) => showCollaboratorTool('edit', employeeId)}
            onMarkUnderstood={learningProgress.markUnderstood}
            onNavigateArea={handleLearningAreaNavigation}
            onPrimaryAction={handleGuidePrimaryAction}
            onRemoveEmployeeException={learningProgress.removeEmployeeException}
            onRestartJourney={(areaId) => {
              learningProgress.restartJourneyView(areaId);
              handleLearningAreaNavigation(areaId);
            }}
            onSelectEmployee={learningProgress.selectEmployee}
            onSetEmployeeException={(employeeId, requirementId, reason) => {
              learningProgress.setEmployeeException(employeeId, requirementId, {
                reason,
                updatedAt: new Date().toISOString(),
              });
            }}
            onSetExpanded={learningProgress.setExpanded}
            onRetrySync={learningProgress.retry}
          />
        ) : undefined}
        onNavigate={onNavigate}
        onTabChange={handleTabClick}
        subtitle={t.subtitle}
        tabs={tabs.map(tab => ({ id: tab.id, label: tab.label, icon: tab.emoji }))}
        title={t.title}
        tone="aqua"
      >
        {isAccessLoaded && tabs.some((tab) => tab.id === activeTab) ? (
          tabs
            .filter((tab) => tab.id === activeTab || visitedTabIds.has(tab.id))
            .map((tab) => {
              const TabComponent = tab.component;
              return (
                <Activity
                  key={tab.id}
                  mode={tab.id === activeTab ? 'visible' : 'hidden'}
                  name={`human-resources-${tab.id}`}
                >
                  <HumanResourcesTabErrorBoundary copy={t.tabError}>
                    <Suspense
                      fallback={(
                        <LoadingBarOverlay
                          isVisible
                          title={t.loading.title}
                          description={t.loading.description}
                        />
                      )}
                    >
                      {tab.id === 'collaborators' ? (
                        <Employees
                          learningModeActive={learningModeActive}
                          onLearningActionsReady={handleLearningActionsReady}
                          onLearningAreaApplied={learningProgress.markApplied}
                          onLearningSignalsChange={setLearningSignals}
                        />
                      ) : (
                        <TabComponent />
                      )}
                    </Suspense>
                  </HumanResourcesTabErrorBoundary>
                </Activity>
              );
            })
        ) : isAccessLoaded ? (
          <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            {t.access.empty}
          </div>
        ) : (
          <LoadingBarOverlay
            isVisible
            title={t.access.loadingTitle}
            description={t.access.loadingDescription}
          />
        )}
    </IndiceModuleShell>
  );
}
