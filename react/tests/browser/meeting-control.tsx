import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
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
    { setCurrentLanguage } = useLanguage();
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
        Prueba UI sintética · sin acceso a producción
      </div>
      <main className="min-h-0 flex-1">
        <Routes>
          <Route
            path="/:pageId/*"
            element={
              <MinutesControl learningModeActive onNavigate={() => {}} />
            }
          />
        </Routes>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <BrowserRouter>
        <FavoritesProvider>
          <WorkbarLayoutProvider>
            <Fixture />
          </WorkbarLayoutProvider>
        </FavoritesProvider>
      </BrowserRouter>
    </LanguageProvider>
  </StrictMode>,
);
