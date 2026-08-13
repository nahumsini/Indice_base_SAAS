import { Building2 } from "lucide-react";
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
}: {
  company: PlatformCompanyDetail;
  activeProductCount: number;
  capacity: number;
  activeUserCount: number;
  availableSeats: number;
  accessLabel: string;
}) {
  const origin = commercialOrigin(company);
  const plan = company.offer_code ? humanize(company.offer_code) : "Sin plan";
  const nextEvent = company.current_period_ends_at || company.trial_ends_at;

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
        <SummaryDatum label="Plan" value={plan} hint={company.stripe_subscription_id ? "Suscripción sincronizada" : "Sin contrato comercial"} />
        <SummaryDatum
          label="Tarifa"
          value={formatMoney(company.recurring_amount_cents, company.currency)}
          hint={company.billing_interval ? humanize(company.billing_interval) : "Sin periodicidad"}
        />
        <SummaryDatum
          label="Usuarios"
          value={`${activeUserCount} de ${capacity}`}
          hint={`${availableSeats} lugar(es) disponible(s)`}
        />
        <SummaryDatum label="Próximo evento" value={formatDate(nextEvent)} hint={nextEvent ? "Fecha comercial registrada" : "Sin fecha programada"} />
      </div>
    </WorkspaceSection>
  );
}
