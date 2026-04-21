import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { useHRLanguage } from './HRLanguage';
import Employees from './Employees';
import Attendance from './Attendance/Attendance';
import Control from './Control';
import Payroll from './Payroll';
import Announcements from './Announcements';
import Assets from './Assets';
import Records from './Records';
import Permissions from './Permissions';
import Incentives from './Incentives';
import KPIs from './KPIs';

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

type HumanResourcesTabId = (typeof humanResourcesTabIds)[number];

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
  const { activeTab, setActiveTab } = useRoutedModuleTab<HumanResourcesTabId>(
    'collaborators',
    humanResourcesTabIds,
    legacyHumanResourcesTabAliases,
  );

  const tabs = [
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
  ];

  // Get the active component
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || Employees;

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
                onClick={() => setActiveTab(tab.id as HumanResourcesTabId)}
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
        <ActiveComponent />
      </div>
    </div>
  );
}
