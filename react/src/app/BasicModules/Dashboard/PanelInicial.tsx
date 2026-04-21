import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { useLanguage } from '../../shared/context';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';

// Import all tab components
import Profile from './Profile';
import BusinessStructure from './BusinessStructure';
import BusinessProfile from './BusinessProfile';
import PersonalPerformance from './PersonalPerformance';
import Plan from './Plan';
import Billing from './Billing';
import Users from './Users';

interface PanelInicialProps {
  onNavigate: (page?: string) => void;
}

const subTabIds = [
  'profile',
  'business-structure',
  'business-profile',
  'personal-performance',
  'plan',
  'billing',
  'users',
] as const;

type PanelInicialTabId = (typeof subTabIds)[number];

const legacySubTabAliases: Partial<Record<string, PanelInicialTabId>> = {
  perfil: 'profile',
  estructuraEmpresarial: 'business-structure',
  perfilEmpresarial: 'business-profile',
  facturacion: 'billing',
  usuarios: 'users',
};

export default function PanelInicial({ onNavigate }: PanelInicialProps) {
  const { t } = useLanguage();
  const { activeTab: activeSubTab, setActiveTab: setActiveSubTab } = useRoutedModuleTab<PanelInicialTabId>(
    'profile',
    subTabIds,
    legacySubTabAliases,
  );

  const subTabs = [
    { id: 'profile', label: t.panelInicial.tabs.profile, emoji: '👤', component: Profile },
    { id: 'business-structure', label: t.panelInicial.tabs.businessStructure, emoji: '🏢', component: BusinessStructure },
    { id: 'business-profile', label: t.panelInicial.tabs.businessProfile, emoji: '📊', component: BusinessProfile },
    { id: 'personal-performance', label: t.panelInicial.tabs.personalPerformance, emoji: '📈', component: PersonalPerformance },
    { id: 'plan', label: t.panelInicial.tabs.plan, emoji: '📋', component: Plan },
    { id: 'billing', label: t.panelInicial.tabs.billing, emoji: '🧾', component: Billing },
    { id: 'users', label: t.panelInicial.tabs.users, emoji: '👥', component: Users },
  ];

  // Get the active component
  const ActiveComponent = subTabs.find(tab => tab.id === activeSubTab)?.component || Profile;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
                Configure your profile, business structure, billing, and more.
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
                  onClick={() => setActiveSubTab(tab.id as PanelInicialTabId)}
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
        <ActiveComponent />
      </div>
    </div>
  );
}
