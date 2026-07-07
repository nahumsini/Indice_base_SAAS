import {
  lazy,
  Suspense,
  useRef,
  type ComponentType,
  type LazyExoticComponent,
} from 'react';
import { Navigate, useParams } from 'react-router';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import {
  routedSalesTabIds,
  type SalesTabId,
} from './salesIdentity';
import { SalesCrmProvider } from './salesCrmContext';
import { SalesHeader } from './components/SalesHeader';
import { SalesLoadingState } from './components/SalesLoadingState';
import { SalesTabsNav } from './components/SalesTabsNav';
import { useSalesTranslations } from './hooks/useSalesTranslations';
import {
  OperationalModuleGuide,
  useSalesGuidanceTranslations,
} from './operationalGuidance';

interface SalesTabRuntimeProps {
  learningModeActive?: boolean;
}

type SalesTabRuntimeComponent = ComponentType<SalesTabRuntimeProps>;
type SalesTabLazyComponent = LazyExoticComponent<SalesTabRuntimeComponent>;

const Prospectos = lazy(() => import('./Prospectos')) as SalesTabLazyComponent;
const Contactos = lazy(() => import('./Contactos')) as SalesTabLazyComponent;
const Cotizacion = lazy(() => import('./Cotizacion')) as SalesTabLazyComponent;
const Sales = lazy(() => import('./Sales/Sales')) as SalesTabLazyComponent;
const Productos = lazy(() => import('./Productos')) as SalesTabLazyComponent;
const Providers = lazy(() => import('./Providers')) as SalesTabLazyComponent;
const Inventory = lazy(() => import('./Inventory')) as SalesTabLazyComponent;
const Postventa = lazy(() => import('./Postventa')) as SalesTabLazyComponent;
const Contrato = lazy(() => import('./Contrato')) as SalesTabLazyComponent;
const KPIs = lazy(() => import('./KPIs')) as SalesTabLazyComponent;

const salesTabComponents: Record<SalesTabId, SalesTabLazyComponent> = {
  leads: Prospectos,
  contacts: Contactos,
  quotes: Cotizacion,
  sales: Sales,
  products: Productos,
  providers: Providers,
  inventory: Inventory,
  contracts: Contrato,
  'after-sales': Postventa,
  kpis: KPIs,
};

interface VentasProps {
  learningModeActive?: boolean;
  onNavigate: (page?: string) => void;
}

const legacySalesTabAliases: Partial<Record<string, SalesTabId>> = {
  prospectos: 'leads',
  contactos: 'contacts',
  cotizacion: 'quotes',
  ventas: 'sales',
  sales: 'sales',
  productos: 'products',
  proveedores: 'providers',
  providers: 'providers',
  inventario: 'inventory',
  postventa: 'after-sales',
  contrato: 'contracts',
};

const inventoryTabRedirects: Record<string, string> = {
  producto: '/inventory/products',
  productos: '/inventory/products',
  product: '/inventory/products',
  products: '/inventory/products',
  proveedor: '/inventory/providers',
  proveedores: '/inventory/providers',
  provider: '/inventory/providers',
  providers: '/inventory/providers',
  supplier: '/inventory/providers',
  suppliers: '/inventory/providers',
  inventario: '/inventory/inventory',
  inventory: '/inventory/inventory',
  stock: '/inventory/inventory',
};

function useInventoryTabRedirect() {
  const params = useParams();
  const requestedTab = params['*']?.split('/').filter(Boolean)[0];

  return requestedTab ? inventoryTabRedirects[requestedTab] ?? null : null;
}

export default function Ventas({ learningModeActive = false, onNavigate }: VentasProps) {
  const redirectTo = useInventoryTabRedirect();

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <VentasContent learningModeActive={learningModeActive} onNavigate={onNavigate} />;
}

function VentasContent({ learningModeActive = false, onNavigate }: VentasProps) {
  const copy = useSalesTranslations();
  const guidanceCopy = useSalesGuidanceTranslations();
  const moduleContentRef = useRef<HTMLElement | null>(null);
  const { activeTab, isTabLoading, setActiveTab } = useRoutedModuleTab<SalesTabId>(
    'leads',
    routedSalesTabIds,
    legacySalesTabAliases,
  );
  const ActiveComponent = salesTabComponents[activeTab] || Prospectos;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-gray-900 dark:text-white">
      <SalesLoadingState
        isVisible={isTabLoading}
        title={copy.loading.openingTitle}
        description={copy.loading.openingDescription}
      />

      <header className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="mx-auto max-w-[1600px]">
          <SalesHeader copy={copy} onNavigate={onNavigate} />
          <SalesTabsNav activeTab={activeTab} copy={copy} onTabChange={setActiveTab} />
          {learningModeActive ? (
            <OperationalModuleGuide
              activeTabId={activeTab}
              copy={guidanceCopy}
              onPrimaryAction={() => moduleContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            />
          ) : null}
        </div>
      </header>

      <main ref={moduleContentRef} className="mx-auto max-w-[1600px] scroll-mt-6 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
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
            <ActiveComponent learningModeActive={learningModeActive} />
          </Suspense>
        </SalesCrmProvider>
      </main>
    </div>
  );
}
