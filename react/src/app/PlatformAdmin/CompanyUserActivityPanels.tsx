import type { ReactNode } from "react";
import {
  BadgeCheck,
  BarChart3,
  CalendarClock,
  Clock3,
  CreditCard,
  Gauge,
  KeyRound,
  LoaderCircle,
  LogIn,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  PlatformCompanySummary,
  PlatformCompanyUserActivity,
} from "../api/platformAdmin";

export function CompanyBusinessActivityPanel({
  company,
  activity,
  english,
  loading,
}: {
  company: PlatformCompanySummary | null;
  activity: PlatformCompanyUserActivity | null;
  english: boolean;
  loading: boolean;
}) {
  if (!company) return null;
  const activeUsers = activity?.totals.active_users ?? company.active_members ?? 0;
  const loggedInToday = activity?.totals.logged_in_users_24h ?? 0;
  const failedAttempts = activity?.totals.failed_login_events_24h ?? 0;
  const successEvents = activity?.activity_buckets.reduce((sum, bucket) => sum + bucket.successful_logins, 0) ?? 0;
  const activityRate = activeUsers > 0 ? Math.round((loggedInToday / activeUsers) * 100) : 0;
  const paymentAmount = formatMoney(company.billing_amount_cents, company.billing_currency || company.currency || "USD", english);
  const paymentDate = paymentDateLabel(company, english);
  const commercialStatus = companyStatusLabel(company, english);
  const attention = failedAttempts > 0 ||
    ["past_due", "unpaid", "failed"].includes(String(company.last_invoice_status || company.last_payment_status || "").toLowerCase());

  return (
    <div className="space-y-4 border-b border-slate-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-950">
            {english ? "Company activity overview" : "Resumen de actividad de empresa"}
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            {english
              ? "Operational activity, billing signal, and company trend for the selected company."
              : "Actividad operativa, senal de cobro y tendencia de la empresa seleccionada."}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
          attention ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
        }`}>
          {attention ? english ? "Needs review" : "Requiere revision" : english ? "Healthy" : "Saludable"}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          icon={<UsersRound className="h-4 w-4" />}
          label={english ? "Active users" : "Usuarios activos"}
          value={activeUsers.toLocaleString()}
          hint={english ? "Users enabled in this company" : "Usuarios habilitados en esta empresa"}
          tone="emerald"
        />
        <OverviewCard
          icon={<TrendingUp className="h-4 w-4" />}
          label={english ? "Company trend" : "Tendencia"}
          value={loading && !activity ? "..." : `${activityRate}%`}
          hint={english
            ? `${loggedInToday} active users logged in, ${successEvents} successful events`
            : `${loggedInToday} usuarios entraron, ${successEvents} eventos exitosos`}
          tone="blue"
        />
        <OverviewCard
          icon={<CreditCard className="h-4 w-4" />}
          label={english ? "Payment coming" : "Proximo cobro"}
          value={paymentAmount}
          hint={paymentDate}
          tone="violet"
        />
        <OverviewCard
          icon={<Gauge className="h-4 w-4" />}
          label={english ? "Company health" : "Salud de empresa"}
          value={commercialStatus}
          hint={failedAttempts
            ? english ? `${failedAttempts} failed login attempts in 24h` : `${failedAttempts} intentos fallidos en 24h`
            : english ? "No failed login attempts in 24h" : "Sin intentos fallidos en 24h"}
          tone={attention ? "rose" : "slate"}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SmallSignal
          icon={<BadgeCheck className="h-4 w-4" />}
          label={english ? "Billing status" : "Estado de cobro"}
          value={company.billing_status || company.last_invoice_status || "N/A"}
        />
        <SmallSignal
          icon={<CalendarClock className="h-4 w-4" />}
          label={english ? "Cycle" : "Ciclo"}
          value={cycleLabel(company, english)}
        />
        <SmallSignal
          icon={<ShieldCheck className="h-4 w-4" />}
          label={english ? "Access mode" : "Modo de acceso"}
          value={company.access_mode || company.lifecycle_state || "N/A"}
        />
      </div>
    </div>
  );
}

export function ActivityPanel({
  activity,
  english,
  loading,
}: {
  activity: PlatformCompanyUserActivity | null;
  english: boolean;
  loading: boolean;
}) {
  if (loading && !activity) {
    return <PanelLoader label={english ? "Loading activity..." : "Cargando actividad..."} />;
  }
  if (!activity) {
    return <EmptyPanel label={english ? "No activity data is available." : "No hay datos de actividad."} />;
  }
  const totals = activity.totals;
  const chartHasData = activity.activity_buckets.some((item) => item.total_events > 0);
  return (
    <div className="space-y-4 p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<UserCheck className="h-4 w-4" />}
          label={english ? "Active users" : "Usuarios activos"}
          value={totals.active_users}
          hint={english ? "Active company members" : "Miembros activos de la empresa"}
          tone="emerald"
        />
        <MetricCard
          icon={<Clock3 className="h-4 w-4" />}
          label={english ? "Active now" : "Activos ahora"}
          value={totals.active_now_users}
          hint={english ? `Last ${activity.activity_window_minutes} minutes` : `Ultimos ${activity.activity_window_minutes} minutos`}
          tone="blue"
        />
        <MetricCard
          icon={<LogIn className="h-4 w-4" />}
          label={english ? "Logged in today" : "Con login hoy"}
          value={totals.logged_in_users_24h}
          hint={english ? "Unique users in 24h" : "Usuarios unicos en 24h"}
          tone="violet"
        />
        <MetricCard
          icon={<ShieldAlert className="h-4 w-4" />}
          label={english ? "Failed attempts" : "Intentos fallidos"}
          value={totals.failed_login_events_24h}
          hint={english ? "Last 24 hours" : "Ultimas 24 horas"}
          tone="rose"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700">
              <BarChart3 className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-sm font-semibold text-slate-950">
                {english ? "Login activity by hour" : "Actividad de login por hora"}
              </h4>
              <p className="text-xs text-slate-500">
                {english
                  ? "Successful and failed authentication events over the last 24 hours."
                  : "Eventos exitosos y fallidos de autenticacion en las ultimas 24 horas."}
              </p>
            </div>
          </div>
          <div className="h-72">
            {chartHasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activity.activity_buckets} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    formatter={(value, name) => [
                      value,
                      name === "successful_logins"
                        ? english ? "Successful logins" : "Logins exitosos"
                        : english ? "Failed attempts" : "Intentos fallidos",
                    ]}
                  />
                  <Bar dataKey="successful_logins" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="failed_attempts" fill="#e11d48" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyPanel
                label={english ? "No login events in the last 24 hours." : "No hay eventos de login en las ultimas 24 horas."}
                compact
              />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-4">
            <h4 className="text-sm font-semibold text-slate-950">
              {english ? "Recent auth events" : "Eventos recientes"}
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              {english
                ? "Latest successful, failed, blocked, and session timeout events."
                : "Ultimos eventos exitosos, fallidos, bloqueados y de sesion."}
            </p>
          </div>
          <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
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
                    <p className="mt-1 text-xs text-slate-500">
                      {eventLabel(event.event_type, event.stage, english)}
                      {event.failure_reason_code ? ` / ${event.failure_reason_code}` : ""}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {formatDate(event.created_at)}{event.ip_address ? ` / ${event.ip_address}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {!activity.recent_events.length ? (
              <EmptyPanel label={english ? "No recent auth events." : "No hay eventos recientes."} compact />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LifecyclePanel({
  activity,
  english,
  loading,
}: {
  activity: PlatformCompanyUserActivity | null;
  english: boolean;
  loading: boolean;
}) {
  if (loading && !activity) {
    return <PanelLoader label={english ? "Loading users..." : "Cargando usuarios..."} />;
  }
  if (!activity) {
    return <EmptyPanel label={english ? "No user lifecycle data is available." : "No hay datos de usuarios."} />;
  }
  const newUsers = activity.members.filter((member) => member.new_user);
  const oldUsers = activity.members.filter((member) => !member.new_user);
  const total = Math.max(activity.totals.total_users, 1);
  const newPercent = Math.round((newUsers.length / total) * 100);
  return (
    <div className="space-y-4 p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          icon={<UserPlus className="h-4 w-4" />}
          label={english ? "New users" : "Usuarios nuevos"}
          value={newUsers.length}
          hint={english ? `Joined in ${activity.new_user_window_days} days` : `Agregados en ${activity.new_user_window_days} dias`}
          tone="blue"
        />
        <MetricCard
          icon={<UsersRound className="h-4 w-4" />}
          label={english ? "Existing users" : "Usuarios antiguos"}
          value={oldUsers.length}
          hint={english ? "Older than the new-user window" : "Fuera de la ventana de nuevos"}
          tone="slate"
        />
        <MetricCard
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Platform Root"
          value={activity.totals.platform_roots}
          hint={english ? "Users with platform-level access" : "Usuarios con acceso de plataforma"}
          tone="violet"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-950">
              {english ? "User age mix" : "Mezcla de usuarios"}
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              {english ? "New users are defined by membership creation date." : "Los usuarios nuevos se definen por la fecha de alta."}
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {newPercent}% {english ? "new" : "nuevo"}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${newPercent}%` }} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-[780px] w-full text-left">
          <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">{english ? "User" : "Usuario"}</th>
              <th className="px-4 py-3">{english ? "Lifecycle" : "Ciclo"}</th>
              <th className="px-4 py-3">{english ? "Joined" : "Alta"}</th>
              <th className="px-4 py-3">{english ? "Last login" : "Ultimo login"}</th>
              <th className="px-4 py-3">{english ? "24h failures" : "Fallos 24h"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activity.members.map((member) => (
              <tr key={member.membership_id}>
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{member.name || member.email}</p>
                  <p className="text-xs text-slate-500">{member.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                    member.new_user ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    {member.new_user ? english ? "New" : "Nuevo" : english ? "Existing" : "Antiguo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{formatDate(member.created_at)}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{formatDate(member.last_login_at)}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-900">{member.failed_login_events_24h}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OverviewCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "blue" | "emerald" | "rose" | "slate" | "violet";
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
      <p className="mt-1 truncate text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 min-h-4 truncate text-xs text-slate-500">{hint}</p>
    </article>
  );
}

function SmallSignal({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-slate-600">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-900">{humanize(value)}</p>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  hint: string;
  tone: "blue" | "emerald" | "rose" | "slate" | "violet";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    slate: "bg-slate-100 text-slate-700",
    violet: "bg-violet-50 text-violet-700",
  }[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${toneClass}`}>{icon}</span>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function PanelLoader({ label }: { label: string }) {
  return (
    <div className="grid min-h-80 place-items-center p-6 text-sm text-slate-500">
      <div className="text-center">
        <LoaderCircle className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-600" />
        {label}
      </div>
    </div>
  );
}

function EmptyPanel({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={`grid place-items-center rounded-xl border border-dashed border-slate-200 text-center text-sm text-slate-500 ${
      compact ? "min-h-32 p-4" : "min-h-80 p-6"
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

function formatMoney(value?: number | null, currency = "USD", english = true) {
  if (value === null || value === undefined) return english ? "Not configured" : "No configurado";
  return new Intl.NumberFormat(english ? "en-US" : "es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function paymentDateLabel(company: PlatformCompanySummary, english: boolean) {
  const date = company.current_period_ends_at || company.last_invoice_period_ends_at || company.trial_ends_at;
  if (!date) {
    return company.billing_amount_kind === "UNAVAILABLE"
      ? english ? "Billing is not configured" : "Cobro no configurado"
      : english ? "Billing date unavailable" : "Fecha de cobro no disponible";
  }
  const prefix = company.trial_ends_at === date
    ? english ? "Trial ends" : "Prueba termina"
    : english ? "Next billing date" : "Proxima fecha de cobro";
  return `${prefix}: ${formatDate(date)}`;
}

function companyStatusLabel(company: PlatformCompanySummary, english: boolean) {
  const raw = company.lifecycle_state || company.billing_status || company.last_payment_status || company.last_invoice_status;
  if (!raw) return english ? "Unknown" : "Desconocido";
  return humanize(raw);
}

function cycleLabel(company: PlatformCompanySummary, english: boolean) {
  const interval = company.billing_amount_interval || company.billing_interval;
  if (!interval) return english ? "No billing cycle" : "Sin ciclo de cobro";
  const normalized = interval.toUpperCase();
  if (normalized === "YEAR") return english ? "Annual" : "Anual";
  if (normalized === "MONTH") return english ? "Monthly" : "Mensual";
  return humanize(interval);
}

function humanize(value?: string | null) {
  if (!value) return "N/A";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
