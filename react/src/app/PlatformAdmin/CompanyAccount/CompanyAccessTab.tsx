import { useCustomerAccountCopy } from "../Customers/useCustomerAccountCopy";
import { Gift, ShieldCheck } from "lucide-react";
import type { PlatformCompanyDetail } from "../../api/platformAdmin";
import { CompactEmptyState, StatusPill, WorkspaceSection } from "./CompanyAccountPrimitives";
import { benefitEffectiveStatus } from "./companyAccountState";
import { formatDate, humanize } from "./companyAccountUtils";
import type { PlatformCatalogProduct } from "../../api/platformAdmin";
import { benefitLabel } from "./companyBenefitPresentation";
import { CompanyBenefitDetails } from "./CompanyBenefitDetails";

export function CompanyAccessTab({
  company,
  saving,
  canCreate,
  canRevoke,
  onCreate,
  onRevoke,
  capacityOnly = false,
  products = [],
}: {
  capacityOnly?: boolean;
  products?: PlatformCatalogProduct[];
  company: PlatformCompanyDetail;
  saving: boolean;
  canCreate: boolean;
  canRevoke: boolean;
  onCreate: () => void;
  onRevoke: (reference: string, label?: string, grantCount?: number) => void;
}) {
  const { t, locale } = useCustomerAccountCopy();
  const benefits = company.benefits.filter(benefit => !capacityOnly || benefit.benefit_type !== "PRODUCT");
  if (capacityOnly && !benefits.length) return null;
  return (
    <WorkspaceSection
      title={t(capacityOnly ? "accessCapacity" : "adminAccessTitle")}
      description={t(capacityOnly ? "accessCapacityHelp" : "adminAccessDescription")}
      icon={ShieldCheck}
      action={canCreate && !capacityOnly ? (
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#177D66] px-4 text-sm font-medium text-white transition hover:bg-[#126553]"
          onClick={onCreate}
          disabled={saving}
        >
          <span aria-hidden="true">＋</span>
          {t("createAdjustment")}</button>
      ) : null}
    >
      {benefits.length ? (
        <div className="divide-y divide-slate-100">
          {benefits.map((benefit) => {
            const benefitCanBeRevoked = canRevoke && benefit.status.toUpperCase() === "ACTIVE" && benefit.source_type.toUpperCase() !== "SUBSCRIPTION";
            return (
              <div key={benefit.reference} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <Gift className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">
                      {benefitLabel(benefit, company, products, locale)}
                    </p>
                    <StatusPill status={benefitEffectiveStatus(benefit)} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {humanize(benefit.source_type, locale)}
                    {benefit.ends_at ? ` · ${t("untilDate", { date: formatDate(benefit.ends_at, locale) })}` : ` · ${t("noExpiry")}`}
                  </p>
                  <CompanyBenefitDetails benefits={[benefit]} />
                </div>
                {benefitCanBeRevoked ? (
                  <button
                    type="button"
                    className="min-h-11 rounded-lg border border-rose-200 px-3 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                    disabled={saving}
                    onClick={() => onRevoke(benefit.reference, benefitLabel(benefit, company, products, locale), 1)}
                  >
                    {t("accessRemove")}</button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <CompactEmptyState icon={Gift}>{t("noAdjustments")}</CompactEmptyState>
      )}
    </WorkspaceSection>
  );
}
