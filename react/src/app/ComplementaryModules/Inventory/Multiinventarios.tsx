import { lazy, Suspense, useMemo, useRef, type ComponentType } from 'react';
import { IndiceModuleShell } from '../../components/frontend-os';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { SalesCrmProvider } from '../../BasicModules/Sales/salesCrmContext';
import { useInventoryModuleTranslations } from './hooks/useInventoryModuleTranslations';
import {
  LearningModeHeaderActionsProvider,
  learningModeGuideThemes,
  SimpleModuleLearningGuide,
} from '../../learningMode';
import {
  inventoryLearningControls,
  inventoryLearningLabels,
} from './operationalGuidance/inventoryLearningControls';

const Productos = lazy(() => import('../../BasicModules/Sales/Productos'));
const Inventario = lazy(() => import('../../BasicModules/Sales/Inventory'));
const Almacenes = lazy(() => import('../../BasicModules/Sales/Inventory/Warehouses'));
const Proveedores = lazy(() => import('../../BasicModules/Sales/Providers'));
const OrdenesCompra = lazy(() => import('../../BasicModules/PointOfSale/OrdenesCompra'));
const Descuentos = lazy(() => import('../../BasicModules/PointOfSale/Descuentos'));

const inventoryTabIds = [
  'products',
  'inventory',
  'warehouses',
  'providers',
  'purchase-orders',
  'discounts',
] as const;

type InventoryTabId = (typeof inventoryTabIds)[number];

const legacyInventoryTabAliases: Partial<Record<string, InventoryTabId>> = {
  producto: 'products',
  productos: 'products',
  product: 'products',
  products: 'products',
  inventario: 'inventory',
  inventory: 'inventory',
  stock: 'inventory',
  almacen: 'warehouses',
  almacenes: 'warehouses',
  warehouse: 'warehouses',
  warehouses: 'warehouses',
  proveedor: 'providers',
  proveedores: 'providers',
  provider: 'providers',
  providers: 'providers',
  supplier: 'providers',
  suppliers: 'providers',
  ordenesCompra: 'purchase-orders',
  ordenes_compra: 'purchase-orders',
  'ordenes-compra': 'purchase-orders',
  compras: 'purchase-orders',
  purchaseOrders: 'purchase-orders',
  purchase_orders: 'purchase-orders',
  'purchase-orders': 'purchase-orders',
  descuento: 'discounts',
  descuentos: 'discounts',
  discount: 'discounts',
  discounts: 'discounts',
  promocion: 'discounts',
  promociones: 'discounts',
  promotion: 'discounts',
  promotions: 'discounts',
};

type InventoryTab = {
  id: InventoryTabId;
  label: string;
  emoji: string;
  component: ComponentType;
};

export default function Multiinventarios({ learningModeActive = false, onNavigate }: { learningModeActive?: boolean; onNavigate?: (page?: string) => void }) {
  return (
    <LearningModeHeaderActionsProvider active={learningModeActive}>
    <SalesCrmProvider>
      <InventoryWorkspace learningModeActive={learningModeActive} onNavigate={onNavigate} />
    </SalesCrmProvider>
    </LearningModeHeaderActionsProvider>
  );
}

function InventoryWorkspace({ learningModeActive, onNavigate }: { learningModeActive: boolean; onNavigate?: (page?: string) => void }) {
  const t = useInventoryModuleTranslations();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const { activeTab, isTabLoading, setActiveTab } = useRoutedModuleTab<InventoryTabId>(
    'products',
    inventoryTabIds,
    legacyInventoryTabAliases,
  );

  const inventoryTabs = useMemo<InventoryTab[]>(() => [
    { id: 'products', label: t.tabs.products, emoji: '📦', component: Productos },
    { id: 'inventory', label: t.tabs.inventory, emoji: '🏬', component: Inventario },
    { id: 'warehouses', label: t.tabs.warehouses, emoji: '🏭', component: Almacenes },
    { id: 'providers', label: t.tabs.providers, emoji: '🏢', component: Proveedores },
    { id: 'purchase-orders', label: t.tabs.purchaseOrders, emoji: '📋', component: OrdenesCompra },
    { id: 'discounts', label: t.tabs.discounts, emoji: '🏷️', component: Descuentos },
  ], [t]);

  const activeTabConfig = inventoryTabs.find((tab) => tab.id === activeTab) ?? inventoryTabs[0];
  const ActiveComponent = activeTabConfig.component;

  return (
    <IndiceModuleShell
      activeTab={activeTab}
      contentRef={mainContentRef}
      currentModule="inventory"
      guide={learningModeActive ? (
        <SimpleModuleLearningGuide
          activeContextLabel={inventoryLearningLabels[activeTab]}
          controls={inventoryLearningControls[activeTab]}
          guideId="inventory-learning-guide"
          moduleTitle={t.title}
          onPrimaryAction={() => mainContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          scopeId={`inventory-${activeTab}`}
          theme={learningModeGuideThemes.commercial}
        />
      ) : undefined}
      loadingOverlay={<LoadingBarOverlay isVisible={isTabLoading} title={t.loading.openingTitle} description={t.loading.openingDescription} />}
      onNavigate={onNavigate}
      onTabChange={setActiveTab}
      subtitle={t.subtitle}
      tabs={inventoryTabs.map(tab => ({ id: tab.id, label: tab.label, icon: tab.emoji }))}
      title={t.title}
      tone="coral"
    >
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
    </IndiceModuleShell>
  );
}
