import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Building2,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import {
  platformAdminApi,
  type PlatformCompanyDetail,
  type PlatformCompanyMember,
  type PlatformCompanyOption,
  type PlatformCompanySummary,
  type PlatformAllCompanyUserActivity,
  type PlatformCompanyUserActivity,
} from "../api/platformAdmin";
import { AllCompanyActivityPanel } from "./AllCompanyActivityPanel";
import {
  ActivityPanel,
  CompanyBusinessActivityPanel,
  LifecyclePanel,
} from "./CompanyUserActivityPanels";
import { IndiceConfirmationDialog } from "../components/indice-modal/IndiceConfirmationDialog";

type CompanyRole = "user" | "admin" | "superadmin" | "root";
type CompanyWorkspaceTab = "users" | "activities" | "allActivities";
type Feedback = { type: "success" | "error"; message: string } | null;
type PendingAccessChange =
  | { kind: "role"; member: PlatformCompanyMember; nextRole: CompanyRole }
  | { kind: "platform"; member: PlatformCompanyMember; nextRole: "PLATFORM_ROOT" | "NONE" };

const roleOptions: { value: CompanyRole; en: string; es: string }[] = [
  { value: "user", en: "User", es: "Usuario" },
  { value: "admin", en: "Admin", es: "Administrador" },
  { value: "superadmin", en: "Super Admin", es: "Super Admin" },
  { value: "root", en: "Root", es: "Root" },
];

const companyWorkspaceTabs: { id: CompanyWorkspaceTab; en: string; es: string; icon: LucideIcon }[] = [
  { id: "users", en: "Users", es: "Usuarios", icon: UsersRound },
  { id: "activities", en: "Activities", es: "Actividades", icon: Activity },
  { id: "allActivities", en: "All activities", es: "Todas las actividades", icon: Building2 },
];

const INITIAL_ALL_ACTIVITY_RECENT_LIMIT = 10;
const ALL_ACTIVITY_RECENT_INCREMENT = 10;
const MAX_ALL_ACTIVITY_RECENT_LIMIT = 100;

export function CompaniesDirectoryTab({
  english,
  companies,
  canManageRoles,
  onOpenCompany,
}: {
  english: boolean;
  companies: PlatformCompanySummary[];
  canManageRoles: boolean;
  onOpenCompany: (company: PlatformCompanyDetail) => void;
}) {
  const [query, setQuery] = useState("");
  const [directoryCompanies, setDirectoryCompanies] = useState<PlatformCompanyOption[]>([]);
  const [directoryPage, setDirectoryPage] = useState(1);
  const [directoryPageSize] = useState(25);
  const [directoryTotal, setDirectoryTotal] = useState(0);
  const [directoryPages, setDirectoryPages] = useState(1);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [company, setCompany] = useState<PlatformCompanyDetail | null>(null);
  const [activity, setActivity] = useState<PlatformCompanyUserActivity | null>(null);
  const [allActivity, setAllActivity] = useState<PlatformAllCompanyUserActivity | null>(null);
  const [allActivityRecentLimit, setAllActivityRecentLimit] = useState(INITIAL_ALL_ACTIVITY_RECENT_LIMIT);
  const [activeCompanyTab, setActiveCompanyTab] = useState<CompanyWorkspaceTab>("users");
  const [loading, setLoading] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [loadingAllActivity, setLoadingAllActivity] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pendingAccessChange, setPendingAccessChange] = useState<PendingAccessChange | null>(null);
  const [accessReason, setAccessReason] = useState("");
  const [accessError, setAccessError] = useState("");
  const companyRequestSequence = useRef(0);

  const selectedCompanySummary = useMemo(
    () => company ?? companies.find((item) => item.id === selectedCompanyId) ?? null,
    [companies, company, selectedCompanyId],
  );
  const selectedCompanyActive = company?.platform_status !== "DELETED";

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setDirectoryLoading(true);
      try {
        const response = await platformAdminApi.getCompanyOptions(query.trim(), directoryPage, directoryPageSize);
        if (!active) return;
        setDirectoryCompanies(response.companies);
        setDirectoryTotal(response.pagination.total_items);
        setDirectoryPages(response.pagination.total_pages);
        if (response.pagination.page !== directoryPage) setDirectoryPage(response.pagination.page);
      } catch (error) {
        if (!active) return;
        setFeedback({
          type: "error",
          message: error instanceof Error ? error.message : english ? "Company directory could not be loaded." : "No se pudo cargar el directorio de empresas.",
        });
      } finally {
        if (active) setDirectoryLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [directoryPage, directoryPageSize, english, query]);

  const loadCompany = useCallback(async (companyId: number) => {
    const requestSequence = ++companyRequestSequence.current;
    setLoading(true);
    setFeedback(null);
    try {
      const companyDetail = await platformAdminApi.getCompany(companyId);
      if (requestSequence !== companyRequestSequence.current) return;
      setCompany(companyDetail);
      setSelectedCompanyId(companyId);
      setActivity(null);
    } catch (error) {
      if (requestSequence !== companyRequestSequence.current) return;
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : english ? "Company users could not be loaded." : "No se pudieron cargar los usuarios.",
      });
    } finally {
      if (requestSequence === companyRequestSequence.current) setLoading(false);
    }
  }, [english]);

  const loadActivity = useCallback(async (companyId: number) => {
    setLoadingActivity(true);
    setFeedback(null);
    try {
      setActivity(await platformAdminApi.getCompanyUserActivity(companyId));
    } catch (error) {
      setActivity(null);
      setFeedback({
        type: "error",
        message: error instanceof Error
          ? error.message
          : english ? "Company activity could not be loaded." : "No se pudo cargar la actividad.",
      });
    } finally {
      setLoadingActivity(false);
    }
  }, [english]);

  const loadAllActivity = useCallback(async (recentLimit = INITIAL_ALL_ACTIVITY_RECENT_LIMIT) => {
    setLoadingAllActivity(true);
    setFeedback(null);
    try {
      const response = await platformAdminApi.getAllCompanyUserActivity(recentLimit);
      setAllActivity(response);
      setAllActivityRecentLimit(response.recent_events_limit ?? recentLimit);
    } catch (error) {
      setAllActivity(null);
      setFeedback({
        type: "error",
        message: error instanceof Error
          ? error.message
          : english ? "All company activity could not be loaded." : "No se pudo cargar la actividad general.",
      });
    } finally {
      setLoadingAllActivity(false);
    }
  }, [english]);

  const loadMoreAllActivity = useCallback(async () => {
    const currentLimit = allActivity?.recent_events_limit ?? allActivityRecentLimit;
    const nextLimit = Math.min(currentLimit + ALL_ACTIVITY_RECENT_INCREMENT, MAX_ALL_ACTIVITY_RECENT_LIMIT);
    await loadAllActivity(nextLimit);
  }, [allActivity?.recent_events_limit, allActivityRecentLimit, loadAllActivity]);

  useEffect(() => {
    if (directoryLoading) return;
    if (!directoryCompanies.length) {
      companyRequestSequence.current += 1;
      setLoading(false);
      setCompany(null);
      setSelectedCompanyId(null);
      return;
    }
    if (selectedCompanyId && directoryCompanies.some((item) => item.id === selectedCompanyId)) {
      return;
    }
    void loadCompany(directoryCompanies[0].id);
  }, [directoryCompanies, directoryLoading, loadCompany, selectedCompanyId]);

  useEffect(() => {
    if (activeCompanyTab !== "activities" || !selectedCompanyId || activity) return;
    void loadActivity(selectedCompanyId);
  }, [activeCompanyTab, activity, loadActivity, selectedCompanyId]);

  useEffect(() => {
    if (activeCompanyTab !== "allActivities" || allActivity) return;
    void loadAllActivity(allActivityRecentLimit);
  }, [activeCompanyTab, allActivity, allActivityRecentLimit, loadAllActivity]);

  const refreshCompany = async () => {
    if (activeCompanyTab === "allActivities") {
      await loadAllActivity(allActivityRecentLimit);
      return;
    }
    if (selectedCompanyId) {
      setCompany(await platformAdminApi.getCompany(selectedCompanyId));
      if (activeCompanyTab === "activities") {
        await loadActivity(selectedCompanyId);
      }
    }
  };

  const updateRole = async (member: PlatformCompanyMember, role: CompanyRole, reason: string) => {
    if (!company || normalizeRole(member.role) === role) return;
    setSavingKey(`role:${member.user_id}`);
    setFeedback(null);
    setAccessError("");
    try {
      await platformAdminApi.updateCompanyUserRole(company.id, member.user_id, role, reason);
      await refreshCompany();
      setFeedback({
        type: "success",
        message: english ? "Company role updated." : "Rol de la cuenta actualizado.",
      });
      setPendingAccessChange(null);
      setAccessReason("");
    } catch (error) {
      const message = error instanceof Error ? error.message : english ? "Role could not be updated." : "No se pudo actualizar el rol.";
      setAccessError(message);
      setFeedback({
        type: "error",
        message,
      });
    } finally {
      setSavingKey("");
    }
  };

  const updatePlatformAccess = async (
    member: PlatformCompanyMember,
    nextRole: "PLATFORM_ROOT" | "NONE",
    reason: string,
  ) => {
    if (!company) return;
    setSavingKey(`platform:${member.user_id}`);
    setFeedback(null);
    setAccessError("");
    try {
      await platformAdminApi.updateCompanyUserPlatformAccess(company.id, member.user_id, nextRole, reason);
      await refreshCompany();
      setFeedback({
        type: "success",
        message: nextRole === "PLATFORM_ROOT"
          ? english ? "Platform Root access granted." : "Acceso Platform Root concedido."
          : english ? "Platform Root access revoked." : "Acceso Platform Root revocado.",
      });
      setPendingAccessChange(null);
      setAccessReason("");
    } catch (error) {
      const message = error instanceof Error ? error.message : english ? "Platform access could not be updated." : "No se pudo actualizar el acceso de plataforma.";
      setAccessError(message);
      setFeedback({
        type: "error",
        message,
      });
    } finally {
      setSavingKey("");
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-blue-700 shadow-sm">
            <UsersRound className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-950">
              {english ? "Companies" : "Empresas"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {english
                ? activeCompanyTab === "users"
                  ? "Select a company, review its users, and manage company roles or Platform Root access."
                  : activeCompanyTab === "activities"
                    ? "Select a company and review active users, company trend, billing signals, and security activity."
                    : "Review every company, active users, payments, authentication trend, and server load."
                : activeCompanyTab === "users"
                  ? "Selecciona una empresa, revisa sus usuarios y administra roles de cuenta o acceso Platform Root."
                  : activeCompanyTab === "activities"
                    ? "Selecciona una empresa y revisa usuarios activos, tendencia, cobros y actividad de seguridad."
                    : "Revisa todas las empresas, usuarios activos, cobros, tendencia de acceso y carga del servidor."}
            </p>
          </div>
          <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700">
            {directoryTotal} {english ? "companies" : "empresas"}
          </span>
        </div>
      </div>

      <div className="flex max-w-full gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {companyWorkspaceTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeCompanyTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveCompanyTab(tab.id);
                if (tab.id === "allActivities") {
                  void loadAllActivity();
                }
              }}
              className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {english ? tab.en : tab.es}
            </button>
          );
        })}
      </div>

      {feedback ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          feedback.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-rose-200 bg-rose-50 text-rose-700"
        }`}>
          {feedback.message}
        </div>
      ) : null}

      {activeCompanyTab === "allActivities" ? (
        <AllCompanyActivityPanel
          activity={allActivity}
          companies={companies}
          english={english}
          loading={loadingAllActivity}
          onRefresh={() => void loadAllActivity(allActivityRecentLimit)}
          onLoadMore={() => void loadMoreAllActivity()}
        />
      ) : (
      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => { setQuery(event.target.value); setDirectoryPage(1); }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder={english ? "Search company or owner" : "Buscar empresa o propietario"}
              />
            </label>
          </div>
          <div className="max-h-[620px] divide-y divide-slate-100 overflow-y-auto">
            {directoryCompanies.map((item) => {
              const selected = item.id === selectedCompanyId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void loadCompany(item.id)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                    selected ? "bg-blue-50" : "hover:bg-slate-50"
                  }`}
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                    selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    <Building2 className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{item.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">{item.owner_email || `#${item.id}`}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {item.platform_status === "DELETED"
                        ? english ? "Deleted account · read only" : "Cuenta eliminada · solo lectura"
                        : `${item.active_members} ${english ? "active users" : "usuarios activos"}`}
                    </span>
                  </span>
                </button>
              );
            })}
            {!directoryCompanies.length && !directoryLoading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                {english ? "No companies match this search." : "No hay empresas con esa busqueda."}
              </div>
            ) : null}
            {directoryLoading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-5 text-sm text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin text-blue-600" />
                {english ? "Loading companies..." : "Cargando empresas..."}
              </div>
            ) : null}
          </div>
          {directoryTotal > directoryPageSize ? (
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-3 text-xs text-slate-500">
              <button
                type="button"
                disabled={directoryPage <= 1 || directoryLoading}
                onClick={() => setDirectoryPage((current) => Math.max(1, current - 1))}
                className="h-9 rounded-lg border border-slate-200 px-3 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {english ? "Previous" : "Anterior"}
              </button>
              <span>{directoryPage} / {directoryPages}</span>
              <button
                type="button"
                disabled={directoryPage >= directoryPages || directoryLoading}
                onClick={() => setDirectoryPage((current) => Math.min(directoryPages, current + 1))}
                className="h-9 rounded-lg border border-slate-200 px-3 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {english ? "Next" : "Siguiente"}
              </button>
            </div>
          ) : null}
        </aside>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading && !company ? (
            <div className="grid min-h-80 place-items-center text-sm text-slate-500">
              <LoaderCircle className="mb-3 h-6 w-6 animate-spin text-blue-600" />
              {english ? "Loading users..." : "Cargando usuarios..."}
            </div>
          ) : null}

          {company ? (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-slate-950">{company.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {company.members.length} {english ? "users" : "usuarios"} / {company.owner_email || `#${company.id}`}
                  </p>
                </div>
                {activeCompanyTab === "activities" && selectedCompanyId ? (
                  <button
                    type="button"
                    onClick={() => void loadActivity(selectedCompanyId)}
                    disabled={loadingActivity}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingActivity ? "animate-spin" : ""}`} />
                    {english ? "Refresh" : "Actualizar"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onOpenCompany(company)}
                  className="h-10 rounded-xl border border-blue-200 px-4 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                >
                  {english ? "Open account" : "Abrir cuenta"}
                </button>
              </div>

              {activeCompanyTab === "users" ? (
                <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-left">
                  <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">{english ? "User" : "Usuario"}</th>
                      <th className="px-4 py-3">{english ? "Status" : "Estado"}</th>
                      <th className="px-4 py-3">{english ? "Company role" : "Rol en empresa"}</th>
                      <th className="px-4 py-3">{english ? "Platform access" : "Acceso plataforma"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {company.members.map((member) => {
                      const role = normalizeRole(member.role);
                      const owner = Boolean(member.is_owner);
                      const active = normalizeStatus(member.status) === "active";
                      return (
                        <tr key={member.membership_id} className="align-middle">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                                {initials(member.name || member.email)}
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-slate-900">{member.name || member.email}</p>
                                  {owner ? (
                                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                      {english ? "Owner" : "Propietario"}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="truncate text-xs text-slate-500">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge active={active} english={english} />
                          </td>
                          <td className="px-4 py-3">
                            {owner ? (
                              <span className="inline-flex h-10 min-w-44 items-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-medium text-amber-800">
                                {english ? "Owner" : "Propietario"}
                              </span>
                            ) : (
                              <select
                                value={role}
                                disabled={!canManageRoles || !selectedCompanyActive || savingKey === `role:${member.user_id}`}
                                onChange={(event) => {
                                  const nextRole = event.target.value as CompanyRole;
                                  if (nextRole === role) return;
                                  setAccessReason("");
                                  setAccessError("");
                                  setPendingAccessChange({ kind: "role", member, nextRole });
                                }}
                                className="h-10 min-w-44 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                              >
                                {roleOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {english ? option.en : option.es}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              disabled={
                                !canManageRoles
                                || !active
                                || (!selectedCompanyActive && !isPlatformRoot(member))
                                || savingKey === `platform:${member.user_id}`
                              }
                              onClick={() => {
                                setAccessReason("");
                                setAccessError("");
                                setPendingAccessChange({
                                  kind: "platform",
                                  member,
                                  nextRole: isPlatformRoot(member) ? "NONE" : "PLATFORM_ROOT",
                                });
                              }}
                              className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 ${
                                isPlatformRoot(member)
                                  ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {savingKey === `platform:${member.user_id}` ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                              ) : isPlatformRoot(member) ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <ShieldCheck className="h-4 w-4" />
                              )}
                              {isPlatformRoot(member)
                                ? "Platform Root"
                                : english ? "Grant Platform Root" : "Dar Platform Root"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              ) : null}

              {activeCompanyTab === "activities" ? (
                <div className="divide-y divide-slate-100">
                  <CompanyBusinessActivityPanel
                    activity={activity}
                    company={selectedCompanySummary}
                    english={english}
                    loading={loadingActivity}
                  />
                  <ActivityPanel activity={activity} english={english} loading={loadingActivity} />
                  <LifecyclePanel activity={activity} english={english} loading={loadingActivity} />
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
      )}
      <IndiceConfirmationDialog
        open={pendingAccessChange !== null}
        busy={Boolean(savingKey)}
        destructive={pendingAccessChange?.kind === "platform" && pendingAccessChange.nextRole === "NONE"}
        tone={pendingAccessChange?.kind === "platform" ? "coral" : "blue"}
        title={pendingAccessChange?.kind === "role"
          ? english ? "Change company role" : "Cambiar rol de empresa"
          : pendingAccessChange?.nextRole === "PLATFORM_ROOT"
            ? english ? "Grant Platform Root" : "Conceder Platform Root"
            : english ? "Revoke Platform Root" : "Revocar Platform Root"}
        description={pendingAccessChange?.kind === "platform"
          ? english
            ? "This changes cross-company administrative access and will be recorded in the platform audit log."
            : "Esto cambia el acceso administrativo entre empresas y quedará registrado en la bitácora de plataforma."
          : english
            ? "The user's permissions inside this company will change immediately."
            : "Los permisos del usuario dentro de esta empresa cambiarán inmediatamente."}
        itemName={pendingAccessChange?.member.name || pendingAccessChange?.member.email}
        confirmLabel={english ? "Confirm change" : "Confirmar cambio"}
        confirmDisabled={accessReason.trim().length < 5}
        onCancel={() => { if (!savingKey) { setPendingAccessChange(null); setAccessReason(""); setAccessError(""); } }}
        onConfirm={() => {
          if (!pendingAccessChange || accessReason.trim().length < 5) return;
          if (pendingAccessChange.kind === "role") {
            void updateRole(pendingAccessChange.member, pendingAccessChange.nextRole, accessReason.trim());
          } else {
            void updatePlatformAccess(pendingAccessChange.member, pendingAccessChange.nextRole, accessReason.trim());
          }
        }}
      >
        {accessError ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {accessError}
          </div>
        ) : null}
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">
          <span>{english ? "Operational reason" : "Motivo operativo"}</span>
          <textarea
            autoFocus
            required
            minLength={5}
            maxLength={500}
            value={accessReason}
            onChange={(event) => setAccessReason(event.target.value)}
            className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder={english ? "Explain why this access is changing" : "Explica por qué cambia este acceso"}
          />
        </label>
      </IndiceConfirmationDialog>
    </section>
  );
}

function StatusBadge({ active, english }: { active: boolean; english: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
      active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
    }`}>
      {active ? english ? "Active" : "Activo" : english ? "Inactive" : "Inactivo"}
    </span>
  );
}

function normalizeRole(value?: string | null): CompanyRole {
  const role = (value ?? "user").trim().toLowerCase().replace(/[ -]/g, "_");
  return role === "root" || role === "superadmin" || role === "admin" ? role : "user";
}

function normalizeStatus(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function isPlatformRoot(member: PlatformCompanyMember) {
  return member.platform_role === "PLATFORM_ROOT" && member.platform_status === "ACTIVE";
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";
}
