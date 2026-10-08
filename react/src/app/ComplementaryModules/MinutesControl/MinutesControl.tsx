import { useCallback, useEffect } from "react";
import { authApi } from "../../api/auth";
import {
  canAccessModuleTab,
  normalizeTabScopeRole,
} from "../../access/tabScopeCatalog";
import { IndiceModuleShell } from "../../components/frontend-os/IndiceModuleShell";
import { useRoutedModuleTab } from "../../hooks/useRoutedModuleTab";
import { useLanguage } from "../../shared/context";
import { Feedback, useMeetingQuery } from "./components/MeetingPrimitives";
import { getMeetingCopy } from "./translations/meetingCopy";
import MeetingsTab from "./tabs/MeetingsTab";
import AgreementsTab from "./tabs/AgreementsTab";
import IndicatorsTab from "./tabs/IndicatorsTab";
import { MeetingGuide } from "./components/MeetingGuide";

const tabs = ["meetings", "agreements", "indicators"] as const;
export default function MinutesControl({
  onNavigate,
  learningModeActive = false,
}: {
  onNavigate: (page?: string) => void;
  learningModeActive?: boolean;
}) {
  const { currentLanguage } = useLanguage(),
    copy = getMeetingCopy(currentLanguage.code);
  const auth = useMeetingQuery(
    useCallback(() => authApi.getSessionOrNull(), []),
  );
  const { activeTab, setActiveTab } = useRoutedModuleTab("meetings", tabs, {
    reuniones: "meetings",
    acuerdos: "agreements",
    seguimientos: "agreements",
    kpis: "indicators",
  });
  const allowed = auth.data
    ? tabs.filter((id) => canAccessModuleTab("minutes-control", id, auth.data))
    : [];
  useEffect(() => {
    if (allowed.length && !allowed.includes(activeTab))
      setActiveTab(allowed[0]);
  }, [allowed.join(","), activeTab]);
  const administrator = [
    "root",
    "superadmin",
    "admin",
    "owner",
    "dueno",
  ].includes(normalizeTabScopeRole(auth.data?.user.role));
  const userId = auth.data?.user.id ?? 0;
  return (
    <IndiceModuleShell
      currentModule="minutes-control"
      title={copy.title}
      subtitle={copy.subtitle}
      tone="blue"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onNavigate={onNavigate}
      tabs={allowed.map((id) => ({
        id,
        label: copy[id],
        icon: { meetings: "📅", agreements: "🤝", indicators: "📊" }[id],
        access: { page: "minutes-control", tabId: id },
      }))}
    >
      <div className="space-y-6" data-meeting-workspace>
        {learningModeActive && allowed.length > 0 && (
          <MeetingGuide copy={copy} />
        )}
        {auth.loading ? (
          <Feedback>{copy.loading}</Feedback>
        ) : auth.error || !allowed.length ? (
          <Feedback error>{copy.error}</Feedback>
        ) : (
          allowed.includes(activeTab) &&
          (activeTab === "meetings" ? (
            <MeetingsTab
              copy={copy}
              locale={currentLanguage.code}
              userId={userId}
              administrator={administrator}
              onAgreements={
                allowed.includes("agreements")
                  ? () => setActiveTab("agreements")
                  : undefined
              }
            />
          ) : activeTab === "agreements" ? (
            <AgreementsTab
              copy={copy}
              locale={currentLanguage.code}
              userId={userId}
              administrator={administrator}
            />
          ) : (
            <IndicatorsTab
              copy={copy}
              locale={currentLanguage.code}
              canMeetings={allowed.includes("meetings")}
              canAgreements={allowed.includes("agreements")}
            />
          ))
        )}
      </div>
    </IndiceModuleShell>
  );
}
