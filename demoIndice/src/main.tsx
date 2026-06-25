import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { installSourceAuthBridge } from './auth/sourceAuthBridge';
import { FavoritesProvider, LanguageProvider } from '../../react/src/app/shared/context';
import './index.css';
import '../../react/src/styles/index.css';

installSourceAuthBridge();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <FavoritesProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </FavoritesProvider>
    </LanguageProvider>
  </StrictMode>,
);
