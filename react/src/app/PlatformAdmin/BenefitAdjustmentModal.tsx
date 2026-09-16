import { catalogProductLabel } from "./CatalogWorkspace/catalogLabels";
import { useCustomerAccountCopy } from "./Customers/useCustomerAccountCopy";
import { useRef, useState, type FormEvent } from "react";
import { Gift, Plus } from "lucide-react";
import type {
  BenefitPayload,
  PlatformCatalogProduct,
} from "../api/platformAdmin";
import { IndiceModalFrame, IndiceModalValidation } from "../components/indice-modal";
import { IndiceConfirmationDialog } from "../components/indice-modal/IndiceConfirmationDialog";
import { accessReasonOptions, extraSeatOptions, flowOptionLabel } from "./flowOptions";

const controlClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-800";

export function BenefitAdjustmentModal({
  benefit,
  products,
  saving,
  onBenefit,
  onClose,
  onSubmit,
  companyName,
  error,
  allowedTypes = ["PRODUCT", "SEAT", "STORAGE"],
}: {
  allowedTypes?: BenefitPayload["benefit_type"][];
  companyName?: string;
  error?: string;
  benefit: BenefitPayload;
  products: PlatformCatalogProduct[];
  saving: boolean;
  onBenefit: (value: BenefitPayload) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const { t, locale, number } = useCustomerAccountCopy();
  const initialValue = useRef(JSON.stringify(benefit));
  const [discardOpen, setDiscardOpen] = useState(false);
  const [temporary, setTemporary] = useState(Boolean(benefit.ends_at));
  const [validationError, setValidationError] = useState("");
  const eligibleProducts = products.filter(product => product.active && product.commercially_available !== false && product.commercial_kind !== "SEAT")
    .sort((a, b) => catalogProductLabel(a, locale).localeCompare(catalogProductLabel(b, locale), locale));
  const selectedProduct = eligibleProducts.find(product => product.product_code === benefit.product_code);
  const close = () => {
    if (saving) return;
    if (JSON.stringify(benefit) !== initialValue.current || temporary !== Boolean(benefit.ends_at)) setDiscardOpen(true);
    else onClose();
  };
  const submit = (event: FormEvent) => {
    if (saving) { event.preventDefault(); return; }
    if (benefit.benefit_type === "PRODUCT" && !selectedProduct) { event.preventDefault(); setValidationError(t("selectModule")); return; }
    if (temporary && (!benefit.ends_at || Date.parse(benefit.ends_at) <= Date.now() || !Number.isFinite(Date.parse(benefit.ends_at)))) {
      event.preventDefault(); setValidationError(t("accessInvalidEnd")); return;
    }
    setValidationError("");
    onSubmit(event);
  };
  const presetReason = accessReasonOptions.includes(
    benefit.reason as (typeof accessReasonOptions)[number],
  );
  const reasonSelection = presetReason
    ? benefit.reason
    : benefit.reason
      ? "OTHER"
      : "";
  if (discardOpen) return <IndiceConfirmationDialog open title={t("accessDiscardTitle")} description={t("accessDiscardHelp")}
    cancelLabel={t("accessKeepEditing")} confirmLabel={t("accessDiscard")} destructive tone="aqua"
    onCancel={() => setDiscardOpen(false)} onConfirm={onClose} />;
  return (
    <IndiceModalFrame
      open
      busy={saving}
      onOpenChange={(open) => !open && close()}
      modalType="standard-form"
      tone="aqua"
      icon={<Gift className="h-5 w-5" />}
      eyebrow={t("customerAccount")}
      title={t(benefit.benefit_type === "PRODUCT" ? "accessGrant" : "accessManageCapacity")}
      description={companyName ? `${companyName} · ${t("accessFormHelp")}` : t("accessFormHelp")}
      footerSummary={selectedProduct ? catalogProductLabel(selectedProduct, locale) : undefined}
      footer={
        <>
          <button type="button" onClick={close} disabled={saving}>
            {t("cancel")}</button>
          <button
            type="submit"
            form="benefit-adjustment-form"
            disabled={saving || (benefit.benefit_type === "PRODUCT" && !selectedProduct)}
          >
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {saving ? t("applying") : t(benefit.benefit_type === "PRODUCT" ? "accessGrant" : "accessManageCapacity")}
            </span>
          </button>
        </>
      }
    >
      <form
        id="benefit-adjustment-form"
        onSubmit={submit}
      >
        <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><IndiceModalValidation messages={[error, validationError].filter((message): message is string => Boolean(message))} /></div>
        {allowedTypes.length > 1 ? <Field label={t("adjustmentType")}>
          <select
            value={benefit.benefit_type}
            onChange={(event) =>
              onBenefit({
                ...benefit,
                benefit_type: event.target
                  .value as BenefitPayload["benefit_type"],
                product_code: "",
                quantity: 1,
              })
            }
            className={controlClass}
          >
            {allowedTypes.includes("PRODUCT") ? <option value="PRODUCT">{t("module")}</option> : null}
            {allowedTypes.includes("SEAT") ? <option value="SEAT">{t("extraUsers")}</option> : null}
            {allowedTypes.includes("STORAGE") ? <option value="STORAGE">{t("storage")}</option> : null}
          </select>
        </Field> : null}
        <Field label={t("origin")}>
          <select
            value={benefit.source_type}
            onChange={(event) =>
              onBenefit({
                ...benefit,
                source_type: event.target
                  .value as BenefitPayload["source_type"],
              })
            }
            className={controlClass}
          >
            <option value="COURTESY">{t("courtesy")}</option>
            <option value="PROMOTION">{t("promotion")}</option>
            <option value="SUPPORT">{t("support")}</option>
            <option value="TEST">{t("trial")}</option>
          </select>
        </Field>
        {benefit.benefit_type === "PRODUCT" ? (
          <Field label={t("module")}>
            <select
              required
              value={benefit.product_code || ""}
              onChange={(event) =>
                onBenefit({ ...benefit, product_code: event.target.value })
              }
              className={controlClass}
            >
              <option value="">{t("selectModule")}</option>
              {eligibleProducts.map((product) => (
                <option key={product.id} value={product.product_code}>
                  {catalogProductLabel(product, locale)}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label={t(benefit.benefit_type === "SEAT" ? "accessSeatQuantity" : "accessStorageQuantity")}>
            <select
              required
              value={benefit.quantity || 1}
              onChange={(event) =>
                onBenefit({ ...benefit, quantity: Number(event.target.value) })
              }
              className={controlClass}
            >
              {extraSeatOptions
                .filter((quantity) => quantity > 0)
                .map((quantity) => (
                  <option key={quantity} value={quantity}>
                    {number(quantity)}
                  </option>
                ))}
            </select>
          </Field>
        )}
        <Field label={t("accessValidity")}>
          <select className={controlClass} value={temporary ? "temporary" : "permanent"} onChange={event => {
            const next = event.target.value === "temporary";
            setTemporary(next);
            if (!next) onBenefit({ ...benefit, ends_at: "" });
          }}>
            <option value="temporary">{t("accessTemporary")}</option>
            <option value="permanent">{t("accessPermanent")}</option>
          </select>
        </Field>
        {temporary ? <Field label={t("accessTemporary")}>
          <input required type="datetime-local" value={benefit.ends_at || ""}
            onChange={event => onBenefit({ ...benefit, ends_at: event.target.value })} className={controlClass} />
        </Field> : <p className="self-center text-sm text-slate-500">{t("accessPermanentHelp")}</p>}
        {benefit.benefit_type === "PRODUCT" && !eligibleProducts.length ? <p className="text-sm text-slate-500 sm:col-span-2">{t("accessNoEligibleProducts")}</p> : null}
        <div className="sm:col-span-2">
          <Field label={t("auditReason")}>
            <select
              required
              value={reasonSelection}
              onChange={(event) =>
                onBenefit({
                  ...benefit,
                  reason: event.target.value,
                })
              }
              className={controlClass}
            >
              <option value="">{t("selectReason")}</option>
              {accessReasonOptions.map((reason) => (
                <option key={reason} value={reason}>
                  {flowOptionLabel(reason, locale)}
                </option>
              ))}
              <option value="OTHER">{t("otherReason")}</option>
            </select>
          </Field>
        </div>
        {reasonSelection === "OTHER" ? (
          <div className="sm:col-span-2">
            <Field label={t("describeReason")}>
              <textarea
                required
                minLength={5}
                value={benefit.reason === "OTHER" ? "" : benefit.reason}
                onChange={(event) =>
                  onBenefit({ ...benefit, reason: event.target.value })
                }
                className={`${controlClass} min-h-20 resize-y py-2`}
              />
            </Field>
          </div>
        ) : null}
        </fieldset>
      </form>
    </IndiceModalFrame>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      {children}
    </label>
  );
}
