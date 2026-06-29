import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './app/routes';
import { FavoritesProvider, LanguageProvider } from './app/shared/context';
import { PettyCashProvider } from './app/BasicModules/PettyCash/context/PettyCashContext';
import './styles/index.css';

const chunkReloadStorageKey = 'indice:chunk-reload-attempted';
const routeChunkReloadStorageKey = 'indice:route-chunk-reload-attempted';
const renderChunkReloadStorageKey = 'indice:render-chunk-reload-attempted';

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

window.addEventListener('load', () => {
  sessionStorage.removeItem(chunkReloadStorageKey);
  sessionStorage.removeItem(routeChunkReloadStorageKey);
  sessionStorage.removeItem(renderChunkReloadStorageKey);
});

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
