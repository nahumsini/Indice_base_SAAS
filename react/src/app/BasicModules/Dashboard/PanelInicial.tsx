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
import { useAuthorizationRevision } from '../../hooks/useAuthorizationRevision';

const Profile = lazy(() => import('./Profile'));
const BusinessStructure = lazy(() => import('./BusinessStructure'));
const BusinessProfile = lazy(() => import('./BusinessProfile'));
const Consulting = lazy(() => import('./Consulting'));
const Integrations = lazy(() => import('./Integrations'));
const Users = lazy(() => import('./Users'));

interface PanelInicialProps {
  learningModeActive?: boolean;
  onNavigate: (page?: string) => void;
}

type PanelInicialTabId = PanelInicialGuidanceTabId | 'integrations';

const subTabIds = [
  'profile',
  'business-structure',
  'business-profile',
  'consulting',
  'integrations',
  'users',
] as const;

const legacySubTabAliases: Partial<Record<string, PanelInicialTabId>> = {
  perfil: 'profile',
  estructuraEmpresarial: 'business-structure',
  perfilEmpresarial: 'business-profile',
  consultoria: 'consulting',
  integraciones: 'integrations',
  'personal-performance': 'business-profile',
  usuarios: 'users',
};

export default function PanelInicial({ learningModeActive = false, onNavigate }: PanelInicialProps) {
  const { t } = useLanguage();
  const shellCopy = usePanelInicialTranslations();
  const guidanceCopy = usePanelInicialGuidanceTranslations();
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const authorizationRevision = useAuthorizationRevision();
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
  const subTabs = useMemo(() => [
    { id: 'profile', label: t.panelInicial.tabs.profile, helper: shellCopy.tabDescriptions.profile, emoji: '👤', component: Profile },
    { id: 'business-structure', label: t.panelInicial.tabs.businessStructure, helper: shellCopy.tabDescriptions.businessStructure, emoji: '🏢', component: BusinessStructure },
    { id: 'business-profile', label: t.panelInicial.tabs.businessProfile, helper: shellCopy.tabDescriptions.businessProfile, emoji: '📊', component: BusinessProfile },
    { id: 'consulting', label: t.panelInicial.tabs.consulting, helper: shellCopy.tabDescriptions.consulting, emoji: '🤝', component: Consulting },
    {
      id: 'integrations',
      label: shellCopy.integrationsLabel,
      helper: shellCopy.tabDescriptions.integrations,
      emoji: '🤖',
      component: Integrations,
    },
    { id: 'users', label: t.panelInicial.tabs.users, helper: shellCopy.tabDescriptions.users, emoji: '👥', component: Users },
  ], [shellCopy.integrationsLabel, shellCopy.tabDescriptions, t.panelInicial.tabs]);
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
  }, [authorizationRevision]);

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
    <LearningModeHeaderActionsProvider active={learningModeActive && activeSubTab !== 'integrations'}>
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--indice-background)] dark:bg-slate-950">
      <LoadingBarOverlay
        isVisible={isTabLoading || !sessionAccess.loaded}
        title={shellCopy.loadingTabTitle}
        description={shellCopy.loadingTabDescription}
      />

      <PanelInicialHeader
        activeTabId={activeSubTab}
        navigationLabel={shellCopy.navigationLabel}
        onNavigate={onNavigate}
        onTabSelect={(tabId) => handleTabClick(tabId as PanelInicialTabId)}
        subtitle={shellCopy.subtitle}
        tabs={visibleSubTabs}
        title={t.panelInicial.title}
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {learningModeActive && activeSubTab !== 'integrations' ? (
        <div className="border-b border-[var(--indice-border)] bg-white px-3 pb-4 dark:bg-slate-800 sm:px-8 sm:pb-6">
          <div className="mx-auto max-w-[1600px]">
              <OperationalModuleGuide
                copy={guidanceCopy}
                activeTabId={activeSubTab as PanelInicialGuidanceTabId}
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
    </div>
    </LearningModeHeaderActionsProvider>
  );
}
