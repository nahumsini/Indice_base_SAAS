import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useLanguage } from '../../shared/context';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { authApi } from '../../api/auth';
import { canAccessHomePanelTab, type HomePanelTabId } from '../../access/accessRules';
import {
  OperationalModuleGuide,
  usePanelInicialGuidanceTranslations,
  type PanelInicialGuidanceTabId,
} from './operationalGuidance';

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
  const guidanceCopy = usePanelInicialGuidanceTranslations();
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const [sessionAccess, setSessionAccess] = useState<{
    role: string | null;
    tabPermissionKeys: string[];
    tabPermissionsConfigured: boolean;
    loaded: boolean;
  }>({
    role: null,
    tabPermissionKeys: [],
    tabPermissionsConfigured: false,
    loaded: false,
  });
  const { activeTab: activeSubTab, isTabLoading, setActiveTab: setActiveSubTab } = useRoutedModuleTab<PanelInicialTabId>(
    'profile',
    subTabIds,
    legacySubTabAliases,
  );
  const isGuidedTab = activeSubTab !== 'plan';

  const subTabs = [
    { id: 'profile', label: t.panelInicial.tabs.profile, emoji: '👤', component: Profile },
    { id: 'business-structure', label: t.panelInicial.tabs.businessStructure, emoji: '🏢', component: BusinessStructure },
    { id: 'business-profile', label: t.panelInicial.tabs.businessProfile, emoji: '📊', component: BusinessProfile },
    { id: 'personal-performance', label: t.panelInicial.tabs.personalPerformance, emoji: '📈', component: PersonalPerformance },
    { id: 'users', label: t.panelInicial.tabs.users, emoji: '👥', component: Users },
    { id: 'plan', label: t.panelInicial.tabs.plan, emoji: '💳', component: Plan },
  ];
  const visibleSubTabs = sessionAccess.loaded
    ? subTabs.filter((tab) => (
        tab.id !== 'plan'
        && canAccessHomePanelTab(
          sessionAccess.role,
          tab.id as HomePanelTabId,
          sessionAccess.tabPermissionKeys,
          sessionAccess.tabPermissionsConfigured,
        )
      ))
    : [];

  // Get the active component
  const ActiveComponent = visibleSubTabs.find(tab => tab.id === activeSubTab)?.component || null;

  useEffect(() => {
    let active = true;
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
        });
      })
      .catch(() => {
        if (active) {
          setSessionAccess({
            role: null,
            tabPermissionKeys: [],
            tabPermissionsConfigured: false,
            loaded: true,
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <LoadingBarOverlay
        isVisible={isTabLoading}
        title="Loading Home Panel tab"
        description="Opening the selected configuration workspace."
      />

      {/* Module header */}
      <div className="border-b border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-800 sm:px-8 sm:py-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Favorites bar */}
          <div className="mt-2 sm:mt-3">
            <FavoritesBar
              onNavigate={(page) => {
                if (page === 'home-panel') return;
                onNavigate(page);
              }}
              currentModule="home-panel"
            />
          </div>
          
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h1 className="mb-2 text-[1.625rem] font-bold leading-tight text-gray-900 dark:text-white sm:text-3xl">
                {t.panelInicial.title}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">
                Configure your profile, business structure, users, and more.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => onNavigate()}
              className="w-full justify-center gap-2 text-sm sm:w-auto"
            >
              <span className="text-lg">🏠</span> {t.panelInicial.back}
            </Button>
          </div>

          {learningModeActive && isGuidedTab ? (
            <div className="mt-5">
              <OperationalModuleGuide
                copy={guidanceCopy}
                activeTabId={activeSubTab}
                onPrimaryAction={handleGuidePrimaryAction}
              />
            </div>
          ) : null}

          {/* Sub-tabs */}
          <div className="-mx-3 mt-4 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0">
            <div className="flex min-w-max snap-x snap-mandatory items-center gap-2">
              {visibleSubTabs.map(tab => (
                <button
                  key={tab.id}
                  aria-current={activeSubTab === tab.id ? 'page' : undefined}
                  className={`flex min-h-10 snap-start items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-all duration-200 sm:px-4 sm:text-sm ${
                    activeSubTab === tab.id
                      ? 'bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/20'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  onClick={() => handleTabClick(tab.id as PanelInicialTabId)}
                >
                  <span>{tab.emoji}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div ref={mainContentRef} className="mx-auto max-w-[1600px] scroll-mt-24 px-3 py-4 sm:px-8 sm:py-8">
        <Suspense
          fallback={(
            <LoadingBarOverlay
              isVisible
              title="Loading Home Panel tab"
              description="Downloading only the selected configuration workspace."
            />
          )}
        >
          {ActiveComponent ? <ActiveComponent /> : null}
          {sessionAccess.loaded && !ActiveComponent ? (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              No Home Panel tabs are assigned to your user.
            </div>
          ) : null}
        </Suspense>
      </div>
    </div>
  );
}
