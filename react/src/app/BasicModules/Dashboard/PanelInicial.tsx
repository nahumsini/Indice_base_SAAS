import { lazy, Suspense, useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useLanguage } from '../../shared/context';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { authApi } from '../../api/auth';
import {
  canAccessHomePanelTab,
  type HomePanelTabId,
} from '../../access/accessRules';

const Profile = lazy(() => import('./Profile'));
const BusinessStructure = lazy(() => import('./BusinessStructure'));
const BusinessProfile = lazy(() => import('./BusinessProfile'));
const PersonalPerformance = lazy(() => import('./PersonalPerformance'));
const Users = lazy(() => import('./Users'));

interface PanelInicialProps {
  onNavigate: (page?: string) => void;
}

const subTabIds = [
  'profile',
  'business-structure',
  'business-profile',
  'personal-performance',
  'users',
] as const;

const legacySubTabAliases: Partial<Record<string, HomePanelTabId>> = {
  perfil: 'profile',
  estructuraEmpresarial: 'business-structure',
  perfilEmpresarial: 'business-profile',
  usuarios: 'users',
};

export default function PanelInicial({ onNavigate }: PanelInicialProps) {
  const { t } = useLanguage();
  const [sessionAccess, setSessionAccess] = useState<{
    role: string | null;
    tabPermissionKeys: string[];
    tabPermissionsConfigured: boolean;
  }>({
    role: null,
    tabPermissionKeys: [],
    tabPermissionsConfigured: false,
  });
  const [isAccessLoaded, setIsAccessLoaded] = useState(false);
  const { activeTab: activeSubTab, isTabLoading, setActiveTab: setActiveSubTab } = useRoutedModuleTab<HomePanelTabId>(
    'profile',
    subTabIds,
    legacySubTabAliases,
  );

  const allSubTabs = [
    { id: 'profile', label: t.panelInicial.tabs.profile, emoji: '👤', component: Profile },
    { id: 'business-structure', label: t.panelInicial.tabs.businessStructure, emoji: '🏢', component: BusinessStructure },
    { id: 'business-profile', label: t.panelInicial.tabs.businessProfile, emoji: '📊', component: BusinessProfile },
    { id: 'personal-performance', label: t.panelInicial.tabs.personalPerformance, emoji: '📈', component: PersonalPerformance },
    { id: 'users', label: t.panelInicial.tabs.users, emoji: '👥', component: Users },
  ] satisfies Array<{
    id: HomePanelTabId;
    label: string;
    emoji: string;
    component: typeof Profile;
  }>;

  const canAccessTab = (tabId: HomePanelTabId) => canAccessHomePanelTab(
    sessionAccess.role,
    tabId,
    sessionAccess.tabPermissionKeys,
    sessionAccess.tabPermissionsConfigured,
  );

  const subTabs = isAccessLoaded
    ? allSubTabs.filter((tab) => canAccessTab(tab.id))
    : [];

  // Get the active component
  const ActiveComponent = subTabs.find(tab => tab.id === activeSubTab)?.component ?? null;

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
        });
      })
      .catch(() => {
        if (active) {
          setSessionAccess({
            role: null,
            tabPermissionKeys: [],
            tabPermissionsConfigured: false,
          });
        }
      })
      .finally(() => {
        if (active) {
          setIsAccessLoaded(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isAccessLoaded || canAccessTab(activeSubTab)) {
      return;
    }

    if (subTabs[0]) {
      setActiveSubTab(subTabs[0].id);
    }
  }, [activeSubTab, isAccessLoaded, sessionAccess, setActiveSubTab, subTabs]);

  const handleTabClick = (tabId: HomePanelTabId) => {
    if (tabId === activeSubTab) {
      return;
    }
    if (!canAccessTab(tabId)) {
      return;
    }

    setActiveSubTab(tabId);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <LoadingBarOverlay
        isVisible={isTabLoading}
        title="Loading Home Panel tab"
        description="Opening the selected configuration workspace."
      />

      {/* Header del módulo */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-8 sm:py-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Barra de Favoritos */}
          <div className="mt-2 sm:mt-3">
            <FavoritesBar
              onNavigate={(page) => {
                if (page === 'home-panel') return;
                onNavigate(page);
              }}
              currentModule="home-panel"
            />
          </div>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 sm:text-3xl">
                {t.panelInicial.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
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

          {/* Sub-tabs */}
          <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            <div className="flex min-w-max items-center gap-2">
              {subTabs.map(tab => (
                <button
                  key={tab.id}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-all duration-200 sm:px-4 sm:text-sm ${
                    activeSubTab === tab.id
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  onClick={() => handleTabClick(tab.id)}
                >
                  <span>{tab.emoji}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-[1600px] mx-auto px-4 py-6 sm:px-8 sm:py-8">
        <Suspense
          fallback={(
            <LoadingBarOverlay
              isVisible
              title="Loading Home Panel tab"
              description="Downloading only the selected configuration workspace."
            />
          )}
        >
          {isAccessLoaded && ActiveComponent ? (
            <ActiveComponent />
          ) : isAccessLoaded ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              No Home Panel tabs are available for this user.
            </div>
          ) : (
            <LoadingBarOverlay
              isVisible
              title="Loading Home Panel access"
              description="Checking which setup areas are available."
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
