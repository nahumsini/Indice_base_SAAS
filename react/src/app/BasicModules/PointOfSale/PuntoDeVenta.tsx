import { lazy, Suspense } from 'react';
import {
  ArrowLeft,
  BadgePercent,
  BarChart3,
  Boxes,
  ClipboardList,
  CreditCard,
  ReceiptText,
  Scissors,
  ShoppingBag,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { usePuntoDeVentaTranslations } from '../../hooks/usePuntoDeVentaTranslations';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';

const Sale = lazy(() => import('./Sale/Sale'));
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
  arqueos: 'cortes',
  productos: 'productos',
  ordenesCompra: 'ordenesCompra',
  ordenes_compra: 'ordenesCompra',
  credito: 'credito',
  credit: 'credito',
};

export default function PuntoDeVenta({ onNavigate }: PuntoDeVentaProps) {
  const t = usePuntoDeVentaTranslations();
  const { activeTab, isTabLoading, setActiveTab } = useRoutedModuleTab<PointOfSaleTabId>(
    'sale',
    pointOfSaleTabIds,
    legacyPointOfSaleTabAliases,
  );

  const tabs = [
    { id: 'sale' as const, label: 'Venta', icon: ShoppingCart, component: Sale },
    { id: 'cortes' as const, label: t.tabs.arqueos, icon: Scissors, component: Arqueos },
    { id: 'clientes' as const, label: t.tabs.clientes, icon: Users, component: Clientes },
    { id: 'productos' as const, label: t.tabs.productos, icon: ShoppingBag, component: Productos },
    { id: 'inventario' as const, label: t.tabs.inventario, icon: Boxes, component: Inventario },
    { id: 'ordenesCompra' as const, label: t.tabs.ordenesCompra, icon: ClipboardList, component: OrdenesCompra },
    { id: 'facturacion' as const, label: t.tabs.facturacion, icon: ReceiptText, component: Facturacion },
    { id: 'descuentos' as const, label: t.tabs.descuentos, icon: BadgePercent, component: Descuentos },
    { id: 'credito' as const, label: 'Credito', icon: CreditCard, component: Credito },
    { id: 'kpis' as const, label: t.tabs.kpis, icon: BarChart3, component: KPIs },
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
      <div className="border-b border-gray-200 bg-white px-4 py-5 dark:border-gray-700 dark:bg-gray-800 sm:px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto">
          {/* Barra de Favoritos */}
          <FavoritesBar 
            onNavigate={(page) => {
              if (page === 'point-of-sale') return;
              onNavigate(page);
            }} 
            currentModule="point-of-sale" 
          />
          
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 inline-flex rounded-md bg-orange-100 px-2 py-1 text-xs font-semibold uppercase text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                Terminal operativo
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                {t.title}
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                {t.subtitle}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => onNavigate()}
              className="text-sm gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.back}
            </Button>
          </div>

          {/* Pestañas */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? 'bg-gray-950 text-white shadow-md dark:bg-white dark:text-gray-950'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

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
