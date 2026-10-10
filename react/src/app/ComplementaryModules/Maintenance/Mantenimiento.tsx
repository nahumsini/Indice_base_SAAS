import { useCallback, useEffect } from "react";
import {
  ClipboardList,
  Wrench,
  PackageCheck,
  Repeat,
  ChartNoAxesCombined,
  Settings2,
} from "lucide-react";
import { authApi } from "../../api/auth";
import { canAccessModuleTab } from "../../access/tabScopeCatalog";
import { IndiceModuleShell } from "../../components/frontend-os/IndiceModuleShell";
import { IndiceViewState } from "../../components/frontend-os/IndiceViewState";
import { useRoutedModuleTab } from "../../hooks/useRoutedModuleTab";
import { useAuthorizationRevision } from "../../hooks/useAuthorizationRevision";
import { useLanguage } from "../../shared/context";
import { maintenanceApi, type Context } from "./services/maintenanceApi";
import { getMaintenanceCopy } from "./translations/maintenanceCopy";
import {
  Action,
  Feedback,
  useMaintenanceQuery,
} from "./components/MaintenancePrimitives";
import {
  RequestsTab,
  OrdersTab,
  AssetsTab,
  PreventiveTab,
} from "./tabs/OperationalTabs";
import { IndicatorsTab, ConfigurationTab } from "./tabs/ManagementTabs";
import { MaintenanceGuide } from "./components/MaintenanceGuide";

const tabs = [
  "requests",
  "orders",
  "assets",
  "preventive",
  "indicators",
  "configuration",
] as const;
const icons = {
  requests: ClipboardList,
  orders: Wrench,
  assets: PackageCheck,
  preventive: Repeat,
  indicators: ChartNoAxesCombined,
  configuration: Settings2,
};
export default function Mantenimiento({
  onNavigate,
  learningModeActive = false,
}: {
  onNavigate?: (page?: string) => void;
  learningModeActive?: boolean;
}) {
  const { currentLanguage } = useLanguage(),
    c = getMaintenanceCopy(currentLanguage.code),
    revision = useAuthorizationRevision();
  const result = useMaintenanceQuery(
    useCallback(async (signal: AbortSignal) => {
      const session = await authApi.getSessionOrNull();
      if (!session) throw new Error("Session required");
      const context = await maintenanceApi.get<Context>("/context", signal);
      return { session, context };
    }, []),
  );
  const { activeTab, setActiveTab } = useRoutedModuleTab("requests", tabs, {
    reportes: "requests",
    ordenes: "orders",
    equipos: "assets",
    preventivos: "preventive",
    kpis: "indicators",
  });
  const allowed = result.data
    ? tabs.filter((tab) =>
        canAccessModuleTab("maintenance", tab, result.data!.session),
      )
    : [];
  useEffect(() => {
    if (allowed.length && !allowed.includes(activeTab))
      setActiveTab(allowed[0]);
  }, [activeTab, allowed.join(",")]);
  const props = result.data
    ? {
        c,
        context: result.data.context,
        locale: currentLanguage.code,
        allowed: [...allowed],
      }
    : undefined;
  return (
    <IndiceModuleShell
      currentModule="maintenance"
      title={c.title}
      subtitle={c.subtitle}
      tone="gray"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onNavigate={onNavigate}
      tabs={allowed.map((id) => {
        const Icon = icons[id];
        return {
          id,
          label: c[id],
          icon: <Icon className="h-4 w-4" />,
          access: { page: "maintenance" as const, tabId: id },
        };
      })}
    >
      <div className="space-y-6" data-maintenance-workspace>
        {learningModeActive && allowed.length > 0 && <MaintenanceGuide c={c} />}
        {result.loading ? (
          <IndiceViewState tone="gray" variant="loading" title={c.loading} />
        ) : result.error ? (
          <IndiceViewState
            tone="gray"
            variant="error"
            title={c.error}
            action={<Action onClick={result.reload}>{c.retry}</Action>}
          />
        ) : !allowed.length ? (
          <IndiceViewState
            tone="gray"
            variant="restricted"
            title={c.scopeError}
          />
        ) : (
          props &&
          allowed.includes(activeTab) && (
            <div key={`${revision}:${activeTab}`}>
              {activeTab === "requests" ? (
                <RequestsTab {...props} />
              ) : activeTab === "orders" ? (
                <OrdersTab {...props} />
              ) : activeTab === "assets" ? (
                <AssetsTab {...props} />
              ) : activeTab === "preventive" ? (
                <PreventiveTab {...props} />
              ) : activeTab === "indicators" ? (
                <IndicatorsTab {...props} />
              ) : (
                <ConfigurationTab {...props} onChanged={result.reload} />
              )}
            </div>
          )
        )}
      </div>
    </IndiceModuleShell>
  );
}
