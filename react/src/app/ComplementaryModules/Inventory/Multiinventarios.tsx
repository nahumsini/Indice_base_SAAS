import { lazy, Suspense, useMemo, useRef, type ComponentType, type ReactNode } from 'react';
import { IndiceModuleShell } from '../../components/frontend-os';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { SalesCrmProvider } from '../../BasicModules/Sales/salesCrmContext';
import { WarehouseColorIcon } from '../../BasicModules/Sales/Inventory/components/warehouses/WarehouseColorIcon';
import { useInventoryModuleTranslations } from './hooks/useInventoryModuleTranslations';
import {
  LearningModeHeaderActionsProvider,
  learningModeGuideThemes,
  SimpleModuleLearningGuide,
  type LearningModeJourneyStep,
} from '../../learningMode';
import {
  inventoryLearningControls,
} from './operationalGuidance/inventoryLearningControls';

const Productos = lazy(() => import('../../BasicModules/Sales/Productos'));
const Inventario = lazy(() => import('../../BasicModules/Sales/Inventory'));
const Almacenes = lazy(() => import('../../BasicModules/Sales/Inventory/Warehouses'));
const Proveedores = lazy(() => import('../../BasicModules/Sales/Providers'));
const OrdenesCompra = lazy(() => import('../../BasicModules/PointOfSale/OrdenesCompra'));
const Descuentos = lazy(() => import('../../BasicModules/PointOfSale/Descuentos'));

const inventoryTabIds = [
  'products',
  'warehouses',
  'inventory',
  'providers',
  'purchase-orders',
  'discounts',
] as const;

type InventoryTabId = (typeof inventoryTabIds)[number];

const inventoryLearningJourneyOrder: readonly InventoryTabId[] = [
  'products',
  'warehouses',
  'inventory',
  'providers',
  'purchase-orders',
  'discounts',
];

const inventoryLearningJourneyEmoji: Record<InventoryTabId, string> = {
  products: '📦',
  warehouses: '🏬',
  inventory: '🧮',
  providers: '🏢',
  'purchase-orders': '📋',
  discounts: '🏷️',
};

const inventoryLearningSignals: Record<InventoryTabId, string> = {
  products: 'Empieza por la ficha: un producto define qué compras o vendes, pero todavía no representa existencia física.',
  warehouses: 'Después define dónde vive el stock; cada almacén separa ubicación, responsable y disponibilidad real.',
  inventory: 'Aquí se cruzan producto + almacén: recibir, transferir o ajustar explica cada cambio de existencias.',
  providers: 'Relaciona el abastecimiento con un proveedor confiable antes de comprometer una compra.',
  'purchase-orders': 'La orden solicita; la recepción confirma lo que llegó y solo entonces aumenta el inventario del almacén.',
  discounts: 'Al final, publica reglas de descuento sobre productos ya controlados, con vigencia, canal y margen protegido.',
};

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
  icon: ReactNode;
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
    { id: 'products', label: t.tabs.products, icon: '📦', component: Productos },
    { id: 'warehouses', label: t.tabs.warehouses, icon: <WarehouseColorIcon className="h-[18px] w-[18px]" />, component: Almacenes },
    { id: 'inventory', label: t.tabs.inventory, icon: '🏬', component: Inventario },
    { id: 'providers', label: t.tabs.providers, icon: '🏢', component: Proveedores },
    { id: 'purchase-orders', label: t.tabs.purchaseOrders, icon: '📋', component: OrdenesCompra },
    { id: 'discounts', label: t.tabs.discounts, icon: '🏷️', component: Descuentos },
  ], [t]);

  const activeTabConfig = inventoryTabs.find((tab) => tab.id === activeTab) ?? inventoryTabs[0];
  const ActiveComponent = activeTabConfig.component;
  const learningJourney = useMemo<readonly LearningModeJourneyStep[]>(() => (
    inventoryLearningJourneyOrder.map((journeyId) => ({
      emoji: inventoryLearningJourneyEmoji[journeyId],
      id: journeyId,
      label: inventoryTabs.find((tab) => tab.id === journeyId)?.label ?? journeyId,
    }))
  ), [inventoryTabs]);

  return (
    <IndiceModuleShell
      activeTab={activeTab}
      contentRef={mainContentRef}
      currentModule="inventory"
      guide={learningModeActive ? (
        <SimpleModuleLearningGuide
          activeContextLabel={activeTabConfig.label}
          activeJourneyId={activeTab}
          contextSignal={inventoryLearningSignals[activeTab]}
          controls={inventoryLearningControls[activeTab]}
          guideId="inventory-learning-guide"
          journey={learningJourney}
          moduleTitle={t.title}
          onJourneyChange={(journeyId) => setActiveTab(journeyId as InventoryTabId)}
          onPrimaryAction={() => mainContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          scopeId={`inventory-${activeTab}`}
          theme={learningModeGuideThemes.commercial}
        />
      ) : undefined}
      loadingOverlay={<LoadingBarOverlay isVisible={isTabLoading} title={t.loading.openingTitle} description={t.loading.openingDescription} />}
      onNavigate={onNavigate}
      onTabChange={setActiveTab}
      subtitle={t.subtitle}
      tabs={inventoryTabs.map(tab => ({ id: tab.id, label: tab.label, icon: tab.icon }))}
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
