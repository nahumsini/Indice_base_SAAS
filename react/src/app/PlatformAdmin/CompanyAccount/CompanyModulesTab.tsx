import { Box, ShieldCheck } from "lucide-react";
import type { PlatformBenefit, PlatformCatalogProduct, PlatformCompanyDetail } from "../../api/platformAdmin";
import { CompactEmptyState, StatusPill, WorkspaceSection } from "./CompanyAccountPrimitives";
import { displayProductName } from "./companyAccountUtils";

export function CompanyModulesTab({
  company,
  products,
  activeProducts,
  activeProductBenefits,
  saving,
  onGrant,
  onUpdateTrialProducts,
  onRevoke,
}: {
  company: PlatformCompanyDetail;
  products: PlatformCatalogProduct[];
  activeProducts: Set<string>;
  activeProductBenefits: Map<string, PlatformBenefit[]>;
  saving: boolean;
  onGrant: (productCode: string) => Promise<void>;
  onUpdateTrialProducts: (productCodes: string[]) => Promise<void>;
  onRevoke: (reference: string, label?: string, grantCount?: number) => void;
}) {
  const stripeTrial = company.billing_status?.toUpperCase() === "TRIALING" && Boolean(company.stripe_subscription_id);
  const stripeManaged = Boolean(company.stripe_subscription_id);
  const selectedBasicCount = products.filter(
    (product) => product.product_type.toUpperCase() === "BASIC" && activeProducts.has(product.product_code),
  ).length;
  const activeCatalogProducts = products.filter((product) => activeProducts.has(product.product_code));
  const availableCatalogProducts = products.filter((product) => !activeProducts.has(product.product_code));
  const trialSelection = Array.from(activeProducts);

  const renderProduct = (product: PlatformCatalogProduct, active: boolean) => {
    const benefits = activeProductBenefits.get(product.product_code) || [];
    const removableBenefit = benefits.find((benefit) => benefit.source_type.toUpperCase() !== "SUBSCRIPTION");
    const isBasic = product.product_type.toUpperCase() === "BASIC";
    const canRemoveFromStripe = active && (!isBasic || selectedBasicCount > 1);

    return (
      <article
        key={product.product_code}
        className="flex min-w-0 items-center gap-3 border-t border-slate-100 px-4 py-3 lg:[&:nth-child(odd)]:border-r"
      >
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-600"}`}>
          <Box className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-medium text-slate-900">{displayProductName(product)}</h4>
            {active ? (
              <StatusPill status="active" />
            ) : (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                Disponible
              </span>
            )}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              {isBasic ? "Paquete base" : "Complemento"}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-slate-500">
            {product.capabilities?.length ? product.capabilities.join(" · ") : product.product_code}
          </p>
        </div>
        {stripeManaged && active ? (
          <button
            type="button"
            className="h-9 shrink-0 rounded-lg border border-rose-200 px-3 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={saving || !canRemoveFromStripe}
            title={canRemoveFromStripe
              ? (stripeTrial ? "Actualizar el cobro que iniciará al terminar la prueba" : "Actualizar la suscripción con prorrateo")
              : "El paquete debe conservar al menos un módulo básico"}
            onClick={() => void onUpdateTrialProducts(trialSelection.filter((code) => code !== product.product_code))}
          >
            Quitar
          </button>
        ) : stripeManaged && !active ? (
          <button
            type="button"
            className="h-9 shrink-0 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving}
            onClick={() => void onUpdateTrialProducts([...trialSelection, product.product_code])}
          >
            Agregar
          </button>
        ) : active && removableBenefit ? (
          <button
            type="button"
            className="h-9 shrink-0 rounded-lg border border-rose-200 px-3 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving}
            onClick={() => onRevoke(removableBenefit.reference, displayProductName(product), benefits.length)}
          >
            Quitar
          </button>
        ) : active ? null : (
          <button
            type="button"
            className="h-9 shrink-0 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving}
            onClick={() => void onGrant(product.product_code)}
          >
            Agregar
          </button>
        )}
      </article>
    );
  };

  return (
    <WorkspaceSection
      title="Plan y módulos"
      description="Configura el paquete base y sus complementos; Stripe aplica el cambio según el estado de la cuenta."
      icon={Box}
      action={<span className="text-xs font-medium text-slate-500">{activeProducts.size} activos</span>}
    >
      {products.length ? (
        <div className="border-b border-slate-100">
          <div className="flex items-center justify-between bg-slate-50/80 px-4 py-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Módulos activos</h4>
            <span className="text-xs font-medium text-slate-500">{activeCatalogProducts.length}</span>
          </div>
          {activeCatalogProducts.length ? (
            <div className="grid lg:grid-cols-2">
              {activeCatalogProducts.map((product) => renderProduct(product, true))}
            </div>
          ) : (
            <CompactEmptyState icon={Box}>La cuenta todavía no tiene módulos activos.</CompactEmptyState>
          )}

          <div className="flex items-center justify-between border-t border-slate-100 bg-blue-50/50 px-4 py-2.5">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-800">Disponibles para agregar</h4>
              <p className="mt-0.5 text-xs text-blue-700/80">Sólo aparecen módulos publicados y listos comercialmente.</p>
            </div>
            <span className="text-xs font-medium text-blue-700">{availableCatalogProducts.length}</span>
          </div>
          {availableCatalogProducts.length ? (
            <div className="grid lg:grid-cols-2">
              {availableCatalogProducts.map((product) => renderProduct(product, false))}
            </div>
          ) : (
            <CompactEmptyState icon={Box}>Esta cuenta ya tiene todos los módulos disponibles del catálogo.</CompactEmptyState>
          )}
        </div>
      ) : (
        <CompactEmptyState icon={Box}>No hay módulos comerciales publicados.</CompactEmptyState>
      )}
      <div className="flex items-start gap-2 bg-blue-50/70 px-4 py-2.5 text-xs text-blue-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          {stripeTrial
            ? "Stripe no cobra durante la prueba. Al vencer, cobrará el plan correspondiente a los módulos vigentes y comenzará la renovación automática."
            : stripeManaged
              ? "Los cambios se sincronizan con Stripe. En una suscripción activa se factura o acredita el prorrateo; durante la prueba se aplican al cobro futuro."
              : "Este acceso es demo o cortesía administrativa: puedes editar sus módulos, pero no habrá cargo automático hasta registrar un método de pago en Stripe."}
        </p>
      </div>
    </WorkspaceSection>
  );
}
