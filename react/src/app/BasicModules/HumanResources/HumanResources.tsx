import { lazy, Suspense, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { useHumanResourcesTranslations } from './hooks/useHumanResourcesTranslations';
import {
  OperationalModuleGuide,
  useHumanResourcesGuidanceTranslations,
} from './operationalGuidance';

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
  learningModeActive?: boolean;
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

export default function HumanResources({ learningModeActive = false, onNavigate }: HumanResourcesProps) {
  const copy = useHumanResourcesTranslations();
  const guidanceCopy = useHumanResourcesGuidanceTranslations();
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const { activeTab, setActiveTab } = useRoutedModuleTab<HumanResourcesTabId>(
    'collaborators',
    humanResourcesTabIds,
    legacyHumanResourcesTabAliases,
  );

  const tabs = [
    { id: 'collaborators', label: copy.tabs.collaborators, emoji: '👥', component: Employees },
    { id: 'attendance', label: copy.tabs.attendance, emoji: '📅', component: Attendance },
    { id: 'control', label: copy.tabs.control, emoji: '⏱️', component: Control },
    { id: 'payroll', label: copy.tabs.payroll, emoji: '💰', component: Payroll },
    { id: 'announcements', label: copy.tabs.announcements, emoji: '📢', component: Announcements },
    { id: 'assets', label: copy.tabs.assets, emoji: '💼', component: Assets },
    { id: 'records', label: copy.tabs.records, emoji: '📋', component: Records },
    { id: 'permissions', label: copy.tabs.permissions, emoji: '✅', component: Permissions },
    { id: 'incentives', label: copy.tabs.incentives, emoji: '🎁', component: Incentives },
    { id: 'kpis', label: copy.tabs.kpis, emoji: '📊', component: KPIs },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || Employees;

  const handleTabClick = (tabId: HumanResourcesTabId) => {
    if (tabId === activeTab) {
      return;
    }

    setActiveTab(tabId);
  };

  const handleGuidePrimaryAction = () => {
    mainContentRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <div className="max-w-[1600px] mx-auto">
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
                {copy.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {copy.subtitle}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => onNavigate()}
              className="text-sm gap-2"
            >
              <span className="text-lg">🏠</span> {copy.back}
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

          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id as HumanResourcesTabId)}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-[#59C3A5] text-white shadow-md shadow-[#59C3A5]/20'
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

      <div ref={mainContentRef} className="max-w-[1600px] mx-auto px-8 py-6">
        <Suspense
          fallback={(
            <LoadingBarOverlay
              isVisible
              title={copy.loading.title}
              description={copy.loading.description}
            />
          )}
        >
          <ActiveComponent />
        </Suspense>
      </div>
    </div>
  );
}
