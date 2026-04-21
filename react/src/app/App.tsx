import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Settings } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Header } from './components/Header';
import { KPICard } from './components/KPICard';
import { KPICarousel } from './components/KPICarousel';
import { ModuleCard } from './components/ModuleCard';
import { ModuleCarousel } from './components/ModuleCarousel';
import { LearningModeBanner } from './components/LearningModeBanner';
import { KPIConfiguration } from './components/KPIConfiguration';
import { SuccessToast } from './components/SuccessToast';
import { Button } from './components/ui/button';
import { useLanguage } from './shared/context';
import { useFavorites } from './shared/context';
import HumanResources from './BasicModules/HumanResources';
import ProcessesTasks from './BasicModules/ProcessesTasks';
import PanelInicial from './BasicModules/Dashboard';
import Gastos from './BasicModules/Expenses';
import CajaChica from './BasicModules/PettyCash';
import PuntoVenta from './BasicModules/PointOfSale';
import Ventas from './BasicModules/Sales';
import Kpis from './BasicModules/Kpis';
import Mantenimiento from './ComplementaryModules/Maintenance';
import Inventarios from './ComplementaryModules/Inventory';
import ControlMinutas from './ComplementaryModules/MinutesControl';
import Limpieza from './ComplementaryModules/Cleaning';
import Lavanderia from './ComplementaryModules/Laundry';
import Transportacion from './ComplementaryModules/Transportation';
import VehiculosMaquinaria from './ComplementaryModules/VehiclesMachinery';
import Inmuebles from './ComplementaryModules/Properties';
import Formularios from './ComplementaryModules/Forms';
import FacturacionComplementaria from './ComplementaryModules/Invoicing';
import CorreoElectronico from './ComplementaryModules/Email';
import ClimaLaboral from './ComplementaryModules/WorkClimate';
import AgenteVentas from './AIModules/SalesAgent';
import Analitica from './AIModules/Analytics';
import Capacitacion from './AIModules/Training';
import Coach from './AIModules/Coach';
import {
  getPagePath,
  resolvePageId,
  type PageId,
} from './config/navigation';
import { useLocalStorageState } from './hooks/useLocalStorageState';
import { dashboardApi } from './api/dashboard';
import {
  buildDefaultModuleCatalog,
  mapBackendModuleToCard,
  mergeDashboardModules,
  type DashboardModuleCard,
} from './config/moduleCatalog';

const getNavigationSuccessToast = (state: unknown) => {
  if (!state || typeof state !== 'object' || !('successToast' in state)) {
    return '';
  }

  const successToast = (state as { successToast?: unknown }).successToast;
  return typeof successToast === 'string' ? successToast : '';
};

function StandaloneModuleShell({
  children,
  onBack,
}: {
  children: ReactNode;
  onBack: () => void;
}) {
  return (
    <div>
      <div className="max-w-[1600px] mx-auto px-8 pt-6">
        <Button
          variant="outline"
          onClick={onBack}
          className="text-sm gap-2"
        >
          <span className="text-lg">🏠</span> Home
        </Button>
      </div>
      {children}
    </div>
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
  const [availableModules, setAvailableModules] = useState<DashboardModuleCard[]>(() => buildDefaultModuleCatalog(t));
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

  useEffect(() => {
    let active = true;

    const defaultModules = buildDefaultModuleCatalog(t);
    setAvailableModules(defaultModules);

    dashboardApi.listModules()
      .then((backendModules) => {
        if (!active) {
          return;
        }

        const mappedModules = backendModules
          .map((module) => mapBackendModuleToCard(module, t))
          .filter((module): module is DashboardModuleCard => module !== null);

        if (mappedModules.length === 0) {
          setAvailableModules(defaultModules);
          return;
        }

        setAvailableModules(mergeDashboardModules(mappedModules, defaultModules));
      })
      .catch(() => {
        if (active) {
          setAvailableModules(defaultModules);
        }
      });

    return () => {
      active = false;
    };
  }, [t]);

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
  const { pathname, state } = location;
  const { pageId, '*': wildcardPath } = useParams();
  const [learningModeActive, setLearningModeActive] = useLocalStorageState('indice.app.learningModeActive', true);
  const [learningModeVisible, setLearningModeVisible] = useLocalStorageState('indice.app.learningModeVisible', true);
  const [learningStep, setLearningStep] = useLocalStorageState('indice.app.learningStep', 0);
  const [darkMode, setDarkMode] = useLocalStorageState('indice.app.darkMode', false);
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const currentPage = resolvePageId(pageId);
  const needsPageRedirect = Boolean(pageId && currentPage && pageId !== currentPage);

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
    navigate(getPagePath(targetPage));
  };

  const standaloneModulePages: Partial<Record<PageId, ComponentType>> = {
    maintenance: Mantenimiento,
    inventory: Inventarios,
    'minutes-control': ControlMinutas,
    cleaning: Limpieza,
    laundry: Lavanderia,
    transportation: Transportacion,
    'vehicles-machinery': VehiculosMaquinaria,
    properties: Inmuebles,
    forms: Formularios,
    invoicing: FacturacionComplementaria,
    email: CorreoElectronico,
    'work-climate': ClimaLaboral,
    'sales-agent': AgenteVentas,
    analytics: Analitica,
    training: Capacitacion,
    coach: Coach,
  };

  const standaloneModuleComponent = currentPage ? standaloneModulePages[currentPage] : undefined;
  const StandaloneModuleComponent = standaloneModuleComponent;

  const pageContent =
    currentPage === 'dashboard' ? (
      <Dashboard
        learningModeActive={learningModeActive}
        learningModeVisible={learningModeVisible}
        setLearningModeVisible={setLearningModeVisible}
        learningStep={learningStep}
        setLearningStep={setLearningStep}
        onNavigate={(page) => handleModuleNavigation(page)}
      />
    ) : currentPage === 'human-resources' ? (
      <HumanResources onNavigate={handleModuleNavigation} />
    ) : currentPage === 'processes-tasks' ? (
      <ProcessesTasks onNavigate={handleModuleNavigation} />
    ) : currentPage === 'home-panel' ? (
      <PanelInicial onNavigate={handleModuleNavigation} />
    ) : currentPage === 'expenses' ? (
      <Gastos onNavigate={handleModuleNavigation} />
    ) : currentPage === 'petty-cash' ? (
      <CajaChica onNavigate={handleModuleNavigation} />
    ) : currentPage === 'point-of-sale' ? (
      <PuntoVenta onNavigate={handleModuleNavigation} />
    ) : currentPage === 'sales' ? (
      <Ventas onNavigate={handleModuleNavigation} />
    ) : currentPage === 'kpis' ? (
      <Kpis onNavigate={handleModuleNavigation} />
    ) : StandaloneModuleComponent ? (
      <StandaloneModuleShell onBack={() => navigate(getPagePath('dashboard'))}>
        <StandaloneModuleComponent />
      </StandaloneModuleShell>
    ) : null;

  if (!currentPage || needsPageRedirect) {
    return null;
  }

  return (
    <div
      translate="no"
      className={`notranslate min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}
    >
      <Header 
        learningModeActive={learningModeActive} 
        onToggleLearningMode={toggleLearningMode}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />
      {pageContent}
      <SuccessToast
        isVisible={Boolean(successToastMessage)}
        message={successToastMessage}
        onClose={() => setSuccessToastMessage('')}
      />
    </div>
  );
}
