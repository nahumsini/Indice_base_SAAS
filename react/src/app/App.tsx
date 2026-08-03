import { lazy, Suspense, useEffect, useRef, useState, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import { CreditCard, Settings } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Header } from './components/Header';
import { KPICard } from './components/KPICard';
import { KPICarousel } from './components/KPICarousel';
import { ModuleCard } from './components/ModuleCard';
import { ModuleCarousel } from './components/ModuleCarousel';
import { LearningModeBanner } from './components/LearningModeBanner';
import { KPIConfiguration } from './components/KPIConfiguration';
import { LoadingBarOverlay } from './components/LoadingBarOverlay';
import { SuccessToast } from './components/SuccessToast';
import { FavoritesBar } from './components/FavoritesBar';
import { Button } from './components/ui/button';
import { MainDashboard } from './Dashboard';
import { useLanguage } from './shared/context';
import { useFavorites } from './shared/context';
import {
  getPagePath,
  resolvePageId,
  type PageId,
} from './config/navigation';
import { useLocalStorageState } from './hooks/useLocalStorageState';
import { useLearningModePreferences } from './hooks/useLearningModePreferences';
import { dashboardApi } from './api/dashboard';
import { authApi } from './api/auth';
import type { AuthSessionResponse } from './api/auth.types';
import { buildDefaultModuleCatalog, FRONTEND_OWNED_BASIC_MODULE_ROUTES, routeForBackendSlug } from './config/moduleCatalog';
import { useAccessibleModuleCatalog } from './hooks/useAccessibleModuleCatalog';
import { canAccessModulePage, isAdminAccessRole } from './access/accessRules';
import { allowedModuleTabIds, MODULE_TAB_SCOPE_CATALOG } from './access/tabScopeCatalog';
import { BusinessCurrencyProvider } from './BasicModules/shared/BusinessCurrencyContext';

const getNavigationSuccessToast = (state: unknown) => {
  if (!state || typeof state !== 'object' || !('successToast' in state)) {
    return '';
  }

  const successToast = (state as { successToast?: unknown }).successToast;
  return typeof successToast === 'string' ? successToast : '';
};

const MODULE_NAVIGATION_LOADING_MS = 700;

const HumanResources = lazy(() => import('./BasicModules/HumanResources'));
const ProcessesTasks = lazy(() => import('./BasicModules/ProcessesTasks'));
const PanelInicial = lazy(() => import('./BasicModules/Dashboard'));
const Gastos = lazy(() => import('./BasicModules/Expenses/ExpensesModule'));
const CajaChica = lazy(() => import('./BasicModules/PettyCash'));
const PuntoVenta = lazy(() => import('./BasicModules/PointOfSale'));
const Ventas = lazy(() => import('./BasicModules/Sales'));
const Cartera = lazy(() => import('./BasicModules/Receivables'));
const Kpis = lazy(() => import('./BasicModules/Kpis'));
const Mantenimiento = lazy(() => import('./ComplementaryModules/Maintenance'));
const Inventarios = lazy(() => import('./ComplementaryModules/Inventory'));
const ControlMinutas = lazy(() => import('./ComplementaryModules/MinutesControl'));
const Limpieza = lazy(() => import('./ComplementaryModules/Cleaning'));
const Lavanderia = lazy(() => import('./ComplementaryModules/Laundry'));
const Transportacion = lazy(() => import('./ComplementaryModules/Transportation'));
const VehiculosMaquinaria = lazy(() => import('./ComplementaryModules/VehiclesMachinery'));
const Inmuebles = lazy(() => import('./ComplementaryModules/Properties'));
const Formularios = lazy(() => import('./ComplementaryModules/Forms'));
const FacturacionComplementaria = lazy(() => import('./ComplementaryModules/Invoicing'));
const CorreoElectronico = lazy(() => import('./ComplementaryModules/Email'));
const ClimaLaboral = lazy(() => import('./ComplementaryModules/WorkClimate'));
const Afiliados = lazy(() => import('./ComplementaryModules/Affiliates'));
const AgenteVentas = lazy(() => import('./AIModules/SalesAgent'));
const Analitica = lazy(() => import('./AIModules/Analytics'));
const Capacitacion = lazy(() => import('./AIModules/Training'));
const Coach = lazy(() => import('./AIModules/Coach'));
const SubscriptionManagementPage = lazy(() => import('./Billing/SubscriptionManagementPage'));

type StandaloneModuleComponent = ComponentType | LazyExoticComponent<ComponentType>;
type SubscriptionSessionInfo = {
  status: string;
  access_allowed: boolean;
  lock_reason?: string;
  trial_end_at?: string;
} | null;

function StandaloneModuleShell({
  children,
  currentModule,
  onNavigate,
}: {
  children: ReactNode;
  currentModule: PageId;
  onNavigate: (page?: string) => void;
}) {
  return (
    <div>
      <div className="max-w-[1600px] mx-auto px-8 pt-6">
        <FavoritesBar
          onNavigate={(page) => {
            if (resolvePageId(page) === currentModule) return;
            onNavigate(page);
          }}
          currentModule={currentModule}
        />
      </div>
      {children}
    </div>
  );
}

function SubscriptionRequiredScreen({
  subscription,
  onManageBilling,
}: {
  subscription: SubscriptionSessionInfo;
  onManageBilling: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-3xl items-center px-6 py-12">
      <section className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-blue-50 p-3 text-[var(--indice-structural-blue)]">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Subscription required</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Access is paused for this company. Status: {subscription?.status || 'inactive'}
              {subscription?.lock_reason ? ` (${subscription.lock_reason})` : ''}.
            </p>
            <Button className="mt-5 bg-[var(--indice-structural-blue)] hover:bg-[var(--indice-structural-blue-hover)]" onClick={onManageBilling}>
              Manage billing
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Dashboard({
  learningModeActive,
  learningModeVisible,
  setLearningModeVisible,
  learningStep,
  setLearningStep,
  onNavigate,
}: {
  learningModeActive: boolean;
  learningModeVisible: boolean;
  setLearningModeVisible: (visible: boolean) => void;
  learningStep: number;
  setLearningStep: (step: number) => void;
  onNavigate: (page: PageId) => void;
}) {
  const { t } = useLanguage();
  const { favorites, toggleFavorite, getFavoriteModules } = useFavorites();
  const [isKPIConfigOpen, setIsKPIConfigOpen] = useState(false);
  const availableModules = useAccessibleModuleCatalog(t);
  const [selectedKPIIds, setSelectedKPIIds] = useLocalStorageState<string[]>('indice.dashboard.selectedKpis', [
    'weeklyRevenue',
    'netProfit',
    'activeClients',
    'activeEmployees',
    'pendingTasks',
    'monthlyExpenses'
  ]);

  const handleNextStep = () => {
    if (learningStep < 7) {
      setLearningStep(learningStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (learningStep > 0) {
      setLearningStep(learningStep - 1);
    }
  };

  const handleSaveKPIs = (kpis: string[]) => {
    setSelectedKPIIds(kpis);
  };

  const handleModuleClick = (moduleRoute: PageId) => {
    onNavigate(moduleRoute);
  };

  // Mapeo de IDs de KPIs a datos visuales
  const kpiDataMap: Record<string, any> = {
    weeklyRevenue: { title: t.kpis.weeklyRevenue, value: '$45,200', change: `+6% ${t.kpis.vsWeekBefore}`, isPositive: true },
    netProfit: { title: t.kpis.netProfit, value: '$28,750', change: `+12% ${t.kpis.thisMonth}`, isPositive: true },
    activeClients: { title: t.kpis.activeClients, value: '245', change: `+18 ${t.kpis.newOnes}`, isPositive: true },
    activeEmployees: { title: t.kpis.activeEmployees, value: '18', change: `+2 ${t.kpis.thisMonth}`, isPositive: true },
    pendingTasks: { title: t.kpis.pendingTasks, value: '12', change: `3 ${t.kpis.dueToday}`, isPositive: false },
    monthlyExpenses: { title: t.kpis.monthlyExpenses, value: '$15,320', change: `+10% ${t.kpis.vsMonthBefore}`, isPositive: false },
    // Simulated fallback metrics for secondary KPI cards
    expensesByCategory: { title: 'Expenses by Category', value: '$8,450', change: '+5% vs last month', isPositive: false },
    pendingExpenses: { title: 'Pending Expenses', value: '8', change: '2 due today', isPositive: false },
    pettyCashBalance: { title: 'Petty Cash Balance', value: '$2,500', change: '-15% vs last month', isPositive: false },
    pettyCashExpenses: { title: 'Monthly Petty Cash Expenses', value: '$1,800', change: '+8% vs last month', isPositive: false },
    monthlyRevenue: { title: 'Monthly Revenue', value: '$180,500', change: '+15% vs last month', isPositive: true },
    averageTicket: { title: 'Average Ticket', value: '$736', change: '+3% vs last month', isPositive: true },
    salesConversion: { title: 'Sales Conversion Rate', value: '23%', change: '+2% vs last month', isPositive: true },
    dailySales: { title: 'Daily Sales', value: '$6,200', change: '+8% vs yesterday', isPositive: true },
    transactionsCount: { title: 'Transactions', value: '142', change: '+12 vs yesterday', isPositive: true },
    newHires: { title: 'New Hires', value: '3', change: 'this month', isPositive: true },
    employeeTurnover: { title: 'Employee Turnover', value: '5%', change: '-2% vs last month', isPositive: true },
    absenteeismRate: { title: 'Absenteeism Rate', value: '3%', change: '+1% vs last month', isPositive: false },
    payrollCost: { title: 'Payroll Cost', value: '$45,000', change: '+5% vs last month', isPositive: false },
    newClients: { title: 'New Clients', value: '28', change: '+10 vs last month', isPositive: true },
    clientRetention: { title: 'Client Retention', value: '92%', change: '+3% vs last month', isPositive: true },
    customerLifetimeValue: { title: 'Customer Lifetime Value', value: '$12,450', change: '+8% vs last month', isPositive: true },
    completedTasks: { title: 'Completed Tasks', value: '48', change: 'this week', isPositive: true },
    taskCompletionRate: { title: 'Task Completion Rate', value: '87%', change: '+5% vs last week', isPositive: true },
    overdueTasks: { title: 'Overdue Tasks', value: '5', change: '-2 vs last week', isPositive: true },
    inventoryValue: { title: 'Inventory Value', value: '$85,000', change: '+3% vs last month', isPositive: true },
    stockLevel: { title: 'Stock Level', value: '850', change: 'units', isPositive: true },
    lowStockItems: { title: 'Low Stock Items', value: '12', change: '+3 vs last week', isPositive: false },
    inventoryTurnover: { title: 'Inventory Turnover', value: '4.2x', change: '+0.3 vs last month', isPositive: true },
    pendingMaintenance: { title: 'Pending Maintenance', value: '6', change: '2 urgent', isPositive: false },
    maintenanceCost: { title: 'Maintenance Cost', value: '$3,200', change: '+12% vs last month', isPositive: false },
    equipmentUptime: { title: 'Equipment Uptime', value: '95%', change: '+2% vs last month', isPositive: true },
    invoicesIssued: { title: 'Invoices Issued', value: '156', change: 'this month', isPositive: true },
    pendingInvoices: { title: 'Pending Invoices', value: '23', change: '8 overdue', isPositive: false },
    collectionRate: { title: 'Collection Rate', value: '88%', change: '+3% vs last month', isPositive: true },
    employeeSatisfaction: { title: 'Employee Satisfaction', value: '8.2/10', change: '+0.5 vs last quarter', isPositive: true },
    engagementScore: { title: 'Engagement Score', value: '78%', change: '+6% vs last quarter', isPositive: true },
  };

  const kpiData = selectedKPIIds.map(id => kpiDataMap[id]).filter(Boolean);

  const mainModules = availableModules.filter((module) => module.category === 'basic');
  const complementaryModules = availableModules.filter((module) => module.category === 'complementary');
  const aiModules = availableModules.filter((module) => module.category === 'ai');

  const favoriteModules = getFavoriteModules(availableModules);
  const isGuidedLearningVisible = learningModeActive && learningModeVisible;

  return (
    <main className="max-w-[1600px] mx-auto px-8 py-10 space-y-12">
      {/* Modo Aprendiz Banner */}
      {isGuidedLearningVisible && (
        <LearningModeBanner
          isVisible={learningModeVisible}
          onHide={() => setLearningModeVisible(false)}
          currentStep={learningStep}
          totalSteps={8}
          onNext={handleNextStep}
          onPrevious={handlePreviousStep}
        />
      )}

      {/* Sección KPIs - Solo visible cuando Modo Aprendiz está desactivado */}
      {!isGuidedLearningVisible && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                📊 {t.sections.kpis}
              </h2>
              {kpiData.length > 0 && (
                <span className="bg-[#558DBD] text-white text-sm font-medium px-3 py-1 rounded-full">
                  {kpiData.length}
                </span>
              )}
            </div>
            <KPIConfiguration
              isOpen={isKPIConfigOpen}
              onOpen={() => setIsKPIConfigOpen(true)}
              onClose={() => setIsKPIConfigOpen(false)}
              selectedKPIIds={selectedKPIIds}
              onSave={handleSaveKPIs}
            />
          </div>
          {kpiData.length > 0 ? (
            <KPICarousel>
              {kpiData.map((kpi, index) => (
                <KPICard key={index} {...kpi} orderNumber={index + 1} />
              ))}
            </KPICarousel>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No KPIs configured
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Select the KPIs you want to display to get started.
              </p>
              <Button 
                onClick={() => setIsKPIConfigOpen(true)}
                className="bg-[#558DBD] hover:bg-[#4a7aa8] text-white"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configure KPIs
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Sección Favoritos - Solo visible cuando Modo Aprendiz está desactivado */}
      {!isGuidedLearningVisible && favoriteModules.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              ⭐ {t.sections.favorites}
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t.sections.quickAccess}</span>
          </div>
          <ModuleCarousel gridClasses="grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10">
            {favoriteModules.map((module, index) => (
              <ModuleCard
                key={index}
                {...module}
                isFavorite={true}
                onToggleFavorite={() => toggleFavorite(module.id)}
                onClick={() => handleModuleClick(module.route)}
                size="small"
              />
            ))}
          </ModuleCarousel>
        </section>
      )}

      {/* Sección Módulos Principales */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            🏢 {t.sections.basicModules}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t.sections.main}</span>
        </div>
        <ModuleCarousel gridClasses="grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10">
          {mainModules.map((module, index) => (
            <ModuleCard
              key={index}
              {...module}
              isFavorite={favorites.includes(module.id)}
              onToggleFavorite={() => toggleFavorite(module.id)}
              onClick={() => handleModuleClick(module.route)}
              size="small"
              stepNumber={isGuidedLearningVisible ? index + 1 : undefined}
              isHighlighted={isGuidedLearningVisible && learningStep === index}
            />
          ))}
        </ModuleCarousel>
      </section>

      {/* Sección Módulos Complementarios */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            🔧 {t.sections.complementaryModules}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t.sections.additional}</span>
        </div>
        <ModuleCarousel singleRow={true}>
          {complementaryModules.map((module, index) => (
            <ModuleCard
              key={index}
              {...module}
              isFavorite={favorites.includes(module.id)}
              onToggleFavorite={() => toggleFavorite(module.id)}
              onClick={() => handleModuleClick(module.route)}
              size="small"
            />
          ))}
        </ModuleCarousel>
      </section>

      {/* Sección Módulos de IA */}
      <section className="pb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            🤖 {t.sections.aiModules}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t.sections.aiLabel}</span>
        </div>
        <ModuleCarousel gridClasses="grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10">
          {aiModules.map((module, index) => (
            <ModuleCard
              key={index}
              {...module}
              isFavorite={favorites.includes(module.id)}
              onToggleFavorite={() => toggleFavorite(module.id)}
              onClick={() => handleModuleClick(module.route)}
              size="small"
            />
          ))}
        </ModuleCarousel>
      </section>
    </main>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { pathname, state } = location;
  const { pageId, '*': wildcardPath } = useParams();
  const [sessionTabAccess, setSessionTabAccess] = useState<AuthSessionResponse | null>();
  const {
    learningModeActive,
    learningModeVisible,
    learningStep,
    setLearningModeActive,
    setLearningModeVisible,
    setLearningStep,
  } = useLearningModePreferences(sessionTabAccess);
  const [darkMode, setDarkMode] = useLocalStorageState('indice.app.darkMode', false);
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const [isModuleNavigationLoading, setIsModuleNavigationLoading] = useState(false);
  const [allowedModuleRoutes, setAllowedModuleRoutes] = useState<Set<PageId> | null>(null);
  const [isModuleAccessLoaded, setIsModuleAccessLoaded] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionSessionInfo>(null);
  const moduleNavigationTimeoutRef = useRef<number | null>(null);
  const moduleNavigationAnimationFrameCleanupRef = useRef<(() => void) | null>(null);
  const moduleNavigationStartedAtRef = useRef(0);
  const moduleNavigationTargetPathRef = useRef<string | null>(null);
  const currentPage = resolvePageId(pageId);
  const needsPageRedirect = Boolean(pageId && currentPage && pageId !== currentPage);
  const isBillingPage = currentPage === 'billing';
  const isModuleAccessPending = Boolean(currentPage && currentPage !== 'dashboard' && !isBillingPage && !isModuleAccessLoaded);
  const isDeniedModulePage = Boolean(
    currentPage
    && currentPage !== 'dashboard'
    && !isBillingPage
    && isModuleAccessLoaded
    && !canAccessModulePage(currentPage, allowedModuleRoutes),
  );
  const isSubscriptionBlocked = Boolean(subscriptionInfo && !subscriptionInfo.access_allowed && !isBillingPage);
  const currentTabScopeDefinition = currentPage ? MODULE_TAB_SCOPE_CATALOG[currentPage] : undefined;
  const requestedTabId = wildcardPath?.split('/').filter(Boolean)[0];
  const allowedCurrentTabIds = currentPage && currentTabScopeDefinition && sessionTabAccess !== undefined
    ? allowedModuleTabIds(currentPage, Object.keys(currentTabScopeDefinition.tabs), sessionTabAccess)
    : [];
  const isDeniedTabPage = Boolean(
    currentPage
    && currentTabScopeDefinition
    && isModuleAccessLoaded
    && sessionTabAccess !== undefined
    && (
      allowedCurrentTabIds.length === 0
      || !requestedTabId
      || !currentTabScopeDefinition.tabs[requestedTabId]
      || !allowedCurrentTabIds.includes(requestedTabId)
    ),
  );

  const clearModuleNavigationTimeout = () => {
    if (moduleNavigationTimeoutRef.current !== null) {
      window.clearTimeout(moduleNavigationTimeoutRef.current);
      moduleNavigationTimeoutRef.current = null;
    }
  };

  const clearPendingModuleNavigation = () => {
    moduleNavigationAnimationFrameCleanupRef.current?.();
    moduleNavigationAnimationFrameCleanupRef.current = null;
  };

  const hideModuleNavigationLoadingAfterMinimum = () => {
    clearModuleNavigationTimeout();

    const elapsedMs = (
      typeof performance !== 'undefined' ? performance.now() : Date.now()
    ) - moduleNavigationStartedAtRef.current;
    const remainingMs = Math.max(0, MODULE_NAVIGATION_LOADING_MS - elapsedMs);

    moduleNavigationTimeoutRef.current = window.setTimeout(() => {
      setIsModuleNavigationLoading(false);
      moduleNavigationTargetPathRef.current = null;
      moduleNavigationTimeoutRef.current = null;
    }, remainingMs);
  };

  const showModuleNavigationLoading = (targetPath: string) => {
    clearModuleNavigationTimeout();

    moduleNavigationStartedAtRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
    moduleNavigationTargetPathRef.current = targetPath;
    setIsModuleNavigationLoading(true);
    hideModuleNavigationLoadingAfterMinimum();
  };

  const navigateAfterLoadingPaint = (targetPath: string) => {
    clearPendingModuleNavigation();

    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      navigate(targetPath);
      return;
    }

    let secondFrameId: number | null = null;
    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        moduleNavigationAnimationFrameCleanupRef.current = null;
        navigate(targetPath);
      });
    });

    moduleNavigationAnimationFrameCleanupRef.current = () => {
      window.cancelAnimationFrame(firstFrameId);

      if (secondFrameId !== null) {
        window.cancelAnimationFrame(secondFrameId);
      }
    };
  };

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.classList.toggle('dark', darkMode);
    document.body.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => () => {
    clearPendingModuleNavigation();
    clearModuleNavigationTimeout();
  }, []);

  useEffect(() => {
    let active = true;

    const loadAllowedModuleRoutes = async () => {
      const session = await authApi.getSessionOrNull().catch(() => null);
      if (active) {
        setSubscriptionInfo(session?.company.subscription ?? null);
        setSessionTabAccess(session);
      }

      try {
        const backendModules = await dashboardApi.listModules();
        if (!active) {
          return;
        }

        const routes = new Set<PageId>();
        for (const module of backendModules) {
          const route = routeForBackendSlug(module.slug);
          if (route) {
            routes.add(route);
          }
        }
        for (const route of FRONTEND_OWNED_BASIC_MODULE_ROUTES) {
          routes.add(route);
        }
        if (routes.size === 0 && isAdminAccessRole(session?.user.role)) {
          for (const module of buildDefaultModuleCatalog(t)) {
            routes.add(module.route);
          }
        }
        setAllowedModuleRoutes(routes);
      } catch {
        if (active) {
          const routes = new Set<PageId>();
          if (isAdminAccessRole(session?.user.role)) {
            for (const module of buildDefaultModuleCatalog(t)) {
              routes.add(module.route);
            }
          }
          setAllowedModuleRoutes(routes);
        }
      } finally {
        if (active) {
          setIsModuleAccessLoaded(true);
        }
      }
    };

    void loadAllowedModuleRoutes();

    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    if (!isModuleNavigationLoading || moduleNavigationTargetPathRef.current !== pathname) {
      return;
    }

    hideModuleNavigationLoadingAfterMinimum();
  }, [isModuleNavigationLoading, pathname]);

  useEffect(() => {
    if (!isModuleNavigationLoading || moduleNavigationTimeoutRef.current !== null) {
      return;
    }

    hideModuleNavigationLoadingAfterMinimum();
  }, [isModuleNavigationLoading]);

  useEffect(() => {
    if (!pageId) {
      return;
    }

    if (!currentPage) {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (needsPageRedirect) {
      navigate(getPagePath(currentPage, wildcardPath), { replace: true });
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    const nextSuccessToast = getNavigationSuccessToast(state);
    if (nextSuccessToast) {
      setSuccessToastMessage(nextSuccessToast);
      navigate(pathname, { replace: true, state: null });
    }
  }, [currentPage, navigate, needsPageRedirect, pageId, pathname, state, wildcardPath]);

  useEffect(() => {
    if (isDeniedModulePage) {
      navigate('/dashboard', { replace: true });
    }
  }, [isDeniedModulePage, navigate]);

  useEffect(() => {
    if (!isDeniedTabPage || !currentPage) {
      return;
    }
    const fallbackTab = allowedCurrentTabIds[0];
    navigate(fallbackTab ? getPagePath(currentPage, fallbackTab) : '/dashboard', { replace: true });
  }, [allowedCurrentTabIds, currentPage, isDeniedTabPage, navigate]);

  const toggleLearningMode = () => {
    setLearningModeActive((current) => {
      const next = !current;

      if (next) {
        setLearningModeVisible(true);
      }

      return next;
    });
  };

  const toggleDarkMode = () => {
    setDarkMode((current) => !current);
  };

  const handleModuleNavigation = (page?: string) => {
    const targetPage = resolvePageId(page) ?? 'dashboard';
    const safeTargetPage = isModuleAccessLoaded && !canAccessModulePage(targetPage, allowedModuleRoutes)
      ? 'dashboard'
      : targetPage;

    if (safeTargetPage === currentPage) {
      return;
    }

    const targetPath = getPagePath(safeTargetPage);
    showModuleNavigationLoading(targetPath);
    navigateAfterLoadingPaint(targetPath);
  };

  const standaloneModulePages: Partial<Record<PageId, StandaloneModuleComponent>> = {
    maintenance: Mantenimiento,
    'minutes-control': ControlMinutas,
    cleaning: Limpieza,
    laundry: Lavanderia,
    transportation: Transportacion,
    'vehicles-machinery': VehiculosMaquinaria,
    properties: Inmuebles,
    forms: Formularios,
    invoicing: FacturacionComplementaria,
    email: CorreoElectronico,
    'sales-agent': AgenteVentas,
    analytics: Analitica,
    training: Capacitacion,
    coach: Coach,
  };

  const standaloneModuleComponent = currentPage ? standaloneModulePages[currentPage] : undefined;
  const StandaloneModuleComponent = standaloneModuleComponent;

  const pageContent =
    currentPage === 'billing' ? (
      <SubscriptionManagementPage />
    ) : currentPage === 'dashboard' ? (
      <MainDashboard
        learningModeActive={learningModeActive}
        learningModeVisible={learningModeVisible}
        setLearningModeVisible={setLearningModeVisible}
        learningStep={learningStep}
        setLearningStep={setLearningStep}
        onNavigate={(page) => handleModuleNavigation(page)}
      />
    ) : currentPage === 'human-resources' ? (
      <HumanResources learningModeActive={learningModeActive} onNavigate={handleModuleNavigation} />
    ) : currentPage === 'processes-tasks' ? (
      <ProcessesTasks learningModeActive={learningModeActive} onNavigate={handleModuleNavigation} />
    ) : currentPage === 'home-panel' ? (
      <PanelInicial learningModeActive={learningModeActive} onNavigate={handleModuleNavigation} />
    ) : currentPage === 'expenses' ? (
      <Gastos learningModeActive={learningModeActive} onNavigate={handleModuleNavigation} />
    ) : currentPage === 'petty-cash' ? (
      <CajaChica learningModeActive={learningModeActive} onNavigate={handleModuleNavigation} />
    ) : currentPage === 'point-of-sale' ? (
      <PuntoVenta learningModeActive={learningModeActive} onNavigate={handleModuleNavigation} />
    ) : currentPage === 'sales' ? (
      <Ventas learningModeActive={learningModeActive} onNavigate={handleModuleNavigation} />
    ) : currentPage === 'receivables' ? (
      <Cartera learningModeActive={learningModeActive} onNavigate={handleModuleNavigation} />
    ) : currentPage === 'kpis' ? (
      <Kpis learningModeActive={learningModeActive} onNavigate={handleModuleNavigation} />
    ) : currentPage === 'inventory' ? (
      <StandaloneModuleShell currentModule={currentPage} onNavigate={handleModuleNavigation}>
        <Inventarios learningModeActive={learningModeActive} />
      </StandaloneModuleShell>
    ) : currentPage === 'work-climate' ? (
      <StandaloneModuleShell currentModule={currentPage} onNavigate={handleModuleNavigation}>
        <ClimaLaboral learningModeActive={learningModeActive} onNavigate={handleModuleNavigation} />
      </StandaloneModuleShell>
    ) : currentPage === 'affiliate-management' ? (
      <Afiliados onNavigate={handleModuleNavigation} />
    ) : StandaloneModuleComponent && currentPage ? (
      <StandaloneModuleShell currentModule={currentPage} onNavigate={handleModuleNavigation}>
        <StandaloneModuleComponent />
      </StandaloneModuleShell>
    ) : null;

  if (!currentPage || needsPageRedirect || isModuleAccessPending || isDeniedModulePage || isDeniedTabPage) {
    return null;
  }

  const renderedPageContent = isSubscriptionBlocked ? (
    <SubscriptionRequiredScreen
      subscription={subscriptionInfo}
      onManageBilling={() => navigate('/billing')}
    />
  ) : pageContent;

  return (
    <div
      translate="no"
      className={`notranslate min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}
    >
      <BusinessCurrencyProvider>
        <Header
          learningModeActive={learningModeActive}
          onToggleLearningMode={toggleLearningMode}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
        />
        <LoadingBarOverlay
          isVisible={isModuleNavigationLoading}
          title="Loading module"
          description="Preparing the latest data before the screen becomes active."
          className="z-[160]"
        />
        <Suspense
          fallback={(
            <LoadingBarOverlay
              isVisible
              title="Loading module"
              description="Downloading only the workspace you opened."
              className="z-[150]"
            />
          )}
        >
          {renderedPageContent}
        </Suspense>
        <SuccessToast
          isVisible={Boolean(successToastMessage)}
          message={successToastMessage}
          onClose={() => setSuccessToastMessage('')}
        />
      </BusinessCurrencyProvider>
    </div>
  );
}
