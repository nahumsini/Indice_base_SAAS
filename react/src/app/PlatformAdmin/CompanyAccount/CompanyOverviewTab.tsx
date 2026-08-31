import { Building2, ExternalLink, ShieldCheck } from "lucide-react";
import type { PlatformCompanyDetail } from "../../api/platformAdmin";
import { WorkspaceSection, SummaryDatum, StatusPill } from "./CompanyAccountPrimitives";
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
  onUpdatePublicDemo?: (enabled: boolean) => Promise<void>;
}) {
  const origin = commercialOrigin(company);
  const plan = company.offer_code ? humanize(company.offer_code) : "Sin plan";
  const nextEvent = company.current_period_ends_at || company.trial_ends_at;
  const paymentStatus = company.stripe_subscription_id
    ? (company.last_payment_status ? humanize(company.last_payment_status) : "Administrado en Stripe")
    : company.stripe_customer_id
      ? "Cliente Stripe sin contrato"
      : "Sin Stripe";

  return (
    <WorkspaceSection
      title="Resumen operativo"
      description="Estado, relación comercial, capacidad y facturación en una sola vista."
      icon={Building2}
    >
      <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:[&>*:nth-child(2n)]:border-l lg:grid-cols-4 lg:[&>*]:border-l lg:[&>*:nth-child(4n+1)]:border-l-0">
        <SummaryDatum label="Estado" value={<StatusPill status={company.billing_status || company.lifecycle_state || "Sin estado"} />} />
        <SummaryDatum label="Tipo de usuario" value={humanize(company.user_type)} hint="Rol propietario de la cuenta" />
        <SummaryDatum label="Trazabilidad" value={origin.value} hint={origin.hint} />
        <SummaryDatum label="Acceso" value={accessLabel} hint={`${activeProductCount} módulo(s) activo(s)`} />
        <SummaryDatum
          label="Plan"
          value={plan}
          hint={company.stripe_subscription_id
            ? `${company.catalog_version_historical ? "Contrato histórico" : "Catálogo vigente"}${company.catalog_version ? ` · ${company.catalog_version}` : ""}`
            : "Sin contrato comercial"}
        />
        <SummaryDatum
          label="Tarifa"
          value={formatMoney(company.recurring_amount_cents, company.currency)}
          hint={company.billing_interval ? `${humanize(company.billing_interval)} · antes de impuestos` : "Sin periodicidad"}
        />
        <SummaryDatum
          label="Usuarios"
          value={`${activeUserCount} de ${capacity}`}
          hint={`${availableSeats} lugar(es) disponible(s)`}
        />
        <SummaryDatum label="Próximo corte" value={formatDate(nextEvent)} hint={nextEvent ? "El cargo y el cambio programado se concilian en esta fecha" : "Sin fecha programada"} />
        <SummaryDatum
          label="Método de pago"
          value={paymentStatus}
          hint="El propietario administra las tarjetas en Stripe; Root no accede a sus datos."
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
              <p className="font-semibold text-slate-900">Demo pública con credenciales</p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                Permite que esta empresa aparezca en <code className="rounded bg-white px-1.5 py-0.5 text-xs text-blue-700">/demo</code>.
                Sus credenciales existentes podrán iniciar una sesión demo de 60 minutos sin MFA; el acceso normal no cambia.
              </p>
              {company.public_demo_enabled ? (
                <a href="/demo" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900">
                  Abrir página de demos <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(company.public_demo_enabled)}
            disabled={!canManagePublicDemo || saving || company.user_type !== "SUPER_ADMIN"}
            onClick={() => void onUpdatePublicDemo?.(!company.public_demo_enabled)}
            className={`relative h-8 w-14 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50 ${
              company.public_demo_enabled ? "bg-blue-600" : "bg-slate-300"
            }`}
            aria-label={company.public_demo_enabled ? "Deshabilitar demo pública" : "Habilitar demo pública"}
          >
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition ${
              company.public_demo_enabled ? "left-7" : "left-1"
            }`} />
          </button>
        </div>
      </div>
    </WorkspaceSection>
  );
}
