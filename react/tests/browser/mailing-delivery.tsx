import { useState } from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "../../src/app/shared/context";
import { CampaignDelivery } from "../../src/app/BasicModules/Sales/Mailing/components/CampaignDelivery";
import { setCachedCsrfToken } from "../../src/app/api/authSessionStore";
import "../../src/styles/index.css";
setCachedCsrfToken("synthetic-csrf");
function Fixture() {
  const [closed, setClosed] = useState(false);
  return (
    <main>
      {closed ? (
        <output>closed</output>
      ) : (
        <CampaignDelivery
          id="00000000-0000-4000-8000-000000000001"
          name="Campaña de prueba"
          onClose={() => setClosed(true)}
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
