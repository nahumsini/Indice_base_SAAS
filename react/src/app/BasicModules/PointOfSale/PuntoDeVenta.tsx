import { lazy, Suspense } from 'react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { usePuntoDeVentaTranslations } from '../../hooks/usePuntoDeVentaTranslations';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';

const Sale = lazy(() => import('./Sale/Sale'));
const Cortes = lazy(() => import('./Cortes'));
const Clientes = lazy(() => import('./Clientes'));
const Productos = lazy(() => import('./Productos'));
const Inventario = lazy(() => import('./Inventario'));
const OrdenesCompra = lazy(() => import('./OrdenesCompra'));
const Facturacion = lazy(() => import('./Facturacion'));
const Descuentos = lazy(() => import('./Descuentos'));
const KPIs = lazy(() => import('./KPIs'));

interface PuntoDeVentaProps {
  onNavigate: (page?: string) => void;
}

const pointOfSaleTabIds = [
  'sale',
  'cortes',
  'clientes',
  'productos',
  'inventario',
  'ordenesCompra',
  'facturacion',
  'descuentos',
  'kpis',
] as const;

type PointOfSaleTabId = (typeof pointOfSaleTabIds)[number];

const legacyPointOfSaleTabAliases: Partial<Record<string, PointOfSaleTabId>> = {
  venta: 'sale',
  arqueos: 'cortes',
  productos: 'productos',
  ordenesCompra: 'ordenesCompra',
  ordenes_compra: 'ordenesCompra',
};

export default function PuntoDeVenta({ onNavigate }: PuntoDeVentaProps) {
  const t = usePuntoDeVentaTranslations();
  const { activeTab, isTabLoading, setActiveTab } = useRoutedModuleTab<PointOfSaleTabId>(
    'sale',
    pointOfSaleTabIds,
    legacyPointOfSaleTabAliases,
  );

  const tabs = [
    { id: 'sale' as const, label: 'Venta', emoji: '🛒', component: Sale },
    { id: 'cortes' as const, label: t.tabs.arqueos, emoji: '💰', component: Cortes },
    { id: 'clientes' as const, label: t.tabs.clientes, emoji: '👥', component: Clientes },
    { id: 'productos' as const, label: t.tabs.productos, emoji: '🛍️', component: Productos },
    { id: 'inventario' as const, label: t.tabs.inventario, emoji: '📦', component: Inventario },
    { id: 'ordenesCompra' as const, label: t.tabs.ordenesCompra, emoji: '📋', component: OrdenesCompra },
    { id: 'facturacion' as const, label: t.tabs.facturacion, emoji: '🧾', component: Facturacion },
    { id: 'descuentos' as const, label: t.tabs.descuentos, emoji: '🎁', component: Descuentos },
    { id: 'kpis' as const, label: t.tabs.kpis, emoji: '📊', component: KPIs },
  ];

  // Get the active component
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || Sale;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <LoadingBarOverlay
        isVisible={isTabLoading}
        title="Loading point of sale tab"
        description="Opening the selected sales operation workspace."
      />

      {/* Header del módulo */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Barra de Favoritos */}
          <FavoritesBar 
            onNavigate={(page) => {
              if (page === 'punto-de-venta') return; // Ya estamos aquí
              onNavigate(page);
            }} 
            currentModule="punto-de-venta" 
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
                onClick={() => setActiveTab(tab.id)}
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
        <Suspense
          fallback={(
            <LoadingBarOverlay
              isVisible
              title="Loading point of sale tab"
              description="Downloading only the selected sales operation workspace."
            />
          )}
        >
          <ActiveComponent />
        </Suspense>
      </div>
    </div>
  );
}
