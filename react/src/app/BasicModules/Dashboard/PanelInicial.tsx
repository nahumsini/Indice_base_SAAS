import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useLanguage } from '../../shared/context';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { authApi } from '../../api/auth';
import { canAccessHomePanelTab, type HomePanelTabId } from '../../access/accessRules';
import { LearningModeHeaderActionsProvider } from '../../learningMode';
import {
  OperationalModuleGuide,
  usePanelInicialGuidanceTranslations,
  type PanelInicialGuidanceTabId,
} from './operationalGuidance';
import { PanelInicialErrorBoundary } from './components/PanelInicialErrorBoundary';
import { PanelInicialHeader } from './components/PanelInicialHeader';
import { PanelInicialState } from './components/PanelInicialState';
import { usePanelInicialTranslations } from './hooks/usePanelInicialTranslations';

const Profile = lazy(() => import('./Profile'));
const BusinessStructure = lazy(() => import('./BusinessStructure'));
const BusinessProfile = lazy(() => import('./BusinessProfile'));
const PersonalPerformance = lazy(() => import('./PersonalPerformance'));
const Users = lazy(() => import('./Users'));
const Plan = lazy(() => import('./Plan'));

interface PanelInicialProps {
  learningModeActive?: boolean;
  onNavigate: (page?: string) => void;
}

type PanelInicialTabId = PanelInicialGuidanceTabId | 'plan';

const subTabIds = [
  'profile',
  'business-structure',
  'business-profile',
  'personal-performance',
  'users',
  'plan',
] as const;

const legacySubTabAliases: Partial<Record<string, PanelInicialGuidanceTabId>> = {
  perfil: 'profile',
  estructuraEmpresarial: 'business-structure',
  perfilEmpresarial: 'business-profile',
  usuarios: 'users',
};

export default function PanelInicial({ learningModeActive = false, onNavigate }: PanelInicialProps) {
  const { t } = useLanguage();
  const shellCopy = usePanelInicialTranslations();
  const guidanceCopy = usePanelInicialGuidanceTranslations();
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const [sessionAccess, setSessionAccess] = useState<{
    role: string | null;
    tabPermissionKeys: string[];
    tabPermissionsConfigured: boolean;
    loaded: boolean;
    loadError: boolean;
  }>({
    role: null,
    tabPermissionKeys: [],
    tabPermissionsConfigured: false,
    loaded: false,
    loadError: false,
  });
  const { activeTab: activeSubTab, isTabLoading, setActiveTab: setActiveSubTab } = useRoutedModuleTab<PanelInicialTabId>(
    'profile',
    subTabIds,
    legacySubTabAliases,
  );
  const isGuidedTab = activeSubTab !== 'plan';

  const subTabs = useMemo(() => [
    { id: 'profile', label: t.panelInicial.tabs.profile, emoji: '👤', component: Profile },
    { id: 'business-structure', label: t.panelInicial.tabs.businessStructure, emoji: '🏢', component: BusinessStructure },
    { id: 'business-profile', label: t.panelInicial.tabs.businessProfile, emoji: '📊', component: BusinessProfile },
    { id: 'personal-performance', label: t.panelInicial.tabs.personalPerformance, emoji: '📈', component: PersonalPerformance },
    { id: 'users', label: t.panelInicial.tabs.users, emoji: '👥', component: Users },
    { id: 'plan', label: t.panelInicial.tabs.plan, emoji: '💳', component: Plan },
  ], [t.panelInicial.tabs]);
  const visibleSubTabs = sessionAccess.loaded
    ? subTabs.filter((tab) => (
        canAccessHomePanelTab(
          sessionAccess.role,
          tab.id as HomePanelTabId,
          sessionAccess.tabPermissionKeys,
          sessionAccess.tabPermissionsConfigured,
        )
      ))
    : [];

  // Get the active component
  const ActiveComponent = visibleSubTabs.find(tab => tab.id === activeSubTab)?.component || null;

  const loadSessionAccess = useCallback(() => {
    let active = true;
    setSessionAccess((current) => ({ ...current, loaded: false, loadError: false }));
    authApi.getSessionOrNull()
      .then((session) => {
        if (!active) {
          return;
        }
        setSessionAccess({
          role: session?.user.role ?? null,
          tabPermissionKeys: session?.user.tab_permission_keys ?? [],
          tabPermissionsConfigured: Boolean(session?.user.tab_permissions_configured),
          loaded: true,
          loadError: false,
        });
      })
      .catch(() => {
        if (active) {
          setSessionAccess({
            role: null,
            tabPermissionKeys: [],
            tabPermissionsConfigured: false,
            loaded: true,
            loadError: true,
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return loadSessionAccess();
  }, [loadSessionAccess]);

  useEffect(() => {
    if (!sessionAccess.loaded || visibleSubTabs.length === 0) {
      return;
    }
    if (!visibleSubTabs.some((tab) => tab.id === activeSubTab)) {
      setActiveSubTab(visibleSubTabs[0].id as PanelInicialTabId);
    }
  }, [activeSubTab, sessionAccess.loaded, setActiveSubTab, visibleSubTabs]);

  const handleTabClick = (tabId: PanelInicialTabId) => {
    if (tabId === activeSubTab) {
      return;
    }

    setActiveSubTab(tabId);
  };

  const handleGuidePrimaryAction = () => {
    mainContentRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <LearningModeHeaderActionsProvider active={learningModeActive}>
    <div className="min-h-screen bg-[var(--indice-background)] dark:bg-slate-950">
      <LoadingBarOverlay
        isVisible={isTabLoading || !sessionAccess.loaded}
        title={shellCopy.loadingTabTitle}
        description={shellCopy.loadingTabDescription}
      />

      <PanelInicialHeader
        activeTabId={activeSubTab}
        backLabel={t.panelInicial.back}
        navigationLabel={shellCopy.navigationLabel}
        onBack={() => onNavigate()}
        onNavigate={onNavigate}
        onTabSelect={(tabId) => handleTabClick(tabId as PanelInicialTabId)}
        subtitle={shellCopy.subtitle}
        tabs={visibleSubTabs}
        title={t.panelInicial.title}
      />

      {learningModeActive && isGuidedTab ? (
        <div className="border-b border-[var(--indice-border)] bg-white px-3 pb-4 dark:bg-slate-800 sm:px-8 sm:pb-6">
          <div className="mx-auto max-w-[1600px]">
              <OperationalModuleGuide
                copy={guidanceCopy}
                activeTabId={activeSubTab}
                onPrimaryAction={handleGuidePrimaryAction}
              />
          </div>
        </div>
      ) : null}

      {/* Main content */}
      <div ref={mainContentRef} className="mx-auto max-w-[1600px] scroll-mt-24 px-3 py-4 sm:px-8 sm:py-8">
        <Suspense
          fallback={(
            <LoadingBarOverlay
              isVisible
              title={shellCopy.loadingTabTitle}
              description={shellCopy.downloadingTabDescription}
            />
          )}
        >
          {ActiveComponent ? (
            <PanelInicialErrorBoundary key={activeSubTab} copy={shellCopy}>
              <ActiveComponent />
            </PanelInicialErrorBoundary>
          ) : null}
          {sessionAccess.loaded && sessionAccess.loadError ? (
            <PanelInicialState
              description={shellCopy.accessErrorDescription}
              onRetry={loadSessionAccess}
              retryLabel={shellCopy.retry}
              title={shellCopy.accessErrorTitle}
              tone="error"
            />
          ) : null}
          {sessionAccess.loaded && !sessionAccess.loadError && !ActiveComponent ? (
            <PanelInicialState
              description={shellCopy.accessEmptyDescription}
              title={shellCopy.accessEmptyTitle}
              tone="restricted"
            />
          ) : null}
        </Suspense>
      </div>
    </div>
    </LearningModeHeaderActionsProvider>
  );
}
