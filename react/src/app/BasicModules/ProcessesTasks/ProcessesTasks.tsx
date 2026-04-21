import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { useProcessesTasksTranslations } from '../../hooks/useProcessesTasksTranslations';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import Agenda from './Agenda';
import Projects from './Projects';
import Processes from './Processes';
import KPIs from './KPIs';
import OrgChart from './OrgChart';

interface ProcessesTasksProps {
  onNavigate: (page?: string) => void;
}

const processTaskTabIds = [
  'calendar',
  'projects',
  'processes',
  'kpis',
  'org-chart',
] as const;

type ProcessTaskTabId = (typeof processTaskTabIds)[number];

const legacyProcessTaskTabAliases: Partial<Record<string, ProcessTaskTabId>> = {
  agenda: 'calendar',
  proyectos: 'projects',
  procesos: 'processes',
  organigrama: 'org-chart',
};

export default function ProcessesTasks({ onNavigate }: ProcessesTasksProps) {
  const t = useProcessesTasksTranslations();
  const { activeTab, setActiveTab } = useRoutedModuleTab<ProcessTaskTabId>(
    'calendar',
    processTaskTabIds,
    legacyProcessTaskTabAliases,
  );

  const tabs = [
    { id: 'calendar', label: t.tabs.agenda, emoji: '📋', component: Agenda },
    { id: 'projects', label: t.tabs.projects, emoji: '🎯', component: Projects },
    { id: 'processes', label: t.tabs.processes, emoji: '⚙️', component: Processes },
    { id: 'kpis', label: t.tabs.kpis, emoji: '📊', component: KPIs },
    { id: 'org-chart', label: t.tabs.orgChart, emoji: '🏢', component: OrgChart },
  ];

  // Get the active component
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || Agenda;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header del módulo */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Barra de Favoritos */}
          <FavoritesBar 
            onNavigate={(page) => {
              if (page === 'processes-tasks') return;
              onNavigate(page);
            }} 
            currentModule="processes-tasks" 
          />
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {t.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t.subtitle}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => onNavigate()}
              className="text-sm gap-2"
            >
              <span className="text-lg">🏠</span> {t.back}
            </Button>
          </div>

          {/* Pestañas */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ProcessTaskTabId)}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-[rgb(235,165,52)] text-white shadow-md'
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
        <ActiveComponent />
      </div>
    </div>
  );
}
