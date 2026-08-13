import { useState, type FormEvent } from "react";
import { MapPinned } from "lucide-react";
import { IndiceModalFrame } from "../../components/indice-modal";
import { countryOption, countryOptions, currencyOptions } from "../flowOptions";
import type { CoverageInput } from "./types";

const controlClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15";
export function CoverageCreateModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: CoverageInput) => void;
}) {
  const [value, setValue] = useState<CoverageInput>({
    city_name: "",
    region_name: "",
    country_name: "México",
    country_code: "MX",
    timezone: "America/Mexico_City",
    currency: "MXN",
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onCreate({
      ...value,
      country_code: value.country_code.trim().toUpperCase(),
      currency: value.currency.trim().toUpperCase(),
    });
  };
  return (
    <IndiceModalFrame
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      modalType="standard-form"
      tone="blue"
      icon={<MapPinned className="h-5 w-5" />}
      eyebrow="Consultoría presencial"
      title="Agregar cobertura"
      description="Registra una ciudad disponible para sesiones presenciales."
      footer={
        <div className="flex w-full justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl bg-white px-4 text-sm font-medium text-slate-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="coverage-create-form"
            className="h-11 rounded-xl bg-white/15 px-5 text-sm font-semibold text-white ring-1 ring-white/35"
          >
            Agregar cobertura
          </button>
        </div>
      }
    >
      <form
        id="coverage-create-form"
        onSubmit={submit}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field label="Ciudad">
          <input
            autoFocus
            required
            value={value.city_name}
            onChange={(event) =>
              setValue({ ...value, city_name: event.target.value })
            }
            className={controlClass}
          />
        </Field>
        <Field label="Región o provincia">
          <input
            required
            value={value.region_name}
            onChange={(event) =>
              setValue({ ...value, region_name: event.target.value })
            }
            className={controlClass}
          />
        </Field>
        <Field label="País">
          <select
            required
            value={value.country_code}
            onChange={(event) => {
              const country = countryOption(event.target.value);
              if (!country) return;
              setValue({
                ...value,
                country_name: country.label,
                country_code: country.code,
                timezone: country.timezones[0],
                currency: country.currency,
              });
            }}
            className={controlClass}
          >
            {countryOptions.map((country) => (
              <option key={country.code} value={country.code}>
                {country.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Código de país">
          <input disabled value={value.country_code} className={controlClass} />
        </Field>
        <Field label="Zona horaria">
          <select
            required
            value={value.timezone}
            onChange={(event) =>
              setValue({ ...value, timezone: event.target.value })
            }
            className={controlClass}
          >
            {(countryOption(value.country_code)?.timezones ?? []).map(
              (timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ),
            )}
          </select>
        </Field>
        <Field label="Moneda">
          <select
            required
            value={value.currency}
            onChange={(event) =>
              setValue({ ...value, currency: event.target.value })
            }
            className={controlClass}
          >
            {currencyOptions.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </Field>
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
    <label className="block space-y-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}
