import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { LanguageProvider, FavoritesProvider } from '../../src/app/shared/context';
import { WorkbarLayoutProvider } from '../../src/app/components/workbar/WorkbarLayoutContext';
import { BusinessCurrencyProvider } from '../../src/app/BasicModules/shared/BusinessCurrencyContext';
import SalesBoard from '../../src/app/ComplementaryModules/SalesBoard/SalesBoard';
import { setCachedAuthSession } from '../../src/app/api/authSessionStore';
import '../../src/styles/index.css';
setCachedAuthSession({ user: { id: 9001, role: 'admin', name: 'Synthetic reviewer', module_slugs: ['sales_board'], tab_permissions_configured: true, tab_permission_keys: ['sales_board.overview'] }, company: { id: 9001, name: 'Synthetic company', active: true, role: 'admin', commercial_account_type: 'SUPER_ADMIN' }, companies: [], csrfToken: 'synthetic-csrf' });
createRoot(document.getElementById('root')!).render(
  <LanguageProvider><FavoritesProvider><WorkbarLayoutProvider><BusinessCurrencyProvider>
    <MemoryRouter initialEntries={['/sales-board/overview']}><Routes><Route path="/:pageId/*" element={<SalesBoard />} /></Routes></MemoryRouter>
  </BusinessCurrencyProvider></WorkbarLayoutProvider></FavoritesProvider></LanguageProvider>,
);
