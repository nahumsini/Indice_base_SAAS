import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './app/routes';
import { FavoritesProvider, LanguageProvider } from './app/shared/context';
import { PettyCashProvider } from './app/BasicModules/PettyCash/context/PettyCashContext';
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

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <LanguageProvider>
      <FavoritesProvider>
        <PettyCashProvider>
          <RouterProvider router={router} />
        </PettyCashProvider>
      </FavoritesProvider>
    </LanguageProvider>
  </StrictMode>,
);
