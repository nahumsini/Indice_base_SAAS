import { useCustomerAccountCopy } from "./useCustomerAccountCopy";
import { useState, type FormEvent } from "react";
import { CalendarClock, CalendarPlus, LoaderCircle, ShieldCheck } from "lucide-react";
import {
  IndiceModalFrame,
  IndiceModalValidation,
} from "../../components/indice-modal";

export type TrialExtensionDays = 15;

export interface TrialExtensionCompany {
  name: string;
  trial_ends_at?: string | null;
  trial_days_remaining?: number;
}

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
  const { t, locale, number } = useCustomerAccountCopy();
  const [days] = useState<TrialExtensionDays>(15);
  const [consultationConfirmed, setConsultationConfirmed] = useState(false);
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
      tone="aqua"
      icon={<CalendarPlus className="h-5 w-5" />}
      eyebrow={t("controlledTrial")}
      title={t("extendTrial")}
      description={company.name}
      footerSummary={t("trialBalance", { count: remainingDays })}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </button>
          <button
            type="submit"
            form="trial-extension-form"
            disabled={saving || !consultationConfirmed}
            className="inline-flex items-center justify-center gap-2"
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarPlus className="h-4 w-4" />
            )}
            {saving
              ? t("extending")
              : t("addDays", { count: days })}
          </button>
        </>
      }
    >
      <form id="trial-extension-form" onSubmit={submit} className="space-y-4">
        <IndiceModalValidation messages={error ? [error] : []} />

        <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f5f2] text-[#177D66]">
                <CalendarClock className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900 dark:text-white">{company.name}</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {company.trial_ends_at
                    ? `${t("currentEnd")}: ${formatDate(company.trial_ends_at, locale)}`
                    : t("noExpirationDate")}
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              {remainingDays > 0
                ? t(new Intl.PluralRules(locale).select(remainingDays) === "one" ? "dayLeftOne" : "dayLeftOther", { count: remainingDays })
                : t("expired")}
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-[#59C3A5] bg-[#59C3A5]/12 px-4 py-4 text-[#176B5B]">
            <span className="block text-2xl font-medium tabular-nums">+{number(15)}</span>
            <span className="mt-1 block text-xs font-medium">
              {t("trialLimit")}
            </span>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <input
              type="checkbox"
              checked={consultationConfirmed}
              onChange={(event) => setConsultationConfirmed(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#177D66] focus:ring-[#59C3A5]"
            />
            <span>{t("consultationConfirm")}</span>
          </label>
        </section>

        <div className="flex gap-3 rounded-xl border border-[#59C3A5]/30 bg-[#59C3A5]/10 px-4 py-3 text-sm leading-6 text-[#176B5B] dark:border-[#59C3A5]/25 dark:bg-[#59C3A5]/10 dark:text-[#8FE0CA]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {t("trialPreservation")}
          </p>
        </div>
      </form>
    </IndiceModalFrame>
  );
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
