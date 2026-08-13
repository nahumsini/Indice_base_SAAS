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
  onChange: (patch: Partial<PlatformAccountCreatePayload>) => void;
  onToggleProduct: (code: string) => void;
};

export function AccessStep({
  copy,
  form,
  products,
  onChange,
  onToggleProduct,
}: AccessStepProps) {
  const selectedBasicCount = products.filter(
    (product) => product.product_type.toUpperCase() === "BASIC"
      && form.product_codes.includes(product.product_code),
  ).length;
  const employees = Math.max(0, Math.trunc(form.employee_count || 0));
  const extraSeats = requiredExtraSeats(employees);
  const groups = [
    { type: "BASIC", title: copy.access.baseGroup, description: copy.access.baseGroupDescription },
    { type: "ADDON", title: copy.access.addonGroup, description: copy.access.addonGroupDescription },
  ];
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <AccountStepTitle
        number="3"
        icon={PackageCheck}
        title={copy.access.title}
        description={copy.access.description}
      />
      <fieldset className="mt-4">
        <legend className="text-sm font-semibold text-slate-800">
          {copy.access.modules}
        </legend>
        <div className="mt-3 space-y-4">
          {groups.map((group) => {
            const groupedProducts = products.filter((product) => product.product_type.toUpperCase() === group.type);
            if (!groupedProducts.length) return null;
            return <div key={group.type}>
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-700">{group.title}</p>
                <p className="text-[11px] text-slate-500">{group.description}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
          {groupedProducts.map((product) => {
            const selected = form.product_codes.includes(product.product_code);
            const isLastBasic = product.product_type.toUpperCase() === "BASIC"
              && selected
              && selectedBasicCount === 1;
            return (
              <label
                key={product.id}
                className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition ${isLastBasic ? "cursor-not-allowed" : "cursor-pointer"} ${selected ? "border-[#59C3A5] bg-[#f1fbf8] ring-1 ring-[#59C3A5]/30" : "border-slate-200 hover:border-slate-300"}`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={isLastBasic}
                  onChange={() => onToggleProduct(product.product_code)}
                  className="mt-1 h-4 w-4 accent-[#177D66] disabled:cursor-not-allowed"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">
                    {product.display_name}
                  </span>
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

      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#2563EB] shadow-sm">
            <Users className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{copy.access.capacityTitle}</p>
            <p className="text-xs text-slate-500">{copy.access.capacityDescription}</p>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            [copy.access.package, copy.access.packageName(selectedBasicCount)],
            [copy.access.requiredUsers, employees],
            [copy.access.includedUsers, INCLUDED_ACCOUNT_SEATS],
            [copy.access.additionalUsers, extraSeats],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-blue-100 bg-white px-3 py-2">
              <dt className="text-[11px] text-slate-500">{label}</dt>
              <dd className="mt-0.5 text-sm font-bold text-slate-900">{value}</dd>
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
