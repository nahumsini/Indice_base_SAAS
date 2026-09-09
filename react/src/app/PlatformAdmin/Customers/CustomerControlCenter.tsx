import { useCustomerAccountCopy } from "./useCustomerAccountCopy";
import {
  ArrowRight,
  CircleAlert,
  Clock3,
  PackageSearch,
  Radar,
  Rocket,
} from "lucide-react";
import type { PlatformCompanySummary, PlatformOverview } from "../../api/platformAdmin";
import {
  customerControlSignals,
  customerPriorityScore,
  isCustomerAttentionAccount,
  isCustomerTrialEndingSoon,
  isCustomerWithoutAdoption,
  isCustomerWithoutOffer,
  isManagedCustomer,
  type CustomerControlSignal,
} from "./customerTableUtils";


export function CustomerControlCenter({
  english,
  companies,
  control,
  activeFilter,
  onFilter,
  onOpenCompany,
}: {
  english: boolean;
  companies: PlatformCompanySummary[];
  control?: PlatformOverview["control"];
  activeFilter: string;
  onFilter: (filter: string) => void;
  onOpenCompany: (company: PlatformCompanySummary) => void;
}) {
  const { t, locale, number } = useCustomerAccountCopy();
const signalCopy: Record<
  CustomerControlSignal,
  { es: string; en: string; actionEs: string; actionEn: string }
> = {
  payment: {
    es: t("signalPayment"),
    en: t("signalPayment"),
    actionEs: t("signalPaymentAction"),
    actionEn: t("signalPaymentAction"),
  },
  access: {
    es: t("signalAccess"),
    en: t("signalAccess"),
    actionEs: t("signalAccessAction"),
    actionEn: t("signalAccessAction"),
  },
  pricing: {
    es: t("signalPricing"),
    en: t("signalPricing"),
    actionEs: t("signalPricingAction"),
    actionEn: t("signalPricingAction"),
  },
  trialExpired: {
    es: t("trialExpired"),
    en: t("trialExpired"),
    actionEs: t("signalTrialExpiredAction"),
    actionEn: t("signalTrialExpiredAction"),
  },
  trialEnding: {
    es: t("trialEndingSoon"),
    en: t("trialEndingSoon"),
    actionEs: t("signalTrialEndingAction"),
    actionEn: t("signalTrialEndingAction"),
  },
  owner: {
    es: t("noOwnerContact"),
    en: t("noOwnerContact"),
    actionEs: t("signalOwnerAction"),
    actionEn: t("signalOwnerAction"),
  },
  offer: {
    es: t("noPlanModulesDefined"),
    en: t("noPlanModulesDefined"),
    actionEs: t("signalOfferAction"),
    actionEn: t("signalOfferAction"),
  },
  adoption: {
    es: t("noActiveUsersLabel"),
    en: t("noActiveUsersLabel"),
    actionEs: t("signalAdoptionAction"),
    actionEn: t("signalAdoptionAction"),
  },
};

  const customerAccounts = companies.filter(isManagedCustomer);
  const attention = control?.attention ?? customerAccounts.filter(isCustomerAttentionAccount).length;
  const expiring = control?.expiring ?? customerAccounts.filter(isCustomerTrialEndingSoon).length;
  const withoutOffer = control?.no_offer ?? customerAccounts.filter(isCustomerWithoutOffer).length;
  const withoutAdoption = control?.no_adoption ?? customerAccounts.filter(isCustomerWithoutAdoption).length;
  const prioritySource = control?.priorities ?? customerAccounts;
  const priorities = prioritySource
    .map((company) => ({ company, signals: customerControlSignals(company) }))
    .filter(({ signals }) => signals.length > 0)
    .sort((left, right) => customerPriorityScore(right.company) - customerPriorityScore(left.company))
    .slice(0, 5);

  const indicators = [
    {
      filter: "attention",
      label: t("criticalReview"),
      value: attention,
      hint: t("billingOrAccess"),
      icon: CircleAlert,
      accent: "coral",
    },
    {
      filter: "expiring",
      label: t("trialsEnding"),
      value: expiring,
      hint: t("nextSevenDays"),
      icon: Clock3,
      accent: "gold",
    },
    {
      filter: "no_offer",
      label: t("offerPending"),
      value: withoutOffer,
      hint: t("noPlanModules"),
      icon: PackageSearch,
      accent: "blue",
    },
    {
      filter: "no_adoption",
      label: t("noAdoption"),
      value: withoutAdoption,
      hint: t("noActiveUsersLabel"),
      icon: Rocket,
      accent: "mint",
    },
  ] as const;

  return (
    <section
      aria-labelledby="customer-control-title"
      className="overflow-hidden rounded-2xl border border-[#59C3A5]/35 bg-white shadow-[0_18px_50px_-42px_rgba(15,23,42,0.7)] dark:border-[#59C3A5]/25 dark:bg-slate-900"
    >
      <div className="flex flex-col gap-4 border-b border-[#59C3A5]/20 bg-gradient-to-r from-[#e8f5f2] via-white to-white px-5 py-4 dark:from-emerald-950/35 dark:via-slate-900 dark:to-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#177D66] text-white shadow-sm">
            <Radar className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#177D66] dark:text-[#8FE0CA]">
              {t("portfolioCommand")}
            </p>
            <h2 id="customer-control-title" className="mt-1 text-lg font-medium text-slate-950 dark:text-white">
              {t("attentionToday")}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {t("priorityDataHelp")}
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#176B5B] ring-1 ring-[#59C3A5]/35 dark:bg-slate-800 dark:text-[#8FE0CA]">
          {priorities.length
            ? t("topPriorities", { count: priorities.length })
            : t("portfolioUnderControl")}
        </span>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
        <div className="min-w-0 border-b border-slate-200 lg:border-b-0 lg:border-r dark:border-slate-700">
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                {t("nextActions")}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t("highestRiskFirst")}
              </p>
            </div>
          </div>

          {priorities.length ? (
            <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
              {priorities.map(({ company, signals }) => {
                const primarySignal = signalCopy[signals[0]];
                const responsible = company.distributor_company_name || (t("indiceTeam"));
                return (
                  <button
                    type="button"
                    key={company.id}
                    onClick={() => onOpenCompany(company)}
                    className="group grid w-full gap-3 px-5 py-3 text-left transition hover:bg-[#59C3A5]/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#59C3A5]/35 sm:grid-cols-[minmax(0,1fr)_minmax(190px,0.8fr)_auto] sm:items-center"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{company.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                        {primarySignal.es}
                        {signals.length > 1 ? ` · +${number(signals.length - 1)}` : ""}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-[#176B5B] dark:text-[#8FE0CA]">
                        {primarySignal.actionEs}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                        {t("responsible")}: {responsible}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#177D66] opacity-80 transition group-hover:translate-x-0.5 group-hover:opacity-100 dark:text-[#8FE0CA]">
                      {t("review")}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="border-t border-slate-100 px-5 py-8 text-center dark:border-slate-800">
              <p className="text-sm font-medium text-[#177D66] dark:text-[#8FE0CA]">
                {t("noImmediateRisks")}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {t("monitorRenewals")}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800">
          {indicators.map(({ filter, label, value, hint, icon: Icon, accent }) => {
            const active = activeFilter === filter;
            const accents = {
              coral: "bg-red-50 text-[#d84f49] dark:bg-red-950/35 dark:text-red-300",
              gold: "bg-amber-50 text-amber-700 dark:bg-amber-950/35 dark:text-amber-300",
              blue: "bg-blue-50 text-[#174799] dark:bg-blue-950/35 dark:text-blue-300",
              mint: "bg-[#e8f5f2] text-[#177D66] dark:bg-emerald-950/35 dark:text-emerald-300",
            };
            return (
              <button
                key={filter}
                type="button"
                aria-pressed={active}
                onClick={() => onFilter(active ? "all" : filter)}
                className={`min-h-32 bg-white p-4 text-left transition hover:bg-[#59C3A5]/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#59C3A5]/35 dark:bg-slate-900 dark:hover:bg-slate-800 ${active ? "ring-2 ring-inset ring-[#59C3A5]" : ""}`}
              >
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${accents[accent]}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="mt-3 block text-xl font-medium tabular-nums text-slate-950 dark:text-white">{number(value)}</span>
                <span className="mt-0.5 block text-xs font-medium text-slate-700 dark:text-slate-200">{label}</span>
                <span className="mt-0.5 block text-[11px] text-slate-400">{hint}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
