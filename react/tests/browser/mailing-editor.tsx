import { useState } from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "../../src/app/shared/context";
import { CampaignEditor } from "../../src/app/BasicModules/Sales/Mailing/components/CampaignEditor";
import { useMailingCopy } from "../../src/app/BasicModules/Sales/Mailing/translations";
import {
  setCachedAuthSession,
  setCachedCsrfToken,
} from "../../src/app/api/authSessionStore";
import "../../src/styles/index.css";

setCachedAuthSession({
  user: {
    id: 9001,
    role: "admin",
    name: "Synthetic user",
    module_slugs: ["crm"],
    tab_permissions_configured: true,
    tab_permission_keys: ["crm.mailing", "crm.contacts"],
  },
  company: {
    id: 9001,
    name: "Synthetic company",
    active: true,
    role: "admin",
    commercial_account_type: "SUPER_ADMIN",
  },
  companies: [],
  csrfToken: "synthetic-csrf",
});
setCachedCsrfToken("synthetic-csrf");
function Fixture() {
  const { copy } = useMailingCopy();
  const [result, setResult] = useState("");
  const params = new URLSearchParams(location.search);
  return (
    <main className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950 dark:text-white">
      <output>{result}</output>
      {!result && (
        <CampaignEditor
          canEdit={!params.has("readonly")}
          campaign={
            params.has("new")
              ? null
              : {
                  id: "00000000-0000-4000-8000-000000000001",
                  name: "Seguimiento de octubre",
                  subject: "Hola {{name}}",
                  bodyText: "Queremos presentarte nuestros servicios.",
                  previewText: "Conoce nuestras opciones",
                  senderName: "Equipo comercial",
                  senderAccountId: "sender-a",
                  replyTo: "ventas@example.com",
                  version: 1,
                  status: "DRAFT",
                  recipientCount: 0,
                  updatedAt: "2026-10-19T12:00:00Z",
                  recipients: [],
                }
          }
          copy={copy}
          onClose={() => setResult("closed")}
          onSaved={(_, review) => setResult(review ? "review" : "saved")}
          onConfigureAccounts={() => setResult("configure")}
        />
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <Fixture />
  </LanguageProvider>,
);
