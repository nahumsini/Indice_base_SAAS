import { customerAccountError } from "../Customers/customerAccountErrors";
import { catalogCapabilityLabel, catalogProductLabel } from "../CatalogWorkspace/catalogLabels";
import { useCustomerAccountCopy } from "../Customers/useCustomerAccountCopy";
import { Box, LoaderCircle, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  PlatformBenefit,
  PlatformCatalogProduct,
  PlatformCompanyDetail,
  PlatformCompanyProductPreview,
} from "../../api/platformAdmin";
import { CompactEmptyState, StatusPill, WorkspaceSection } from "./CompanyAccountPrimitives";

type DisplayProduct = {
  code: string;
  name: string;
  type: string;
  commercialKind?: string;
  monthlyPriceCents?: number | null;
  capabilities: string[];
  catalogVersion?: string | null;
  source?: string;
  currentCatalog: boolean;
};

type PendingChange = {
  productCodes: string[];
  preview: PlatformCompanyProductPreview;
  description: string;
};

export function CompanyModulesTab({
  company,
  products,
  activeProducts,
  activeProductBenefits,
  saving,
  canManageProducts,
  canRevokeBenefits,
  onGrant,
  onPreviewProducts,
  onUpdateTrialProducts,
  onRevoke,
}: {
  company: PlatformCompanyDetail;
  products: PlatformCatalogProduct[];
  activeProducts: Set<string>;
  activeProductBenefits: Map<string, PlatformBenefit[]>;
  saving: boolean;
  canManageProducts: boolean;
  canRevokeBenefits: boolean;
  onGrant: (productCode: string) => Promise<void>;
  onPreviewProducts: (productCodes: string[]) => Promise<PlatformCompanyProductPreview>;
  onUpdateTrialProducts: (productCodes: string[], expectedCatalogVersion: string) => Promise<boolean>;
  onRevoke: (reference: string, label?: string, grantCount?: number) => void;
}) {
  const { t, locale, number } = useCustomerAccountCopy();
  const [previewingCode, setPreviewingCode] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const stripeTrial = company.billing_status?.toUpperCase() === "TRIALING" && Boolean(company.stripe_subscription_id);
  const stripeManaged = Boolean(
    company.stripe_subscription_id
    && !company.stripe_subscription_id.startsWith("internal_")
    && !company.stripe_subscription_id.startsWith("legacy_"),
  );
  const versionedOffer = products.some((product) => product.commercial_model);
  const commercialSyncing = company.commercial_change?.status === "PENDING_STRIPE";

  const subscriptionProductCodes = useMemo(
    () => new Set(
      company.products
        .filter((product) => product.source.split(",").some((source) => source.trim().startsWith("SUBSCRIPTION_")))
        .map((product) => product.code),
    ),
    [company.products],
  );
  const targetProductCodes = useMemo(
    () => ["PENDING_STRIPE", "SCHEDULED"].includes(company.commercial_change?.status || "")
      ? new Set(company.commercial_change.product_codes)
      : subscriptionProductCodes,
    [company.commercial_change, subscriptionProductCodes],
  );

  const contractedProducts = useMemo<DisplayProduct[]>(
    () => company.products
      .filter((product) => product.commercial_kind !== "SEAT")
      .map((product) => ({
        code: product.code,
        name: catalogProductLabel({ product_code: product.code, display_name: product.name }, locale),
        type: product.type,
        commercialKind: product.commercial_kind,
        monthlyPriceCents: product.monthly_price_cents,
        capabilities: (product.capabilities || []).map((code) => catalogCapabilityLabel(code, locale)),
        catalogVersion: product.catalog_version,
        source: product.source,
        currentCatalog: product.catalog_version_id === company.active_catalog_version_id,
      })),
    [company.active_catalog_version_id, company.products, locale],
  );

  const availableCatalogProducts = useMemo<DisplayProduct[]>(
    () => products
      .filter((product) => !activeProducts.has(product.product_code))
      .map((product) => ({
        code: product.product_code,
        name: catalogProductLabel(product, locale),
        type: product.product_type,
        commercialKind: product.commercial_kind,
        monthlyPriceCents: product.monthly_price_cents,
        capabilities: product.capabilities.map((code) => catalogCapabilityLabel(code, locale)),
        catalogVersion: product.version_code,
        currentCatalog: true,
      })),
    [activeProducts, products, locale],
  );

  const requestPreview = async (productCodes: string[], description: string, code: string) => {
    if (!canManageProducts) return;
    setPreviewError("");
    setPreviewingCode(code);
    try {
      const preview = await onPreviewProducts(productCodes);
      setPendingChange({ productCodes, preview, description });
    } catch (error) {
      setPreviewError(customerAccountError(error, locale, "previewFailed"));
    } finally {
      setPreviewingCode(null);
    }
  };

  const applyPendingChange = async () => {
    if (!pendingChange || !canManageProducts) return;
    const applied = await onUpdateTrialProducts(
      pendingChange.productCodes,
      pendingChange.preview.catalog_version,
    );
    if (applied) setPendingChange(null);
  };

  const renderProduct = (product: DisplayProduct, active: boolean) => {
    const benefits = activeProductBenefits.get(product.code) || [];
    const removableBenefit = benefits.find((benefit) => benefit.source_type.toUpperCase() !== "SUBSCRIPTION");
    const subscriptionProduct = subscriptionProductCodes.has(product.code);
    const targetProduct = targetProductCodes.has(product.code);
    const canRemoveFromStripe = subscriptionProduct && targetProduct && targetProductCodes.size > 1;
    const busy = saving || previewingCode !== null || commercialSyncing;
    const price = product.monthlyPriceCents == null
      ? null
      : new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(product.monthlyPriceCents / 100);

    return (
      <article
        key={`${product.catalogVersion || "catalog"}:${product.code}:${product.source || "available"}`}
        className="flex min-w-0 items-center gap-3 border-t border-slate-100 px-4 py-3 lg:[&:nth-child(odd)]:border-r"
      >
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-600"}`}>
          <Box className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-medium text-slate-900">{product.name}</h4>
            {active ? <StatusPill status="active" /> : (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">{t("available")}</span>
            )}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              {product.commercialKind === "PACKAGE" ? t("package") : versionedOffer ? t("individualModule") : product.type.toUpperCase() === "BASIC" ? t("basePackage") : t("addon")}
            </span>
            {active && !product.currentCatalog ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">{t("historicalContract")}</span>
            ) : null}
            {active && removableBenefit && !subscriptionProduct ? (
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">{t("courtesyAccess")}</span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-xs text-slate-500">
            {product.capabilities.length ? product.capabilities.join(" · ") : product.code}
          </p>
          {price ? (
            <p className="mt-0.5 text-xs font-medium text-emerald-700">
              {price} {t("perMonth")}{product.catalogVersion ? ` · ${product.catalogVersion}` : ""}
            </p>
          ) : null}
        </div>
        {canManageProducts && stripeManaged && subscriptionProduct && !targetProduct ? (
          <button
            type="button"
            className="h-9 shrink-0 rounded-lg border border-blue-200 bg-white px-3 text-xs font-medium text-blue-700 transition hover:bg-blue-50 disabled:opacity-60"
            disabled={busy}
            title={t("keepProductHint")}
            onClick={() => void requestPreview(
              [...targetProductCodes, product.code],
              t("keepProduct", { name: product.name }),
              product.code,
            )}
          >
            {previewingCode === product.code ? <LoaderCircle className="mx-auto h-4 w-4 animate-spin" /> : t("keep")}
          </button>
        ) : canManageProducts && stripeManaged && subscriptionProduct ? (
          <button
            type="button"
            className="h-9 shrink-0 rounded-lg border border-rose-200 px-3 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy || !canRemoveFromStripe}
            title={canRemoveFromStripe ? t("removePreviewHint") : t("retainSubscriptionProduct")}
            onClick={() => void requestPreview(
              Array.from(targetProductCodes).filter((code) => code !== product.code),
              t("removeProduct", { name: product.name }),
              product.code,
            )}
          >
            {previewingCode === product.code ? <LoaderCircle className="mx-auto h-4 w-4 animate-spin" /> : t("remove")}
          </button>
        ) : active && removableBenefit && canRevokeBenefits ? (
          <button
            type="button"
            className="h-9 shrink-0 rounded-lg border border-rose-200 px-3 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={() => onRevoke(removableBenefit.reference, product.name, benefits.length)}
          >
            {t("removeAccess")}</button>
        ) : active ? null : canManageProducts && stripeManaged && targetProduct ? (
          <button
            type="button"
            className="h-9 shrink-0 rounded-lg border border-rose-200 bg-white px-3 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
            disabled={busy || targetProductCodes.size <= 1}
            title={targetProductCodes.size > 1 ? t("removeScheduledHint") : t("retainSelectionProduct")}
            onClick={() => void requestPreview(
              Array.from(targetProductCodes).filter((code) => code !== product.code),
              t("removeScheduledProduct", { name: product.name }),
              product.code,
            )}
          >
            {previewingCode === product.code ? <LoaderCircle className="mx-auto h-4 w-4 animate-spin" /> : t("removeFromChange")}
          </button>
        ) : canManageProducts && stripeManaged ? (
          <button
            type="button"
            className="h-9 shrink-0 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            title={t("addPreviewHint")}
            onClick={() => void requestPreview(
              [...targetProductCodes, product.code],
              t("addProduct", { name: product.name }),
              product.code,
            )}
          >
            {previewingCode === product.code ? <LoaderCircle className="mx-auto h-4 w-4 animate-spin" /> : t("add")}
          </button>
        ) : canManageProducts ? (
          <button
            type="button"
            className="h-9 shrink-0 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={() => void onGrant(product.code)}
          >
            {t("addAccess")}</button>
        ) : null}
      </article>
    );
  };

  return (
    <WorkspaceSection
      title={t("planModules")}
      description={t("planModulesHelp")}
      icon={Box}
      action={<span className="text-xs font-medium text-slate-500">{t("modulesSummary", { count: activeProducts.size })}</span>}
    >
      {company.catalog_version_historical ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("historicalMigration", { current: company.catalog_version || t("historical"), next: company.active_catalog_version || t("activeVersion") })}
        </div>
      ) : null}

      {company.commercial_change ? (
        <div className="border-b border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">
              {company.commercial_change.status === "PENDING_STRIPE"
                ? t("stripeChangePending")
                : company.commercial_change.status === "SCHEDULED"
                  ? t("contractChangeScheduled")
                  : t("contractDraft")}
            </p>
            {canManageProducts && company.commercial_change.status === "PENDING_STRIPE" ? (
              <button
                type="button"
                className="h-8 rounded-lg border border-blue-300 bg-white px-3 text-xs font-medium text-blue-800 disabled:opacity-60"
                disabled={saving || previewingCode !== null}
                onClick={() => void requestPreview(
                  company.commercial_change!.product_codes,
                  t("retrySync"),
                  "commercial-retry",
                )}
              >
                {previewingCode === "commercial-retry" ? t("reviewing") : t("retry")}
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-5 text-blue-800">
            {company.commercial_change.product_names.join(" · ") || t("noProducts")}
            {company.commercial_change.effective_at
              ? ` · ${t("appliesAfterPayment", { date: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(company.commercial_change.effective_at)) })}`
              : ` · ${t("noAccessUntilStripe")}`}
          </p>
        </div>
      ) : null}

      {previewError ? (
        <div role="alert" className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{previewError}</div>
      ) : null}

      {pendingChange ? (
        <div className="border-b border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-950">
          <p className="font-medium">{t("confirmCommercialChange")}</p>
          <p className="mt-1 text-blue-800">{pendingChange.description}. {t("noImmediateCharge")}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-blue-100">
              <p className="text-xs text-slate-500">{t("newVersion")}</p>
              <p className="mt-0.5 font-medium text-slate-900">{pendingChange.preview.catalog_version}</p>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-blue-100">
              <p className="text-xs text-slate-500">{t("newTotal")}</p>
              <p className="mt-0.5 font-medium text-slate-900">
                {pendingChange.preview.estimated_amount_cents == null
                  ? t("priceUnavailable")
                  : `${new Intl.NumberFormat(locale, { style: "currency", currency: pendingChange.preview.currency || "USD" }).format(pendingChange.preview.estimated_amount_cents / 100)} ${pendingChange.preview.billing_interval === "YEAR" ? t("annual") : t("monthly")}`}
              </p>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-blue-100">
              <p className="text-xs text-slate-500">{t("application")}</p>
              <p className="mt-0.5 font-medium text-slate-900">{pendingChange.preview.change_timing === "TRIAL_END" ? t("afterTrial") : t("billingDate")}</p>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" className="h-9 rounded-lg border border-blue-200 bg-white px-3 font-medium text-blue-800" disabled={saving} onClick={() => setPendingChange(null)}>{t("cancel")}</button>
            <button type="button" className="h-9 rounded-lg bg-blue-700 px-4 font-medium text-white disabled:opacity-60" disabled={!canManageProducts || saving || pendingChange.preview.estimated_amount_cents == null} onClick={() => void applyPendingChange()}>
              {saving ? t("applying") : t("confirmChange")}
            </button>
          </div>
        </div>
      ) : null}

      <div className="border-b border-slate-100">
        <div className="flex items-center justify-between bg-slate-50/80 px-4 py-2.5">
          <div>
            <h4 className="text-xs font-medium uppercase tracking-[0.12em] text-slate-600">{t("currentContractAccess")}</h4>
            <p className="mt-0.5 text-xs text-slate-500">{t("originalPriceHelp")}</p>
          </div>
          <span className="text-xs font-medium text-slate-500">{number(contractedProducts.length)}</span>
        </div>
        {contractedProducts.length ? (
          <div className="grid lg:grid-cols-2">{contractedProducts.map((product) => renderProduct(product, true))}</div>
        ) : (
          <CompactEmptyState icon={Box}>{t("noActiveProducts")}</CompactEmptyState>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 bg-blue-50/50 px-4 py-2.5">
          <div>
            <h4 className="text-xs font-medium uppercase tracking-[0.12em] text-blue-800">{t("availableOffer")}</h4>
            <p className="mt-0.5 text-xs text-blue-700/80">{t("publishedProductsHelp")}</p>
          </div>
          <span className="text-xs font-medium text-blue-700">{number(availableCatalogProducts.length)}</span>
        </div>
        {availableCatalogProducts.length ? (
          <div className="grid lg:grid-cols-2">{availableCatalogProducts.map((product) => renderProduct(product, false))}</div>
        ) : (
          <CompactEmptyState icon={Box}>{t("allOfferIncluded")}</CompactEmptyState>
        )}
      </div>

      <div className="flex items-start gap-2 bg-blue-50/70 px-4 py-2.5 text-xs text-blue-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          {stripeTrial
            ? t("stripeTrialChanges")
            : stripeManaged
              ? t("stripeRenewalChanges")
              : t("courtesyIndependent")}
        </p>
      </div>
    </WorkspaceSection>
  );
}
