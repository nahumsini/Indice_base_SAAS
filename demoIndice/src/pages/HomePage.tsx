import { lazy, Suspense, useMemo, useState, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '../../../react/src/app/components/Header';
import {
  getPagePath,
  resolvePageId,
  type PageId,
} from '../../../react/src/app/config/navigation';
import { Button } from '../../../react/src/app/components/ui/button';

const MainDashboard = lazy(() => import('../../../react/src/app/Dashboard').then((module) => ({ default: module.MainDashboard })));
const PanelInicial = lazy(() => import('../../../react/src/app/BasicModules/Dashboard'));
const HumanResources = lazy(() => import('../../../react/src/app/BasicModules/HumanResources'));
const ProcessesTasks = lazy(() => import('../../../react/src/app/BasicModules/ProcessesTasks'));
const Expenses = lazy(() => import('../../../react/src/app/BasicModules/Expenses/ExpensesModule'));
const PettyCash = lazy(() => import('../../../react/src/app/BasicModules/PettyCash'));
const PointOfSale = lazy(() => import('../../../react/src/app/BasicModules/PointOfSale'));
const Sales = lazy(() => import('../../../react/src/app/BasicModules/Sales'));
const Kpis = lazy(() => import('../../../react/src/app/BasicModules/Kpis'));
const Maintenance = lazy(() => import('../../../react/src/app/ComplementaryModules/Maintenance'));
const Inventory = lazy(() => import('../../../react/src/app/ComplementaryModules/Inventory'));
const MinutesControl = lazy(() => import('../../../react/src/app/ComplementaryModules/MinutesControl'));
const Cleaning = lazy(() => import('../../../react/src/app/ComplementaryModules/Cleaning'));
const Laundry = lazy(() => import('../../../react/src/app/ComplementaryModules/Laundry'));
const Transportation = lazy(() => import('../../../react/src/app/ComplementaryModules/Transportation'));
const VehiclesMachinery = lazy(() => import('../../../react/src/app/ComplementaryModules/VehiclesMachinery'));
const Properties = lazy(() => import('../../../react/src/app/ComplementaryModules/Properties'));
const Forms = lazy(() => import('../../../react/src/app/ComplementaryModules/Forms'));
const Invoicing = lazy(() => import('../../../react/src/app/ComplementaryModules/Invoicing'));
const Email = lazy(() => import('../../../react/src/app/ComplementaryModules/Email'));
const WorkClimate = lazy(() => import('../../../react/src/app/ComplementaryModules/WorkClimate'));
const Affiliates = lazy(() => import('../../../react/src/app/ComplementaryModules/Affiliates'));
const SalesAgent = lazy(() => import('../../../react/src/app/AIModules/SalesAgent'));
const Analytics = lazy(() => import('../../../react/src/app/AIModules/Analytics'));
const Training = lazy(() => import('../../../react/src/app/AIModules/Training'));
const Coach = lazy(() => import('../../../react/src/app/AIModules/Coach'));

type ModuleComponent = ComponentType<any> | LazyExoticComponent<ComponentType<any>>;

const moduleComponents: Partial<Record<PageId, ModuleComponent>> = {
  'human-resources': HumanResources,
  'processes-tasks': ProcessesTasks,
  expenses: Expenses,
  'petty-cash': PettyCash,
  'point-of-sale': PointOfSale,
  sales: Sales,
  kpis: Kpis,
  maintenance: Maintenance,
  inventory: Inventory,
  'minutes-control': MinutesControl,
  cleaning: Cleaning,
  laundry: Laundry,
  transportation: Transportation,
  'vehicles-machinery': VehiclesMachinery,
  properties: Properties,
  forms: Forms,
  invoicing: Invoicing,
  email: Email,
  'work-climate': WorkClimate,
  'affiliate-management': Affiliates,
  'sales-agent': SalesAgent,
  analytics: Analytics,
  training: Training,
  coach: Coach,
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
          <span className="text-lg">Home</span>
        </Button>
      </div>
      {children}
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [learningModeActive, setLearningModeActive] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [learningModeVisible, setLearningModeVisible] = useState(false);
  const [learningStep, setLearningStep] = useState(0);

  const currentPage = useMemo<PageId>(() => {
    const [pageSegment] = location.pathname.split('/').filter(Boolean);
    return resolvePageId(pageSegment) ?? 'dashboard';
  }, [location.pathname]);

  const handleNavigate = (page?: string) => {
    const targetPage = resolvePageId(page) ?? 'dashboard';

    if (targetPage === 'home-panel') {
      navigate(getPagePath('home-panel', 'profile'));
      return;
    }

    navigate(getPagePath(targetPage));
  };

  const ActiveModule = moduleComponents[currentPage];

  const pageContent = currentPage === 'dashboard' ? (
    <MainDashboard
      learningModeActive={learningModeActive}
      learningModeVisible={learningModeVisible}
      setLearningModeVisible={setLearningModeVisible}
      learningStep={learningStep}
      setLearningStep={setLearningStep}
      onNavigate={handleNavigate}
    />
  ) : currentPage === 'home-panel' ? (
    <PanelInicial
      learningModeActive={learningModeActive}
      onNavigate={handleNavigate}
    />
  ) : ActiveModule ? (
    <StandaloneModuleShell onBack={() => handleNavigate('dashboard')}>
      <ActiveModule
        learningModeActive={learningModeActive}
        onNavigate={handleNavigate}
      />
    </StandaloneModuleShell>
  ) : (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">Module unavailable</h1>
      <p className="mt-2 text-slate-600">This demo route is enabled, but no local module view is registered yet.</p>
    </div>
  );

  return (
    <div
      translate="no"
      className={`notranslate min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}
    >
      <Header
        learningModeActive={learningModeActive}
        onToggleLearningMode={() => setLearningModeActive((current) => !current)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((current) => !current)}
      />
      <Suspense fallback={<div className="px-8 py-10 text-slate-600">Loading module...</div>}>
        {pageContent}
      </Suspense>
    </div>
  );
}
