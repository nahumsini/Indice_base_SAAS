import { catalogProductLabel, catalogCapabilityLabel } from "./catalogLabels";
import { useLanguage } from "../../shared/context";
import { catalogLocale, getCatalogCopy } from "./translations";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Boxes, Calculator, Gift, LoaderCircle, PackageCheck, ReceiptText, Save, ShieldCheck } from "lucide-react";
import {
  platformAdminApi,
  type PlatformCatalog,
  type PlatformCatalogProduct,
  type PlatformCatalogPromotion,
  type PlatformModule,
} from "../../api/platformAdmin";
import type { CommercialOfferEditorSection, CommercialOfferSelectionTarget } from "./CommercialOfferWorkspace";
import { defaultAnnualDiscountPercent } from "./commercialOfferPresentation";

const dollars = (cents?: number | null) => (cents == null ? "" : (cents / 100).toFixed(2));
const cents = (value: string) => {
  if (value.trim() === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 1_000_000
    ? Math.round(amount * 100)
    : null;
};
const currency = (value: number, languageCode: string) => new Intl.NumberFormat(languageCode, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
}).format(Number.isFinite(value) ? value : 0);

export function CommercialOfferDetail({
  catalog,
  editable,
  focusSection,
  modules,
  product,
  promotion,
  mode,
  workingVersionId,
  stripeMode,
  liveSyncEnabled,
  onBusyChange,
  onClose,
  onSaved,
  onSelect,
  english,
}: {
  catalog: PlatformCatalog | null;
  editable: boolean;
  focusSection?: CommercialOfferEditorSection;
  modules: PlatformModule[];
  product: PlatformCatalogProduct | null;
  promotion: PlatformCatalogPromotion | null;
  mode: CommercialOfferSelectionTarget["type"] | "empty";
  workingVersionId: number | null;
  stripeMode: "TEST" | "LIVE";
  liveSyncEnabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onClose: () => void;
  onSaved: (catalog: PlatformCatalog) => void;
  onSelect: (target: CommercialOfferSelectionTarget) => void;
  english: boolean;
}) {
  const { currentLanguage } = useLanguage();
  const languageCode = catalogLocale(currentLanguage.code);
  const copy = {
    nameRequired: getCatalogCopy(languageCode).enterACommercialName,
    packageMinimum: getCatalogCopy(languageCode).aPackageMustIncludeAtLeastTwoModules,
    saved: getCatalogCopy(languageCode).offerSavedInTheDraft,
    saveError: getCatalogCopy(languageCode).theOfferCouldNotBeSaved,
    pricesSavedRefreshFailed: getCatalogCopy(languageCode).pricesWereSavedInTheDraftButThe,
    pricesConnectedRefreshFailed: getCatalogCopy(languageCode).pricesWereConnectedToStripeButTheCatalog,
    promotionRequired: getCatalogCopy(languageCode).completeTheNameCodeAndDiscount,
    promotionSaved: getCatalogCopy(languageCode).promotionSavedInTheDraft,
    promotionError: getCatalogCopy(languageCode).thePromotionCouldNotBeSaved,
    select: getCatalogCopy(languageCode).selectAnOfferItem,
    promotion: getCatalogCopy(languageCode).promotion,
    package: getCatalogCopy(languageCode).package,
    quantity: getCatalogCopy(languageCode).quantityProduct,
    module: getCatalogCopy(languageCode).individualModule,
    create: getCatalogCopy(languageCode).createANewOffer,
    locked: getCatalogCopy(languageCode).prepareAChangeVersionToEditWithoutAffecting,
    commercialName: getCatalogCopy(languageCode).commercialName,
    code: getCatalogCopy(languageCode).code,
    description: getCatalogCopy(languageCode).description,
    type: getCatalogCopy(languageCode).type,
    percentage: getCatalogCopy(languageCode).percentage,
    fixed: getCatalogCopy(languageCode).fixedAmountUSD,
    discount: getCatalogCopy(languageCode).discount,
    stripePromotion: getCatalogCopy(languageCode).stripePromotionID,
    monthly: getCatalogCopy(languageCode).monthlyUSD,
    annual: getCatalogCopy(languageCode).annualUSD,
    stripePrice: getCatalogCopy(languageCode).stripePriceID,
    appliesTo: getCatalogCopy(languageCode).appliesTo,
    included: getCatalogCopy(languageCode).includedModules,
    selected: getCatalogCopy(languageCode).selected,
    quantityLabel: getCatalogCopy(languageCode).quantityProduct,
    allPurchase: getCatalogCopy(languageCode).withNoSelectionThePromotionAppliesToThe,
    available: getCatalogCopy(languageCode).availableToCustomers,
    unavailable: getCatalogCopy(languageCode).notPublished,
    save: getCatalogCopy(languageCode).saveChanges,
    saveDetails: getCatalogCopy(languageCode).saveInformation,
    savePricing: getCatalogCopy(languageCode).savePrices,
    connectPricing: getCatalogCopy(languageCode).saveAndConnectToStripeTEST,
    saveAvailability: getCatalogCopy(languageCode).saveAvailability,
    createOffer: getCatalogCopy(languageCode).createOfferItem,
    directConnection: getCatalogCopy(languageCode).connectThisItemSeparately,
    directConnectionHelp: getCatalogCopy(languageCode).youCanConnectThisItemNowOrPublish,
    annualCalculator: getCatalogCopy(languageCode).annualPriceCalculator,
    annualCalculatorHelp: getCatalogCopy(languageCode).startFromTheMonthlyPriceAndDefineThe,
    annualDiscount: getCatalogCopy(languageCode).annualDiscount,
    regularAnnual: getCatalogCopy(languageCode).twelveMonthlyPayments,
    annualSavings: getCatalogCopy(languageCode).customerSavings,
    suggestedAnnual: getCatalogCopy(languageCode).suggestedAnnualPrice,
    applyAnnual: getCatalogCopy(languageCode).applyAnnualPrice,
    calculatorNeedsMonthly: getCatalogCopy(languageCode).enterTheMonthlyPriceToCalculateTheAnnual,
    discountSimulator: getCatalogCopy(languageCode).discountSimulator,
    discountSimulatorHelp: getCatalogCopy(languageCode).testThePromotionAgainstASamplePurchaseWithout,
    samplePurchase: getCatalogCopy(languageCode).samplePurchaseUSD,
    discountApplied: getCatalogCopy(languageCode).discountApplied,
    finalPrice: getCatalogCopy(languageCode).finalCustomerPrice,
    availabilityTitle: getCatalogCopy(languageCode).customerVisibility,
    availabilityHelp: getCatalogCopy(languageCode).whenEnabledThisItemCanBeIncludedIn,
    detailsHelp: getCatalogCopy(languageCode).editOnlyTheCommercialIdentityAndCompositionOf,
    pricingHelp: getCatalogCopy(languageCode).saveThePreTaxPricesInTheDraft,
    priceRequired: getCatalogCopy(languageCode).enterValidMonthlyAndAnnualPrices,
    stripeSynced: getCatalogCopy(languageCode).pricesConnectedToStripeTEST,
    taxTitle: getCatalogCopy(languageCode).doNotAddTaxToThesePrices,
    taxHelp: getCatalogCopy(languageCode).stripeTaxAddsGSTHSTPSTQSTOr,
    taxExclusive: getCatalogCopy(languageCode).taxExclusive,
    stripeTest: getCatalogCopy(languageCode).stripeTEST,
    taxCode: getCatalogCopy(languageCode).saasBusinessUse,
    notConnected: getCatalogCopy(languageCode).notConnectedYet,
    liveConfirmation: getCatalogCopy(languageCode).liveConfirmation,
    liveConfirmationHelp: getCatalogCopy(languageCode).typeTheExactPhraseToAuthorizeCreationOf,
    liveBlocked: getCatalogCopy(languageCode).liveCatalogSynchronizationIsDisabledForThisDeployment,
    livePhrase: getCatalogCopy(languageCode).publicarENSTRIPELIVE,
    replacementHelp: getCatalogCopy(languageCode).changingAnAmountCreatesANewStripePrice
  };
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(false);
  const [included, setIncluded] = useState<string[]>([]);
  const [monthly, setMonthly] = useState("");
  const [yearly, setYearly] = useState("");
  const [monthlyStripe, setMonthlyStripe] = useState("");
  const [yearlyStripe, setYearlyStripe] = useState("");
  const [liveConfirmation, setLiveConfirmation] = useState("");
  const [promotionCode, setPromotionCode] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [discountValue, setDiscountValue] = useState("");
  const [promotionStripe, setPromotionStripe] = useState("");
  const [annualDiscount, setAnnualDiscount] = useState(() => String(defaultAnnualDiscountPercent(product, mode === "new-package")));
  const [simulationBase, setSimulationBase] = useState("1000");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  useEffect(() => {
    onBusyChange(saving);
    return () => onBusyChange(false);
  }, [saving, onBusyChange]);
  const directModules = useMemo(
    () =>
      (catalog?.products ?? []).filter(
        (candidate) =>
          candidate.catalog_version_id === workingVersionId &&
          candidate.commercial_kind === "MODULE",
      ),
    [catalog?.products, workingVersionId],
  );
  const promotionCandidates = useMemo(
    () =>
      (catalog?.products ?? []).filter(
        (candidate) =>
          candidate.catalog_version_id === workingVersionId &&
          candidate.commercial_kind !== "CORE",
      ),
    [catalog?.products, workingVersionId],
  );
  const prices = (catalog?.prices ?? []).filter(
    (price) => price.catalog_version_id === workingVersionId && price.catalog_product_id === product?.id,
  );
  const monthPrice = prices.find((price) => price.billing_interval === "MONTH");
  const yearPrice = prices.find((price) => price.billing_interval === "YEAR");

  useEffect(() => {
    const creatingPackage = mode === "new-package";
    const creatingPromotion = mode === "new-promotion";
    setName(creatingPackage || creatingPromotion ? "" : product?.display_name || promotion?.display_name || "");
    setDescription(creatingPackage || creatingPromotion ? "" : product?.description || promotion?.description || "");
    setActive(creatingPackage || creatingPromotion ? false : product?.active ?? promotion?.active ?? false);
    setIncluded(creatingPackage || creatingPromotion ? [] : product?.included_product_codes || promotion?.product_codes || []);
    setMonthly(creatingPackage ? "" : dollars(monthPrice?.unit_amount_cents));
    setYearly(creatingPackage ? "" : dollars(yearPrice?.unit_amount_cents));
    setMonthlyStripe(creatingPackage ? "" : monthPrice?.external_price_id || "");
    setYearlyStripe(creatingPackage ? "" : yearPrice?.external_price_id || "");
    setPromotionCode(creatingPromotion ? "" : promotion?.promotion_code || "");
    setDiscountType(promotion?.discount_type || "PERCENT");
    setDiscountValue(
      creatingPromotion ? "" : promotion?.discount_type === "FIXED"
        ? dollars(promotion.amount_off_cents)
        : String((promotion?.percent_basis_points || 0) / 100),
    );
    setPromotionStripe(creatingPromotion ? "" : promotion?.external_promotion_code_id || "");
    setAnnualDiscount(String(defaultAnnualDiscountPercent(product, creatingPackage)));
    setSimulationBase("1000");
    setFeedback(null);
  }, [mode, monthPrice?.id, product?.id, product?.commercial_kind, product?.product_type, product?.product_code, promotion?.id, yearPrice?.id]);

  const refresh = async () => {
    const next = await platformAdminApi.getCatalog();
    onSaved(next);
    return next;
  };

  const saveProduct = async () => {
    if (!product && mode !== "new-package") return;
    if (!name.trim()) return setFeedback(copy.nameRequired);
    if ((product?.commercial_kind === "PACKAGE" || mode === "new-package") && included.length < 2) {
      return setFeedback(copy.packageMinimum);
    }
    setSaving(true);
    setFeedback(null);
    try {
      let productId = product?.id;
      if (mode === "new-package") {
        const created = await platformAdminApi.createCatalogProduct({
          display_name: name.trim(), description: description.trim(), sort_order: 500,
          active, capabilities: [], commercial_kind: "PACKAGE", included_product_codes: included,
        });
        productId = created.id;
      } else if (productId) {
        await platformAdminApi.updateCatalogProduct(productId, {
          display_name: name.trim(), description: description.trim(),
          sort_order: product?.sort_order ?? 500, active, capabilities: product?.capabilities ?? [],
          commercial_kind: product?.commercial_kind === "PACKAGE"
            ? "PACKAGE"
            : product?.commercial_kind === "SEAT"
              ? "SEAT"
              : product?.commercial_kind === "VOLUME"
                ? "VOLUME"
                : product?.commercial_kind === "STORAGE" ? "STORAGE" : "MODULE",
          included_product_codes: product?.commercial_kind === "PACKAGE" ? included : undefined,
        });
      }
      const next = await refresh();
      const saved = next.products.find((candidate) => candidate.id === productId) ||
        next.products.find((candidate) => candidate.display_name === name.trim() && candidate.catalog_version_id === workingVersionId);
      if (!saved) throw new Error(getCatalogCopy(languageCode).savedProductMissing);
      onSelect({ type: "product", id: saved.id });
      setFeedback(copy.saved);
      onClose();
    } catch (error) {
      setFeedback(copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const savePrices = async () => {
    if (!product || saving) return;
    const monthlyAmount = cents(monthly);
    const annualAmount = cents(yearly);
    if (monthlyAmount == null || annualAmount == null || monthlyAmount <= 0 || annualAmount <= 0) {
      return setFeedback(copy.priceRequired);
    }
    setSaving(true);
    setFeedback(null);
    let pricesSaved = false;
    try {
      await platformAdminApi.saveCatalogProductPrices(product.id, {
        monthly_amount_cents: monthlyAmount,
        annual_amount_cents: annualAmount,
      });
      pricesSaved = true;
      await refresh();
      setFeedback(copy.saved);
      onClose();
    } catch (error) {
      setFeedback(pricesSaved ? copy.pricesSavedRefreshFailed : copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const synchronizePrices = async () => {
    if (!product || saving) return;
    const monthlyAmount = cents(monthly);
    const annualAmount = cents(yearly);
    if (monthlyAmount == null || annualAmount == null || monthlyAmount <= 0 || annualAmount <= 0) {
      return setFeedback(copy.priceRequired);
    }
    if (stripeMode === "LIVE" && !liveSyncEnabled) return setFeedback(copy.liveBlocked);
    if (stripeMode === "LIVE" && liveConfirmation !== copy.livePhrase) {
      return setFeedback(`${copy.liveConfirmation}: ${copy.livePhrase}`);
    }
    setSaving(true);
    setFeedback(null);
    let pricesConnected = false;
    try {
      const result = await platformAdminApi.synchronizeCatalogProductPrices(product.id, {
        monthly_amount_cents: monthlyAmount,
        annual_amount_cents: annualAmount,
        target_mode: stripeMode,
        ...(stripeMode === "LIVE" ? { confirmation: liveConfirmation } : {}),
      });
      pricesConnected = true;
      setMonthlyStripe(result.monthly.external_price_id);
      setYearlyStripe(result.annual.external_price_id);
      await refresh();
      setFeedback(stripeMode === "LIVE"
        ? (getCatalogCopy(languageCode).pricesVerifiedInStripeLIVE)
        : copy.stripeSynced);
    } catch (error) {
      setFeedback(pricesConnected ? copy.pricesConnectedRefreshFailed : copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const savePromotion = async () => {
    if (!name.trim() || !promotionCode.trim() || !discountValue) return setFeedback(copy.promotionRequired);
    setSaving(true);
    setFeedback(null);
    const payload = {
      promotion_code: promotionCode.trim().toUpperCase(), display_name: name.trim(), description: description.trim(),
      discount_type: discountType, percent_basis_points: discountType === "PERCENT" ? Math.round(Number(discountValue) * 100) : null,
      amount_off_cents: discountType === "FIXED" ? cents(discountValue) : null,
      duration_type: "ONCE" as const, duration_cycles: null, starts_at: null, ends_at: null,
      external_promotion_code_id: promotionStripe.trim() || null, active, sort_order: promotion?.sort_order ?? 0,
      product_codes: included,
    };
    try {
      const saved = promotion
        ? await platformAdminApi.updateCatalogPromotion(promotion.id, payload)
        : await platformAdminApi.createCatalogPromotion(payload);
      await refresh();
      if (saved.id) onSelect({ type: "promotion", id: saved.id });
      setFeedback(copy.promotionSaved);
    } catch (error) {
      setFeedback(copy.promotionError);
    } finally {
      setSaving(false);
    }
  };

  if (mode === "empty") return <div className="grid place-items-center p-10 text-sm text-slate-500">{copy.select}</div>;
  const isPromotion = mode === "promotion" || mode === "new-promotion";
  const isPackage = mode === "new-package" || product?.commercial_kind === "PACKAGE";
  const isCreating = mode === "new-package" || mode === "new-promotion";
  const showDetails = isCreating || focusSection === "details";
  const showPricing = mode === "new-promotion" || (!isCreating && focusSection === "pricing");
  const showAvailability = isCreating || focusSection === "availability";
  const Icon = isPromotion ? Gift : isPackage ? PackageCheck : Boxes;
  const feedbackSuccess = feedback === copy.saved || feedback === copy.promotionSaved || feedback === copy.stripeSynced;
  const feedbackWarning = feedback === copy.pricesSavedRefreshFailed || feedback === copy.pricesConnectedRefreshFailed;
  const stripeModeLabel = `Stripe ${stripeMode}`;
  const liveSuccess = getCatalogCopy(languageCode).pricesVerifiedInStripeLIVE;
  const monthlyValue = Math.max(0, Number(monthly) || 0);
  const annualDiscountValue = Math.min(100, Math.max(0, Number(annualDiscount) || 0));
  const regularAnnualValue = monthlyValue * 12;
  const suggestedAnnualValue = regularAnnualValue * (1 - annualDiscountValue / 100);
  const annualSavingsValue = regularAnnualValue - suggestedAnnualValue;
  const simulationBaseValue = Math.max(0, Number(simulationBase) || 0);
  const configuredDiscountValue = Math.max(0, Number(discountValue) || 0);
  const simulatedDiscountValue = discountType === "PERCENT"
    ? simulationBaseValue * Math.min(100, configuredDiscountValue) / 100
    : Math.min(simulationBaseValue, configuredDiscountValue);
  const simulatedFinalValue = Math.max(0, simulationBaseValue - simulatedDiscountValue);
  const saveLabel = isCreating
    ? copy.createOffer
    : focusSection === "pricing"
      ? isPromotion ? copy.save : copy.savePricing
      : focusSection === "availability"
        ? copy.saveAvailability
        : copy.saveDetails;

  return (
    <fieldset disabled={saving} aria-busy={saving} className="min-w-0 border-0 p-5 lg:p-7">
      {isCreating ? <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between dark:border-slate-800">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#E9F8F3] text-[#177D66]"><Icon className="h-5 w-5" /></span>
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#177D66]">{isPromotion ? copy.promotion : isPackage ? copy.package : product?.commercial_kind === "SEAT" ? copy.quantity : copy.module}</p><h3 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{mode.startsWith("new-") ? copy.create : product?.display_name || promotion?.display_name}</h3></div>
        </div>
        <span className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}><span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />{active ? copy.available : copy.unavailable}</span>
      </header> : null}

      {!editable ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><ShieldCheck className="mr-2 inline h-4 w-4" />{copy.locked}</div> : null}
      {showDetails ? (
        <section className="mt-6">
          <p className="mb-4 text-sm text-slate-500">{copy.detailsHelp}</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">{copy.commercialName}<input value={name} disabled={!editable} onChange={(event) => setName(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-[#59C3A5] disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900" /></label>
            {isPromotion ? <label className="space-y-1.5 text-sm font-medium text-slate-700">{copy.code}<input value={promotionCode} disabled={!editable} onChange={(event) => setPromotionCode(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 uppercase outline-none focus:border-[#59C3A5]" placeholder={getCatalogCopy(languageCode).promotionExample} /></label> : null}
            <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">{copy.description}<textarea value={description} disabled={!editable} onChange={(event) => setDescription(event.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#59C3A5] disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900" /></label>
          </div>

          {(isPackage || isPromotion) ? <div className="mt-6"><div className="flex items-center justify-between"><h4 className="font-semibold text-slate-950 dark:text-white">{isPromotion ? copy.appliesTo : copy.included}</h4><span className="text-xs text-slate-500">{included.length} {copy.selected}</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{(isPromotion ? promotionCandidates : directModules).map((candidate) => <label key={candidate.id} className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${included.includes(candidate.product_code) ? "border-[#59C3A5] bg-[#E9F8F3]" : "border-slate-200"}`}><input type="checkbox" disabled={!editable} checked={included.includes(candidate.product_code)} onChange={() => setIncluded((current) => current.includes(candidate.product_code) ? current.filter((code) => code !== candidate.product_code) : [...current, candidate.product_code])} className="h-4 w-4 accent-[#177D66]" /><span><strong className="block text-slate-900">{catalogProductLabel(candidate, languageCode)}</strong><small className="text-slate-500">{candidate.commercial_kind === "SEAT" ? copy.quantityLabel : candidate.commercial_kind === "PACKAGE" ? copy.package : candidate.capabilities.map((slug) => catalogCapabilityLabel(slug, languageCode)).join(", ")}</small></span></label>)}</div>{isPromotion ? <p className="mt-2 text-xs text-slate-500">{copy.allPurchase}</p> : null}</div> : null}
        </section>
      ) : null}

      {showPricing ? (
        <section className="mt-6 space-y-4">
          <p className="text-sm text-slate-500">{copy.pricingHelp}</p>
          {isPromotion ? (
            <>
              <div className="grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3 dark:bg-slate-950/40">
                <label className="text-sm font-medium text-slate-700">{copy.type}<select value={discountType} disabled={!editable} onChange={(event) => setDiscountType(event.target.value as "PERCENT" | "FIXED")} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3"><option value="PERCENT">{copy.percentage}</option><option value="FIXED">{copy.fixed}</option></select></label>
                <label className="text-sm font-medium text-slate-700">{copy.discount} {discountType === "PERCENT" ? "%" : "USD"}<input value={discountValue} disabled={!editable} onChange={(event) => setDiscountValue(event.target.value)} type="number" min="0" step="0.01" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
                <label className="text-sm font-medium text-slate-700">{copy.stripePromotion}<input value={promotionStripe} disabled={!editable} onChange={(event) => setPromotionStripe(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3" placeholder="promo_..." /></label>
              </div>
              <div className="rounded-2xl border border-[#59C3A5]/35 bg-[#F3FBF8] p-4">
                <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#177D66] shadow-sm"><Calculator className="h-5 w-5" /></span><div><h4 className="font-medium text-slate-950">{copy.discountSimulator}</h4><p className="mt-1 text-sm text-slate-500">{copy.discountSimulatorHelp}</p></div></div>
                <label className="mt-4 block text-sm font-medium text-slate-700">{copy.samplePurchase}<input value={simulationBase} onChange={(event) => setSimulationBase(event.target.value)} type="number" min="0" step="0.01" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3" /></label>
                <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">{copy.samplePurchase}</p><p className="mt-1 font-medium text-slate-950">{currency(simulationBaseValue, languageCode)}</p></div><div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">{copy.discountApplied}</p><p className="mt-1 font-medium text-emerald-700">−{currency(simulatedDiscountValue, languageCode)}</p></div><div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">{copy.finalPrice}</p><p className="mt-1 font-medium text-slate-950">{currency(simulatedFinalValue, languageCode)}</p></div></div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-[#59C3A5]/40 bg-[#F3FBF8] p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#177D66] shadow-sm"><ReceiptText className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-slate-950">{copy.taxTitle}</h4>
                    <p className="mt-1 text-sm leading-5 text-slate-600">{copy.taxHelp}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[stripeModeLabel, copy.taxExclusive, copy.taxCode].map((item) => <span key={item} className="rounded-full border border-[#59C3A5]/35 bg-white px-3 py-1 text-xs font-semibold text-[#177D66]">{item}</span>)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2 dark:bg-slate-950/40">
                {[[copy.monthly, monthly, setMonthly, monthlyStripe], [copy.annual, yearly, setYearly, yearlyStripe]].map(([label, amount, setAmount, stripe]) => (
                  <div key={label as string} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <label className="text-sm font-semibold text-slate-900 dark:text-white">{label as string}<input value={amount as string} disabled={!editable} onChange={(event) => (setAmount as (value: string) => void)(event.target.value)} type="number" min="0" step="0.01" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
                    <div className="mt-3"><p className="text-xs font-medium text-slate-500">{copy.stripePrice}</p><div className="mt-1.5 flex min-h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-500">{(stripe as string) || copy.notConnected}</div></div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-[#59C3A5]/35 bg-[#F3FBF8] p-4">
                <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#177D66] shadow-sm"><Calculator className="h-5 w-5" /></span><div><h4 className="font-medium text-slate-950">{copy.annualCalculator}</h4><p className="mt-1 text-sm text-slate-500">{copy.annualCalculatorHelp}</p></div></div>
                <label className="mt-4 block max-w-xs text-sm font-medium text-slate-700">{copy.annualDiscount} %<input value={annualDiscount} onChange={(event) => setAnnualDiscount(event.target.value)} type="number" min="0" max="100" step="0.5" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3" /></label>
                {monthlyValue > 0 ? <><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">{copy.regularAnnual}</p><p className="mt-1 font-medium text-slate-950">{currency(regularAnnualValue, languageCode)}</p></div><div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">{copy.annualSavings}</p><p className="mt-1 font-medium text-emerald-700">{currency(annualSavingsValue, languageCode)}</p></div><div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">{copy.suggestedAnnual}</p><p className="mt-1 font-medium text-slate-950">{currency(suggestedAnnualValue, languageCode)}</p></div></div><button type="button" disabled={!editable} onClick={() => setYearly(suggestedAnnualValue.toFixed(2))} className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-[#59C3A5] bg-white px-4 text-sm font-medium text-[#177D66] hover:bg-[#E9F8F3] disabled:opacity-40">{copy.applyAnnual}</button></> : <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-slate-500">{copy.calculatorNeedsMonthly}</p>}
              </div>
              <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-500">{copy.replacementHelp}</p>
              <details className="rounded-xl border border-slate-200 p-4">
                <summary className="cursor-pointer text-sm font-medium text-slate-700">{copy.directConnection}</summary>
                <p className="mt-3 text-sm text-slate-500">{copy.directConnectionHelp}</p>
                {stripeMode === "LIVE" ? <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50 p-4"><label className="text-sm font-medium text-rose-900">{copy.liveConfirmation}<input value={liveConfirmation} disabled={!editable || !liveSyncEnabled} onChange={(event) => setLiveConfirmation(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-rose-200 bg-white px-3 font-mono" placeholder={copy.livePhrase} /></label><p className="mt-2 text-xs text-rose-700">{liveSyncEnabled ? copy.liveConfirmationHelp : copy.liveBlocked}</p></div> : null}
                <button type="button" disabled={!editable || saving || (stripeMode === "LIVE" && (!liveSyncEnabled || liveConfirmation !== copy.livePhrase))} onClick={() => void synchronizePrices()} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#59C3A5]/40 px-4 py-2 text-sm font-medium text-[#177D66] disabled:opacity-40">
                  <ShieldCheck className="h-4 w-4" />{stripeMode === "LIVE" ? (getCatalogCopy(languageCode).verifyAndConnectToStripeLIVE) : copy.connectPricing}
                </button>
              </details>
            </>
          )}
        </section>
      ) : null}

      {showAvailability ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/40">
          <h4 className="font-medium text-slate-950 dark:text-white">{copy.availabilityTitle}</h4>
          <p className="mt-1 text-sm leading-5 text-slate-500">{copy.availabilityHelp}</p>
          <label className={`mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-xl border bg-white p-4 ${active ? "border-[#59C3A5]" : "border-slate-200"}`}><span><strong className="block text-sm text-slate-950">{copy.available}</strong><small className="mt-1 block text-slate-500">{active ? copy.available : copy.unavailable}</small></span><input type="checkbox" checked={active} disabled={!editable} onChange={(event) => setActive(event.target.checked)} className="h-5 w-5 accent-[#177D66]" /></label>
        </section>
      ) : null}

      <div className="mt-6 flex justify-end border-t border-slate-200 pt-5 dark:border-slate-800"><button type="button" disabled={!editable || saving} onClick={() => void (isPromotion ? savePromotion() : focusSection === "pricing" ? savePrices() : saveProduct())} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-5 py-2 text-center text-sm font-semibold text-white hover:bg-[#126653] disabled:opacity-40">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saveLabel}</button></div>
      {feedback ? <p role="status" className={`mt-3 rounded-xl px-4 py-3 text-sm ${feedbackSuccess || feedback === liveSuccess ? "bg-emerald-50 text-emerald-800" : feedbackWarning ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-700"}`}>{feedbackSuccess || feedback === liveSuccess ? <BadgeCheck className="mr-2 inline h-4 w-4" /> : null}{feedback}</p> : null}
    </fieldset>
  );
}
