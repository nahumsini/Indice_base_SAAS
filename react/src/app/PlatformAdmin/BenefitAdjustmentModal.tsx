import { catalogProductLabel } from "./CatalogWorkspace/catalogLabels";
import { useCustomerAccountCopy } from "./Customers/useCustomerAccountCopy";
import type { FormEvent } from "react";
import { Gift, Plus } from "lucide-react";
import type {
  BenefitPayload,
  PlatformCatalogProduct,
} from "../api/platformAdmin";
import { IndiceModalFrame } from "../components/indice-modal";
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
}: {
  benefit: BenefitPayload;
  products: PlatformCatalogProduct[];
  saving: boolean;
  onBenefit: (value: BenefitPayload) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const { t, locale, number } = useCustomerAccountCopy();
  const presetReason = accessReasonOptions.includes(
    benefit.reason as (typeof accessReasonOptions)[number],
  );
  const reasonSelection = presetReason
    ? benefit.reason
    : benefit.reason
      ? "OTHER"
      : "";
  return (
    <IndiceModalFrame
      open
      busy={saving}
      onOpenChange={(open) => !open && onClose()}
      modalType="standard-form"
      tone="aqua"
      icon={<Gift className="h-5 w-5" />}
      eyebrow={t("customerAccount")}
      title={t("applyAccessAdjustment")}
      description={t("adjustmentHelp")}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving}>
            {t("cancel")}</button>
          <button
            type="submit"
            form="benefit-adjustment-form"
            disabled={saving}
          >
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {saving ? t("applying") : t("applyAdjustment")}
            </span>
          </button>
        </>
      }
    >
      <form
        id="benefit-adjustment-form"
        onSubmit={onSubmit}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field label={t("adjustmentType")}>
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
            <option value="PRODUCT">{t("module")}</option>
            <option value="SEAT">{t("extraUsers")}</option>
            <option value="STORAGE">{t("storage")}</option>
          </select>
        </Field>
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
              {products.map((product) => (
                <option key={product.id} value={product.product_code}>
                  {catalogProductLabel(product, locale)}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label={t("quantity")}>
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
        <Field label={t("validUntilOptional")}>
          <input
            type="datetime-local"
            value={benefit.ends_at || ""}
            onChange={(event) =>
              onBenefit({ ...benefit, ends_at: event.target.value })
            }
            className={controlClass}
          />
        </Field>
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
