import { lazy, Suspense } from 'react';
import { Home } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { useProcessesTasksTranslations } from './hooks/useProcessesTasksTranslations';

const Agenda = lazy(() => import('./Agenda'));
const Projects = lazy(() => import('./Projects'));
const Processes = lazy(() => import('./Processes'));
const KPIs = lazy(() => import('./KPIs'));

interface ProcessesTasksProps {
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

export default function ProcessesTasks({ onNavigate }: ProcessesTasksProps) {
  const t = useProcessesTasksTranslations();
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

  const ActiveComponent = tabs.find((tab) => tab.id === activeTab)?.component || Agenda;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <LoadingBarOverlay
        isVisible={isTabLoading}
        title={t.shell.loading.title}
        description={t.shell.loading.description}
      />

      <div className="border-b border-gray-200 bg-white px-8 py-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-[1600px]">
          <FavoritesBar
            onNavigate={(page) => {
              if (page === 'processes-tasks') return;
              onNavigate(page);
            }}
            currentModule="processes-tasks"
          />

          <div className="flex items-start justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">{t.shell.title}</h1>
              <p className="text-gray-600 dark:text-gray-400">{t.shell.subtitle}</p>
            </div>
            <Button variant="outline" onClick={() => onNavigate()} className="gap-2 text-sm">
              <Home className="h-4 w-4" aria-hidden="true" />
              {t.shell.back}
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => {
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ProcessTaskTabId)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-[rgb(235,165,52)] text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <span className="text-base leading-none" aria-hidden="true">{tab.emoji}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-8 py-6">
        <Suspense
          fallback={(
            <LoadingBarOverlay
              isVisible
              title={t.shell.loading.fallbackTitle}
              description={t.shell.loading.fallbackDescription}
            />
          )}
        >
          <ActiveComponent />
        </Suspense>
      </div>
    </div>
  );
}
