import { lazy, Suspense } from 'react';
import { createBrowserRouter, redirect } from 'react-router';
import App from './App';
import { InviteAcceptPage, LoginPage } from './Auth';
import { authApi } from './api/auth';
import { LoadingBarOverlay } from './components/LoadingBarOverlay';

const HumanResourcesKiosk = lazy(() => import('./BasicModules/HumanResources/Kiosk/Kiosk'));
const ProcessTasksKiosk = lazy(() => import('./BasicModules/ProcessesTasks/Kiosk/PublicTaskKioskPage'));

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

const redirectToLanding = async () => {
  const session = await authApi.getSessionOrNull();
  return redirect(session ? '/dashboard' : '/login');
};

const redirectIfAuthenticated = async () => {
  const session = await authApi.getSessionOrNull();

  if (session) {
    return redirect('/dashboard');
  }

  return null;
};

const requireAuthenticatedSession = async () => {
  const session = await authApi.getSessionOrNull();

  if (!session) {
    return redirect('/login');
  }

  return null;
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
    path: '/invite/:token',
    element: <InviteAcceptPage />,
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
    path: '/:pageId/*',
    element: <App />,
    loader: requireAuthenticatedSession,
  },
]);
