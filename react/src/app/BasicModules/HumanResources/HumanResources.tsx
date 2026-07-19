import { lazy, Suspense, useEffect, useRef } from 'react';
import { IndiceModuleShell } from '../../components/frontend-os';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { LearningModeHeaderActionsProvider } from '../../learningMode';
import { HumanResourcesTabErrorBoundary } from './components/HumanResourcesTabErrorBoundary';
import { useHumanResourcesAccess } from './hooks/useHumanResourcesAccess';
import { useHumanResourcesTranslations } from './hooks/useHumanResourcesTranslations';
import type { HumanResourcesTabId } from '../../access/accessRules';
import {
  OperationalModuleGuide,
  useHumanResourcesGuidanceTranslations,
} from './operationalGuidance';

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

  // Get the active component
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component ?? null;

  useEffect(() => {
    if (!isAccessLoaded || canAccessTab(activeTab)) {
      return;
    }

    if (tabs[0]) {
      setActiveTab(tabs[0].id);
    }
  }, [activeTab, canAccessTab, isAccessLoaded, setActiveTab, tabs]);

  const handleTabClick = (tabId: HumanResourcesTabId) => {
    if (tabId === activeTab) {
      return;
    }
    if (!canAccessTab(tabId)) {
      return;
    }

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
        backLabel={t.back}
        contentRef={mainContentRef}
        currentModule="human-resources"
        guide={learningModeActive && activeTab !== 'collaborators' ? (
          <OperationalModuleGuide
            copy={guidanceCopy}
            activeTabId={activeTab}
            onPrimaryAction={handleGuidePrimaryAction}
          />
        ) : undefined}
        onNavigate={onNavigate}
        onTabChange={handleTabClick}
        subtitle={t.subtitle}
        tabs={tabs.map(tab => ({ id: tab.id, label: tab.label, icon: tab.emoji }))}
        title={t.title}
        tone="aqua"
      >
        <HumanResourcesTabErrorBoundary key={activeTab} copy={t.tabError}>
          <Suspense
            fallback={(
              <LoadingBarOverlay
                isVisible
                title={t.loading.title}
                description={t.loading.description}
              />
            )}
          >
            {isAccessLoaded && ActiveComponent ? (
              activeTab === 'collaborators' ? (
                <Employees learningModeActive={learningModeActive} />
              ) : (
                <ActiveComponent />
              )
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
          </Suspense>
        </HumanResourcesTabErrorBoundary>
      </IndiceModuleShell>
    </LearningModeHeaderActionsProvider>
  );
}
