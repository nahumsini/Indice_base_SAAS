import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageProvider } from '../../src/app/shared/context';
import { CommercialOperationsWorkspace } from '../../src/app/PlatformAdmin/CommercialOperations/CommercialOperationsWorkspace';
import { setCachedAuthSession, setCachedCsrfToken } from '../../src/app/api/authSessionStore';
import type { AuthSessionResponse } from '../../src/app/api/auth.types';
import '../../src/styles/index.css';
const session = { user: { id: 1, role: 'ROOT' }, company: { id: 1, role: 'ROOT', active: true } } as AuthSessionResponse;
setCachedAuthSession(session);
setCachedCsrfToken('synthetic-csrf');
function Fixture() {
  const [destination, setDestination] = useState('');
  return <LanguageProvider><main className="mx-auto max-w-7xl p-4">
    <button onClick={() => setCachedAuthSession({ ...session, company: { ...session.company, id: 2 } })}>Switch company</button>
    <output data-testid="destination">{destination}</output>
    <CommercialOperationsWorkspace locale="es-MX" onOpenCompany={(id, tab) => setDestination(`${id}:${tab}`)}
      onOpenCare={name => setDestination(`care:${name}`)} onOpenConsulting={name => setDestination(`consulting:${name}`)} />
  </main></LanguageProvider>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Fixture /></StrictMode>);
