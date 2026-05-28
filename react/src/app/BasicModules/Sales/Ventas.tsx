import { lazy, Suspense } from 'react';
import { Home } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useVentasTranslations } from '../../hooks/useVentasTranslations';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import {
  salesModuleTabs,
  salesTabIds,
  type SalesTabId,
} from './salesIdentity';
import { SalesCrmProvider } from './salesCrmContext';

const Prospectos = lazy(() => import('./Prospectos'));
const Contactos = lazy(() => import('./Contactos'));
const Cotizacion = lazy(() => import('./Cotizacion'));
const Productos = lazy(() => import('./Productos'));
const Inventory = lazy(() => import('./Inventory'));
const Postventa = lazy(() => import('./Postventa'));
const Contrato = lazy(() => import('./Contrato'));
const KPIs = lazy(() => import('./KPIs'));

interface VentasProps {
  onNavigate: (page?: string) => void;
}

const legacySalesTabAliases: Partial<Record<string, SalesTabId>> = {
  prospectos: 'leads',
  contactos: 'contacts',
  cotizacion: 'quotes',
  productos: 'products',
  inventario: 'inventory',
  postventa: 'after-sales',
  contrato: 'contracts',
};

export default function Ventas({ onNavigate }: VentasProps) {
  const t = useVentasTranslations();
  const { activeTab, isTabLoading, setActiveTab } = useRoutedModuleTab<SalesTabId>(
    'leads',
    salesTabIds,
    legacySalesTabAliases,
  );

  const tabComponents = {
    leads: Prospectos,
    contacts: Contactos,
    quotes: Cotizacion,
    products: Productos,
    inventory: Inventory,
    'after-sales': Postventa,
    contracts: Contrato,
    kpis: KPIs,
  };
  const ActiveComponent = tabComponents[activeTab] || Prospectos;

  return (
    <div className="min-h-screen bg-gray-50 text-slate-950 dark:bg-gray-900 dark:text-white">
      <LoadingBarOverlay
        isVisible={isTabLoading}
        title={t.loadingTitle}
        description={t.loadingDescription}
      />

      <header className="border-b border-gray-200 bg-white px-8 py-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-[1600px]">
          <FavoritesBar
            onNavigate={(page) => {
              if (page === 'sales') return;
              onNavigate(page);
            }}
            currentModule="sales"
          />

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">{t.title}</h1>
              <p className="text-gray-600 dark:text-gray-400">{t.subtitle}</p>
            </div>
            <Button variant="outline" onClick={() => onNavigate()} className="h-11 gap-2 rounded-lg px-4 text-sm">
              <Home className="h-4 w-4" aria-hidden="true" />
              {t.back}
            </Button>
          </div>

          <nav className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
            {salesModuleTabs.map((tab) => {
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
                  <span>{t.tabs[tab.translationKey]}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-8 py-6">
        <SalesCrmProvider>
          <Suspense
            fallback={(
              <LoadingBarOverlay
                isVisible
                title={t.loadingFallbackTitle}
                description={t.loadingFallbackDescription}
              />
            )}
          >
            <ActiveComponent />
          </Suspense>
        </SalesCrmProvider>
      </main>
    </div>
  );
}
