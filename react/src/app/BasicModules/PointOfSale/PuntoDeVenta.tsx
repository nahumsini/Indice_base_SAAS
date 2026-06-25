import { lazy, Suspense } from 'react';
import {
  Home,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { usePuntoDeVentaTranslations } from '../../hooks/usePuntoDeVentaTranslations';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { SalesCrmProvider } from '../Sales/salesCrmContext';

const Sale = lazy(() => import('./Sale/Sale'));
const Cortes = lazy(() => import('./Cortes'));
const Arqueos = lazy(() => import('./Arqueos'));
const Clientes = lazy(() => import('./Clientes'));
const Productos = lazy(() => import('./Productos'));
const Inventario = lazy(() => import('./Inventario'));
const OrdenesCompra = lazy(() => import('./OrdenesCompra'));
const Facturacion = lazy(() => import('./Facturacion'));
const Descuentos = lazy(() => import('./Descuentos'));
const Credito = lazy(() => import('./Credito'));
const KPIs = lazy(() => import('./KPIs'));

interface PuntoDeVentaProps {
  onNavigate: (page?: string) => void;
}

const pointOfSaleTabIds = [
  'sale',
  'cortes',
  'arqueos',
  'clientes',
  'productos',
  'inventario',
  'ordenesCompra',
  'facturacion',
  'descuentos',
  'credito',
  'kpis',
] as const;

type PointOfSaleTabId = (typeof pointOfSaleTabIds)[number];

const legacyPointOfSaleTabAliases: Partial<Record<string, PointOfSaleTabId>> = {
  venta: 'sale',
  productos: 'productos',
  ordenesCompra: 'ordenesCompra',
  ordenes_compra: 'ordenesCompra',
  credito: 'credito',
  credit: 'credito',
};

export default function PuntoDeVenta({ onNavigate }: PuntoDeVentaProps) {
  return (
    <SalesCrmProvider>
      <PuntoDeVentaContent onNavigate={onNavigate} />
    </SalesCrmProvider>
  );
}

function PuntoDeVentaContent({ onNavigate }: PuntoDeVentaProps) {
  const t = usePuntoDeVentaTranslations();
  const { activeTab, isTabLoading, setActiveTab } = useRoutedModuleTab<PointOfSaleTabId>(
    'sale',
    pointOfSaleTabIds,
    legacyPointOfSaleTabAliases,
  );

  const tabs = [
    { id: 'sale' as const, label: t.tabs.sale, emoji: '🛒', component: Sale },
    { id: 'cortes' as const, label: t.tabs.cortes, emoji: '✂️', component: Cortes },
    { id: 'arqueos' as const, label: t.tabs.arqueos, emoji: '🛡️', component: Arqueos },
    { id: 'clientes' as const, label: t.tabs.clientes, emoji: '👥', component: Clientes },
    { id: 'productos' as const, label: t.tabs.productos, emoji: '🛍️', component: Productos },
    { id: 'inventario' as const, label: t.tabs.inventario, emoji: '🏬', component: Inventario },
    { id: 'ordenesCompra' as const, label: t.tabs.ordenesCompra, emoji: '📋', component: OrdenesCompra },
    { id: 'facturacion' as const, label: t.tabs.facturacion, emoji: '🧾', component: Facturacion },
    { id: 'descuentos' as const, label: t.tabs.descuentos, emoji: '🏷️', component: Descuentos },
    { id: 'credito' as const, label: t.tabs.credito, emoji: '💳', component: Credito },
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

      <header className="border-b border-gray-200 bg-white px-8 py-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-[1600px]">
          <FavoritesBar 
            onNavigate={(page) => {
              if (page === 'point-of-sale') return;
              onNavigate(page);
            }} 
            currentModule="point-of-sale" 
          />
          
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t.title}
              </h1>
              <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
                {t.subtitle}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => onNavigate()}
              className="gap-2 rounded-xl border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <Home className="h-4 w-4" />
              {t.back}
            </Button>
          </div>

          <nav className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-[#FF6B5E] text-white shadow-md shadow-[#FF6B5E]/20'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <span className="text-base leading-none" aria-hidden="true">{tab.emoji}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Contenido del tab activo */}
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
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
