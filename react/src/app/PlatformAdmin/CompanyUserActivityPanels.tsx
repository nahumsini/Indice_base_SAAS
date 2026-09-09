import {
  useOperationsCopy,
  getOperationsCopy,
  operationsText,
  operationsNumber,
  operationsStatus,
  type OperationsLocale,
} from "./OperationsTranslations";
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
  const { copy, locale } = useOperationsCopy();
  if (!company) return null;
  const activeUsers = activity?.totals.active_users ?? company.active_members ?? 0;
  const loggedInToday = activity?.totals.logged_in_users_24h ?? 0;
  const failedAttempts = activity?.totals.failed_login_events_24h ?? 0;
  const successEvents = activity?.activity_buckets.reduce((sum, bucket) => sum + bucket.successful_logins, 0) ?? 0;
  const activityRate = activeUsers > 0 ? Math.round((loggedInToday / activeUsers) * 100) : 0;
  const paymentAmount = formatMoney(locale, company.billing_amount_cents, company.billing_currency || company.currency || "USD", english);
  const paymentDate = paymentDateLabel(locale, company, english);
  const commercialStatus = companyStatusLabel(locale, company, english);
  const attention = failedAttempts > 0 ||
    ["past_due", "unpaid", "failed"].includes(String(company.last_invoice_status || company.last_payment_status || "").toLowerCase());

  return (
    <div className="space-y-4 border-b border-slate-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-950">
            {copy.companyActivityOverview}
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            {copy.operationalActivityBillingSignalAndCompanyTrend}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
          attention ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
        }`}>
          {attention ? copy.needsReview : copy.healthy}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          icon={<UsersRound className="h-4 w-4" />}
          label={copy.activeUsers}
          value={activeUsers.toLocaleString(locale)}
          hint={copy.usersEnabledInThisCompany}
          tone="emerald"
        />
        <OverviewCard
          icon={<TrendingUp className="h-4 w-4" />}
          label={copy.companyTrend}
          value={loading && !activity ? "..." : new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(activityRate / 100)}
          hint={operationsText(copy.valueActiveUsersLoggedInValueSuccessful, { value0: loggedInToday, value1: successEvents }, locale)}
          tone="blue"
        />
        <OverviewCard
          icon={<CreditCard className="h-4 w-4" />}
          label={copy.paymentComing}
          value={paymentAmount}
          hint={paymentDate}
          tone="violet"
        />
        <OverviewCard
          icon={<Gauge className="h-4 w-4" />}
          label={copy.companyHealth}
          value={commercialStatus}
          hint={failedAttempts
            ? operationsText(copy.valueFailedLoginAttemptsInH, { value0: failedAttempts }, locale)
            : copy.noFailedLoginAttemptsInH}
          tone={attention ? "rose" : "slate"}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SmallSignal
          icon={<BadgeCheck className="h-4 w-4" />}
          label={copy.billingStatus}
          value={operationsStatus(company.billing_status || company.last_invoice_status, locale)}
        />
        <SmallSignal
          icon={<CalendarClock className="h-4 w-4" />}
          label={copy.cycle}
          value={cycleLabel(locale, company, english)}
        />
        <SmallSignal
          icon={<ShieldCheck className="h-4 w-4" />}
          label={copy.accessMode}
          value={operationsStatus(company.access_mode || company.lifecycle_state, locale)}
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
  const { copy, locale } = useOperationsCopy();
  if (loading && !activity) {
    return <PanelLoader label={copy.loadingActivity} />;
  }
  if (!activity) {
    return <EmptyPanel label={copy.noActivityDataIsAvailable} />;
  }
  const totals = activity.totals;
  const chartHasData = activity.activity_buckets.some((item) => item.total_events > 0);
  return (
    <div className="space-y-4 p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<UserCheck className="h-4 w-4" />}
          label={copy.activeUsers}
          value={totals.active_users}
          hint={copy.activeCompanyMembers}
          tone="emerald"
        />
        <MetricCard
          icon={<Clock3 className="h-4 w-4" />}
          label={copy.activeNow}
          value={totals.active_now_users}
          hint={operationsText(copy.lastValueMinutes, { value0: activity.activity_window_minutes }, locale)}
          tone="blue"
        />
        <MetricCard
          icon={<LogIn className="h-4 w-4" />}
          label={copy.loggedInToday}
          value={totals.logged_in_users_24h}
          hint={copy.uniqueUsersInH}
          tone="violet"
        />
        <MetricCard
          icon={<ShieldAlert className="h-4 w-4" />}
          label={copy.failedAttempts}
          value={totals.failed_login_events_24h}
          hint={copy.lastHours}
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
                {copy.loginActivityByHour}
              </h4>
              <p className="text-xs text-slate-500">
                {copy.successfulAndFailedAuthenticationEventsOverThe}
              </p>
            </div>
          </div>
          <div className="h-72">
            {chartHasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activity.activity_buckets} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(value) => operationsNumber(Number(value), locale)} allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    formatter={(value, name) => [
                      operationsNumber(Number(value), locale),
                      name === "successful_logins"
                        ? copy.successfulLogins
                        : copy.failedAttempts,
                    ]}
                  />
                  <Bar dataKey="successful_logins" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="failed_attempts" fill="#e11d48" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyPanel
                label={copy.noLoginEventsInTheLastHours}
                compact
              />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-4">
            <h4 className="text-sm font-semibold text-slate-950">
              {copy.recentAuthEvents}
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              {copy.latestSuccessfulFailedBlockedAndSessionTimeout}
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
                        {event.name || event.email || (copy.unknownUser)}
                      </p>
                      <OutcomeBadge outcome={event.outcome} english={english} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {eventLabel(locale, event.event_type, event.stage, english)}
                      {event.failure_reason_code ? ` / ${event.failure_reason_code}` : ""}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {formatDate(locale, event.created_at)}{event.ip_address ? ` / ${event.ip_address}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {!activity.recent_events.length ? (
              <EmptyPanel label={copy.noRecentAuthEvents} compact />
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
  const { copy, locale } = useOperationsCopy();
  if (loading && !activity) {
    return <PanelLoader label={copy.loadingUsers} />;
  }
  if (!activity) {
    return <EmptyPanel label={copy.noUserLifecycleDataIsAvailable} />;
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
          label={copy.newUsers}
          value={newUsers.length}
          hint={operationsText(copy.joinedInValueDays, { value0: activity.new_user_window_days }, locale)}
          tone="blue"
        />
        <MetricCard
          icon={<UsersRound className="h-4 w-4" />}
          label={copy.existingUsers}
          value={oldUsers.length}
          hint={copy.olderThanTheNewUserWindow}
          tone="slate"
        />
        <MetricCard
          icon={<ShieldCheck className="h-4 w-4" />}
          label={copy.platformRoot}
          value={activity.totals.platform_roots}
          hint={copy.usersWithPlatformLevelAccess}
          tone="violet"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-950">
              {copy.userAgeMix}
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              {copy.newUsersAreDefinedByMembershipCreation}
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(newPercent / 100)} {copy.new}
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
              <th className="px-4 py-3">{copy.user}
            </th>
              <th className="px-4 py-3">{copy.lifecycle}
            </th>
              <th className="px-4 py-3">{copy.joined}
            </th>
              <th className="px-4 py-3">{copy.lastLogin}
            </th>
              <th className="px-4 py-3">{copy.hFailures}
            </th>
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
                    {member.new_user ? copy.new194 : copy.existing}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{formatDate(locale, member.created_at)}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{formatDate(locale, member.last_login_at)}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-900">{operationsNumber(member.failed_login_events_24h, locale)}</td>
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
  const { locale } = useOperationsCopy();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-slate-600">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-900">{humanize(locale, value)}</p>
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
  const { locale } = useOperationsCopy();
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
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value.toLocaleString(locale)}</p>
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
  const { copy } = useOperationsCopy();
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
      {success ? copy.success : blocked ? copy.blocked : copy.failed}
    </span>
  );
}

function eventTone(outcome?: string | null) {
  const normalized = (outcome ?? "").toUpperCase();
  if (normalized === "SUCCESS") return "bg-emerald-50 text-emerald-700";
  if (normalized === "BLOCKED") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function eventLabel(locale: OperationsLocale, eventType?: string | null, stage?: string | null, english = true) {
  const copy = getOperationsCopy(locale);
  const type = (eventType ?? "").toUpperCase();
  const eventStage = (stage ?? "").toUpperCase();
  if (type === "MFA_VERIFY") return copy.mfaVerification;
  if (type === "SESSION_TIMEOUT") return copy.sessionTimeout;
  if (eventStage === "PASSWORD") return copy.passwordLogin;
  return [eventType, stage].filter(Boolean).join(" / ") || (copy.authenticationEvent);
}

function formatDate(locale: OperationsLocale, value?: string | null) {
  const copy = getOperationsCopy(locale);
  if (!value) return copy.notAvailable;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return copy.notAvailable;
  return date.toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(locale: OperationsLocale, value?: number | null, currency = "USD", english = true) {
  const copy = getOperationsCopy(locale);
  if (value === null || value === undefined) return copy.notConfigured;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function paymentDateLabel(locale: OperationsLocale, company: PlatformCompanySummary, english: boolean) {
  const copy = getOperationsCopy(locale);
  const date = company.current_period_ends_at || company.last_invoice_period_ends_at || company.trial_ends_at;
  if (!date) {
    return company.billing_amount_kind === "UNAVAILABLE"
      ? copy.billingIsNotConfigured
      : copy.billingDateUnavailable;
  }
  const prefix = company.trial_ends_at === date
    ? copy.trialEnds
    : copy.nextBillingDate;
  return `${prefix}: ${formatDate(locale, date)}`;
}

function companyStatusLabel(locale: OperationsLocale, company: PlatformCompanySummary, english: boolean) {
  const copy = getOperationsCopy(locale);
  const raw = company.lifecycle_state || company.billing_status || company.last_payment_status || company.last_invoice_status;
  if (!raw) return copy.unknown;
  return operationsStatus(raw, locale);
}

function cycleLabel(locale: OperationsLocale, company: PlatformCompanySummary, english: boolean) {
  const copy = getOperationsCopy(locale);
  const interval = company.billing_amount_interval || company.billing_interval;
  if (!interval) return copy.noBillingCycle;
  const normalized = interval.toUpperCase();
  if (normalized === "YEAR") return copy.annual;
  if (normalized === "MONTH") return copy.monthly;
  return humanize(locale, interval);
}

function humanize(locale: OperationsLocale, value?: string | null) {
  const copy = getOperationsCopy(locale);
  if (!value) return copy.notAvailable;
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
