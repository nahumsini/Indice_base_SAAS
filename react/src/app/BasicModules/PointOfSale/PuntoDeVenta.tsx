import { lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import { Navigate, useParams } from 'react-router';
import { IndiceModuleShell } from '../../components/frontend-os';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { SalesCrmProvider } from '../Sales/salesCrmContext';
import { usePointOfSaleResolvedLocale, usePointOfSaleTranslations } from './hooks/usePointOfSaleTranslations';
import { PointOfSaleLegacyLocalizer } from './PointOfSaleLegacyLocalizer';
import { posBackendApi } from './Sale/services/posBackendApi';
import {
  LearningModeHeaderActionsProvider,
  learningModeGuideThemes,
  SimpleModuleLearningGuide,
} from '../../learningMode';
import {
  pointOfSaleLearningControls,
  pointOfSaleLearningLabels,
} from './operationalGuidance/pointOfSaleLearningControls';

const Sale = lazy(() => import('./Sale/Sale'));
const Cortes = lazy(() => import('./Cortes'));
const Clientes = lazy(() => import('../Sales/Contactos'));
const KPIs = lazy(() => import('./KPIs'));
const KiosksWorkspace = lazy(() => import('./Kiosks/KiosksWorkspace'));
const CashRegistersWorkspace = lazy(() => import('./CashRegisters/CashRegistersWorkspace'));

interface PuntoDeVentaProps {
  learningModeActive?: boolean;
  onNavigate: (page?: string) => void;
}

const pointOfSaleTabIds = [
  'sale',
  'cortes',
  'clientes',
  'kpis',
  'kiosks',
  'cajas',
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
  descuentos: '/inventory/discounts',
  discounts: '/inventory/discounts',
  promociones: '/inventory/discounts',
  promotions: '/inventory/discounts',
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

export default function PuntoDeVenta({ learningModeActive = false, onNavigate }: PuntoDeVentaProps) {
  const redirectTo = useExternalTabRedirect();

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <LearningModeHeaderActionsProvider active={learningModeActive}>
    <SalesCrmProvider>
      <PuntoDeVentaContent learningModeActive={learningModeActive} onNavigate={onNavigate} />
    </SalesCrmProvider>
    </LearningModeHeaderActionsProvider>
  );
}

function PuntoDeVentaContent({ learningModeActive = false, onNavigate }: PuntoDeVentaProps) {
  const t = usePointOfSaleTranslations();
  const locale = usePointOfSaleResolvedLocale();
  const params = useParams();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const enteredWithoutExplicitTab = useRef(!params['*']?.split('/').filter(Boolean)[0]);
  const operationalLandingResolved = useRef(false);
  const { activeTab, isTabLoading, setActiveTab } = useRoutedModuleTab<PointOfSaleTabId>(
    'sale',
    pointOfSaleTabIds,
    legacyPointOfSaleTabAliases,
  );

  useEffect(() => {
    if (!enteredWithoutExplicitTab.current || operationalLandingResolved.current || isTabLoading) {
      return;
    }

    operationalLandingResolved.current = true;
    let cancelled = false;
    void posBackendApi.context()
      .then((context) => {
        if (cancelled) return;
        const hasActiveCashRegister = context.cashRegisters.some((cashRegister) => (
          cashRegister.active && cashRegister.status === 'ACTIVE'
        ));
        const landingTab: PointOfSaleTabId = hasActiveCashRegister ? 'sale' : 'cajas';
        if (landingTab !== activeTab) {
          setActiveTab(landingTab);
        }
      })
      .catch(() => undefined);

    return () => { cancelled = true; };
  }, [activeTab, isTabLoading, setActiveTab]);

  const tabs = useMemo(() => [
    { id: 'cajas' as const, label: t.tabs.cajas, emoji: '🏪', component: CashRegistersWorkspace },
    { id: 'sale' as const, label: t.tabs.sale, emoji: '🧾', component: Sale },
    { id: 'cortes' as const, label: t.tabs.cortes, emoji: '💵', component: Cortes },
    { id: 'kiosks' as const, label: t.tabs.kiosks, emoji: '🖥️', component: KiosksWorkspace },
    { id: 'clientes' as const, label: t.tabs.clientes, emoji: '👥', component: Clientes },
    { id: 'kpis' as const, label: t.tabs.kpis, emoji: '📊', component: KPIs },
  ], [t]);

  const ActiveComponent = tabs.find((tab) => tab.id === activeTab)?.component || Sale;

  return (
    <IndiceModuleShell
      activeTab={activeTab}
      backLabel={t.back}
      contentRef={mainContentRef}
      currentModule="point-of-sale"
      guide={learningModeActive ? (
        <SimpleModuleLearningGuide
          activeContextLabel={pointOfSaleLearningLabels[activeTab]}
          controls={pointOfSaleLearningControls[activeTab]}
          guideId="point-of-sale-learning-guide"
          moduleTitle={t.title}
          onPrimaryAction={() => mainContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          scopeId={`point-of-sale-${activeTab}`}
          theme={learningModeGuideThemes.commercial}
        />
      ) : undefined}
      loadingOverlay={<LoadingBarOverlay isVisible={isTabLoading} title={t.loading.openingTitle} description={t.loading.openingDescription} />}
      onNavigate={onNavigate}
      onTabChange={setActiveTab}
      subtitle={t.subtitle}
      tabs={tabs.map(tab => ({ id: tab.id, label: tab.label, icon: tab.emoji }))}
      title={t.title}
      tone="coral"
    >
        <PointOfSaleLegacyLocalizer locale={locale}>
          <Suspense
            fallback={(
              <LoadingBarOverlay
                isVisible
                title={t.loading.fallbackTitle}
                description={t.loading.fallbackDescription}
              />
            )}
          >
            {activeTab === 'clientes'
              ? <Clientes titleBarTitle={t.tabs.clientes} />
              : <ActiveComponent />}
          </Suspense>
        </PointOfSaleLegacyLocalizer>
    </IndiceModuleShell>
  );
}
