import { lazy, Suspense, useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { useHRLanguage } from './HRLanguage';
import { authApi } from '../../api/auth';
import {
  canAccessHumanResourcesTab,
  type HumanResourcesTabId,
} from '../../access/accessRules';

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

export default function HumanResources({ onNavigate }: HumanResourcesProps) {
  const t = useHRLanguage();
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
  const { activeTab, setActiveTab } = useRoutedModuleTab<HumanResourcesTabId>(
    'collaborators',
    humanResourcesTabIds,
    legacyHumanResourcesTabAliases,
  );

  const allTabs = [
    { id: 'collaborators', label: t.shell.tabs.collaborators, emoji: '👥', component: Employees },
    { id: 'attendance', label: t.shell.tabs.attendance, emoji: '📅', component: Attendance },
    { id: 'control', label: t.shell.tabs.control, emoji: '⏱️', component: Control },
    { id: 'payroll', label: t.shell.tabs.payroll, emoji: '💰', component: Payroll },
    { id: 'announcements', label: t.shell.tabs.announcements, emoji: '📢', component: Announcements },
    { id: 'assets', label: t.shell.tabs.assets, emoji: '💼', component: Assets },
    { id: 'records', label: t.shell.tabs.records, emoji: '📋', component: Records },
    { id: 'permissions', label: t.shell.tabs.permissions, emoji: '✅', component: Permissions },
    { id: 'incentives', label: t.shell.tabs.incentives, emoji: '🎁', component: Incentives },
    { id: 'kpis', label: t.shell.tabs.kpis, emoji: '📊', component: KPIs },
  ] satisfies Array<{
    id: HumanResourcesTabId;
    label: string;
    emoji: string;
    component: typeof Employees;
  }>;

  const canAccessTab = (tabId: HumanResourcesTabId) => canAccessHumanResourcesTab(
    sessionAccess.role,
    tabId,
    sessionAccess.tabPermissionKeys,
    sessionAccess.tabPermissionsConfigured,
  );

  const tabs = isAccessLoaded
    ? allTabs.filter((tab) => canAccessTab(tab.id))
    : [];

  // Get the active component
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component ?? null;

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
    if (!isAccessLoaded || canAccessTab(activeTab)) {
      return;
    }

    if (tabs[0]) {
      setActiveTab(tabs[0].id);
    }
  }, [activeTab, isAccessLoaded, sessionAccess, setActiveTab, tabs]);

  const handleTabClick = (tabId: HumanResourcesTabId) => {
    if (tabId === activeTab) {
      return;
    }
    if (!canAccessTab(tabId)) {
      return;
    }

    setActiveTab(tabId);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header del módulo */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Barra de Favoritos */}
          <FavoritesBar 
            onNavigate={(page) => {
              if (page === 'human-resources') return;
              onNavigate(page);
            }} 
            currentModule="human-resources" 
          />
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {t.shell.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t.shell.subtitle}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => onNavigate()}
              className="text-sm gap-2"
            >
              <span className="text-lg">🏠</span> {t.shell.back}
            </Button>
          </div>

          {/* Pestañas */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido del tab activo */}
      <div className="max-w-[1600px] mx-auto px-8 py-6">
        <Suspense
          fallback={(
            <LoadingBarOverlay
              isVisible
              title="Loading HR tab"
              description="Downloading only the selected human resources workspace."
            />
          )}
        >
          {isAccessLoaded && ActiveComponent ? (
            <ActiveComponent />
          ) : isAccessLoaded ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              No Human Resources tabs are available for this user.
            </div>
          ) : (
            <LoadingBarOverlay
              isVisible
              title="Loading HR access"
              description="Checking which workspaces are available."
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
