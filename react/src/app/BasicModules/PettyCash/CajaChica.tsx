import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { useCajaChicaTranslations } from '../../hooks/useCajaChicaTranslations';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import Caja from './Caja';
import Control from './Control';
import KPIs from './KPIs';

interface CajaChicaProps {
  onNavigate: (page?: string) => void;
}

const pettyCashTabIds = [
  'cash',
  'control',
  'kpis',
] as const;

type PettyCashTabId = (typeof pettyCashTabIds)[number];

const legacyPettyCashTabAliases: Partial<Record<string, PettyCashTabId>> = {
  caja: 'cash',
};

export default function CajaChica({ onNavigate }: CajaChicaProps) {
  const t = useCajaChicaTranslations();
  const { activeTab, setActiveTab } = useRoutedModuleTab<PettyCashTabId>(
    'cash',
    pettyCashTabIds,
    legacyPettyCashTabAliases,
  );

  const tabs = [
    { id: 'cash', label: t.tabs.caja, emoji: '💵', component: Caja },
    { id: 'control', label: t.tabs.control, emoji: '📝', component: Control },
    { id: 'kpis', label: t.tabs.kpis, emoji: '📊', component: KPIs },
  ];

  // Get the active component
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || Caja;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header del módulo */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Barra de Favoritos */}
          <FavoritesBar 
            onNavigate={(page) => {
              if (page === 'petty-cash') return;
              onNavigate(page);
            }} 
            currentModule="petty-cash" 
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
                onClick={() => setActiveTab(tab.id as PettyCashTabId)}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-[#147514] text-white shadow-md'
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
