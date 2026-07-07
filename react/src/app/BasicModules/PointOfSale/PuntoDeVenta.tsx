import { lazy, Suspense, useMemo } from 'react';
import { Navigate, useParams } from 'react-router';
import { Home } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { SalesCrmProvider } from '../Sales/salesCrmContext';
import { usePointOfSaleTranslations } from './hooks/usePointOfSaleTranslations';

const Sale = lazy(() => import('./Sale/Sale'));
const Cortes = lazy(() => import('./Cortes'));
const Clientes = lazy(() => import('../Sales/Contactos'));
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
  'facturacion',
  'descuentos',
  'kpis',
] as const;

type PointOfSaleTabId = (typeof pointOfSaleTabIds)[number];

const legacyPointOfSaleTabAliases: Partial<Record<string, PointOfSaleTabId>> = {
  venta: 'sale',
  contacts: 'clientes',
  contactos: 'clientes',
  customers: 'clientes',
  clientes: 'clientes',
};

const externalTabRedirects: Record<string, string> = {
  producto: '/inventory/products',
  productos: '/inventory/products',
  product: '/inventory/products',
  products: '/inventory/products',
  inventario: '/inventory/inventory',
  inventory: '/inventory/inventory',
  stock: '/inventory/inventory',
  proveedor: '/inventory/providers',
  proveedores: '/inventory/providers',
  provider: '/inventory/providers',
  providers: '/inventory/providers',
  supplier: '/inventory/providers',
  suppliers: '/inventory/providers',
  ordenesCompra: '/inventory/purchase-orders',
  ordenes_compra: '/inventory/purchase-orders',
  'ordenes-compra': '/inventory/purchase-orders',
  compras: '/inventory/purchase-orders',
  purchaseOrders: '/inventory/purchase-orders',
  purchase_orders: '/inventory/purchase-orders',
  'purchase-orders': '/inventory/purchase-orders',
  credito: '/receivables/credit-sales',
  credit: '/receivables/credit-sales',
  creditos: '/receivables/credit-sales',
  credits: '/receivables/credit-sales',
  cartera: '/receivables/credit-sales',
  receivables: '/receivables/credit-sales',
};

function useExternalTabRedirect() {
  const params = useParams();
  const requestedTab = params['*']?.split('/').filter(Boolean)[0];

  return requestedTab ? externalTabRedirects[requestedTab] ?? null : null;
}

export default function PuntoDeVenta({ onNavigate }: PuntoDeVentaProps) {
  const redirectTo = useExternalTabRedirect();

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <SalesCrmProvider>
      <PuntoDeVentaContent onNavigate={onNavigate} />
    </SalesCrmProvider>
  );
}

function PuntoDeVentaContent({ onNavigate }: PuntoDeVentaProps) {
  const t = usePointOfSaleTranslations();
  const { activeTab, isTabLoading, setActiveTab } = useRoutedModuleTab<PointOfSaleTabId>(
    'sale',
    pointOfSaleTabIds,
    legacyPointOfSaleTabAliases,
  );

  const tabs = useMemo(() => [
    { id: 'sale' as const, label: t.tabs.sale, emoji: '🛒', component: Sale },
    { id: 'cortes' as const, label: t.tabs.cortes, emoji: '✂️', component: Cortes },
    { id: 'clientes' as const, label: t.tabs.clientes, emoji: '👥', component: Clientes },
    { id: 'facturacion' as const, label: t.tabs.facturacion, emoji: '🧾', component: Facturacion },
    { id: 'descuentos' as const, label: t.tabs.descuentos, emoji: '🏷️', component: Descuentos },
    { id: 'kpis' as const, label: t.tabs.kpis, emoji: '📊', component: KPIs },
  ], [t]);

  const ActiveComponent = tabs.find((tab) => tab.id === activeTab)?.component || Sale;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <LoadingBarOverlay
        isVisible={isTabLoading}
        title={t.loading.openingTitle}
        description={t.loading.openingDescription}
      />

      <header className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="mx-auto max-w-[1600px]">
          <FavoritesBar
            onNavigate={(page) => {
              if (page === 'point-of-sale') return;
              onNavigate(page);
            }}
            currentModule="point-of-sale"
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                {t.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 sm:text-base">
                {t.subtitle}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => onNavigate()}
              className="w-full justify-center gap-2 text-sm sm:w-auto"
            >
              <Home className="h-4 w-4" />
              {t.back}
            </Button>
          </div>

          <nav className="-mx-4 mt-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0" aria-label={t.navLabel}>
            <div className="flex min-w-max items-center gap-2 lg:min-w-0 lg:flex-wrap">
              {tabs.map((tab) => {
                const active = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/30 ${
                      active
                        ? 'bg-[#FF6B5E] text-white shadow-md shadow-[#FF6B5E]/20'
                        : 'bg-slate-100 text-slate-600 hover:bg-[#FF6B5E]/10 hover:text-[#B63B32] dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-[#FF6B5E]/15 dark:hover:text-[#FFB0AA]'
                    }`}
                  >
                    <span className="text-base leading-none" aria-hidden="true">{tab.emoji}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <Suspense
          fallback={(
            <LoadingBarOverlay
              isVisible
              title={t.loading.fallbackTitle}
              description={t.loading.fallbackDescription}
            />
          )}
        >
          <ActiveComponent />
        </Suspense>
      </div>
    </div>
  );
}
