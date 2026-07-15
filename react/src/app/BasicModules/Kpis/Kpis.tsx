import { lazy, Suspense, type ComponentType } from 'react';
import { ArrowLeft, BarChart3, BellRing, FileSpreadsheet, LayoutDashboard, type LucideIcon } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
import { FavoritesBar } from '../../components/FavoritesBar';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useKpisTranslations } from '../../hooks/useKpisTranslations';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { KPI_ACCENT } from './kpisExecutiveData';

const KPIs = lazy(() => import('./KPIs/KPIs'));
const InformesContables = lazy(() => import('./InformesContables'));
const InformesAutomatizados = lazy(() => import('./InformesAutomatizados'));

interface KpisProps {
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
  icon: LucideIcon;
  iconClassName: string;
  component: ComponentType;
};

const legacyKpiTabAliases: Partial<Record<string, KpiTabId>> = {
  informesAutomatizados: 'automated-reports',
  informesContables: 'accounting-reports',
};

export default function Kpis({ onNavigate }: KpisProps) {
  const t = useKpisTranslations();
  const { activeTab, isTabLoading, setActiveTab } = useRoutedModuleTab<KpiTabId>(
    'kpis',
    kpiTabIds,
    legacyKpiTabAliases,
  );

  const tabs: KpiTab[] = [
    {
      id: 'kpis',
      label: t.tabs.kpis,
      icon: LayoutDashboard,
      iconClassName: 'text-blue-700 bg-blue-50 border-blue-200',
      component: KPIs,
    },
    {
      id: 'accounting-reports',
      label: t.tabs.informesContables,
      icon: FileSpreadsheet,
      iconClassName: 'text-blue-700 bg-blue-50 border-blue-200',
      component: InformesContables,
    },
    {
      id: 'automated-reports',
      label: t.tabs.informesAutomatizados,
      icon: BellRing,
      iconClassName: 'text-blue-700 bg-blue-50 border-blue-200',
      component: InformesAutomatizados,
    },
  ];

  const activeTabConfig = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const ActiveComponent = activeTabConfig.component;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <LoadingBarOverlay
        isVisible={isTabLoading}
        title={t.loadingTitle}
        description={t.loadingDescription}
      />

      <header className="border-b border-slate-200 bg-white/95 px-6 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto max-w-[1600px] space-y-5">
          <FavoritesBar
            onNavigate={(page) => {
              if (page === 'kpis') return;
              onNavigate(page);
            }}
            currentModule="kpis"
          />

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                style={{ backgroundColor: KPI_ACCENT }}
                aria-hidden="true"
              >
                <BarChart3 className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200">
                    {t.badges.executive}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    {t.badges.proforma}
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-normal text-slate-950 dark:text-white md:text-3xl">
                  {t.title}
                </h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {t.subtitle}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => onNavigate()}
              className="h-10 w-fit gap-2 rounded-lg border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.back}
            </Button>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="KPI workspace tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex h-11 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors',
                    isActive
                      ? 'border-blue-700 bg-blue-700 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-800 dark:hover:bg-blue-950/40 dark:hover:text-blue-200',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-md border',
                      isActive ? 'border-white/25 bg-white/15 text-white' : tab.iconClassName,
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        <Suspense
          fallback={(
            <LoadingBarOverlay
              isVisible
              title={t.loadingTitle}
              description={t.loadingDescription}
            />
          )}
        >
          <ActiveComponent />
        </Suspense>
      </main>
    </div>
  );
}
