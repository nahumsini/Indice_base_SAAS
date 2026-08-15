import {
  CalendarClock,
  CalendarPlus,
  PencilLine,
  Settings2,
  Users,
} from "lucide-react";
import type { PlatformCompanySummary } from "../../api/platformAdmin";
import type { CustomerTableCopy } from "./customerTableCopy";
import { CustomerTraceabilityCell } from "./CustomerTraceabilityCell";
import {
  basicCommercialStatus,
  type CustomerCommercialStatus,
} from "./customerTableUtils";

const cellClass = "px-4 py-3 align-middle text-sm font-normal text-slate-700";

const planLabels: Record<string, { en: string; es: string }> = {
  basic_1: { en: "One module", es: "Un módulo" },
  basic_2: { en: "Two modules", es: "Dos módulos" },
  basic_3: { en: "Three modules", es: "Tres módulos" },
  basic_all: { en: "Four or more modules", es: "Cuatro o más módulos" },
};

export function CustomerTableRow({
  company,
  english,
  copy,
  compact,
  canEditTypes,
  onEditType,
  canAssignDistributors,
  onAssignDistributor,
  canExtendTrials,
  onExtendTrial,
  onOpenCompany,
  onOpenUsers,
}: {
  company: PlatformCompanySummary;
  english: boolean;
  copy: CustomerTableCopy;
  compact: boolean;
  canEditTypes?: boolean;
  onEditType?: (company: PlatformCompanySummary) => void;
  canAssignDistributors?: boolean;
  onAssignDistributor?: (company: PlatformCompanySummary) => void;
  canExtendTrials?: boolean;
  onExtendTrial?: (company: PlatformCompanySummary) => void;
  onOpenCompany: (company: PlatformCompanySummary | number) => void;
  onOpenUsers: (company: PlatformCompanySummary) => void;
}) {
  const accountType = normalizeAccountType(company.user_type);
  const status = basicCommercialStatus(company);
  const seats =
    (company.included_seats || 0) +
    (company.purchased_extra_seats || 0) +
    (company.courtesy_extra_seats || 0);
  const capacity = Math.max(seats, company.active_members || 0);
  const availableSeats = Math.max(capacity - (company.active_members || 0), 0);
  const eventDate =
    company.trial_source
      ? company.trial_ends_at
      : company.current_period_ends_at;
  const hasFiniteTrial = Boolean(company.trial_source && company.trial_ends_at);
  const remainingTrialDays = Math.max(0, company.trial_days_remaining ?? 0);
  const effectiveOfferCode = company.offer_code || company.projected_offer_code;
  const plan = planLabels[effectiveOfferCode || ""];
  const payment = company.last_invoice_status || company.last_payment_status;
  const billingKind = company.billing_amount_kind || "UNAVAILABLE";
  const hasBillingAmount = company.billing_amount_cents != null;
  const billingCadence =
    company.billing_amount_interval === "YEAR" ? copy.annual : copy.monthly;
  const billingCaption = {
    CURRENT: copy.currentCharge,
    NEXT_INVOICE: copy.nextInvoiceCharge,
    TRIAL_END: copy.afterTrial,
    ESTIMATE: copy.estimatedCharge,
    UNAVAILABLE: copy.pricePending,
  }[billingKind];

  return (
    <tr className="group transition-colors hover:bg-blue-50/35">
      <td
        className={`${cellClass} sticky left-0 z-10 bg-white shadow-[8px_0_16px_-16px_rgba(15,23,42,0.45)] transition-colors group-hover:bg-[#f8fbff]`}
      >
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f5f2] text-sm font-medium text-[#177D66] ring-1 ring-[#59C3A5]/20">
            {initials(company.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">
              {company.name}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {company.owner_email || `Company #${company.id}`}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              ID {company.id}
            </p>
          </div>
        </div>
      </td>
      <td className={cellClass}>
        <UserTypeBadge type={accountType} english={english} />
      </td>
      <td className={cellClass}>
        <CustomerTraceabilityCell
          company={company}
          copy={copy}
          canAssign={Boolean(canAssignDistributors && accountType === "SUPER_ADMIN")}
          onAssign={onAssignDistributor}
        />
      </td>
      <td className={cellClass}>
        <CommercialStatusBadge status={status} english={english} />
      </td>
      <td className={cellClass}>
        <p className="font-medium text-slate-900">
          {plan
            ? plan[english ? "en" : "es"]
            : effectiveOfferCode || copy.noPlan}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {(company.product_names ?? [])
            .slice(0, compact ? 2 : 3)
            .map((name) => (
              <span
                key={name}
                className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
              >
                {name}
              </span>
            ))}
          {(company.product_names?.length ?? 0) > (compact ? 2 : 3) ? (
            <span className="px-1 py-0.5 text-xs font-medium text-[#2563EB]">
              +{(company.product_names?.length ?? 0) - (compact ? 2 : 3)}
            </span>
          ) : null}
        </div>
      </td>
      <td className={cellClass}>
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-[#177D66]">
            <Users className="h-4 w-4" />
          </span>
          <div>
            <p className="font-medium tabular-nums text-slate-900">
              {company.active_members} / {capacity}
            </p>
            <p className="text-xs text-slate-500">
              {availableSeats} {copy.availableUsers}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenUsers(company)}
          className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-xs font-medium text-[#174799] transition hover:border-[#2563EB] hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/25"
        >
          <Settings2 className="h-3.5 w-3.5" />
          {copy.manageUsers}
        </button>
      </td>
      <td className={cellClass}>
        {hasBillingAmount ? (
          <>
            <p className="font-medium tabular-nums text-slate-900">
              {formatMoney(
                company.billing_amount_cents,
                company.billing_currency || company.currency,
                english,
              )}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {billingCaption} · {billingCadence.toLowerCase()}
            </p>
          </>
        ) : (
          <p className="font-medium text-amber-700">{copy.pricePending}</p>
        )}
        {billingKind === "CURRENT" ? (
          <PaymentBadge status={payment} copy={copy} />
        ) : (
          <BillingProjectionBadge
            kind={billingKind}
            copy={copy}
          />
        )}
      </td>
      <td className={cellClass}>
        <p className="inline-flex items-center gap-1.5 font-medium text-slate-700">
          <CalendarClock className="h-3.5 w-3.5 text-[#2563EB]" />
          {hasFiniteTrial
            ? remainingTrialDays > 0
              ? copy.daysRemaining(remainingTrialDays)
              : copy.trialExpired
            : company.trial_permanent
              ? copy.permanentTrial
            : company.current_period_ends_at
              ? copy.renewal
              : copy.noDate}
        </p>
        {eventDate ? (
          <p className="mt-1 text-xs text-slate-500">
            {hasFiniteTrial ? `${copy.trialEnd}: ` : ""}
            {formatDate(eventDate, english)}
          </p>
        ) : null}
        {canExtendTrials && company.trial_extendable ? (
          <button
            type="button"
            onClick={() => onExtendTrial?.(company)}
            className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-xs font-medium text-[#174799] transition hover:border-[#2563EB] hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/25"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            {copy.extendTrial}
          </button>
        ) : null}
      </td>
      <td
        className={`${cellClass} sticky right-0 z-10 bg-white text-right shadow-[-8px_0_16px_-16px_rgba(15,23,42,0.45)] transition-colors group-hover:bg-[#f8fbff]`}
      >
        <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {canEditTypes && accountType !== "ROOT" ? (
            <button
              type="button"
              onClick={() => onEditType?.(company)}
              aria-label={copy.editType}
              title={copy.editType}
              className="grid h-9 w-9 place-items-center rounded-lg text-[#174799] transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/25"
            >
              <PencilLine className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onOpenCompany(company)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#2563EB] px-3 text-sm font-medium text-white transition hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 focus-visible:ring-offset-1"
          >
            <Settings2 className="h-4 w-4" />
            {copy.manage}
          </button>
        </div>
      </td>
    </tr>
  );
}

function BillingProjectionBadge({
  kind,
  copy,
}: {
  kind: NonNullable<PlatformCompanySummary["billing_amount_kind"]>;
  copy: CustomerTableCopy;
}) {
  const presentation = {
    CURRENT: [copy.currentCharge, "bg-emerald-50 text-emerald-700"],
    NEXT_INVOICE: [copy.nextInvoiceCharge, "bg-blue-50 text-[#174799]"],
    TRIAL_END: [copy.stripeScheduled, "bg-blue-50 text-[#174799]"],
    ESTIMATE: [copy.pendingStripeActivation, "bg-amber-50 text-amber-700"],
    UNAVAILABLE: [copy.configureRate, "bg-rose-50 text-rose-700"],
  }[kind];
  return (
    <span
      className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${presentation[1]}`}
    >
      {presentation[0]}
    </span>
  );
}

function UserTypeBadge({
  type,
  english,
}: {
  type: PlatformCompanySummary["user_type"];
  english: boolean;
}) {
  const presentation = {
    ROOT: ["Root", "border-blue-200 bg-blue-50 text-[#174799]"],
    SUPER_ADMIN: [
      "Super Admin",
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    ],
    DISTRIBUTOR: [
      english ? "Distributor" : "Distribuidor",
      "border-amber-200 bg-amber-50 text-amber-700",
    ],
  }[type];
  return <TableBadge label={presentation[0]} className={presentation[1]} />;
}

function normalizeAccountType(
  type: PlatformCompanySummary["user_type"] | null | undefined,
): PlatformCompanySummary["user_type"] {
  if (type === "ROOT" || type === "DISTRIBUTOR") return type;

  // Older local backends did not expose user_type in the overview payload.
  // Tenant companies are SUPER_ADMIN unless the API identifies another type.
  return "SUPER_ADMIN";
}

function CommercialStatusBadge({
  status,
  english,
}: {
  status: CustomerCommercialStatus;
  english: boolean;
}) {
  const presentation = {
    active: [english ? "Active" : "Activa", "bg-emerald-50 text-emerald-700"],
    trial: [english ? "Trial" : "Prueba", "bg-amber-50 text-amber-700"],
    demo: ["Demo", "bg-blue-50 text-[#2563EB]"],
    inactive: [english ? "Inactive" : "Inactiva", "bg-slate-100 text-slate-600"],
  }[status];
  return <TableBadge label={presentation[0]} className={presentation[1]} />;
}

function PaymentBadge({
  status,
  copy,
}: {
  status?: string | null;
  copy: CustomerTableCopy;
}) {
  const normalized = (status || "").toLowerCase();
  const positive = ["paid", "success", "succeeded"].includes(normalized);
  const attention = ["open", "pending", "past_due", "unpaid", "failed"].includes(
    normalized,
  );
  return (
    <span
      className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        positive
          ? "bg-emerald-50 text-emerald-700"
          : attention
            ? "bg-amber-50 text-amber-700"
            : "bg-slate-100 text-slate-500"
      }`}
    >
      {status || copy.noActivity}
    </span>
  );
}

function TableBadge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-transparent px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatMoney(value?: number | null, currency = "USD", english = false) {
  return new Intl.NumberFormat(english ? "en-CA" : "es-MX", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format((value || 0) / 100);
}

function formatDate(value: string, english: boolean) {
  return new Intl.DateTimeFormat(english ? "en-CA" : "es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
