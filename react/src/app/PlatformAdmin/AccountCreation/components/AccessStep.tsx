import { PackageCheck, ShieldCheck, Users } from "lucide-react";
import type {
  PlatformAccountCreatePayload,
  PlatformCatalogProduct,
} from "../../../api/platformAdmin";
import { trialDayOptions } from "../../flowOptions";
import {
  INCLUDED_ACCOUNT_SEATS,
  humanizeCapability,
  requiredExtraSeats,
} from "../accountCreationUtils";
import type { AccountCreationCopy } from "../translations";
import {
  AccountField,
  AccountStepTitle,
  accountControlClass,
} from "./AccountCreationPrimitives";

type AccessStepProps = {
  copy: AccountCreationCopy;
  form: PlatformAccountCreatePayload;
  products: PlatformCatalogProduct[];
  extraUserMonthlyPrice?: number | null;
  onChange: (patch: Partial<PlatformAccountCreatePayload>) => void;
  onToggleProduct: (code: string) => void;
};

export function AccessStep({
  copy,
  form,
  products,
  extraUserMonthlyPrice,
  onChange,
  onToggleProduct,
}: AccessStepProps) {
  const versionedOffer = products.some((product) => product.commercial_model);
  const selectedBasicCount = products.filter(
    (product) => product.product_type.toUpperCase() === "BASIC"
      && form.product_codes.includes(product.product_code),
  ).length;
  const employees = Math.max(0, Math.trunc(form.employee_count || 0));
  const extraSeats = requiredExtraSeats(employees);
  const groups = versionedOffer
    ? [
        { type: "MODULE", title: "Módulos individuales", description: "Cada módulo tiene su propio precio" },
        { type: "PACKAGE", title: "Paquetes", description: "Combinaciones con precio especial" },
      ]
    : [
        { type: "BASIC", title: copy.access.baseGroup, description: copy.access.baseGroupDescription },
        { type: "ADDON", title: copy.access.addonGroup, description: copy.access.addonGroupDescription },
      ];
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-5">
      <AccountStepTitle
        number="3"
        icon={PackageCheck}
        title={copy.access.title}
        description={copy.access.description}
      />
      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {copy.access.modules}
        </legend>
        <div className="mt-3 space-y-4">
          {groups.map((group) => {
            const groupedProducts = products.filter((product) =>
              versionedOffer
                ? (product.commercial_kind || "MODULE") === group.type
                : product.product_type.toUpperCase() === group.type,
            );
            if (!groupedProducts.length) return null;
            return <div key={group.type}>
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{group.title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{group.description}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
          {groupedProducts.map((product) => {
            const selected = form.product_codes.includes(product.product_code);
            const isLastBasic = !versionedOffer
              && product.product_type.toUpperCase() === "BASIC"
              && selected
              && selectedBasicCount === 1;
            const selectedCapabilities = products
              .filter((candidate) => candidate.product_code !== product.product_code && form.product_codes.includes(candidate.product_code))
              .flatMap((candidate) => candidate.capabilities);
            const overlaps = versionedOffer && !selected && product.capabilities.some((capability) => selectedCapabilities.includes(capability));
            return (
              <label
                key={product.id}
                className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition ${isLastBasic || overlaps ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${selected ? "border-[#59C3A5] bg-[#f1fbf8] ring-1 ring-[#59C3A5]/30" : "border-slate-200 hover:border-slate-300"}`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={isLastBasic || overlaps}
                  onChange={() => onToggleProduct(product.product_code)}
                  className="mt-1 h-4 w-4 accent-[#177D66] disabled:cursor-not-allowed"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900 dark:text-white">
                    {product.display_name}
                  </span>
                  {overlaps ? <span className="mt-1 block text-[11px] text-amber-700">Ya está incluido en otra selección.</span> : null}
                  {versionedOffer && product.monthly_price_cents != null ? (
                    <span className="mt-0.5 block text-xs font-medium text-[#177D66]">
                      {new Intl.NumberFormat("es-MX", { style: "currency", currency: "USD" }).format(product.monthly_price_cents / 100)} USD/mes
                    </span>
                  ) : null}
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {product.capabilities
                      .slice(0, 3)
                      .map(humanizeCapability)
                      .join(" · ") || copy.access.moduleFallback}
                  </span>
                </span>
              </label>
            );
          })}
              </div>
            </div>;
          })}
        </div>
        {!products.length ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {copy.access.noModules}
          </p>
        ) : null}
      </fieldset>

      <div className="mt-4 rounded-xl border border-[#59C3A5]/30 bg-[#59C3A5]/10 p-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#177D66] shadow-sm">
            <Users className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{copy.access.capacityTitle}</p>
            <p className="text-xs text-slate-500">{copy.access.capacityDescription}</p>
            {versionedOffer && extraUserMonthlyPrice != null ? (
              <p className="mt-0.5 text-xs font-medium text-[#177D66]">
                Cada usuario adicional: {new Intl.NumberFormat("es-MX", { style: "currency", currency: "USD" }).format(extraUserMonthlyPrice / 100)} USD al mes
              </p>
            ) : null}
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            [copy.access.package, versionedOffer ? `${form.product_codes.length} producto(s)` : copy.access.packageName(selectedBasicCount)],
            [copy.access.requiredUsers, employees],
            [copy.access.includedUsers, INCLUDED_ACCOUNT_SEATS],
            [copy.access.additionalUsers, extraSeats],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-[#59C3A5]/25 bg-white px-3 py-2 dark:bg-slate-900">
              <dt className="text-[11px] text-slate-500">{label}</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900 dark:text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
        <AccountField label={copy.access.accessType}>
          <select
            value={form.permanent ? "permanent" : "demo"}
            onChange={(event) =>
              onChange({ permanent: event.target.value === "permanent" })
            }
            className={accountControlClass}
          >
            <option value="demo">{copy.access.demo}</option>
            <option value="permanent">{copy.access.permanent}</option>
          </select>
        </AccountField>
        {!form.permanent ? (
          <AccountField label={copy.access.duration}>
            <select
              value={form.access_days || 30}
              onChange={(event) =>
                onChange({ access_days: Number(event.target.value) })
              }
              className={accountControlClass}
            >
              {trialDayOptions.map((days) => (
                <option key={days} value={days}>
                  {copy.access.days(days)}
                </option>
              ))}
            </select>
          </AccountField>
        ) : (
          <div className="flex h-11 items-center gap-3 self-end rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm text-emerald-800">
            <ShieldCheck className="h-5 w-5" /> {copy.access.noExpiration}
          </div>
        )}
      </div>
    </section>
  );
}
