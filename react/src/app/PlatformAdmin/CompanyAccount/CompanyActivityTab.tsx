import { customerAccountError } from "../Customers/customerAccountErrors";
import { useCustomerAccountCopy } from "../Customers/useCustomerAccountCopy";
import {
  Check,
  Clock3,
  Copy,
  CreditCard,
  ExternalLink,
  Mail,
  Receipt,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  UserX,
} from "lucide-react";
import { useMemo, useState } from "react";
import { platformAdminApi, type PlatformCompanyDetail } from "../../api/platformAdmin";
import { IndiceConfirmationDialog } from "../../components/indice-modal/IndiceConfirmationDialog";
import { IndiceModalFrame } from "../../components/indice-modal/IndiceModalFrame";
import { CompactEmptyState, StatusPill, WorkspaceSection } from "./CompanyAccountPrimitives";
import { formatDate, formatMoney, humanize, initials } from "./companyAccountUtils";

type UserView = "active" | "pending" | "inactive";

const safeCount = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const memberIsActive = (status?: string | null) => !status || status.toLowerCase() === "active";

export type CompanyUserManagementApi = Pick<
  typeof platformAdminApi,
  | "inviteCompanyUser"
  | "updateCompanyUserStatus"
  | "resendCompanyUserInvitation"
  | "cancelCompanyUserInvitation"
>;

export function CompanyActivityTab({
  company,
  canManage,
  onRefresh,
  onManageSeats,
  showBilling = true,
  userApi = platformAdminApi,
}: {
  company: PlatformCompanyDetail;
  canManage: boolean;
  onRefresh: () => Promise<void>;
  onManageSeats: () => void;
  showBilling?: boolean;
  userApi?: CompanyUserManagementApi;
}) {
  const { t, locale, number } = useCustomerAccountCopy();
  const [view, setView] = useState<UserView>("active");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [inviteReason, setInviteReason] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [pendingStatus, setPendingStatus] = useState<{
    userId: number;
    status: "active" | "inactive";
    label: string;
  } | null>(null);
  const [pendingInvitationCancel, setPendingInvitationCancel] = useState<{
    invitationId: number;
    label: string;
  } | null>(null);
  const [statusError, setStatusError] = useState("");
  const [invitationCancelError, setInvitationCancelError] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const invitations = company.invitations || [];
  const activeMembers = useMemo(() => company.members.filter((member) => memberIsActive(member.status)), [company.members]);
  const inactiveMembers = useMemo(() => company.members.filter((member) => !memberIsActive(member.status)), [company.members]);
  const included = safeCount(company.seat_usage?.included ?? company.included_seats);
  const purchased = safeCount(company.seat_usage?.purchased_extra ?? company.purchased_extra_seats ?? company.extra_seats);
  const courtesy = safeCount(company.seat_usage?.courtesy_extra);
  const active = safeCount(company.seat_usage?.active ?? activeMembers.length);
  const reserved = safeCount(company.seat_usage?.reserved ?? invitations.length);
  const declaredLimit = safeCount(company.seat_usage?.limit ?? included + purchased + courtesy);
  const limit = declaredLimit > 0 ? declaredLimit : active + reserved;
  const available = company.seat_usage?.available == null
    ? Math.max(limit - active - reserved, 0)
    : safeCount(company.seat_usage.available);
  const capacityEnforced = company.seat_usage?.enforced !== false;
  const usedPercent = limit > 0 ? Math.min(((active + reserved) / limit) * 100, 100) : 0;
  const isBusy = Boolean(busyKey);

  const resetInvite = () => {
    setName("");
    setEmail("");
    setRole("user");
    setInviteReason("");
    setInviteLink("");
    setCopied(false);
    setFeedback(null);
  };

  const submitInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isBusy) return;
    setBusyKey("invite");
    setFeedback(null);
    try {
      const result = await userApi.inviteCompanyUser(company.id, {
        name: name.trim(),
        email: email.trim(),
        role,
        reason: inviteReason.trim(),
      });
      setInviteLink(result.invite_link || "");
      setFeedback({
        type: "success",
        message: result.email_sent
          ? t("inviteSent")
          : t("inviteCreated"),
      });
      await onRefresh();
    } catch (error) {
      setFeedback({ type: "error", message: customerAccountError(error, locale, "inviteFailed") });
    } finally {
      setBusyKey("");
    }
  };

  const updateMemberStatus = async (
    userId: number,
    status: "active" | "inactive",
    reason: string,
  ) => {
    if (isBusy) return;
    setBusyKey(`member-${userId}`);
    setFeedback(null);
    setStatusError("");
    try {
      await userApi.updateCompanyUserStatus(company.id, userId, status, reason);
      await onRefresh();
      setFeedback({
        type: "success",
        message: status === "active" ? t("userReactivated") : t("userDeactivated"),
      });
      setPendingStatus(null);
      setStatusReason("");
    } catch (error) {
      const message = customerAccountError(error, locale, "userUpdateFailed");
      setStatusError(message);
      setFeedback({ type: "error", message });
    } finally {
      setBusyKey("");
    }
  };

  const resendInvitation = async (invitationId: number) => {
    if (isBusy) return;
    setBusyKey(`resend-${invitationId}`);
    setFeedback(null);
    try {
      const result = await userApi.resendCompanyUserInvitation(company.id, invitationId);
      setInviteLink(result.invite_link || "");
      setFeedback({
        type: "success",
        message: result.email_sent ? t("inviteResent") : t("inviteRenewed"),
      });
      await onRefresh();
    } catch (error) {
      setFeedback({ type: "error", message: customerAccountError(error, locale, "inviteResendFailed") });
    } finally {
      setBusyKey("");
    }
  };

  const cancelInvitation = async (invitationId: number) => {
    if (isBusy) return;
    setBusyKey(`cancel-${invitationId}`);
    setFeedback(null);
    setInvitationCancelError("");
    try {
      await userApi.cancelCompanyUserInvitation(company.id, invitationId);
      await onRefresh();
      setFeedback({ type: "success", message: t("inviteCanceled") });
      setPendingInvitationCancel(null);
    } catch (error) {
      const message = customerAccountError(error, locale, "inviteCancelFailed");
      setInvitationCancelError(message);
      setFeedback({ type: "error", message });
    } finally {
      setBusyKey("");
    }
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const views = [
    { id: "active" as const, label: t("activePlural"), count: activeMembers.length, icon: Users },
    { id: "pending" as const, label: t("invitations"), count: invitations.length, icon: Clock3 },
    { id: "inactive" as const, label: t("inactivePlural"), count: inactiveMembers.length, icon: UserX },
  ];

  return (
    <div className="space-y-4">
      {feedback ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{feedback.message}</span>
            {inviteLink ? (
              <button type="button" onClick={() => void copyInviteLink()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-current/20 bg-white px-3 text-xs font-medium">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? t("linkCopied") : t("copyInvitation")}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-emerald-50">
        <div className="grid gap-5 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-base font-medium text-slate-900">{t("userCapacity")}</h3>
              <span className="text-sm text-slate-500">
                {capacityEnforced ? t("committedCapacity", { used: active + reserved, limit }) : t("activeCount", { count: active })}
              </span>
            </div>
            {capacityEnforced ? (
              <>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${usedPercent}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
                  <span><strong className="text-slate-900">{number(active)}</strong> {t("activeLower")}</span>
                  <span><strong className="text-amber-700">{number(reserved)}</strong> {t("reservedLower")}</span>
                  <span><strong className="text-emerald-700">{number(available)}</strong> {t("availableLower")}</span>
                  <span>{number(included)} {t("includedLower")}{purchased + courtesy > 0 ? ` · ${t("additionalCount", { count: purchased + courtesy })}` : ""}</span>
                </div>
              </>
            ) : <p className="mt-2 text-xs text-slate-500">{t("unlimitedSeats")}</p>}
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button type="button" onClick={onManageSeats} disabled={!canManage} className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-sm font-medium text-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              <ShieldCheck className="h-4 w-4" /> {t("adjustSeats")}</button>
            <button
              type="button"
              onClick={() => { resetInvite(); setInviteOpen(true); }}
              disabled={!canManage || (capacityEnforced && available < 1)}
              title={capacityEnforced && available < 1 ? t("noSeatsInvite") : undefined}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <UserPlus className="h-4 w-4" /> {t("inviteUser")}</button>
          </div>
        </div>
      </section>

      <WorkspaceSection
        title={t("accountUsers")}
        description={t("ownerSeatHelp")}
        icon={UserRound}
        action={
          <div className="flex max-w-full flex-wrap rounded-lg bg-slate-100 p-1" role="tablist" aria-label={t("userStatus")}>
            {views.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} type="button" role="tab" aria-selected={view === item.id} onClick={() => setView(item.id)} className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium ${view === item.id ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                  <Icon className="h-3.5 w-3.5" /> {item.label} <span className="rounded-full bg-slate-100 px-1.5 py-0.5">{number(item.count)}</span>
                </button>
              );
            })}
          </div>
        }
      >
        {view === "active" && activeMembers.length ? (
          <div className="divide-y divide-slate-100">
            {activeMembers.map((member) => {
              const protectedUser = Boolean(member.is_owner) || ["root", "superadmin", "super_admin", "owner"].includes((member.role || "").toLowerCase());
              return (
                <div key={member.membership_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-xs font-medium text-emerald-700">{initials(member.name || member.email)}</span>
                  <div className="min-w-[12rem] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-900">{member.name || member.email}</p>
                      {member.is_owner ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">{t("owner")}</span> : null}
                    </div>
                    <p className="truncate text-xs text-slate-500">{member.email}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-slate-600">{humanize(member.role, locale)}</p>
                    <div className="mt-1"><StatusPill status="active" /></div>
                  </div>
                  {canManage ? (
                    <button type="button" disabled={protectedUser || isBusy} onClick={() => { setStatusReason(""); setStatusError(""); setPendingStatus({ userId: member.user_id, status: "inactive", label: member.name || member.email }); }} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400" title={protectedUser ? t("ownerProtected") : t("deactivateRelease")}>
                      <UserX className="h-3.5 w-3.5" /> {protectedUser ? t("protected") : t("deactivate")}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {view === "pending" && invitations.length ? (
          <div className="divide-y divide-slate-100">
            {invitations.map((invitation) => (
              <div key={invitation.invitation_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700"><Mail className="h-4 w-4" /></span>
                <div className="min-w-[12rem] flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{invitation.name || invitation.email}</p>
                  <p className="truncate text-xs text-slate-500">{invitation.email}</p>
                </div>
                <div className="text-xs text-slate-500">
                  <p>{humanize(invitation.role, locale)}</p>
                  <p>{t("expires")} {formatDate(invitation.expires_at, locale)}</p>
                </div>
                {canManage ? (
                  <div className="flex gap-2">
                    <button type="button" disabled={isBusy} onClick={() => void resendInvitation(invitation.invitation_id)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50" aria-label={t("resendInvitation")} title={t("resendRenew")}><RefreshCw className="h-4 w-4" /></button>
                    <button type="button" disabled={isBusy} onClick={() => { setInvitationCancelError(""); setPendingInvitationCancel({ invitationId: invitation.invitation_id, label: invitation.name || invitation.email }); }} className="grid h-9 w-9 place-items-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50" aria-label={t("cancelInvitation")} title={t("cancelRelease")}><Trash2 className="h-4 w-4" /></button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {view === "inactive" && inactiveMembers.length ? (
          <div className="divide-y divide-slate-100">
            {inactiveMembers.map((member) => (
              <div key={member.membership_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">{initials(member.name || member.email)}</span>
                <div className="min-w-[12rem] flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{member.name || member.email}</p>
                  <p className="truncate text-xs text-slate-500">{member.email}</p>
                </div>
                <StatusPill status="inactive" />
                {canManage ? <button type="button" disabled={isBusy || (capacityEnforced && available < 1)} onClick={() => { setStatusReason(""); setStatusError(""); setPendingStatus({ userId: member.user_id, status: "active", label: member.name || member.email }); }} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"><Check className="h-3.5 w-3.5" /> {t("reactivate")}</button> : null}
              </div>
            ))}
          </div>
        ) : null}

        {(view === "active" && !activeMembers.length) || (view === "pending" && !invitations.length) || (view === "inactive" && !inactiveMembers.length) ? (
          <CompactEmptyState icon={view === "pending" ? Clock3 : UserRound}>
            {view === "active" ? t("noActiveUsers") : view === "pending" ? t("noInvitations") : t("noInactiveUsers")}
          </CompactEmptyState>
        ) : null}
      </WorkspaceSection>

      {showBilling ? (
        <WorkspaceSection title={t("recentBilling")} description={t("stripeTransactions")} icon={CreditCard}>
          {company.invoices.length ? (
            <div className="divide-y divide-slate-100">
              {company.invoices.map((invoice) => (
                <div key={invoice.invoice_id} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600"><Receipt className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-900">{t("invoiceId", { id: String(invoice.invoice_id) })}</p><p className="mt-0.5 text-xs text-slate-500">{formatDate(invoice.period_ends_at || invoice.updated_at, locale)}</p></div>
                  <div className="shrink-0 text-right"><p className="text-sm font-medium text-slate-900">{formatMoney(invoice.amount_paid_cents || invoice.amount_due_cents, invoice.currency, locale)}</p><div className="mt-1"><StatusPill status={invoice.status} /></div></div>
                  {invoice.hosted_invoice_url ? <a href={invoice.hosted_invoice_url} target="_blank" rel="noreferrer" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label={t("openInvoice")}><ExternalLink className="h-4 w-4" /></a> : null}
                </div>
              ))}
            </div>
          ) : <CompactEmptyState icon={CreditCard}>{t("noInvoices")}</CompactEmptyState>}
        </WorkspaceSection>
      ) : null}

      <IndiceModalFrame
        open={inviteOpen}
        onOpenChange={(open) => { if (!open) setInviteOpen(false); }}
        busy={isBusy}
        eyebrow={t("accountUsers")}
        title={t("inviteUser")}
        description={t("inviteDescription", { name: company.name })}
        icon={<UserPlus className="h-5 w-5" />}
        modalType="standard-form"
        tone="blue"
        footerSummary={capacityEnforced ? t("availableBeforeInvite", { count: available }) : t("unlimitedCapacity")}
        footer={
          <>
            <button type="button" onClick={() => setInviteOpen(false)}>{inviteLink ? t("close") : t("cancel")}</button>
            {inviteLink ? (
              <button type="button" onClick={() => void copyInviteLink()}>
                {copied ? <Check className="mr-2 inline h-4 w-4" /> : <Copy className="mr-2 inline h-4 w-4" />}
                {copied ? t("linkCopied") : t("copyInvitation")}
              </button>
            ) : (
              <button type="submit" form="platform-company-user-invite" disabled={isBusy || !name.trim() || !email.trim() || inviteReason.trim().length < 5}>
                <Send className="mr-2 inline h-4 w-4" /> {isBusy ? t("sending") : t("sendInvitation")}
              </button>
            )}
          </>
        }
      >
        <form id="platform-company-user-invite" onSubmit={(event) => void submitInvite(event)} className="space-y-4">
          {feedback ? <div className={`rounded-xl border px-4 py-3 text-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{feedback.message}</div> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-slate-700">{t("fullName")}<input autoFocus required value={name} onChange={(event) => setName(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder={t("nameExample")} /></label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">{t("email")}<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder={t("emailExample")} /></label>
          </div>
          <fieldset className="rounded-xl border border-slate-200 bg-white p-4">
            <legend className="px-1 text-sm font-medium text-slate-700">{t("initialRole")}</legend>
            <div className="mt-1 grid gap-3 sm:grid-cols-2">
              <label className={`cursor-pointer rounded-xl border p-3 ${role === "user" ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}><input type="radio" className="sr-only" checked={role === "user"} onChange={() => setRole("user")} /><span className="block text-sm font-medium text-slate-900">{t("employee")}</span><span className="mt-1 block text-xs text-slate-500">{t("employeeAccess")}</span></label>
              <label className={`cursor-pointer rounded-xl border p-3 ${role === "admin" ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}><input type="radio" className="sr-only" checked={role === "admin"} onChange={() => setRole("admin")} /><span className="block text-sm font-medium text-slate-900">{t("administrator")}</span><span className="mt-1 block text-xs text-slate-500">{t("adminRoleHelp")}</span></label>
            </div>
          </fieldset>
          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            <span>{t("operationalReason")}</span>
            <textarea
              required
              minLength={5}
              maxLength={500}
              value={inviteReason}
              onChange={(event) => setInviteReason(event.target.value)}
              className="min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder={t("inviteReasonExample")}
            />
            <span className="block text-xs font-normal text-slate-500">{t("platformAuditHelp")}</span>
          </label>
          <p className="text-xs leading-5 text-slate-500">{t("initialPermissions")}</p>
        </form>
      </IndiceModalFrame>

      <IndiceConfirmationDialog
        open={pendingStatus !== null}
        busy={isBusy}
        destructive={pendingStatus?.status === "inactive"}
        tone={pendingStatus?.status === "inactive" ? "coral" : "blue"}
        title={pendingStatus?.status === "inactive" ? t("deactivateUser") : t("reactivateUser")}
        description={pendingStatus?.status === "inactive"
          ? t("deactivateHelp")
          : t("reactivateHelp")}
        itemName={pendingStatus?.label}
        cancelLabel={t("cancel")}
        confirmLabel={pendingStatus?.status === "inactive" ? t("deactivate") : t("reactivate")}
        confirmDisabled={statusReason.trim().length < 5}
        onCancel={() => { if (!isBusy) { setPendingStatus(null); setStatusReason(""); setStatusError(""); } }}
        onConfirm={() => {
          if (!pendingStatus || statusReason.trim().length < 5) return;
          void updateMemberStatus(pendingStatus.userId, pendingStatus.status, statusReason.trim());
        }}
      >
        {statusError ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {statusError}
          </div>
        ) : null}
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">
          <span>{t("operationalReason")}</span>
          <textarea
            autoFocus
            required
            minLength={5}
            maxLength={500}
            value={statusReason}
            onChange={(event) => setStatusReason(event.target.value)}
            className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder={t("accessChangeReason")}
          />
        </label>
      </IndiceConfirmationDialog>

      <IndiceConfirmationDialog
        open={pendingInvitationCancel !== null}
        busy={isBusy}
        destructive
        tone="coral"
        title={t("cancelInvitation")}
        description={t("cancelInvitationHelp")}
        itemName={pendingInvitationCancel?.label}
        cancelLabel={t("cancel")}
        confirmLabel={t("cancelInvitation")}
        onCancel={() => {
          if (!isBusy) {
            setPendingInvitationCancel(null);
            setInvitationCancelError("");
          }
        }}
        onConfirm={() => {
          if (!pendingInvitationCancel) return;
          void cancelInvitation(pendingInvitationCancel.invitationId);
        }}
      >
        {invitationCancelError ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {invitationCancelError}
          </div>
        ) : null}
      </IndiceConfirmationDialog>
    </div>
  );
}
