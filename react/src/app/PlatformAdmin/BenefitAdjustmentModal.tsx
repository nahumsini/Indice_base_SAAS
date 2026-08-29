import type { FormEvent } from "react";
import { Gift, Plus } from "lucide-react";
import type {
  BenefitPayload,
  PlatformCatalogProduct,
} from "../api/platformAdmin";
import { IndiceModalFrame } from "../components/indice-modal";
import { accessReasonOptions, extraSeatOptions } from "./flowOptions";

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
      eyebrow="Cuenta de cliente"
      title="Aplicar ajuste de acceso"
      description="Selecciona valores controlados para evitar accesos inconsistentes."
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            type="submit"
            form="benefit-adjustment-form"
            disabled={saving}
          >
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {saving ? "Aplicando…" : "Aplicar ajuste"}
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
        <Field label="Tipo de ajuste">
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
            <option value="PRODUCT">Módulo</option>
            <option value="SEAT">Usuarios adicionales</option>
            <option value="STORAGE">Almacenamiento</option>
          </select>
        </Field>
        <Field label="Origen">
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
            <option value="COURTESY">Cortesía</option>
            <option value="PROMOTION">Promoción</option>
            <option value="SUPPORT">Soporte</option>
            <option value="TEST">Prueba</option>
          </select>
        </Field>
        {benefit.benefit_type === "PRODUCT" ? (
          <Field label="Módulo">
            <select
              required
              value={benefit.product_code || ""}
              onChange={(event) =>
                onBenefit({ ...benefit, product_code: event.target.value })
              }
              className={controlClass}
            >
              <option value="">Selecciona un módulo</option>
              {products.map((product) => (
                <option key={product.id} value={product.product_code}>
                  {product.display_name}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Cantidad">
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
                    {quantity}
                  </option>
                ))}
            </select>
          </Field>
        )}
        <Field label="Vigencia hasta (opcional)">
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
          <Field label="Motivo auditable">
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
              <option value="">Selecciona un motivo</option>
              {accessReasonOptions.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
              <option value="OTHER">Otro motivo</option>
            </select>
          </Field>
        </div>
        {reasonSelection === "OTHER" ? (
          <div className="sm:col-span-2">
            <Field label="Describe el motivo">
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
