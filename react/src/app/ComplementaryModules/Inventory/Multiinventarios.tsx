import { lazy, Suspense, useMemo, useRef, type ComponentType } from 'react';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { cn } from '../../components/ui/utils';
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
const Proveedores = lazy(() => import('../../BasicModules/Sales/Providers'));
const OrdenesCompra = lazy(() => import('../../BasicModules/PointOfSale/OrdenesCompra'));

const inventoryTabIds = [
  'products',
  'inventory',
  'providers',
  'purchase-orders',
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
};

type InventoryTab = {
  id: InventoryTabId;
  label: string;
  emoji: string;
  component: ComponentType;
};

export default function Multiinventarios({ learningModeActive = false }: { learningModeActive?: boolean }) {
  return (
    <LearningModeHeaderActionsProvider active={learningModeActive}>
    <SalesCrmProvider>
      <InventoryWorkspace learningModeActive={learningModeActive} />
    </SalesCrmProvider>
    </LearningModeHeaderActionsProvider>
  );
}

function InventoryWorkspace({ learningModeActive }: { learningModeActive: boolean }) {
  const t = useInventoryModuleTranslations();
  const mainContentRef = useRef<HTMLElement>(null);
  const { activeTab, isTabLoading, setActiveTab } = useRoutedModuleTab<InventoryTabId>(
    'products',
    inventoryTabIds,
    legacyInventoryTabAliases,
  );

  const inventoryTabs = useMemo<InventoryTab[]>(() => [
    { id: 'products', label: t.tabs.products, emoji: '📦', component: Productos },
    { id: 'inventory', label: t.tabs.inventory, emoji: '🏬', component: Inventario },
    { id: 'providers', label: t.tabs.providers, emoji: '🏢', component: Proveedores },
    { id: 'purchase-orders', label: t.tabs.purchaseOrders, emoji: '📋', component: OrdenesCompra },
  ], [t]);

  const activeTabConfig = inventoryTabs.find((tab) => tab.id === activeTab) ?? inventoryTabs[0];
  const ActiveComponent = activeTabConfig.component;

  return (
    <div className="min-h-screen bg-gray-50 text-slate-950 dark:bg-gray-900 dark:text-white">
      <LoadingBarOverlay
        isVisible={isTabLoading}
        title={t.loading.openingTitle}
        description={t.loading.openingDescription}
      />

      <header className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                {t.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 sm:text-base">
                {t.subtitle}
              </p>
            </div>
          </div>

          <nav aria-label={t.navLabel} className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            <div className="flex min-w-max items-center gap-2 lg:min-w-0 lg:flex-wrap">
              {inventoryTabs.map((tab) => {
                const active = tab.id === activeTab;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/30',
                      active
                        ? 'bg-[#FF6B5E] text-white shadow-md shadow-[#FF6B5E]/20'
                        : 'bg-gray-100 text-slate-600 hover:bg-[#FF6B5E]/10 hover:text-[#B63B32] dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-[#FF6B5E]/15 dark:hover:text-[#FFB0AA]',
                    )}
                  >
                    <span className="text-base leading-none" aria-hidden="true">{tab.emoji}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {learningModeActive ? (
            <div className="mt-4">
              <SimpleModuleLearningGuide
                activeContextLabel={inventoryLearningLabels[activeTab]}
                controls={inventoryLearningControls[activeTab]}
                guideId="inventory-learning-guide"
                moduleTitle="Guía para conectar productos, compras e inventario"
                onPrimaryAction={() => mainContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                scopeId={`inventory-${activeTab}`}
                theme={learningModeGuideThemes.commercial}
              />
            </div>
          ) : null}
        </div>
      </header>

      <main ref={mainContentRef} className="mx-auto max-w-[1600px] scroll-mt-24 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
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
      </main>
    </div>
  );
}
