import type { ReactNode } from 'react';
import { MODULE_COLORS, type IndiceModuleTone } from '../../styles/moduleColors';

export type KioskThemeTone = IndiceModuleTone;

function kioskTone(tone: KioskThemeTone) {
  return MODULE_COLORS[tone];
}

export function KioskWorkspaceHeader({
  brandName = 'Indice',
  context,
  description,
  icon,
  kioskName,
  moduleLabel,
  tone,
}: {
  brandName?: string;
  context?: ReactNode;
  description?: string;
  icon: ReactNode;
  kioskName: string;
  moduleLabel: string;
  tone: KioskThemeTone;
}) {
  const theme = kioskTone(tone);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950 sm:static sm:px-5 sm:py-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-stretch">
        <div className={`rounded-lg border p-3 shadow-sm sm:p-4 ${theme.lightBg} ${theme.darkBg} ${theme.border} ${theme.darkBorder}`}>
          <div className="flex items-start gap-3">
            <div
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-slate-950 shadow-sm"
              style={{ backgroundColor: theme.primary }}
            >
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-black leading-none text-slate-950 dark:text-white">{brandName}</p>
              <p className={`mt-1 text-xs font-black uppercase tracking-[0.16em] ${theme.text} ${theme.darkText}`}>
                {moduleLabel}
              </p>
              <h1 className="mt-3 text-2xl font-black leading-tight text-slate-950 dark:text-white">{kioskName}</h1>
              {description ? (
                <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-600 dark:text-slate-300">{description}</p>
              ) : null}
            </div>
          </div>
        </div>
        {context ? <div className="grid grid-cols-2 gap-2">{context}</div> : null}
      </div>
    </header>
  );
}

export function KioskAccessPanel({
  children,
  description,
  icon,
  stepLabel,
  title,
  tone,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  stepLabel: string;
  title: string;
  tone: KioskThemeTone;
}) {
  const theme = kioskTone(tone);

  return (
    <section className={`rounded-lg border p-3 shadow-sm sm:p-5 ${theme.lightBg} ${theme.darkBg} ${theme.border} ${theme.darkBorder}`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-black uppercase tracking-[0.2em] ${theme.text} ${theme.darkText}`}>{stepLabel}</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{title}</h2>
          <p className="mt-1 max-w-xl text-sm leading-5 text-slate-600 dark:text-slate-300">{description}</p>
        </div>
        <div
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-slate-950 shadow-sm"
          style={{ backgroundColor: theme.primary }}
        >
          {icon}
        </div>
      </div>
      {children}
    </section>
  );
}

export function KioskPinKeypad({
  deleteLabel,
  disabled,
  maxLength,
  onChange,
  tone,
  value,
}: {
  deleteLabel: string;
  disabled: boolean;
  maxLength: number;
  onChange: (value: string) => void;
  tone: KioskThemeTone;
  value: string;
}) {
  const theme = kioskTone(tone);
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'backspace', '0'];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {keys.map(key => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          className={`flex h-14 items-center justify-center rounded-lg border border-slate-200 bg-white text-xl font-bold text-slate-950 shadow-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white ${theme.iconHover} ${key === '0' ? 'col-start-2' : ''}`}
          onFocus={event => { event.currentTarget.style.borderColor = theme.primary; }}
          onBlur={event => { event.currentTarget.style.borderColor = ''; }}
          onMouseEnter={event => { if (!disabled) event.currentTarget.style.borderColor = theme.primary; }}
          onMouseLeave={event => { event.currentTarget.style.borderColor = ''; }}
          onClick={() => {
            if (key === 'backspace') {
              onChange(value.slice(0, -1));
              return;
            }
            onChange(`${value}${key}`.replace(/\D/g, '').slice(0, maxLength));
          }}
        >
          {key === 'backspace' ? deleteLabel : key}
        </button>
      ))}
    </div>
  );
}

export function KioskMetricCard({
  accent = false,
  icon,
  label,
  tone,
  value,
  valueClassName = 'text-base',
}: {
  accent?: boolean;
  icon?: ReactNode;
  label: string;
  tone: KioskThemeTone;
  value: ReactNode;
  valueClassName?: string;
}) {
  const theme = kioskTone(tone);

  return (
    <div className={`min-w-0 rounded-lg border px-3 py-3 shadow-sm ${accent ? `${theme.lightBg} ${theme.darkBg} ${theme.border} ${theme.darkBorder}` : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'}`}>
      <div className="flex min-w-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {icon}<span className="truncate">{label}</span>
      </div>
      <div className={`mt-1 truncate font-black ${valueClassName} ${accent ? `${theme.text} ${theme.darkText}` : 'text-slate-950 dark:text-white'}`}>
        {value}
      </div>
    </div>
  );
}

export function KioskIdentitySummary({
  action,
  detail,
  initials,
  kioskLabel,
  name,
  scopeLabel,
  tone,
  verifiedLabel,
}: {
  action?: ReactNode;
  detail: string;
  initials: string;
  kioskLabel: string;
  name: string;
  scopeLabel: string;
  tone: KioskThemeTone;
  verifiedLabel: string;
}) {
  const theme = kioskTone(tone);

  return (
    <section className={`overflow-hidden rounded-lg border bg-white shadow-sm dark:bg-slate-950 ${theme.border} ${theme.darkBorder}`}>
      <div className="px-4 py-3 text-slate-950" style={{ backgroundColor: theme.primary }}>
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-base font-black">{kioskLabel}</p>
          {action}
        </div>
      </div>
      <div className="flex flex-col gap-4 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-base font-black text-slate-950 shadow-sm sm:h-16 sm:w-16 sm:text-xl" style={{ backgroundColor: theme.primary }}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">{verifiedLabel}</p>
            <p className="mt-1 truncate text-xl font-black text-slate-950 dark:text-white sm:text-2xl">{name}</p>
            <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">{detail}</p>
          </div>
        </div>
        <div className={`rounded-lg border px-3 py-2 text-sm font-black ${theme.lightBg} ${theme.darkBg} ${theme.border} ${theme.darkBorder} ${theme.text} ${theme.darkText}`}>
          {scopeLabel}
        </div>
      </div>
    </section>
  );
}
