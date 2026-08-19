import {
  lazy,
  Suspense,
  useRef,
  type ComponentType,
  type LazyExoticComponent,
} from 'react';
import { Navigate, useParams } from 'react-router';
import { IndiceModuleShell } from '../../components/frontend-os';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import {
  routedSalesTabIds,
  type SalesTabId,
  visibleSalesModuleTabs,
} from './salesIdentity';
import { SalesCrmProvider } from './salesCrmContext';
import { SalesDataStateBoundary } from './components/SalesDataStateBoundary';
import { SalesLoadingState } from './components/SalesLoadingState';
import { useSalesTranslations } from './hooks/useSalesTranslations';
import { LearningModeHeaderActionsProvider } from '../../learningMode';
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
const SalesCommissions = lazy(() => import('./SalesCommissions')) as SalesTabLazyComponent;
const SalesPaymentAccounts = lazy(() => import('./SalesPaymentAccounts')) as SalesTabLazyComponent;
const Contrato = lazy(() => import('./Contrato')) as SalesTabLazyComponent;
const KPIs = lazy(() => import('./KPIs')) as SalesTabLazyComponent;

const salesTabComponents: Partial<Record<SalesTabId, SalesTabLazyComponent>> = {
  leads: Prospectos,
  contacts: Contactos,
  quotes: Cotizacion,
  sales: Sales,
  commissions: SalesCommissions,
  'payment-accounts': SalesPaymentAccounts,
  contracts: Contrato,
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
  comisiones: 'commissions',
  commissions: 'commissions',
  'cuentas-de-pago': 'payment-accounts',
  'payment-accounts': 'payment-accounts',
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
  const moduleContentRef = useRef<HTMLDivElement | null>(null);
  const { activeTab, isTabLoading, setActiveTab } = useRoutedModuleTab<SalesTabId>(
    'leads',
    routedSalesTabIds,
    legacySalesTabAliases,
  );
  const ActiveComponent = salesTabComponents[activeTab] || Prospectos;

  return (
    <LearningModeHeaderActionsProvider active={learningModeActive}>
      <IndiceModuleShell
        activeTab={activeTab}
        backLabel={copy.back}
        contentRef={moduleContentRef}
        currentModule="sales"
        guide={learningModeActive ? (
          <OperationalModuleGuide
            activeTabId={activeTab}
            copy={guidanceCopy}
            onPrimaryAction={() => moduleContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />
        ) : undefined}
        loadingOverlay={<SalesLoadingState isVisible={isTabLoading} title={copy.loading.openingTitle} description={copy.loading.openingDescription} />}
        onNavigate={onNavigate}
        onTabChange={setActiveTab}
        subtitle={copy.subtitle}
        tabs={visibleSalesModuleTabs.map(tab => ({ id: tab.id, label: copy.tabs[tab.translationKey], icon: tab.emoji }))}
        title={copy.title}
        tone="coral"
      >
        <SalesCrmProvider>
          <SalesDataStateBoundary>
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
          </SalesDataStateBoundary>
        </SalesCrmProvider>
      </IndiceModuleShell>
    </LearningModeHeaderActionsProvider>
  );
}
