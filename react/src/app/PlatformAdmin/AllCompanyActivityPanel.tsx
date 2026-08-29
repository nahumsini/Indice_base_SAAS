import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  Building2,
  CreditCard,
  Gauge,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  Server,
  ShieldAlert,
  SlidersHorizontal,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  PlatformAllCompanyActivityRow,
  PlatformAllCompanyUserActivity,
  PlatformCompanySummary,
} from "../api/platformAdmin";
import { useLocalStorageState } from "../hooks/useLocalStorageState";

const PLATFORM_ACTIVITY_CHART_STORAGE_KEY = "indice.platformAdmin.allActivity.chartMetrics.v2";

const PLATFORM_ACTIVITY_CHART_METRICS = [
  { key: "unique_active_users", color: "#059669", labelEn: "Active users", labelEs: "Usuarios activos" },
  { key: "successful_logins", color: "#2563eb", labelEn: "Successful logins", labelEs: "Logins exitosos" },
  { key: "failed_attempts", color: "#e11d48", labelEn: "Failed attempts", labelEs: "Intentos fallidos" },
  { key: "total_events", color: "#f59e0b", labelEn: "Total auth events", labelEs: "Eventos totales" },
] as const;

type PlatformActivityChartMetricKey = typeof PLATFORM_ACTIVITY_CHART_METRICS[number]["key"];

const DEFAULT_PLATFORM_ACTIVITY_CHART_METRICS: PlatformActivityChartMetricKey[] = [
  "unique_active_users",
  "successful_logins",
];

const chartMetricKeys = new Set<string>(PLATFORM_ACTIVITY_CHART_METRICS.map((metric) => metric.key));

function normalizeChartMetrics(metrics: unknown): PlatformActivityChartMetricKey[] {
  if (!Array.isArray(metrics)) {
    return DEFAULT_PLATFORM_ACTIVITY_CHART_METRICS;
  }

  const normalized = metrics.filter((metric): metric is PlatformActivityChartMetricKey => (
    typeof metric === "string" && chartMetricKeys.has(metric)
  ));
  const deduped = [...new Set(normalized)];
  return deduped.length ? deduped : DEFAULT_PLATFORM_ACTIVITY_CHART_METRICS;
}

function chartMetricLabel(metricKey: string, english: boolean) {
  const metric = PLATFORM_ACTIVITY_CHART_METRICS.find((candidate) => candidate.key === metricKey);
  if (!metric) return metricKey;
  return english ? metric.labelEn : metric.labelEs;
}

export function AllCompanyActivityPanel({
  activity,
  companies,
  english,
  loading,
  onLoadMore,
  onRefresh,
}: {
  activity: PlatformAllCompanyUserActivity | null;
  companies: PlatformCompanySummary[];
  english: boolean;
  loading: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
}) {
  const companyById = useMemo(() => new Map(companies.map((company) => [company.id, company])), [companies]);
  const [chartSettingsOpen, setChartSettingsOpen] = useState(false);
  const [storedChartMetrics, setStoredChartMetrics] = useLocalStorageState<PlatformActivityChartMetricKey[]>(
    PLATFORM_ACTIVITY_CHART_STORAGE_KEY,
    DEFAULT_PLATFORM_ACTIVITY_CHART_METRICS,
  );
  const selectedChartMetrics = useMemo(() => normalizeChartMetrics(storedChartMetrics), [storedChartMetrics]);
  const visibleChartMetrics = useMemo(
    () => PLATFORM_ACTIVITY_CHART_METRICS.filter((metric) => selectedChartMetrics.includes(metric.key)),
    [selectedChartMetrics],
  );

  const toggleChartMetric = (metricKey: PlatformActivityChartMetricKey) => {
    setStoredChartMetrics((current) => {
      const normalized = normalizeChartMetrics(current);
      if (normalized.includes(metricKey)) {
        return normalized.length === 1 ? normalized : normalized.filter((key) => key !== metricKey);
      }
      return [...normalized, metricKey];
    });
  };

  if (loading && !activity) {
    return (
      <div className="grid min-h-80 place-items-center rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        <div className="text-center">
          <LoaderCircle className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-600" />
          {english ? "Loading all company activity..." : "Cargando actividad de todas las empresas..."}
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
        <div>
          <p>{english ? "All activity data is not loaded yet." : "La actividad general aun no esta cargada."}</p>
          <button
            type="button"
            onClick={onRefresh}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            {english ? "Load all activities" : "Cargar todas las actividades"}
          </button>
        </div>
      </div>
    );
  }

  const chartHasData = activity.activity_buckets.some((bucket) => (
    visibleChartMetrics.some((metric) => Number(bucket[metric.key] ?? 0) > 0)
  ));
  const serverLoad = formatServerLoad(activity.server.system_load_average, activity.server.available_processors, english);
  const serverHint = `${english ? "Heap" : "Memoria"} ${formatBytes(activity.server.heap_used_bytes)} / ${formatBytes(activity.server.heap_max_bytes)}`;

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-blue-700 shadow-sm">
              <Activity className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-950">
                {english ? "All activities" : "Todas las actividades"}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {english
                  ? "Every company, active users, authentication trend, payments, and server load in one view."
                  : "Todas las empresas, usuarios activos, tendencia de acceso, cobros y carga del servidor en una vista."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {english ? "Refresh" : "Actualizar"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard icon={<Building2 className="h-4 w-4" />} label={english ? "Companies" : "Empresas"} value={activity.totals.companies} hint={english ? "Loaded from server" : "Cargadas del servidor"} tone="blue" />
        <SummaryCard icon={<UsersRound className="h-4 w-4" />} label={english ? "Active users" : "Usuarios activos"} value={activity.totals.active_users} hint={`${activity.totals.active_now_users} ${english ? "active now" : "activos ahora"}`} tone="emerald" />
        <SummaryCard icon={<Gauge className="h-4 w-4" />} label={english ? "Logged in today" : "Entraron hoy"} value={activity.totals.logged_in_users_24h} hint={`${activity.totals.auth_events_24h} ${english ? "auth events" : "eventos de acceso"}`} tone="violet" />
        <SummaryCard icon={<ShieldAlert className="h-4 w-4" />} label={english ? "Failed attempts" : "Intentos fallidos"} value={activity.totals.failed_login_events_24h} hint={english ? "Last 24 hours" : "Ultimas 24 horas"} tone="rose" />
        <SummaryCard icon={<Server className="h-4 w-4" />} label={english ? "Server load" : "Carga servidor"} value={serverLoad} hint={serverHint} tone="slate" textValue />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700">
                <TrendingUp className="h-4 w-4" />
              </span>
              <div>
                <h4 className="text-sm font-semibold text-slate-950">
                  {english ? "Platform activity trend" : "Tendencia de actividad"}
                </h4>
                <p className="text-xs text-slate-500">
                  {english ? "Hourly active users and authentication events in the last 24 hours." : "Usuarios activos por hora y eventos de acceso en las ultimas 24 horas."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setChartSettingsOpen((open) => !open)}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              aria-expanded={chartSettingsOpen}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {english ? "Customize" : "Personalizar"}
            </button>
          </div>
          {chartSettingsOpen ? (
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {english ? "Metrics" : "Metricas"}
                </p>
                <button
                  type="button"
                  onClick={() => setStoredChartMetrics([...DEFAULT_PLATFORM_ACTIVITY_CHART_METRICS])}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800"
                >
                  {english ? "Reset" : "Restablecer"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_ACTIVITY_CHART_METRICS.map((metric) => {
                  const selected = selectedChartMetrics.includes(metric.key);
                  const locked = selected && selectedChartMetrics.length === 1;
                  return (
                    <label
                      key={metric.key}
                      className={`inline-flex min-h-9 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        selected
                          ? "border-blue-200 bg-white text-slate-900 shadow-sm"
                          : "border-slate-200 bg-slate-100 text-slate-500"
                      } ${locked ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={locked}
                        onChange={() => toggleChartMetric(metric.key)}
                        className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                      />
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: metric.color }} />
                      {chartMetricLabel(metric.key, english)}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="h-64">
            {chartHasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activity.activity_buckets} margin={{ top: 12, right: 20, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4", strokeWidth: 1 }}
                    contentStyle={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 12,
                      boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
                    }}
                    formatter={(value, name) => [value, chartMetricLabel(String(name), english)]}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: 12, paddingBottom: 12 }}
                    formatter={(value) => chartMetricLabel(String(value), english)}
                  />
                  {visibleChartMetrics.map((metric) => (
                    <Line
                      key={metric.key}
                      type="monotone"
                      dataKey={metric.key}
                      name={metric.key}
                      stroke={metric.color}
                      strokeWidth={3}
                      dot={{ fill: metric.color, r: 3 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label={english ? "No auth events in the last 24 hours." : "No hay eventos de acceso en las ultimas 24 horas."} />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-950">
                  {english ? "Latest activity" : "Actividad reciente"}
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  {english ? "Recent events across all companies." : "Eventos recientes de todas las empresas."}
                </p>
              </div>
              <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500">
                {activity.recent_events.length.toLocaleString()} {english ? "shown" : "mostrados"}
              </span>
            </div>
          </div>
          <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
            {activity.recent_events.map((event) => (
              <div key={event.id} className="p-4">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${eventTone(event.outcome)}`}>
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {event.name || event.email || (english ? "Unknown user" : "Usuario desconocido")}
                      </p>
                      <OutcomeBadge outcome={event.outcome} english={english} />
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {event.company_name || (english ? "Unknown company" : "Empresa desconocida")} / {eventLabel(event.event_type, event.stage, english)}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {formatDate(event.created_at)}{event.ip_address ? ` / ${event.ip_address}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {!activity.recent_events.length ? (
              <EmptyState label={english ? "No recent activity." : "No hay actividad reciente."} compact />
            ) : null}
          </div>
          {activity.recent_events_has_more ? (
            <div className="border-t border-slate-100 p-3">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loading}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {english ? "Load more activity" : "Cargar mas actividad"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[1120px] w-full text-left">
          <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">{english ? "Company" : "Empresa"}</th>
              <th className="px-4 py-3">{english ? "Users" : "Usuarios"}</th>
              <th className="px-4 py-3">{english ? "Active now" : "Activos ahora"}</th>
              <th className="px-4 py-3">{english ? "Logged in 24h" : "Login 24h"}</th>
              <th className="px-4 py-3">{english ? "Failed 24h" : "Fallos 24h"}</th>
              <th className="px-4 py-3">{english ? "Payment coming" : "Proximo cobro"}</th>
              <th className="px-4 py-3">{english ? "Status" : "Estado"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activity.companies.map((row) => (
              <CompanyActivityRow key={row.company_id} row={row} company={companyById.get(row.company_id)} english={english} />
            ))}
          </tbody>
        </table>
        {!activity.companies.length ? (
          <EmptyState label={english ? "No companies found." : "No se encontraron empresas."} compact />
        ) : null}
      </div>
    </section>
  );
}

function CompanyActivityRow({
  row,
  company,
  english,
}: {
  row: PlatformAllCompanyActivityRow;
  company?: PlatformCompanySummary;
  english: boolean;
}) {
  const payment = paymentLabel(row, company, english);
  const attention = row.failed_login_events_24h > 0 || ["past_due", "unpaid", "failed", "uncollectible"].includes(
    String(company?.last_invoice_status || row.last_invoice_status || company?.last_payment_status || row.billing_status || "").toLowerCase(),
  );
  return (
    <tr className="align-middle">
      <td className="px-4 py-3">
        <p className="truncate text-sm font-semibold text-slate-900">{row.company_name}</p>
        <p className="truncate text-xs text-slate-500">{row.owner_email || `#${row.company_id}`}</p>
      </td>
      <td className="px-4 py-3 text-sm text-slate-700">
        <span className="font-semibold text-slate-950">{row.active_users}</span> / {row.total_users}
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-slate-950">{row.active_now_users}</td>
      <td className="px-4 py-3 text-sm font-semibold text-slate-950">{row.logged_in_users_24h}</td>
      <td className={`px-4 py-3 text-sm font-semibold ${row.failed_login_events_24h > 0 ? "text-rose-700" : "text-slate-950"}`}>
        {row.failed_login_events_24h}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-start gap-2">
          <CreditCard className="mt-0.5 h-4 w-4 text-slate-400" />
          <div>
            <p className="text-sm font-semibold text-slate-900">{payment.amount}</p>
            <p className="text-xs text-slate-500">{payment.date}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
          attention ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
        }`}>
          {attention ? english ? "Needs review" : "Requiere revision" : english ? "Healthy" : "Saludable"}
        </span>
      </td>
    </tr>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  tone,
  textValue = false,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  hint: string;
  tone: "blue" | "emerald" | "rose" | "slate" | "violet";
  textValue?: boolean;
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    slate: "bg-slate-100 text-slate-700",
    violet: "bg-violet-50 text-violet-700",
  }[tone];
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${toneClass}`}>{icon}</span>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 truncate font-semibold text-slate-950 ${textValue ? "text-xl" : "text-2xl"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="mt-1 min-h-4 truncate text-xs text-slate-500">{hint}</p>
    </article>
  );
}

function EmptyState({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={`grid place-items-center rounded-xl border border-dashed border-slate-200 text-center text-sm text-slate-500 ${
      compact ? "min-h-24 p-4" : "min-h-32 p-4"
    }`}>
      {label}
    </div>
  );
}

function OutcomeBadge({ outcome, english }: { outcome?: string | null; english: boolean }) {
  const normalized = (outcome ?? "").toUpperCase();
  const success = normalized === "SUCCESS";
  const blocked = normalized === "BLOCKED";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
      success
        ? "bg-emerald-50 text-emerald-700"
        : blocked
          ? "bg-amber-50 text-amber-700"
          : "bg-rose-50 text-rose-700"
    }`}>
      {success ? english ? "Success" : "Exitoso" : blocked ? english ? "Blocked" : "Bloqueado" : english ? "Failed" : "Fallido"}
    </span>
  );
}

function eventTone(outcome?: string | null) {
  const normalized = (outcome ?? "").toUpperCase();
  if (normalized === "SUCCESS") return "bg-emerald-50 text-emerald-700";
  if (normalized === "BLOCKED") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function eventLabel(eventType?: string | null, stage?: string | null, english = true) {
  const type = (eventType ?? "").toUpperCase();
  const eventStage = (stage ?? "").toUpperCase();
  if (type === "MFA_VERIFY") return english ? "MFA verification" : "Verificacion MFA";
  if (type === "SESSION_TIMEOUT") return english ? "Session timeout" : "Sesion expirada";
  if (eventStage === "PASSWORD") return english ? "Password login" : "Login con contrasena";
  return [eventType, stage].filter(Boolean).join(" / ") || (english ? "Authentication event" : "Evento de autenticacion");
}

function paymentLabel(row: PlatformAllCompanyActivityRow, company: PlatformCompanySummary | undefined, english: boolean) {
  const cents = company?.billing_amount_cents ?? row.last_invoice_due_cents ?? null;
  const currency = company?.billing_currency || row.billing_currency || company?.currency || "USD";
  const date = company?.current_period_ends_at || row.current_period_ends_at || company?.last_invoice_period_ends_at || row.last_invoice_period_ends_at;
  return {
    amount: cents === null || cents === undefined ? english ? "Not configured" : "No configurado" : formatMoney(cents, currency, english),
    date: date ? `${english ? "Next" : "Proximo"}: ${formatDate(date)}` : english ? "No billing date" : "Sin fecha de cobro",
  };
}

function formatMoney(value: number, currency: string, english: boolean) {
  return new Intl.NumberFormat(english ? "en-US" : "es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: value % 100 === 0 ? 0 : 2,
    maximumFractionDigits: value % 100 === 0 ? 0 : 2,
  }).format(value / 100);
}

function formatServerLoad(load: number, processors: number, english: boolean) {
  if (!Number.isFinite(load) || load < 0) return english ? "Unavailable" : "No disponible";
  return `${load.toFixed(2)} / ${processors || 1}`;
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 MB";
  return `${Math.round(value / 1024 / 1024).toLocaleString()} MB`;
}

function formatDate(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
