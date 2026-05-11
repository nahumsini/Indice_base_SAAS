import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './app/routes';
import { FavoritesProvider, LanguageProvider } from './app/shared/context';
import { PettyCashProvider } from './app/BasicModules/PettyCash/context/PettyCashContext';
import './styles/index.css';

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
