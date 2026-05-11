import { lazy, Suspense } from 'react';
import { BarChart3, Building2, CalendarDays, FolderOpen, Home, ListChecks, Settings2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useProcessesTasksTranslations } from '../../hooks/useProcessesTasksTranslations';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';

const Agenda = lazy(() => import('./Agenda'));
const Tasks = lazy(() => import('./Tasks/Tasks'));
const Projects = lazy(() => import('./Projects'));
const Processes = lazy(() => import('./Processes'));
const KPIs = lazy(() => import('./KPIs'));
const OrgChart = lazy(() => import('./OrgChart'));

interface ProcessesTasksProps {
  onNavigate: (page?: string) => void;
}

const processTaskTabIds = [
  'calendar',
  'tasks',
  'projects',
  'processes',
  'kpis',
  'org-chart',
] as const;

type ProcessTaskTabId = (typeof processTaskTabIds)[number];

const legacyProcessTaskTabAliases: Partial<Record<string, ProcessTaskTabId>> = {
  agenda: 'calendar',
  tareas: 'tasks',
  proyectos: 'projects',
  procesos: 'processes',
  organigrama: 'org-chart',
};

export default function ProcessesTasks({ onNavigate }: ProcessesTasksProps) {
  const t = useProcessesTasksTranslations();
  const { activeTab, isTabLoading, setActiveTab } = useRoutedModuleTab<ProcessTaskTabId>(
    'calendar',
    processTaskTabIds,
    legacyProcessTaskTabAliases,
  );

  const tabs = [
    { id: 'calendar', label: t.tabs.agenda, icon: CalendarDays, component: Agenda },
    { id: 'tasks', label: t.tabs.tasks, icon: ListChecks, component: Tasks },
    { id: 'projects', label: t.tabs.projects, icon: FolderOpen, component: Projects },
    { id: 'processes', label: t.tabs.processes, icon: Settings2, component: Processes },
    { id: 'kpis', label: t.tabs.kpis, icon: BarChart3, component: KPIs },
    { id: 'org-chart', label: t.tabs.orgChart, icon: Building2, component: OrgChart },
  ];

  const ActiveComponent = tabs.find((tab) => tab.id === activeTab)?.component || Agenda;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <LoadingBarOverlay
        isVisible={isTabLoading}
        title="Loading process tab"
        description="Opening the selected agenda, project, or process workspace."
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
              <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">{t.title}</h1>
              <p className="text-gray-600 dark:text-gray-400">{t.subtitle}</p>
            </div>
            <Button variant="outline" onClick={() => onNavigate()} className="gap-2 text-sm">
              <Home className="h-4 w-4" aria-hidden="true" />
              {t.back}
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;

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
                  <Icon className="h-4 w-4" aria-hidden="true" />
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
              title="Loading process tab"
              description="Downloading only the selected process workspace."
            />
          )}
        >
          <ActiveComponent />
        </Suspense>
      </div>
    </div>
  );
}
