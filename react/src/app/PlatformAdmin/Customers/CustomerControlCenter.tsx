import {
  ArrowRight,
  CircleAlert,
  Clock3,
  PackageSearch,
  Radar,
  Rocket,
} from "lucide-react";
import type { PlatformCompanySummary } from "../../api/platformAdmin";
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

const signalCopy: Record<
  CustomerControlSignal,
  { es: string; en: string; actionEs: string; actionEn: string }
> = {
  payment: {
    es: "Cobro vencido o fallido",
    en: "Past-due or failed payment",
    actionEs: "Gestionar cobro y confirmar continuidad",
    actionEn: "Collect payment and confirm continuity",
  },
  access: {
    es: "Cuenta sin acceso operativo",
    en: "Account without operational access",
    actionEs: "Revisar contrato, acceso y estado comercial",
    actionEn: "Review contract, access and commercial status",
  },
  pricing: {
    es: "Tarifa o proyección pendiente",
    en: "Rate or projection pending",
    actionEs: "Definir tarifa y validar la facturación",
    actionEn: "Set the rate and validate billing",
  },
  trialExpired: {
    es: "Prueba vencida",
    en: "Trial expired",
    actionEs: "Cerrar, extender o convertir la prueba",
    actionEn: "Close, extend or convert the trial",
  },
  trialEnding: {
    es: "Prueba por vencer",
    en: "Trial ending soon",
    actionEs: "Contactar y definir el siguiente paso",
    actionEn: "Contact the customer and define the next step",
  },
  owner: {
    es: "Sin contacto propietario",
    en: "No owner contact",
    actionEs: "Registrar al responsable del cliente",
    actionEn: "Register the customer owner",
  },
  offer: {
    es: "Sin plan o módulos definidos",
    en: "No plan or modules defined",
    actionEs: "Configurar la oferta contratada",
    actionEn: "Configure the contracted offer",
  },
  adoption: {
    es: "Sin usuarios activos",
    en: "No active users",
    actionEs: "Agendar activación y revisar adopción",
    actionEn: "Schedule activation and review adoption",
  },
};

export function CustomerControlCenter({
  english,
  companies,
  activeFilter,
  onFilter,
  onOpenCompany,
}: {
  english: boolean;
  companies: PlatformCompanySummary[];
  activeFilter: string;
  onFilter: (filter: string) => void;
  onOpenCompany: (company: PlatformCompanySummary) => void;
}) {
  const customerAccounts = companies.filter(isManagedCustomer);
  const attention = customerAccounts.filter(isCustomerAttentionAccount).length;
  const expiring = customerAccounts.filter(isCustomerTrialEndingSoon).length;
  const withoutOffer = customerAccounts.filter(isCustomerWithoutOffer).length;
  const withoutAdoption = customerAccounts.filter(isCustomerWithoutAdoption).length;
  const priorities = customerAccounts
    .map((company) => ({ company, signals: customerControlSignals(company) }))
    .filter(({ signals }) => signals.length > 0)
    .sort((left, right) => customerPriorityScore(right.company) - customerPriorityScore(left.company))
    .slice(0, 5);

  const indicators = [
    {
      filter: "attention",
      label: english ? "Critical review" : "Revisión crítica",
      value: attention,
      hint: english ? "Billing or access" : "Cobro o acceso",
      icon: CircleAlert,
      accent: "coral",
    },
    {
      filter: "expiring",
      label: english ? "Trials ending" : "Pruebas por vencer",
      value: expiring,
      hint: english ? "Next 7 days" : "Próximos 7 días",
      icon: Clock3,
      accent: "gold",
    },
    {
      filter: "no_offer",
      label: english ? "Offer pending" : "Oferta pendiente",
      value: withoutOffer,
      hint: english ? "No plan or modules" : "Sin plan o módulos",
      icon: PackageSearch,
      accent: "blue",
    },
    {
      filter: "no_adoption",
      label: english ? "No adoption" : "Sin adopción",
      value: withoutAdoption,
      hint: english ? "No active users" : "Sin usuarios activos",
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
              {english ? "Portfolio command" : "Mando de cartera"}
            </p>
            <h2 id="customer-control-title" className="mt-1 text-lg font-medium text-slate-950 dark:text-white">
              {english ? "Decide what needs attention today" : "Decide qué cliente necesita atención hoy"}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {english
                ? "Priorities are calculated from real access, billing, trial and adoption data."
                : "Las prioridades se calculan con datos reales de acceso, cobro, prueba y adopción."}
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#176B5B] ring-1 ring-[#59C3A5]/35 dark:bg-slate-800 dark:text-[#8FE0CA]">
          {priorities.length
            ? english
              ? `${priorities.length} top priorities`
              : `${priorities.length} prioridades principales`
            : english
              ? "Portfolio under control"
              : "Cartera bajo control"}
        </span>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
        <div className="min-w-0 border-b border-slate-200 lg:border-b-0 lg:border-r dark:border-slate-700">
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                {english ? "Recommended next actions" : "Siguientes acciones recomendadas"}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {english ? "Highest-risk customers appear first." : "Los clientes con mayor riesgo aparecen primero."}
              </p>
            </div>
          </div>

          {priorities.length ? (
            <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
              {priorities.map(({ company, signals }) => {
                const primarySignal = signalCopy[signals[0]];
                const responsible = company.distributor_company_name || (english ? "Indice team" : "Equipo Índice");
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
                        {english ? primarySignal.en : primarySignal.es}
                        {signals.length > 1 ? ` · +${signals.length - 1}` : ""}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-[#176B5B] dark:text-[#8FE0CA]">
                        {english ? primarySignal.actionEn : primarySignal.actionEs}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                        {english ? "Responsible" : "Responsable"}: {responsible}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#177D66] opacity-80 transition group-hover:translate-x-0.5 group-hover:opacity-100 dark:text-[#8FE0CA]">
                      {english ? "Review" : "Revisar"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="border-t border-slate-100 px-5 py-8 text-center dark:border-slate-800">
              <p className="text-sm font-medium text-[#177D66] dark:text-[#8FE0CA]">
                {english ? "No immediate operational risks." : "No hay riesgos operativos inmediatos."}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {english ? "Continue monitoring adoption and upcoming renewals." : "Continúa monitoreando adopción y próximas renovaciones."}
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
                <span className="mt-3 block text-xl font-medium tabular-nums text-slate-950 dark:text-white">{value}</span>
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
