import { lazy, Suspense, useRef } from 'react';
import { Home } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { useProcessesTasksTranslations } from './hooks/useProcessesTasksTranslations';
import {
  OperationalModuleGuide,
  useProcessesTasksGuidanceTranslations,
} from './operationalGuidance';

const Agenda = lazy(() => import('./Agenda'));
const Projects = lazy(() => import('./Projects'));
const Processes = lazy(() => import('./Processes'));
const KPIs = lazy(() => import('./KPIs'));

interface ProcessesTasksProps {
  learningModeActive?: boolean;
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

export default function ProcessesTasks({ learningModeActive = false, onNavigate }: ProcessesTasksProps) {
  const t = useProcessesTasksTranslations();
  const guidanceCopy = useProcessesTasksGuidanceTranslations();
  const mainContentRef = useRef<HTMLDivElement | null>(null);
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
        title={t.shell.loading.title}
        description={t.shell.loading.description}
      />

      <div className="border-b border-gray-200 bg-white px-4 py-5 dark:border-gray-700 dark:bg-gray-800 sm:px-6 lg:px-8 lg:py-6">
        <div className="mx-auto max-w-[1600px]">
          <FavoritesBar
            onNavigate={(page) => {
              if (page === 'processes-tasks') return;
              onNavigate(page);
            }}
            currentModule="processes-tasks"
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="mb-2 text-2xl font-bold leading-tight text-gray-900 dark:text-white sm:text-3xl">{t.shell.title}</h1>
              <p className="text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">{t.shell.subtitle}</p>
            </div>
            <Button variant="outline" onClick={() => onNavigate()} className="w-full gap-2 text-sm sm:w-auto">
              <Home className="h-4 w-4" aria-hidden="true" />
              {t.shell.back}
            </Button>
          </div>

          {learningModeActive ? (
            <div className="mt-5">
              <OperationalModuleGuide
                copy={guidanceCopy}
                activeTabId={activeTab}
                onPrimaryAction={handleGuidePrimaryAction}
              />
            </div>
          ) : null}

          <div className="mt-4 flex snap-x items-center gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => {
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ProcessTaskTabId)}
                  className={`flex snap-start items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-[#F4C84A] text-[#222831] shadow-md shadow-[#F4C84A]/20'
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

      <div ref={mainContentRef} className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
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
