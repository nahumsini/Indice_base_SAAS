import { useCustomerAccountCopy } from "../Customers/useCustomerAccountCopy";
import { useState } from "react";
import { Building2, ExternalLink, ShieldCheck } from "lucide-react";
import type { PlatformCompanyDetail } from "../../api/platformAdmin";
import { IndiceConfirmationDialog } from "../../components/indice-modal";
import { WorkspaceSection, SummaryDatum, StatusPill } from "./CompanyAccountPrimitives";
import { basicCommercialStatus } from "../Customers/customerTableUtils";
import { commercialOrigin, formatDate, formatMoney, humanize } from "./companyAccountUtils";

export function CompanyOverviewTab({
  company,
  activeProductCount,
  capacity,
  activeUserCount,
  availableSeats,
  accessLabel,
  canManagePublicDemo,
  saving,
  onUpdatePublicDemo,
}: {
  company: PlatformCompanyDetail;
  activeProductCount: number;
  capacity: number;
  activeUserCount: number;
  availableSeats: number;
  accessLabel: string;
  canManagePublicDemo: boolean;
  saving: boolean;
  onUpdatePublicDemo?: (enabled: boolean, reason: string) => Promise<boolean>;
}) {
  const { t, locale, number } = useCustomerAccountCopy();
  const [pendingDemoState, setPendingDemoState] = useState<boolean | null>(null);
  const [demoReason, setDemoReason] = useState("");
  const [demoError, setDemoError] = useState("");
  const origin = commercialOrigin(company, locale);
  const planCode = company.offer_code || company.projected_offer_code;
  const plan = planCode ? humanize(planCode, locale) : t("noPlan");
  const nextEvent = company.trial_source ? company.trial_ends_at : company.current_period_ends_at;
  const paymentStatus = company.billing_managed_by_stripe
    ? (company.last_payment_status ? humanize(company.last_payment_status, locale) : t("stripeManaged"))
    : company.stripe_customer_id
      ? t("stripeNoContract")
      : t("noStripe");

  return (
    <WorkspaceSection
      title={t("operationalSummary")}
      description={t("overviewDescription")}
      icon={Building2}
    >
      <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:[&>*:nth-child(2n)]:border-l lg:grid-cols-4 lg:[&>*]:border-l lg:[&>*:nth-child(4n+1)]:border-l-0">
        <SummaryDatum label={t("status")} value={<StatusPill status={basicCommercialStatus(company)} />} />
        <SummaryDatum label={t("workspaceAccountType")} value={(company.commercial_account_type || company.user_type) === "DISTRIBUTOR" ? t("distributor") : t("workspaceClient")} />
        <SummaryDatum label={t("workspaceRootUsers")} value={number(company.members.filter((member) => member.platform_role === "PLATFORM_ROOT" && member.platform_status === "ACTIVE" && (!member.status || member.status.toLowerCase() === "active")).length)} />
        <SummaryDatum label={t("traceability")} value={origin.value} hint={origin.hint} />
        <SummaryDatum label={t("workspaceEffectiveAccess")} value={accessLabel} hint={t("modulesSummary", { count: activeProductCount })} />
        <SummaryDatum
          label={t("plan")}
          value={plan}
          hint={company.billing_managed_by_stripe
            ? `${company.catalog_version_historical ? t("historicalContract") : t("currentCatalog")}${company.catalog_version ? ` · ${company.catalog_version}` : ""}`
            : t("noCommercialContract")}
        />
        <SummaryDatum
          label={t("rate")}
          value={formatMoney(company.billing_amount_cents, company.billing_currency, locale)}
          hint={company.billing_amount_kind === "ESTIMATE" ? t("workspacePriceEstimate") : company.billing_amount_interval ? humanize(company.billing_amount_interval, locale) : t("noInterval")}
        />
        <SummaryDatum
          label={t("users")}
          value={company.seat_usage?.enforced === false ? t("activeCount", { count: activeUserCount }) : t("usageOfCapacity", { used: activeUserCount, capacity })}
          hint={company.seat_usage?.enforced === false ? t("workspaceNoLimit") : t("availableSeats", { count: availableSeats })}
        />
        <SummaryDatum label={t("workspaceNextEvent")} value={formatDate(nextEvent, locale)} hint={nextEvent ? t("billingDateHelp") : t("noScheduledDate")} />
        <SummaryDatum
          label={t("paymentMethod")}
          value={paymentStatus}
          hint={t("cardsPrivate")}
        />
      </div>
      <div className="border-t border-slate-100 p-4 sm:p-5">
        <div className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
          company.public_demo_enabled
            ? "border-blue-200 bg-blue-50/70"
            : "border-slate-200 bg-slate-50"
        }`}>
          <div className="flex items-start gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
              company.public_demo_enabled ? "bg-blue-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"
            }`}>
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-slate-900">{t("publicCredentialDemo")}</p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                {t("publicDemoHelp")}
              </p>
              {company.public_demo_enabled ? (
                <a href="/demo" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900">
                  {t("openDemoPage")}<ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(company.public_demo_enabled)}
            disabled={!canManagePublicDemo || saving || company.user_type !== "SUPER_ADMIN"}
            onClick={() => {
              setDemoReason("");
              setDemoError("");
              setPendingDemoState(!company.public_demo_enabled);
            }}
            className={`relative h-8 w-14 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50 ${
              company.public_demo_enabled ? "bg-blue-600" : "bg-slate-300"
            }`}
            aria-label={company.public_demo_enabled ? t("disablePublicDemo") : t("enablePublicDemo")}
          >
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition ${
              company.public_demo_enabled ? "left-7" : "left-1"
            }`} />
          </button>
        </div>
      </div>
      <IndiceConfirmationDialog
        open={pendingDemoState !== null}
        tone={pendingDemoState ? "blue" : "coral"}
        destructive={pendingDemoState === false}
        title={pendingDemoState ? t("enablePublicDemo") : t("disablePublicDemo")}
        description={pendingDemoState
          ? t("enableDemoHelp")
          : t("disableDemoHelp")}
        cancelLabel={t("cancel")}
        confirmLabel={pendingDemoState ? t("enableDemo") : t("disableDemo")}
        confirmDisabled={saving || demoReason.trim().length < 5}
        busy={saving}
        onCancel={() => { setPendingDemoState(null); setDemoError(""); }}
        onConfirm={async () => {
          if (pendingDemoState === null || demoReason.trim().length < 5) return;
          const changed = await onUpdatePublicDemo?.(pendingDemoState, demoReason.trim());
          if (changed) {
            setPendingDemoState(null);
            setDemoError("");
          } else {
            setDemoError(t("demoSaveFailed"));
          }
        }}
      >
        {demoError ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {demoError}
          </div>
        ) : null}
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">
          <span>{t("operationalReason")}</span>
          <textarea
            autoFocus
            required
            minLength={5}
            maxLength={500}
            value={demoReason}
            onChange={(event) => setDemoReason(event.target.value)}
            className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder={t("demoReason")}
          />
        </label>
      </IndiceConfirmationDialog>
    </WorkspaceSection>
  );
}
