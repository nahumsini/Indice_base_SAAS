import { Gift, ShieldCheck } from "lucide-react";
import type { PlatformCompanyDetail } from "../../api/platformAdmin";
import { CompactEmptyState, StatusPill, WorkspaceSection } from "./CompanyAccountPrimitives";
import { formatDate, humanize, offerLabels } from "./companyAccountUtils";

export function CompanyAccessTab({
  company,
  saving,
  canCreate,
  canRevoke,
  onCreate,
  onRevoke,
}: {
  company: PlatformCompanyDetail;
  saving: boolean;
  canCreate: boolean;
  canRevoke: boolean;
  onCreate: () => void;
  onRevoke: (reference: string, label?: string, grantCount?: number) => void;
}) {
  return (
    <WorkspaceSection
      title="Accesos administrativos"
      description="Cortesías, promociones, pruebas y apoyos con vigencia auditable."
      icon={ShieldCheck}
      action={canCreate ? (
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-900 px-4 text-sm font-medium text-white transition hover:bg-blue-950"
          onClick={onCreate}
        >
          <span aria-hidden="true">＋</span>
          Crear ajuste
        </button>
      ) : null}
    >
      {company.benefits.length ? (
        <div className="divide-y divide-slate-100">
          {company.benefits.map((benefit) => {
            const benefitCanBeRevoked = canRevoke && benefit.status.toUpperCase() === "ACTIVE" && benefit.source_type.toUpperCase() !== "SUBSCRIPTION";
            return (
              <div key={benefit.reference} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <Gift className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">
                      {benefit.product_code ? humanize(benefit.product_code) : humanize(benefit.benefit_type)}
                    </p>
                    <StatusPill status={benefit.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {benefit.reason || "Ajuste administrativo"} · {offerLabels[benefit.source_type.toLowerCase()] || humanize(benefit.source_type)}
                    {benefit.ends_at ? ` · hasta ${formatDate(benefit.ends_at)}` : " · sin vencimiento"}
                  </p>
                </div>
                {benefitCanBeRevoked ? (
                  <button
                    type="button"
                    className="h-9 rounded-lg border border-rose-200 px-3 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                    disabled={saving}
                    onClick={() => onRevoke(benefit.reference, benefit.product_code ? humanize(benefit.product_code) : humanize(benefit.benefit_type), 1)}
                  >
                    Revocar
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <CompactEmptyState icon={Gift}>No hay ajustes administrativos registrados.</CompactEmptyState>
      )}
    </WorkspaceSection>
  );
}
