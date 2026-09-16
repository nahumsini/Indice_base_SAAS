import { customerAccountError } from "../Customers/customerAccountErrors";
import { catalogCapabilityLabel, catalogProductLabel } from "../CatalogWorkspace/catalogLabels";
import { useCustomerAccountCopy } from "../Customers/useCustomerAccountCopy";
import { Box, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  PlatformBenefit,
  PlatformCatalogProduct,
  PlatformCompanyDetail,
  PlatformCompanyProductPreview,
} from "../../api/platformAdmin";
import { CompactEmptyState, StatusPill, WorkspaceSection } from "./CompanyAccountPrimitives";
import { CompanyBenefitDetails } from "./CompanyBenefitDetails";
import { benefitLabel } from "./companyBenefitPresentation";
import { benefitEffectiveStatus } from "./companyAccountState";
import { formatDate, formatMoney, humanize } from "./companyAccountUtils";

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

export type PendingModuleChange = {
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
  pendingChange: controlledChange,
  onPendingChange,
  onBusyChange,
}: {
  pendingChange?: PendingModuleChange | null;
  onPendingChange?: (change: PendingModuleChange | null) => void;
  onBusyChange?: (busy: boolean) => void;
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
  const [localChange, setLocalChange] = useState<PendingModuleChange | null>(null);
  const pendingChange = controlledChange === undefined ? localChange : controlledChange;
  const setPendingChange = onPendingChange ?? setLocalChange;
  const requestRunning = useRef(false);
  useEffect(() => { onBusyChange?.(previewingCode !== null); }, [previewingCode, onBusyChange]);
  const stripeTrial = company.billing_status?.toUpperCase() === "TRIALING" && Boolean(company.stripe_subscription_id);
  const stripeManaged = Boolean(
    company.stripe_subscription_id
    && !company.stripe_subscription_id.startsWith("internal_")
    && !company.stripe_subscription_id.startsWith("legacy_"),
  );
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

  const contractedProducts = useMemo<DisplayProduct[]>(() => {
    const rows = new Map<string, DisplayProduct>();
    for (const product of company.products.filter(product => product.commercial_kind !== "SEAT")) {
      const previous = rows.get(product.code);
      rows.set(product.code, {
        code: product.code,
        name: catalogProductLabel({ product_code: product.code, display_name: product.name }, locale),
        type: product.type, commercialKind: product.commercial_kind,
        monthlyPriceCents: product.monthly_price_cents,
        capabilities: [...new Set([...(previous?.capabilities ?? []), ...(product.capabilities || []).map(code => catalogCapabilityLabel(code, locale))])],
        catalogVersion: product.catalog_version,
        source: [previous?.source, product.source].filter(Boolean).join(","),
        currentCatalog: product.catalog_version_id === company.active_catalog_version_id,
      });
    }
    for (const benefit of company.benefits) {
      if (benefit.benefit_type !== "PRODUCT" || !benefit.product_code || rows.has(benefit.product_code)) continue;
      if (!["ACTIVE", "SCHEDULED"].includes(benefitEffectiveStatus(benefit))) continue;
      const product = products.find(item => item.product_code === benefit.product_code);
      rows.set(benefit.product_code, {
        code: benefit.product_code, name: benefitLabel(benefit, company, products, locale),
        type: product?.product_type ?? "BASIC", commercialKind: product?.commercial_kind,
        capabilities: (product?.capabilities ?? []).map(code => catalogCapabilityLabel(code, locale)),
        currentCatalog: true,
      });
    }
    return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [company, products, locale]);

  const availableCatalogProducts = useMemo<DisplayProduct[]>(
    () => products
      .filter((product) => !contractedProducts.some(current => current.code === product.product_code))
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
    [contractedProducts, products, locale],
  );

  const requestPreview = async (productCodes: string[], description: string, code: string) => {
    if (!canManageProducts || saving || requestRunning.current) return;
    requestRunning.current = true;
    onBusyChange?.(true);
    setPreviewError("");
    setPreviewingCode(code);
    try {
      const preview = await onPreviewProducts(productCodes);
      setPendingChange({ productCodes, preview, description });
    } catch (error) {
      setPreviewError(customerAccountError(error, locale, "previewFailed"));
    } finally {
      requestRunning.current = false;
      setPreviewingCode(null);
      onBusyChange?.(false);
    }
  };

  const applyPendingChange = async () => {
    if (!pendingChange || !canManageProducts || saving || requestRunning.current) return;
    requestRunning.current = true;
    onBusyChange?.(true);
    try {
      const applied = await onUpdateTrialProducts(
        pendingChange.productCodes,
        pendingChange.preview.catalog_version,
      );
      if (applied) setPendingChange(null);
    } catch (error) { setPreviewError(customerAccountError(error, locale, "previewFailed")); }
    finally { requestRunning.current = false; onBusyChange?.(false); }
  };

  const renderProduct = (product: DisplayProduct, active: boolean) => {
    const benefits = activeProductBenefits.get(product.code) || [];
    const records = company.benefits.filter(benefit => benefit.benefit_type === "PRODUCT" && benefit.product_code === product.code);
    const revocable = records.filter(benefit => benefit.status.toUpperCase() === "ACTIVE" && benefit.source_type.toUpperCase() !== "SUBSCRIPTION");
    const removableBenefit = revocable[0];
    const scheduledBenefit = records.find(benefit => benefitEffectiveStatus(benefit) === "SCHEDULED");
    const sourceLabel = subscriptionProductCodes.has(product.code) ? t("subscription") : benefits.length ? humanize(benefits[0].source_type, locale) : scheduledBenefit ? humanize(scheduledBenefit.source_type, locale) : null;
    const end = benefits.some(benefit => !benefit.ends_at) ? null : benefits.map(benefit => benefit.ends_at!).sort((a, b) => Date.parse(b) - Date.parse(a))[0];
    const subscriptionProduct = subscriptionProductCodes.has(product.code);
    const targetProduct = targetProductCodes.has(product.code);
    const canRemoveFromStripe = subscriptionProduct && targetProduct && targetProductCodes.size > 1;
    const busy = saving || previewingCode !== null || commercialSyncing || Boolean(pendingChange);
    const price = product.monthlyPriceCents == null
      ? null
      : new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(product.monthlyPriceCents / 100);

    return (
      <article
        key={`${product.catalogVersion || "catalog"}:${product.code}:${product.source || "available"}`}
        className="flex min-w-0 flex-wrap items-start gap-3 border-t border-slate-100 px-4 py-4 dark:border-slate-800"
      >
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-600"}`}>
          <Box className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-[180px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="break-words text-sm font-medium text-slate-900 dark:text-slate-100">{product.name}</h4>
            {active ? <StatusPill status="active" /> : records.some(record => benefitEffectiveStatus(record) === "SCHEDULED") ? <StatusPill status="scheduled" /> : (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">{t("available")}</span>
            )}
            {active && !product.currentCatalog ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">{t("historicalContract")}</span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {product.capabilities.length ? product.capabilities.filter(name => name !== product.name).join(" · ") : ""}
          </p>
          {sourceLabel ? <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {sourceLabel}{benefits.length && !subscriptionProduct ? ` · ${end ? t("untilDate", { date: formatDate(end, locale) }) : t("accessPermanent")}` : ""}
          </p> : null}
          {!active && scheduledBenefit ? <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{formatDate(scheduledBenefit.starts_at, locale)} — {scheduledBenefit.ends_at ? formatDate(scheduledBenefit.ends_at, locale) : t("accessPermanent")}</p> : null}
          <CompanyBenefitDetails benefits={records} />
          {company.products.some(item => item.code === product.code && item.source.split(",").some(source => source.trim().startsWith("SUBSCRIPTION_"))) ? <details className="text-xs text-slate-500">
            <summary className="flex min-h-11 cursor-pointer items-center">{t("currentContractAccess")}</summary>
            {company.products.filter(item => item.code === product.code).map(item => <p key={`${item.catalog_product_id}:${item.source}`}>{item.name} · {item.catalog_version} · {formatMoney(item.monthly_price_cents, "USD", locale)} {t("perMonth")}</p>)}
          </details> : null}
          {price && !active ? (
            <p className="mt-0.5 text-xs font-medium text-emerald-700">
              {price} {t("perMonth")}{product.catalogVersion ? ` · ${product.catalogVersion}` : ""}
            </p>
          ) : null}
        </div>
        {canManageProducts && stripeManaged && subscriptionProduct && !targetProduct ? (
          <button
            type="button"
            className="min-h-11 shrink-0 rounded-lg border border-blue-200 bg-white px-3 text-xs font-medium text-blue-700 transition hover:bg-blue-50 disabled:opacity-60"
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
            className="min-h-11 shrink-0 rounded-lg border border-rose-200 px-3 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy || !canRemoveFromStripe}
            title={canRemoveFromStripe ? t("removePreviewHint") : t("retainSubscriptionProduct")}
            onClick={() => void requestPreview(
              Array.from(targetProductCodes).filter((code) => code !== product.code),
              t("removeProduct", { name: product.name }),
              product.code,
            )}
          >
            {previewingCode === product.code ? <LoaderCircle className="mx-auto h-4 w-4 animate-spin" /> : t("accessContractRemove")}
          </button>
        ) : removableBenefit && canRevokeBenefits ? (
          <button
            type="button"
            className="min-h-11 shrink-0 rounded-lg border border-rose-200 px-3 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={() => onRevoke(removableBenefit.reference, product.name, revocable.length)}
          >
            {t("accessRemove")}</button>
        ) : active ? null : canManageProducts && stripeManaged && targetProduct ? (
          <button
            type="button"
            className="min-h-11 shrink-0 rounded-lg border border-rose-200 bg-white px-3 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
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
            className="min-h-11 shrink-0 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            title={t("addPreviewHint")}
            onClick={() => void requestPreview(
              [...targetProductCodes, product.code],
              t("addProduct", { name: product.name }),
              product.code,
            )}
          >
            {previewingCode === product.code ? <LoaderCircle className="mx-auto h-4 w-4 animate-spin" /> : t("accessContractAdd")}
          </button>
        ) : canManageProducts ? (
          <button
            type="button"
            className="min-h-11 shrink-0 rounded-lg bg-[#177D66] px-3 text-xs font-medium text-white transition hover:bg-[#126553] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={() => void onGrant(product.code)}
          >
            {t("accessGrant")}</button>
        ) : null}
        {stripeManaged && subscriptionProduct && canManageProducts ? <button type="button" disabled={busy}
          className={`min-h-11 rounded-lg border px-3 text-xs font-medium disabled:opacity-60 ${removableBenefit ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "border-slate-200 text-[#177D66] hover:bg-emerald-50"}`}
          onClick={() => removableBenefit ? onRevoke(removableBenefit.reference, product.name, revocable.length) : void onGrant(product.code)}>
          {t(removableBenefit ? "accessRemove" : "accessGrant")}
        </button> : null}
      </article>
    );
  };

  return (
    <WorkspaceSection
      title={t("modules")}
      description={t("accessModulesHelp")}
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
                className="min-h-11 rounded-lg border border-blue-300 bg-white px-3 text-xs font-medium text-blue-800 disabled:opacity-60"
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
            <button type="button" className="min-h-11 rounded-lg border border-blue-200 bg-white px-3 font-medium text-blue-800" disabled={saving} onClick={() => setPendingChange(null)}>{t("cancel")}</button>
            <button type="button" className="min-h-11 rounded-lg bg-blue-700 px-4 font-medium text-white disabled:opacity-60" disabled={!canManageProducts || saving || pendingChange.preview.estimated_amount_cents == null} onClick={() => void applyPendingChange()}>
              {saving ? t("applying") : t("confirmChange")}
            </button>
          </div>
        </div>
      ) : null}

      <div className="border-b border-slate-100">
        <div className="flex items-center justify-between bg-slate-50/80 px-4 py-2.5">
          <div>
            <h4 className="text-xs font-medium text-slate-600">{t("workspaceEffectiveAccess")}</h4>
          </div>
          <span className="text-xs font-medium text-slate-500">{number(contractedProducts.length)}</span>
        </div>
        {contractedProducts.length ? (
          <div>{contractedProducts.map((product) => renderProduct(product, activeProducts.has(product.code)))}</div>
        ) : (
          <CompactEmptyState icon={Box}>{t("noActiveProducts")}</CompactEmptyState>
        )}

        {availableCatalogProducts.length ? <details className="border-t border-slate-100" open={!contractedProducts.length || undefined}>
          <summary className="flex min-h-11 cursor-pointer items-center bg-slate-50 px-4 py-3 text-sm font-medium text-[#177D66]">{t("accessAvailableModules", { count: availableCatalogProducts.length })}</summary>
          <div>{availableCatalogProducts.map(product => renderProduct(product, false))}</div>
        </details> : null}
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
