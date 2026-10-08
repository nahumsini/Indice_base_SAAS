import { StrictMode, useSyncExternalStore, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './app/routes';
import { FavoritesProvider, LanguageProvider } from './app/shared/context';
import { PettyCashProvider } from './app/BasicModules/PettyCash/context/PettyCashContext';
import { getLegacyTrainingDestination } from './app/Training/trainingAccess';
import './styles/index.css';

const chunkReloadStorageKey = 'indice:chunk-reload-attempted';

function isDynamicImportFailure(reason: unknown) {
  const message = reason instanceof Error ? reason.message : String(reason ?? '');
  return message.includes('Failed to fetch dynamically imported module')
    || message.includes('Importing a module script failed')
    || message.includes('Loading chunk')
    || message.includes('ChunkLoadError');
}

window.addEventListener('unhandledrejection', (event) => {
  if (!isDynamicImportFailure(event.reason)) {
    return;
  }

  const alreadyAttempted = sessionStorage.getItem(chunkReloadStorageKey) === 'true';
  if (alreadyAttempted) {
    return;
  }

  event.preventDefault();
  sessionStorage.setItem(chunkReloadStorageKey, 'true');
  window.location.reload();
});

// Do not clear the retry markers on `load`: that event fires before lazy route
// chunks finish loading and used to turn a persistent chunk failure into an
// endless reload loop. The route error UI clears the relevant marker when the
// user explicitly retries.

const rootElement = document.getElementById('root');
const publicPresentationRouteIds = new Set(['investment', 'investment-carlos-munoz', 'presentation', 'public-scheduling']);
const standaloneWorkspaceRouteIds = new Set(['training-centre']);

// Public presentations and booking pages must not mount tenant-data providers.
// Independent training also avoids loading unrelated tenant financial data.
// All other existing routes retain the same providers, including after SPA navigation.
function WorkspaceProviders({ children }: { children: ReactNode }) {
  const skipTenantDataProviders = useSyncExternalStore(router.subscribe, () =>
    router.state.matches.some(match => publicPresentationRouteIds.has(match.route.id)
      || standaloneWorkspaceRouteIds.has(match.route.id))
    || Boolean(getLegacyTrainingDestination(`${window.location.origin}${router.state.location.pathname}${router.state.location.search}`)));
  if (skipTenantDataProviders) return children;
  return <FavoritesProvider><PettyCashProvider>{children}</PettyCashProvider></FavoritesProvider>;
}

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <LanguageProvider>
      <WorkspaceProviders>
        <RouterProvider router={router} />
      </WorkspaceProviders>
    </LanguageProvider>
  </StrictMode>,
);
