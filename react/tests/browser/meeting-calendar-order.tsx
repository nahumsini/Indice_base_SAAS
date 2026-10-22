import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import {
  LanguageProvider,
  FavoritesProvider,
  useLanguage,
  languages,
} from "../../src/app/shared/context";
import {
  WorkbarLayoutProvider,
  useWorkbarLayout,
} from "../../src/app/components/workbar/WorkbarLayoutContext";
import {
  setCachedAuthSession,
  setCachedCsrfToken,
} from "../../src/app/api/authSessionStore";
import type { AuthSessionResponse } from "../../src/app/api/auth.types";
import MinutesControl from "../../src/app/ComplementaryModules/MinutesControl/MinutesControl";
import "../../src/styles/index.css";

const actor = (role = "superadmin", keys: string[] = [], id = 42) =>
  ({
    user: {
      id,
      name: "Responsable sintético",
      role,
      module_slugs: ["control_minutas"],
      tab_permissions_configured: true,
      tab_permission_keys: keys,
    },
    company: { id: 8, name: "Empresa sintética", active: true, role },
    csrfToken: "synthetic-csrf",
  }) as AuthSessionResponse;
setCachedAuthSession(actor());
setCachedCsrfToken("synthetic-csrf");
if (!window.location.pathname.startsWith("/minutes-control/"))
  window.history.replaceState(
    null,
    "",
    "/minutes-control/meetings" + window.location.search,
  );
function Fixture() {
  const { setPosition } = useWorkbarLayout(),
    { setCurrentLanguage, currentLanguage } = useLanguage();
  Object.assign(window, {
    meetingFixture: {
      layout: setPosition,
      language: (code: string) =>
        setCurrentLanguage(languages.find((l) => l.code === code)!),
      role: (role: string, keys: string[], id = 42) =>
        setCachedAuthSession(actor(role, keys, id)),
    },
  });
  return (
    <div className="flex h-screen flex-col">
      <div className="shrink-0 bg-blue-600 p-3 text-sm text-white">
        <div className="flex flex-wrap items-center justify-between gap-3"><span>Prueba UI sintética · sin acceso a producción</span><label>Perfil de prueba<select aria-label="Perfil de prueba" className="min-h-11 bg-blue-700" onChange={e=>{ const value=e.target.value; setCachedAuthSession(value==='coordinator'?actor():actor('user',value==='agreements'?['control_minutas.agreements']:['control_minutas.meetings'],value==='writer'?43:44)); }}><option value="coordinator">Coordinación</option><option value="writer">Minutista</option><option value="reader">Consulta</option><option value="agreements">Solo acuerdos</option></select></label><button type="button" className="min-h-11 border px-3" onClick={()=>fetch('/__fixture/conflict',{method:'POST'})}>Simular cambio ajeno</button><div className="flex items-center gap-2"><label className="flex items-center gap-2">Idioma de prueba<select aria-label="Idioma de prueba" className="h-11 rounded-lg border border-white/40 bg-blue-700 px-2 text-white" value={currentLanguage.code} onChange={e=>setCurrentLanguage(languages.find(l=>l.code===e.target.value)!)}>{languages.map(l=><option key={l.code} value={l.code}>{l.code}</option>)}</select></label><button type="button" className="min-h-11 rounded-lg border border-white/40 px-3" onClick={()=>document.documentElement.classList.toggle('dark')}>Cambiar tema</button></div></div>
      </div>
      <main className="min-h-0 flex-1">
        <MinutesControl onNavigate={() => {}} />
      </main>
    </div>
  );
}
const router = createBrowserRouter([{ path: "/:pageId/*", element: <LanguageProvider><FavoritesProvider><WorkbarLayoutProvider><Fixture /></WorkbarLayoutProvider></FavoritesProvider></LanguageProvider> }]);
createRoot(document.getElementById("root")!).render(<StrictMode><RouterProvider router={router} /></StrictMode>);
