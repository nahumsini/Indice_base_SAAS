import { Component, lazy, Suspense, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { createBrowserRouter, redirect, useLocation, useNavigate, useRouteError } from 'react-router';
import { AiOAuthAuthorizePage, InviteAcceptPage, LoginPage, PublicDemoPage, PublicPlansPage, ResetPasswordPage, SignupCompletePage, SignupPage } from './Auth';
import { AiConnectionSupportPage } from './Public/AiConnectionSupportPage';
import { authApi } from './api/auth';
import { subscribeToAuthenticationExpired } from './api/authSessionStore';
import { ApiClientError } from './lib/apiClient';
import { BusinessCurrencyProvider } from './BasicModules/shared/BusinessCurrencyContext';
import { LoadingBarOverlay } from './components/LoadingBarOverlay';

const App = lazy(() => import('./App'));
const HumanResourcesKiosk = lazy(() => import('./BasicModules/HumanResources/Kiosk/Kiosk'));
const ExpensesPayablesKiosk = lazy(() => import('./BasicModules/Expenses/Kiosk/PayablesKioskPage'));
const ProcessTasksKiosk = lazy(() => import('./BasicModules/ProcessesTasks/Kiosk/PublicTaskKioskPage'));
const PettyCashKiosk = lazy(() => import('./BasicModules/PettyCash/Kiosk/PublicPettyCashKioskPage'));
const PublicCatalogPage = lazy(() => import('./BasicModules/Sales/Productos/publicCatalog/PublicCatalogPage'));
const CustomerDisplay = lazy(() => import('./BasicModules/PointOfSale/CustomerDisplay'));
const SupplierPortal = lazy(() => import('./BasicModules/PointOfSale/SupplierPortal'));
const SelfServiceKiosk = lazy(() => import('./BasicModules/PointOfSale/SelfServiceKiosk'));
const SelfCheckoutKiosk = lazy(() => import('./BasicModules/PointOfSale/SelfCheckoutKiosk'));
const RestaurantKioskPage = lazy(() => import('./BasicModules/PointOfSale/RestaurantKiosk/RestaurantKioskPage'));
const PlatformAdminPage = lazy(() => import('./PlatformAdmin/PlatformAdminPage'));
const DistributorPortalPage = lazy(() => import('./DistributorPortal/DistributorPortalPage'));
const MultiKioskMobilePage = lazy(() => import('./KioskCenter/MultiKioskMobilePage'));
const TrainingCertificateVerificationPage = lazy(() => import('./Training/TrainingCertificateVerificationPage'));

const chunkReloadStorageKey = 'indice:route-chunk-reload-attempted';
const renderChunkReloadStorageKey = 'indice:render-chunk-reload-attempted';

function isDynamicImportFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.includes('Failed to fetch dynamically imported module')
    || message.includes('Importing a module script failed')
    || message.includes('Loading chunk')
    || message.includes('ChunkLoadError');
}

function WorkspaceRouteError() {
  const error = useRouteError();
  const isChunkError = isDynamicImportFailure(error);
  const errorMessage = error instanceof Error ? error.message : String(error ?? 'Unknown route error');

  useEffect(() => {
    if (!isChunkError) {
      return;
    }

    const alreadyAttempted = sessionStorage.getItem(chunkReloadStorageKey) === 'true';
    if (alreadyAttempted) {
      return;
    }

    sessionStorage.setItem(chunkReloadStorageKey, 'true');
    window.location.reload();
  }, [isChunkError]);

  useEffect(() => {
    if (!isChunkError) {
      sessionStorage.removeItem(chunkReloadStorageKey);
    }
  }, [isChunkError]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900 dark:bg-slate-950 dark:text-white">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#FF6B5E]">
          Actualizacion de interfaz
        </p>
        <h1 className="mt-2 text-2xl font-black">
          Necesitamos recargar la vista
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          El navegador tenia archivos de una version anterior del frontend. Recarga la pagina para tomar el build actual.
        </p>
        <p className="mt-3 break-all rounded-lg bg-slate-100 p-3 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {errorMessage}
        </p>
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem(chunkReloadStorageKey);
            window.location.reload();
          }}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#FF6B5E] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#E85D52]"
        >
          Recargar ahora
        </button>
      </section>
    </main>
  );
}

class WorkspaceRenderErrorBoundary extends Component<
  { children: ReactNode },
  { error: unknown }
> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    const isChunkError = isDynamicImportFailure(error);
    if (!isChunkError) {
      console.error('[Workspace] render error', error, errorInfo);
      return;
    }

    const alreadyAttempted = sessionStorage.getItem(renderChunkReloadStorageKey) === 'true';
    if (alreadyAttempted) {
      return;
    }

    sessionStorage.setItem(renderChunkReloadStorageKey, 'true');
    window.location.reload();
  }

  render() {
    const isChunkError = isDynamicImportFailure(this.state.error);
    const errorMessage = this.state.error instanceof Error
      ? this.state.error.message
      : String(this.state.error ?? 'Unknown render error');

    if (!this.state.error || (isChunkError && sessionStorage.getItem(renderChunkReloadStorageKey) !== 'true')) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900 dark:bg-slate-950 dark:text-white">
        <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#FF6B5E]">
            Actualizacion de interfaz
          </p>
          <h1 className="mt-2 text-2xl font-black">
            Necesitamos recargar la vista
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            El navegador intento abrir un archivo antiguo del frontend. Recarga para tomar el build actual.
          </p>
          <p className="mt-3 break-all rounded-lg bg-slate-100 p-3 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem(renderChunkReloadStorageKey);
              window.location.reload();
            }}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#FF6B5E] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#E85D52]"
          >
            Recargar ahora
          </button>
        </section>
      </main>
    );
  }
}

function KioskRoute() {
  return (
    <Suspense
      fallback={(
        <LoadingBarOverlay
          isVisible
          title="Loading kiosk"
          description="Preparing the attendance kiosk."
        />
      )}
    >
      <HumanResourcesKiosk />
    </Suspense>
  );
}

function TaskKioskRoute() {
  return (
    <Suspense
      fallback={(
        <LoadingBarOverlay
          isVisible
          title="Loading task access"
          description="Preparing the task kiosk."
        />
      )}
    >
      <ProcessTasksKiosk />
    </Suspense>
  );
}

function PettyCashKioskRoute() {
  return (
    <Suspense
      fallback={(
        <LoadingBarOverlay
          isVisible
          title="Loading petty cash"
          description="Preparing the petty cash kiosk."
        />
      )}
    >
      <PettyCashKiosk />
    </Suspense>
  );
}

function ExpensesPayablesKioskRoute() {
  return (
    <Suspense
      fallback={(
        <LoadingBarOverlay
          isVisible
          title="Loading payable account kiosk"
          description="Preparing the expenses kiosk."
        />
      )}
    >
      <ExpensesPayablesKiosk />
    </Suspense>
  );
}

function PublicCatalogRoute() {
  return (
    <Suspense
      fallback={(
        <LoadingBarOverlay
          isVisible
          title="Cargando catálogo público"
          description="Preparando productos y opciones de contacto."
        />
      )}
    >
      <PublicCatalogPage />
    </Suspense>
  );
}

function CustomerDisplayRoute() {
  return (
    <Suspense
      fallback={(
        <LoadingBarOverlay
          isVisible
          title="Loading customer display"
          description="Preparing the point-of-sale mirror."
        />
      )}
    >
      <CustomerDisplay />
    </Suspense>
  );
}

function SupplierPortalRoute() {
  return (
    <Suspense
      fallback={(
        <LoadingBarOverlay
          isVisible
          title="Loading supplier portal"
          description="Preparing the supplier purchase proposal portal."
        />
      )}
    >
      <SupplierPortal />
    </Suspense>
  );
}

function SelfServiceKioskRoute() {
  return (
    <Suspense
      fallback={(
        <LoadingBarOverlay
          isVisible
          title="Cargando kiosco de autoservicio"
          description="Preparando el catálogo y la caja asignada."
        />
      )}
    >
      <SelfServiceKiosk />
    </Suspense>
  );
}

function SelfCheckoutKioskRoute() {
  return (
    <Suspense
      fallback={(
        <LoadingBarOverlay
          isVisible
          title="Cargando autocobro"
          description="Preparando la estación táctil y su catálogo."
        />
      )}
    >
      <SelfCheckoutKiosk />
    </Suspense>
  );
}

function RestaurantKioskRoute() {
  return (
    <Suspense fallback={<LoadingBarOverlay isVisible title="Cargando operación de restaurante" description="Conectando mesas, comandas, cocina y caja." />}>
      <RestaurantKioskPage />
    </Suspense>
  );
}

function MultiKioskMobileRoute() {
  return (
    <Suspense fallback={<LoadingBarOverlay isVisible title="Cargando Multikiosco" description="Preparando tus accesos de trabajo." />}>
      <MultiKioskMobilePage />
    </Suspense>
  );
}

function PrivateAppRoute() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => subscribeToAuthenticationExpired(() => {
    navigate('/login', {
      replace: true,
      state: {
        authenticationExpired: true,
        returnTo: `${location.pathname}${location.search}${location.hash}`,
      },
    });
  }), [location.hash, location.pathname, location.search, navigate]);

  return (
    <WorkspaceRenderErrorBoundary>
      <BusinessCurrencyProvider>
        <Suspense
          fallback={(
            <LoadingBarOverlay
              isVisible
              title="Loading workspace"
              description="Preparing your dashboard."
            />
          )}
        >
          <App />
        </Suspense>
      </BusinessCurrencyProvider>
    </WorkspaceRenderErrorBoundary>
  );
}

function PlatformAdminRoute() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => subscribeToAuthenticationExpired(() => {
    navigate('/login', {
      replace: true,
      state: {
        authenticationExpired: true,
        returnTo: `${location.pathname}${location.search}${location.hash}`,
      },
    });
  }), [location.hash, location.pathname, location.search, navigate]);

  return (
    <Suspense fallback={<LoadingBarOverlay isVisible title="Cargando plataforma" description="Validando autoridad operativa." />}>
      <PlatformAdminPage />
    </Suspense>
  );
}

function DistributorPortalRoute() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => subscribeToAuthenticationExpired(() => {
    navigate('/login', {
      replace: true,
      state: {
        authenticationExpired: true,
        returnTo: `${location.pathname}${location.search}${location.hash}`,
      },
    });
  }), [location.hash, location.pathname, location.search, navigate]);

  return (
    <Suspense fallback={<LoadingBarOverlay isVisible title="Loading distributor portal" description="Validating your linked portfolio." />}>
      <DistributorPortalPage />
    </Suspense>
  );
}

const redirectToLanding = async () => {
  const session = await getRouteSessionOrNull();
  return redirect(session ? '/dashboard' : '/login');
};

const redirectIfAuthenticated = async () => {
  const session = await getRouteSessionOrNull();

  if (session) {
    return redirect('/dashboard');
  }

  return null;
};

const requireAuthenticatedSession = async () => {
  const session = await getRouteSessionOrNull();

  if (!session) {
    return redirect('/login');
  }

  return null;
};

const requirePlatformAdminSession = async () => {
  const session = await getRouteSessionOrNull();
  if (!session) return redirect('/login');
  const { platformAdminApi } = await import('./api/platformAdmin');
  try {
    await platformAdminApi.getContext();
    return null;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) return redirect('/login');
    if (error instanceof ApiClientError && error.status === 403) return redirect('/dashboard');
    throw error;
  }
};

const requireDistributorPortalSession = async () => {
  const session = await getRouteSessionOrNull();
  if (!session) return redirect('/login');
  if (session.company.commercial_account_type !== 'DISTRIBUTOR') return redirect('/dashboard');
  const { distributorPortalApi } = await import('./DistributorPortal/contracts-access/services/distributorPortalApi');
  try {
    await distributorPortalApi.getContext();
    return null;
  } catch {
    return redirect('/dashboard');
  }
};

const getRouteSessionOrNull = () => authApi.getSessionOrNull().catch(() => null);

const allowPublicDemoOrDistributorSession = async () => {
  const session = await getRouteSessionOrNull();
  if (!session) return null;
  if (!session.demoMode && session.company.commercial_account_type === 'DISTRIBUTOR') return null;
  return redirect('/dashboard');
};

export const router = createBrowserRouter([
  {
    path: '/',
    loader: redirectToLanding,
  },
  {
    path: '/login',
    element: <LoginPage />,
    loader: redirectIfAuthenticated,
  },
  {
    path: '/oauth/authorize',
    element: <AiOAuthAuthorizePage />,
  },
  {
    path: '/support',
    element: <AiConnectionSupportPage />,
  },
  {
    path: '/soporte',
    element: <AiConnectionSupportPage />,
  },
  {
    path: '/demo',
    element: <PublicDemoPage />,
    loader: allowPublicDemoOrDistributorSession,
  },
  {
    path: '/planes',
    element: <PublicPlansPage />,
    loader: redirectIfAuthenticated,
  },
  {
    path: '/plans',
    element: <PublicPlansPage />,
    loader: redirectIfAuthenticated,
  },
  {
    path: '/signup',
    element: <SignupPage />,
    loader: redirectIfAuthenticated,
  },
  {
    path: '/signup/billing',
    element: <SignupPage />,
    loader: redirectIfAuthenticated,
  },
  {
    path: '/signup/complete',
    element: <SignupCompletePage />,
    loader: redirectIfAuthenticated,
  },
  {
    path: '/invite/:token',
    element: <InviteAcceptPage />,
  },
  {
    path: '/reset-password/:token',
    element: <ResetPasswordPage />,
  },
  {
    path: '/kiosk/:deviceToken',
    element: <KioskRoute />,
  },
  {
    path: '/task-kiosk/:deviceToken',
    element: <TaskKioskRoute />,
  },
  {
    path: '/petty-cash/kiosk/:fundToken',
    element: <PettyCashKioskRoute />,
  },
  {
    path: '/expenses/kiosk/cuentas-por-pagar/:token',
    element: <ExpensesPayablesKioskRoute />,
    errorElement: <WorkspaceRouteError />,
  },
  {
    path: '/expenses/kiosk/cuentas-por-pagar',
    element: <ExpensesPayablesKioskRoute />,
    errorElement: <WorkspaceRouteError />,
    loader: requireAuthenticatedSession,
  },
  {
    path: '/public-catalog/:publicAccessToken',
    element: <PublicCatalogRoute />,
  },
  {
    path: '/pos-display/pair',
    element: <CustomerDisplayRoute />,
  },
  {
    path: '/pos-display/:deviceToken',
    element: <CustomerDisplayRoute />,
  },
  {
    path: '/supplier-portal/:portalCode',
    element: <SupplierPortalRoute />,
  },
  {
    path: '/certificates/verify/:folio',
    element: <Suspense fallback={<LoadingBarOverlay isVisible title="Validando certificado" description="Consultando autenticidad y vigencia." />}><TrainingCertificateVerificationPage /></Suspense>,
  },
  {
    path: '/pos-self-service/:publicAccessToken',
    element: <SelfServiceKioskRoute />,
  },
  {
    path: '/pos-self-checkout/:publicAccessToken',
    element: <SelfCheckoutKioskRoute />,
  },
  {
    path: '/pos-restaurant/waiter/:publicAccessToken',
    element: <RestaurantKioskRoute />,
  },
  {
    path: '/pos-restaurant/orders/:publicAccessToken',
    element: <RestaurantKioskRoute />,
  },
  {
    path: '/pos-restaurant/kitchen/:publicAccessToken',
    element: <RestaurantKioskRoute />,
  },
  {
    path: '/multi-kiosk/:publicAccessToken',
    element: <MultiKioskMobileRoute />,
  },
  {
    path: '/platform-admin',
    element: <PlatformAdminRoute />,
    loader: requirePlatformAdminSession,
  },
  {
    path: '/distributor-portal',
    element: <DistributorPortalRoute />,
    loader: requireDistributorPortalSession,
  },
  {
    path: '/:pageId/*',
    element: <PrivateAppRoute />,
    errorElement: <WorkspaceRouteError />,
    loader: requireAuthenticatedSession,
  },
]);
