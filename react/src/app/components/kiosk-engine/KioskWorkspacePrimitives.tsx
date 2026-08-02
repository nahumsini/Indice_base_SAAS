import { Delete } from 'lucide-react';
import type { ReactNode } from 'react';
import { MODULE_COLORS, type IndiceModuleTone } from '../../styles/moduleColors';

export type KioskThemeTone = IndiceModuleTone;

export interface KioskWorkspaceTabItem<Value extends string> {
  badge?: number;
  icon?: ReactNode;
  label: string;
  value: Value;
}

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
              <p className="text-lg font-medium leading-none text-slate-950 dark:text-white">{brandName}</p>
              <p className={`mt-1 text-xs font-medium ${theme.text} ${theme.darkText}`}>
                {moduleLabel}
              </p>
              <h1 className="mt-3 text-2xl font-medium leading-tight text-slate-950 dark:text-white">{kioskName}</h1>
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
          <p className={`text-xs font-medium ${theme.text} ${theme.darkText}`}>{stepLabel}</p>
          <h2 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">{title}</h2>
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
  backspaceLabel,
  clearLabel,
  deleteLabel,
  disabled,
  maxLength,
  onChange,
  tone,
  value,
}: {
  backspaceLabel?: string;
  clearLabel?: string;
  deleteLabel: string;
  disabled: boolean;
  maxLength: number;
  onChange: (value: string) => void;
  tone: KioskThemeTone;
  value: string;
}) {
  const theme = kioskTone(tone);
  const keys = clearLabel
    ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace']
    : ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'backspace', '0'];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {keys.map(key => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          aria-label={key === 'backspace' ? (backspaceLabel ?? deleteLabel) : key === 'clear' ? clearLabel : key}
          className={`flex h-14 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-medium text-slate-950 shadow-[0_5px_12px_-9px_rgba(15,23,42,0.65)] outline-none transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white ${theme.iconHover} ${key === '0' && !clearLabel ? 'col-start-2' : ''}`}
          onFocus={event => { event.currentTarget.style.borderColor = theme.primary; }}
          onBlur={event => { event.currentTarget.style.borderColor = ''; }}
          onMouseEnter={event => { if (!disabled) event.currentTarget.style.borderColor = theme.primary; }}
          onMouseLeave={event => { event.currentTarget.style.borderColor = ''; }}
          onClick={() => {
            if (key === 'backspace') {
              onChange(value.slice(0, -1));
              return;
            }
            if (key === 'clear') {
              onChange('');
              return;
            }
            onChange(`${value}${key}`.replace(/\D/g, '').slice(0, maxLength));
          }}
        >
          {key === 'backspace'
            ? <Delete aria-hidden="true" className="h-5 w-5" />
            : key === 'clear'
              ? <span className="text-xs font-medium">{clearLabel}</span>
              : key}
        </button>
      ))}
    </div>
  );
}

/** Mobile-first kiosk navigation. Keep it immediately below the workspace title. */
export function KioskWorkspaceTabs<Value extends string>({
  activeBackgroundColor,
  activeTextClassName,
  activeValue,
  ariaLabel,
  items,
  onChange,
  sticky = true,
  tone,
}: {
  activeBackgroundColor?: string;
  activeTextClassName?: string;
  activeValue: Value;
  ariaLabel: string;
  items: ReadonlyArray<KioskWorkspaceTabItem<Value>>;
  onChange: (value: Value) => void;
  sticky?: boolean;
  tone: KioskThemeTone;
}) {
  const theme = kioskTone(tone);
  const activeTextClass = activeTextClassName ?? (tone === 'aqua' || tone === 'yellow' || tone === 'gold'
    ? 'text-slate-950'
    : 'text-white');

  return (
    <nav
      aria-label={ariaLabel}
      className={`${sticky ? 'sticky top-0 z-20' : ''} grid gap-1.5 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-950/95`}
      role="tablist"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map(item => {
        const active = activeValue === item.value;
        return (
          <button
            aria-selected={active}
            className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[11px] font-medium leading-tight outline-none transition focus-visible:ring-4 focus-visible:ring-slate-400/25 ${active ? `${activeTextClass} shadow-sm` : `bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 ${theme.iconHover}`}`}
            key={item.value}
            onClick={() => onChange(item.value)}
            role="tab"
            style={active ? { backgroundColor: activeBackgroundColor ?? theme.primary } : undefined}
            type="button"
          >
            {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
            <span className="w-full truncate text-center">{item.label}</span>
            {typeof item.badge === 'number' ? (
              <span className={`absolute right-1 top-1 rounded-full px-1.5 py-0.5 text-[9px] leading-none ${active ? 'bg-white/20' : 'bg-white text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-300'}`}>
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
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
      <div className="flex min-w-0 items-center gap-2 text-[10px] font-medium text-slate-500 dark:text-slate-400">
        {icon}<span className="truncate">{label}</span>
      </div>
      <div className={`mt-1 truncate font-medium ${valueClassName} ${accent ? `${theme.text} ${theme.darkText}` : 'text-slate-950 dark:text-white'}`}>
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
          <p className="truncate text-base font-medium">{kioskLabel}</p>
          {action}
        </div>
      </div>
      <div className="p-3 sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-base font-medium text-slate-950 shadow-sm" style={{ backgroundColor: theme.primary }}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{verifiedLabel}</p>
            <p className="mt-1 line-clamp-2 break-words text-lg font-medium leading-tight text-slate-950 dark:text-white">{name}</p>
            <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{detail}</p>
          </div>
        </div>
        <div className={`mt-3 w-full truncate rounded-lg border px-3 py-2 text-sm font-medium ${theme.lightBg} ${theme.darkBg} ${theme.border} ${theme.darkBorder} ${theme.text} ${theme.darkText}`}>
          {scopeLabel}
        </div>
      </div>
    </section>
  );
}
