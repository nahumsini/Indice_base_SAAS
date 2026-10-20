import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { LanguageProvider } from "../../src/app/shared/context";
import Whatsapping from "../../src/app/BasicModules/Sales/Whatsapping/Whatsapping";
import {
  setCachedAuthSession,
  setCachedCsrfToken,
} from "../../src/app/api/authSessionStore";
import "../../src/styles/index.css";
setCachedAuthSession({
  user: {
    id: 9001,
    role: "user",
    name: "Vendedor de prueba",
    module_slugs: ["crm"],
    tab_permissions_configured: true,
    tab_permission_keys: ["crm.contacts"],
  },
  company: {
    id: 9001,
    name: "Empresa de prueba",
    active: true,
    role: "user",
    commercial_account_type: "SUPER_ADMIN",
  },
  companies: [],
  csrfToken: "synthetic-csrf",
});
setCachedCsrfToken("synthetic-csrf");
createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <MemoryRouter initialEntries={["/sales/whatsapping"]}>
      <main className="min-h-screen min-w-0 bg-slate-50 p-4 md:p-6 dark:bg-slate-950 dark:text-white">
        <Whatsapping />
      </main>
    </MemoryRouter>
  </LanguageProvider>,
);
