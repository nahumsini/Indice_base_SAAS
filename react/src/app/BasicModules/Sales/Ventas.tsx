import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { useVentasTranslations } from '../../hooks/useVentasTranslations';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import Prospectos from './Prospectos';
import Cotizacion from './Cotizacion';
import Productos from './Productos';
import Postventa from './Postventa';
import Contrato from './Contrato';
import KPIs from './KPIs';

interface VentasProps {
  onNavigate: (page?: string) => void;
}

const salesTabIds = [
  'leads',
  'quotes',
  'products',
  'after-sales',
  'contracts',
  'kpis',
] as const;

type SalesTabId = (typeof salesTabIds)[number];

const legacySalesTabAliases: Partial<Record<string, SalesTabId>> = {
  prospectos: 'leads',
  cotizacion: 'quotes',
  productos: 'products',
  postventa: 'after-sales',
  contrato: 'contracts',
};

export default function Ventas({ onNavigate }: VentasProps) {
  const t = useVentasTranslations();
  const { activeTab, setActiveTab } = useRoutedModuleTab<SalesTabId>(
    'leads',
    salesTabIds,
    legacySalesTabAliases,
  );

  const tabs = [
    { id: 'leads', label: t.tabs.prospectos, emoji: '🎯', component: Prospectos },
    { id: 'quotes', label: t.tabs.cotizacion, emoji: '💰', component: Cotizacion },
    { id: 'products', label: t.tabs.productos, emoji: '📦', component: Productos },
    { id: 'after-sales', label: t.tabs.postventa, emoji: '🔧', component: Postventa },
    { id: 'contracts', label: t.tabs.contrato, emoji: '✍️', component: Contrato },
    { id: 'kpis', label: t.tabs.kpis, emoji: '📊', component: KPIs },
  ];

  // Get the active component
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || Prospectos;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header del módulo */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Barra de Favoritos */}
          <FavoritesBar 
            onNavigate={(page) => {
              if (page === 'sales') return;
              onNavigate(page);
            }} 
            currentModule="sales" 
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
                onClick={() => setActiveTab(tab.id as SalesTabId)}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-orange-500 text-white shadow-md'
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
