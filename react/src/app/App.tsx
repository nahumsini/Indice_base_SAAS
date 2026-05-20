import { lazy, Suspense, useEffect, useRef, useState, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Header } from './components/Header';
import { LoadingBarOverlay } from './components/LoadingBarOverlay';
import { SuccessToast } from './components/SuccessToast';
import { Button } from './components/ui/button';
import { MainDashboard } from './Dashboard';
import {
  getPagePath,
  resolvePageId,
  type PageId,
} from './config/navigation';
import { useLocalStorageState } from './hooks/useLocalStorageState';

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

type StandaloneModuleComponent = ComponentType | LazyExoticComponent<ComponentType>;

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
  const [isModuleNavigationLoading, setIsModuleNavigationLoading] = useState(false);
  const moduleNavigationTimeoutRef = useRef<number | null>(null);
  const moduleNavigationAnimationFrameCleanupRef = useRef<(() => void) | null>(null);
  const moduleNavigationStartedAtRef = useRef(0);
  const moduleNavigationTargetPathRef = useRef<string | null>(null);
  const currentPage = resolvePageId(pageId);
  const needsPageRedirect = Boolean(pageId && currentPage && pageId !== currentPage);

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
    if (targetPage === currentPage) {
      return;
    }

    const targetPath = getPagePath(targetPage);
    showModuleNavigationLoading(targetPath);
    navigateAfterLoadingPaint(targetPath);
  };

  const standaloneModulePages: Partial<Record<PageId, StandaloneModuleComponent>> = {
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
      <MainDashboard
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
    ) : currentPage === 'affiliate-management' ? (
      <Afiliados onNavigate={handleModuleNavigation} />
    ) : StandaloneModuleComponent ? (
      <StandaloneModuleShell onBack={() => handleModuleNavigation('dashboard')}>
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
        {pageContent}
      </Suspense>
      <SuccessToast
        isVisible={Boolean(successToastMessage)}
        message={successToastMessage}
        onClose={() => setSuccessToastMessage('')}
      />
    </div>
  );
}
