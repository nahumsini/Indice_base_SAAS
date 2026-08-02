import { CheckCircle2, Globe2, type LucideIcon } from 'lucide-react';
import type { KioskLocale, KioskTranslations } from './translations';

export type KioskStepState = 'done' | 'active' | 'pending';

export type KioskStepItem = {
  label: string;
  state: KioskStepState;
  Icon: LucideIcon;
};

type PinKeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'backspace';

export function deriveInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '??';
  }

  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  return initials || '??';
}

export function KioskStepGuide({ stepLabel, steps }: { stepLabel: string; steps: KioskStepItem[] }) {
  return (
    <div className="space-y-3">
      {steps.map(({ label, state, Icon }, index) => (
        <div
          key={label}
          className={`flex items-center gap-3 rounded-lg border px-3 py-3 transition ${
            state === 'done'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-200'
              : state === 'active'
                ? 'border-[#59C3A5]/35 bg-[#59C3A5]/8 text-[#59C3A5] shadow-[0_2px_10px_rgba(89,195,165,0.08)] dark:border-[#8FE0CA]/35 dark:bg-[#8FE0CA]/10 dark:text-[#8FE0CA]'
                : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-400'
          }`}
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              state === 'done'
                ? 'bg-emerald-500 text-white'
                : state === 'active'
                  ? 'bg-[#59C3A5] text-slate-950 dark:bg-[#8FE0CA] dark:text-slate-950'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {state === 'done' ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium opacity-70">{stepLabel} {index + 1}</p>
            <p className="mt-0.5 text-sm font-medium">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function KioskStatusMetric({
  label,
  value,
  Icon,
  isStrong = false,
}: {
  label: string;
  value: string;
  Icon: LucideIcon;
  isStrong?: boolean;
}) {
  return (
    <div className={`min-w-0 rounded-lg border px-4 py-3 ${isStrong ? 'border-[#59C3A5]/25 bg-[#59C3A5]/8 dark:border-[#8FE0CA]/25 dark:bg-[#8FE0CA]/10' : 'border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-950/75'}`}>
      <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <p className={`mt-2 truncate text-base font-medium ${isStrong ? 'text-[#59C3A5] dark:text-[#8FE0CA]' : 'text-slate-950 dark:text-white'}`}>
        {value}
      </p>
    </div>
  );
}

export function KioskLanguageSelector({
  copy,
  detectedLocale,
  locale,
  localeOptions,
  onLocaleChange,
}: {
  copy: KioskTranslations;
  detectedLocale: KioskLocale | null;
  locale: KioskLocale;
  localeOptions: ReadonlyArray<{ code: KioskLocale; label: string }>;
  onLocaleChange: (locale: KioskLocale) => void;
}) {
  return (
    <label className="flex w-full min-w-0 max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950/75 dark:text-slate-200 sm:w-auto sm:min-w-[13rem] sm:px-3">
      <Globe2 className="h-4 w-4 shrink-0 text-[#59C3A5] dark:text-[#8FE0CA]" />
      <span className="sr-only">{copy.language.selectorLabel}</span>
      <select
        value={locale}
        onChange={(event) => onLocaleChange(event.target.value as KioskLocale)}
        aria-label={copy.language.selectorLabel}
        className="min-w-0 flex-1 truncate bg-transparent text-sm font-medium outline-none"
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
          className="hidden rounded-full bg-[#59C3A5]/8 px-2 py-0.5 text-[10px] font-medium text-[#59C3A5] dark:bg-[#8FE0CA]/10 dark:text-[#8FE0CA] sm:inline"
        >
          {copy.language.autoBadge}
        </span>
      ) : null}
    </label>
  );
}

export function KioskFlowStepper({ stepLabel, steps }: { stepLabel: string; steps: KioskStepItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {steps.map(({ label, state, Icon }, index) => (
        <div
          key={label}
          className={`relative overflow-hidden rounded-lg border px-3 py-3 transition ${
            state === 'done'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-200'
              : state === 'active'
                ? 'border-[#59C3A5]/35 bg-white text-[#59C3A5] shadow-sm dark:border-[#8FE0CA]/35 dark:bg-slate-950 dark:text-[#8FE0CA]'
                : 'border-slate-200 bg-white/80 text-slate-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-400'
          }`}
        >
          {state === 'active' ? <div className="absolute inset-y-0 left-0 w-1 bg-[#59C3A5] dark:bg-[#8FE0CA]" /> : null}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                state === 'done'
                  ? 'bg-emerald-500 text-white'
                  : state === 'active'
                    ? 'bg-[#59C3A5] text-slate-950 dark:bg-[#8FE0CA] dark:text-slate-950'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {state === 'done' ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium opacity-70">{stepLabel} {index + 1}</p>
              <p className="mt-0.5 truncate text-sm font-medium">{label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function KioskPinKeypad({
  value,
  disabled,
  backspaceLabel,
  onChange,
}: {
  value: string;
  disabled: boolean;
  backspaceLabel: string;
  onChange: (nextValue: string) => void;
}) {
  const keys: PinKeypadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'backspace', '0'];

  const handleKey = (key: PinKeypadKey) => {
    if (disabled) {
      return;
    }

    if (key === 'backspace') {
      onChange(value.slice(0, -1));
      return;
    }

    onChange(`${value}${key}`.replace(/\D/g, '').slice(0, 5));
  };

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => handleKey(key)}
          className={`flex h-14 items-center justify-center rounded-lg border border-slate-200 bg-white text-xl font-medium text-slate-950 shadow-sm transition hover:border-[#59C3A5]/35 hover:bg-[#59C3A5]/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-[#8FE0CA]/35 dark:hover:bg-[#8FE0CA]/10 ${
            key === '0' ? 'col-start-2' : ''
          }`}
        >
          {key === 'backspace' ? <span className="text-sm font-medium">{backspaceLabel}</span> : key}
        </button>
      ))}
    </div>
  );
}
