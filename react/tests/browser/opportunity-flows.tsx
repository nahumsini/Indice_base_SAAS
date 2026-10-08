import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { LanguageProvider } from '../../src/app/shared/context';
import { BusinessCurrencyProvider } from '../../src/app/BasicModules/shared/BusinessCurrencyContext';
import { SalesCrmProvider } from '../../src/app/BasicModules/Sales/salesCrmContext';
import Prospectos from '../../src/app/BasicModules/Sales/Prospectos/Prospectos';
import { setCachedAuthSession, setCachedCsrfToken } from '../../src/app/api/authSessionStore';
import type { AuthSessionResponse } from '../../src/app/api/auth.types';
import '../../src/styles/index.css';

const session = (companyId: number, userId: number, role = 'ROOT') => ({
  user: { id: userId, name: 'Operador de prueba', role },
  company: { id: companyId, role, active: true },
}) as AuthSessionResponse;
setCachedAuthSession(session(1, 1));
setCachedCsrfToken('synthetic-csrf');

function Fixture() {
  const [scope, setScope] = useState('1:1');
  const [show, setShow] = useState(true);
  Object.assign(window, { opportunityFixture: {
    switchSession: (companyId: number, userId: number, role?: string) => {
      window.history.replaceState(null, '', window.location.pathname);
      setCachedAuthSession(session(companyId, userId, role));
      setScope(`${companyId}:${userId}`);
    },
  } });
  return <LanguageProvider><MemoryRouter><BusinessCurrencyProvider>
    <main className="mx-auto max-w-7xl p-4">
      <button onClick={() => setShow(value => !value)}>{show ? 'Otra pestaña' : 'Volver a oportunidades'}</button>
      {show ? <SalesCrmProvider key={scope}><Prospectos learningModeActive /></SalesCrmProvider> : <p>Otra pestaña de prueba</p>}
    </main>
  </BusinessCurrencyProvider></MemoryRouter></LanguageProvider>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Fixture /></StrictMode>);
