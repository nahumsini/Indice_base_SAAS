import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { useHumanResourcesTranslations } from './hooks/useHumanResourcesTranslations';
import type { HumanResourcesTranslations } from './translations';
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

interface TabContentErrorBoundaryProps {
  children: ReactNode;
  copy: HumanResourcesTranslations['tabError'];
}

interface TabContentErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
  errorStack?: string;
  componentStack?: string;
}

class TabContentErrorBoundary extends Component<TabContentErrorBoundaryProps, TabContentErrorBoundaryState> {
  state: TabContentErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(error: unknown): TabContentErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    };
  }

  componentDidCatch(error: unknown, errorInfo: { componentStack?: string }) {
    console.error('Human Resources tab failed to render.', error, errorInfo);
    this.setState({ componentStack: errorInfo.componentStack });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { copy } = this.props;

      return (
        <div
          role="alert"
          className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
            {copy.eyebrow}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-amber-950 dark:text-white">
            {copy.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-800 dark:text-amber-100/85">
            {copy.description}
          </p>
          <Button
            type="button"
            onClick={this.handleReload}
            className="mt-4 bg-[#59C3A5] text-white hover:bg-[#4AAE91]"
          >
            {copy.reload}
          </Button>
          {import.meta.env.DEV ? (
            <details className="mt-4 rounded-md border border-amber-200 bg-white/70 p-3 text-xs text-amber-950 dark:border-amber-800 dark:bg-slate-950/40 dark:text-amber-100">
              <summary className="cursor-pointer font-semibold">Detalle técnico local</summary>
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words">
                {[
                  this.state.errorMessage,
                  this.state.errorStack,
                  this.state.componentStack,
                ].filter(Boolean).join('\n\n')}
              </pre>
            </details>
          ) : null}
        </div>
      );
    }

    return this.props.children;
  }
}

export default function HumanResources({ onNavigate }: HumanResourcesProps) {
  const t = useHumanResourcesTranslations();
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header del módulo */}
      <div className="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Barra de Favoritos */}
          <FavoritesBar 
            onNavigate={(page) => {
              if (page === 'human-resources') return;
              onNavigate(page);
            }} 
            currentModule="human-resources" 
          />
          
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="mb-2 text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
                {t.title}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 sm:text-base">
                {t.subtitle}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => onNavigate()}
              className="w-full justify-center gap-2 text-sm sm:w-auto"
            >
              <span className="text-lg">🏠</span> {t.back}
            </Button>
          </div>

          {/* Pestañas */}
          <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-2 scrollbar-hide sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            <div className="flex min-w-max items-center gap-2 lg:min-w-0 lg:flex-wrap">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-[#59C3A5] text-white shadow-md shadow-[#59C3A5]/25'
                      : 'bg-slate-100 text-slate-600 hover:bg-[#59C3A5]/10 hover:text-[#2F8F78] dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-[#59C3A5]/15 dark:hover:text-[#8BE0CB]'
                  }`}
                >
                  <span>{tab.emoji}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido del tab activo */}
      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <TabContentErrorBoundary key={activeTab} copy={t.tabError}>
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
              <ActiveComponent />
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
        </TabContentErrorBoundary>
      </div>
    </div>
  );
}
