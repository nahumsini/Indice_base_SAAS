import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router';
import { LanguageProvider } from '../../src/app/shared/context';
import { NotificationLauncher } from '../../src/app/components/notifications/NotificationLauncher';
import { MessagingLauncher } from '../../src/app/Messaging/MessagingLauncher';
import { dispatchNotificationsRefresh } from '../../src/app/api/notificationEvents';
import { setCachedCsrfToken } from '../../src/app/api/authSessionStore';
import type { AuthSessionResponse } from '../../src/app/api/auth.types';
import '../../src/styles/index.css';
setCachedCsrfToken('synthetic-csrf');
function Fixture() {
  const [company, setCompany] = useState(1);
  const location = useLocation();
  const session = { user: { id: 1 }, company: { id: company, user_company_id: company }, demoMode: false } as AuthSessionResponse;
  return <>
    <header className="flex h-16 items-center justify-between bg-[var(--indice-brand-shell)] px-4 text-white"><strong>Índice · Prueba móvil</strong><div className="flex"><NotificationLauncher scopeKey={`1:${company}:${company}`}/><MessagingLauncher session={session} locale="es-MX"/></div></header>
    <main className="space-y-3 p-4"><p>Datos sintéticos para revisar la navegación.</p><output data-destination className="block break-all">{location.pathname}{location.search}{location.hash}</output>
      <button onClick={dispatchNotificationsRefresh} className="min-h-11 rounded-lg border p-2">Actualizar señales</button>
      <button onClick={() => setCompany(value => value === 1 ? 2 : 1)} className="min-h-11 rounded-lg border p-2">Cambiar empresa</button>
    </main>
  </>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><LanguageProvider><BrowserRouter><Fixture /></BrowserRouter></LanguageProvider></StrictMode>);
