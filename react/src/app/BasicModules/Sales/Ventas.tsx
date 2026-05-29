import { lazy, Suspense } from 'react';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import {
  salesTabIds,
  type SalesTabId,
} from './salesIdentity';
import { SalesCrmProvider } from './salesCrmContext';
import { SalesHeader } from './components/SalesHeader';
import { SalesLoadingState } from './components/SalesLoadingState';
import { SalesTabsNav } from './components/SalesTabsNav';
import { useSalesTranslations } from './hooks/useSalesTranslations';

const Prospectos = lazy(() => import('./Prospectos'));
const Contactos = lazy(() => import('./Contactos'));
const Cotizacion = lazy(() => import('./Cotizacion'));
const Sales = lazy(() => import('./Sales/Sales'));
const Productos = lazy(() => import('./Productos'));
const Inventory = lazy(() => import('./Inventory'));
const Postventa = lazy(() => import('./Postventa'));
const Contrato = lazy(() => import('./Contrato'));
const KPIs = lazy(() => import('./KPIs'));

const salesTabComponents = {
  leads: Prospectos,
  contacts: Contactos,
  quotes: Cotizacion,
  sales: Sales,
  products: Productos,
  inventory: Inventory,
  contracts: Contrato,
  'after-sales': Postventa,
  kpis: KPIs,
} satisfies Record<SalesTabId, typeof Prospectos>;

interface VentasProps {
  onNavigate: (page?: string) => void;
}

const legacySalesTabAliases: Partial<Record<string, SalesTabId>> = {
  prospectos: 'leads',
  contactos: 'contacts',
  cotizacion: 'quotes',
  ventas: 'sales',
  sales: 'sales',
  productos: 'products',
  inventario: 'inventory',
  postventa: 'after-sales',
  contrato: 'contracts',
};

export default function Ventas({ onNavigate }: VentasProps) {
  const copy = useSalesTranslations();
  const { activeTab, isTabLoading, setActiveTab } = useRoutedModuleTab<SalesTabId>(
    'leads',
    salesTabIds,
    legacySalesTabAliases,
  );
  const ActiveComponent = salesTabComponents[activeTab] || Prospectos;

  return (
    <div className="min-h-screen bg-gray-50 text-slate-950 dark:bg-gray-900 dark:text-white">
      <SalesLoadingState
        isVisible={isTabLoading}
        title={copy.loading.openingTitle}
        description={copy.loading.openingDescription}
      />

      <header className="border-b border-gray-200 bg-white px-8 py-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-[1600px]">
          <SalesHeader copy={copy} onNavigate={onNavigate} />
          <SalesTabsNav activeTab={activeTab} copy={copy} onTabChange={setActiveTab} />
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-8 py-6">
        <SalesCrmProvider>
          <Suspense
            fallback={(
              <SalesLoadingState
                isVisible
                title={copy.loading.fallbackTitle}
                description={copy.loading.fallbackDescription}
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
