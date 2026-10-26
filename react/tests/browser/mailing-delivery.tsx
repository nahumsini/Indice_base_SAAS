import { useState } from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "../../src/app/shared/context";
import { CampaignDelivery } from "../../src/app/BasicModules/Sales/Mailing/components/CampaignDelivery";
import { setCachedCsrfToken } from "../../src/app/api/authSessionStore";
import "../../src/styles/index.css";
setCachedCsrfToken("synthetic-csrf");
function Fixture() {
  const [closed, setClosed] = useState(false);
  const [destination, setDestination] = useState("");
  return (
    <main>
      {destination ? (
        <output>{destination}</output>
      ) : closed ? (
        <output>closed</output>
      ) : (
        <CampaignDelivery
          id="00000000-0000-4000-8000-000000000001"
          name="Campaña de prueba"
          onClose={() => setClosed(true)}
          onConfigureAccounts={
            new URLSearchParams(location.search).has("noAccounts")
              ? undefined
              : () => setDestination("accounts")
          }
          onEditDraft={() => setDestination("editor")}
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
