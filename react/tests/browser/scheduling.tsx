import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router';
import { LanguageProvider, FavoritesProvider, useLanguage, languages } from '../../src/app/shared/context';
import { WorkbarLayoutProvider, useWorkbarLayout } from '../../src/app/components/workbar/WorkbarLayoutContext';
import { setCachedAuthSession, setCachedCsrfToken } from '../../src/app/api/authSessionStore';
import type { AuthSessionResponse } from '../../src/app/api/auth.types';
import Scheduling from '../../src/app/ComplementaryModules/Scheduling/Scheduling';
import '../../src/styles/index.css';

const actor = (role = 'superadmin', keys?: string[]) => ({ user: { id: 42, name: 'Consultor sintético', role, module_slugs: ['scheduling','crm'], tab_permissions_configured: true,
  tab_permission_keys: keys ?? (role === 'user' ? ['scheduling.calendar', 'scheduling.reservations', 'scheduling.events', 'scheduling.indicators'] : []) },
  company: { id: 8, name: 'Empresa sintética', active: true, role }, csrfToken: 'synthetic-csrf' }) as AuthSessionResponse;
setCachedAuthSession(actor());setCachedCsrfToken('synthetic-csrf');
if (!window.location.pathname.startsWith('/scheduling/')) window.history.replaceState(null, '', '/scheduling/calendar');
function Fixture() {
  const { setPosition } = useWorkbarLayout(), { setCurrentLanguage } = useLanguage();
  Object.assign(window, { schedulingFixture: { layout: setPosition, language: (code: string) => setCurrentLanguage(languages.find(language => language.code === code)!), role: (role: string, keys?: string[]) => setCachedAuthSession(actor(role, keys)) } });
  return <div className="flex h-screen flex-col"><div className="flex shrink-0 flex-wrap items-center justify-between gap-2 bg-[#2563EB] p-3 text-sm text-white">
    <span>Prueba UI con datos sintéticos · sin acceso a producción</span><a href="/book/piloto" target="_blank" rel="noopener noreferrer" className="underline">Ver página de reservas</a></div>
    <main className="min-h-0 flex-1"><Routes><Route path="/:pageId/*" element={<Scheduling learningModeActive onNavigate={() => {}} />} /></Routes></main></div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><LanguageProvider><BrowserRouter><FavoritesProvider><WorkbarLayoutProvider><Fixture /></WorkbarLayoutProvider></FavoritesProvider></BrowserRouter></LanguageProvider></StrictMode>);
