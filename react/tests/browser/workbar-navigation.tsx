import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, useLocation } from 'react-router';
import { authApi } from '../../src/app/api/auth';
import { setCachedAuthSession, setCachedCsrfToken, clearBrowserLocalStorage } from '../../src/app/api/authSessionStore';
import { LanguageProvider } from '../../src/app/shared/context';
import { WorkbarLayoutProvider, useWorkbarLayout } from '../../src/app/components/workbar/WorkbarLayoutContext';
import { WorkbarLayoutModal } from '../../src/app/components/workbar/WorkbarLayoutModal';
import { DualWorkspaceHost } from '../../src/app/components/workbar/DualWorkspaceHost';
import type { AuthSessionResponse } from '../../src/app/api/auth.types';
import '../../src/styles/index.css';
const embedded = window.self !== window.top;
const session = (user = 9001, company = 9001): AuthSessionResponse => ({user:{id:user,role:'admin',name:'Synthetic'},company:{id:company,name:'Synthetic company',role:'admin',active:true,commercial_account_type:'SUPER_ADMIN',user_company_id:user,scope:{type:'corporate_office',unit_id:null,business_id:null}},companies:[],csrfToken:'synthetic-csrf'});
function Fixture() {
  const preferences = useWorkbarLayout();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [dark, setDark] = useState(false);
  useEffect(() => { void authApi.getSessionOrNull(); }, []);
  Object.assign(window,{workbarFixture:{preferences,
    switchUser(user:number,company=9001){setCachedAuthSession(session(user,company));setCachedCsrfToken('synthetic-csrf');},
    logout(){clearBrowserLocalStorage();setCachedAuthSession(null);},
    setBlocked,
  }});
  return <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
    {!embedded && <header data-testid="global-header" className="flex h-16 shrink-0 items-center justify-between bg-[var(--indice-brand-action)] px-5 text-white">
      <span>Índice</span><button className="min-h-11 px-3" onClick={()=>setOpen(true)}>Personalizar navegación</button>
      <button className="min-h-11" onClick={()=>{setDark(!dark);document.documentElement.classList.toggle('dark',!dark);}}>Tema</button>
    </header>}
    <main className="flex min-h-0 flex-1 overflow-hidden">
      <section data-testid="primary-scroll" className="min-h-0 min-w-0 flex-1 overflow-y-auto"><div className="p-5">
        <h1 className="text-xl font-semibold dark:text-white">{location.pathname==='/dashboard'?'Dashboard':'Herramienta de prueba'}</h1>
        <output data-testid="route">{location.pathname}</output>
        <output data-testid="ready">{String(preferences.preferencesReady)}</output>
        <output data-testid="position">{preferences.position}</output>
        <output data-testid="enabled">{String(preferences.dualScreenEnabled)}</output>
        <output data-testid="active">{String(preferences.isDualScreenActive)}</output>
        <output data-testid="actor">{preferences.preferenceScope}</output>
        <nav className="my-4 flex flex-wrap gap-3"><Link to="/workbar-demo/one">Módulo uno</Link><Link to="/workbar-demo/two">Módulo dos</Link></nav>
        <label className="grid gap-2 dark:text-white">Nota de trabajo<input aria-label="Nota de trabajo" className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900" value={note} onChange={event=>setNote(event.target.value)}/></label>
        <div style={{height:1400}} aria-hidden="true" />
      </div></section>
      <DualWorkspaceHost enabled={!embedded && !blocked} />
    </main>
    {!embedded && <WorkbarLayoutModal key={preferences.preferenceScope} open={open} onOpenChange={setOpen} />}
  </div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><LanguageProvider><WorkbarLayoutProvider><Fixture /></WorkbarLayoutProvider></LanguageProvider></BrowserRouter></StrictMode>);
