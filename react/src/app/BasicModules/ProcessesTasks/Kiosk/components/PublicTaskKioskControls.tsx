import { Globe2 } from 'lucide-react';
import type { TaskKioskLocale, TaskKioskTranslations } from '../translations';

export function TaskPinKeypad({
  value,
  disabled,
  deleteLabel,
  onChange,
}: {
  value: string;
  disabled: boolean;
  deleteLabel: string;
  onChange: (value: string) => void;
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'backspace', '0'];
  return (
    <div className="grid grid-cols-3 gap-3">
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          className={`flex h-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl font-bold text-slate-950 shadow-sm transition hover:border-[#F4C84A] hover:bg-[#F4C84A]/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white ${key === '0' ? 'col-start-2' : ''}`}
          onClick={() => {
            if (key === 'backspace') {
              onChange(value.slice(0, -1));
              return;
            }
            onChange(`${value}${key}`.replace(/\D/g, '').slice(0, 5));
          }}
        >
          {key === 'backspace' ? deleteLabel : key}
        </button>
      ))}
    </div>
  );
}

export function TaskKioskLanguageSelector({
  copy,
  detectedLocale,
  locale,
  localeOptions,
  onLocaleChange,
}: {
  copy: TaskKioskTranslations;
  detectedLocale: TaskKioskLocale | null;
  locale: TaskKioskLocale;
  localeOptions: ReadonlyArray<{ code: TaskKioskLocale; label: string }>;
  onLocaleChange: (locale: TaskKioskLocale) => void;
}) {
  return (
    <label className="flex min-w-[13rem] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
      <Globe2 className="h-4 w-4 shrink-0 text-[#9A6B05]" />
      <span className="sr-only">{copy.language.selectorLabel}</span>
      <select
        value={locale}
        onChange={(event) => onLocaleChange(event.target.value as TaskKioskLocale)}
        aria-label={copy.language.selectorLabel}
        className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
      >
        {localeOptions.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
      {detectedLocale === locale ? (
        <span
          title={copy.language.autoDetected}
          className="hidden rounded-full bg-[#F4C84A]/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A6B05] sm:inline"
        >
          {copy.language.autoBadge}
        </span>
      ) : null}
    </label>
  );
}
