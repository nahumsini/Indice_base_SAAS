import { useState, type FormEvent } from "react";
import { CalendarClock, CalendarPlus, LoaderCircle, ShieldCheck } from "lucide-react";
import {
  IndiceModalFrame,
  IndiceModalValidation,
} from "../../components/indice-modal";

export type TrialExtensionDays = 7 | 15 | 30;

export interface TrialExtensionCompany {
  name: string;
  trial_ends_at?: string | null;
  trial_days_remaining?: number;
}

const options: TrialExtensionDays[] = [7, 15, 30];

export function TrialExtensionModal({
  company,
  english,
  saving,
  error,
  onClose,
  onConfirm,
}: {
  company: TrialExtensionCompany;
  english: boolean;
  saving: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (days: TrialExtensionDays) => Promise<void>;
}) {
  const [days, setDays] = useState<TrialExtensionDays>(7);
  const remainingDays = Math.max(0, company.trial_days_remaining ?? 0);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onConfirm(days);
  };

  return (
    <IndiceModalFrame
      open
      busy={saving}
      onOpenChange={(open) => !open && onClose()}
      modalType="standard-form"
      contentClassName="sm:max-w-2xl"
      tone="blue"
      icon={<CalendarPlus className="h-5 w-5" />}
      eyebrow={english ? "Controlled trial" : "Prueba controlada"}
      title={english ? "Extend trial" : "Extender periodo de prueba"}
      description={company.name}
      footerSummary={
        english
          ? `Current balance: ${remainingDays} day${remainingDays === 1 ? "" : "s"}`
          : `Saldo actual: ${remainingDays} día${remainingDays === 1 ? "" : "s"}`
      }
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving}>
            {english ? "Cancel" : "Cancelar"}
          </button>
          <button
            type="submit"
            form="trial-extension-form"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2"
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarPlus className="h-4 w-4" />
            )}
            {saving
              ? english
                ? "Extending..."
                : "Extendiendo..."
              : english
                ? `Add ${days} days`
                : `Agregar ${days} días`}
          </button>
        </>
      }
    >
      <form id="trial-extension-form" onSubmit={submit} className="space-y-4">
        <IndiceModalValidation messages={error ? [error] : []} />

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#2563EB]">
                <CalendarClock className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{company.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {company.trial_ends_at
                    ? `${english ? "Current end" : "Vencimiento actual"}: ${formatDate(company.trial_ends_at, english)}`
                    : english
                      ? "No expiration date"
                      : "Sin fecha de vencimiento"}
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {remainingDays > 0
                ? english
                  ? `${remainingDays} days left`
                  : `${remainingDays} días restantes`
                : english
                  ? "Expired"
                  : "Vencida"}
            </span>
          </div>

          <fieldset className="mt-4">
            <legend className="text-sm font-semibold text-slate-800">
              {english ? "Days to add" : "Días por agregar"}
            </legend>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {options.map((option) => {
                const selected = days === option;
                return (
                  <label
                    key={option}
                    className={`cursor-pointer rounded-2xl border px-3 py-4 text-center transition focus-within:ring-2 focus-within:ring-[#2563EB]/25 ${
                      selected
                        ? "border-[#2563EB] bg-blue-50 text-[#174799] shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="trial-extension-days"
                      value={option}
                      checked={selected}
                      onChange={() => setDays(option)}
                      className="sr-only"
                    />
                    <span className="block text-2xl font-semibold tabular-nums">+{option}</span>
                    <span className="mt-1 block text-xs font-medium">
                      {english ? "days" : "días"}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </section>

        <div className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-[#143675]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {english
              ? "Only the trial end date changes. Modules and users stay intact, and Stripe does not charge now."
              : "Sólo cambia la fecha de fin de prueba. Los módulos y usuarios se conservan, y Stripe no realiza un cargo ahora."}
          </p>
        </div>
      </form>
    </IndiceModalFrame>
  );
}

function formatDate(value: string, english: boolean) {
  return new Intl.DateTimeFormat(english ? "en-CA" : "es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
