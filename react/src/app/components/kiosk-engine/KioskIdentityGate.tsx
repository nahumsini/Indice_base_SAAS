import { ArrowRight, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useRef, type CSSProperties, type ReactNode } from 'react';
import { MODULE_COLORS } from '../../styles/moduleColors';
import { KioskPinKeypad, type KioskThemeTone } from './KioskWorkspacePrimitives';

interface KioskIdentityGateProps {
  autoFocusPin?: boolean;
  backspaceLabel: string;
  clearLabel: string;
  description: string;
  disabled?: boolean;
  isSubmitting?: boolean;
  identityField?: ReactNode;
  onPinChange: (value: string) => void;
  onSubmit: () => void;
  pinAriaLabel: string;
  pinDescription?: string;
  pinLength: number;
  pinValue: string;
  privacyMessage: string;
  submitClassName?: string;
  submitLabel: string;
  title: string;
  tone: KioskThemeTone;
}

/** Shared, presentation-only identity entry point for public kiosk workspaces. */
export function KioskIdentityGate({
  autoFocusPin = true,
  backspaceLabel,
  clearLabel,
  description,
  disabled = false,
  isSubmitting = false,
  identityField,
  onPinChange,
  onSubmit,
  pinAriaLabel,
  pinDescription,
  pinLength,
  pinValue,
  privacyMessage,
  submitClassName,
  submitLabel,
  title,
  tone,
}: KioskIdentityGateProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canSubmit = !disabled && !isSubmitting && pinValue.length === pinLength;
  const theme = MODULE_COLORS[tone];
  const usesDarkActionText = tone === 'aqua'
    || tone === 'coral'
    || tone === 'gold'
    || tone === 'yellow';
  const themeVariables = {
    '--kiosk-accent': theme.primary,
    '--kiosk-accent-hover': theme.primaryHover,
    '--kiosk-accent-soft': `${theme.primary}1A`,
    backgroundImage: `radial-gradient(circle at top, ${theme.primary}0D, transparent 52%)`,
  } as CSSProperties;

  return (
    <div className="mx-auto flex w-full max-w-[30rem] flex-1 flex-col justify-center py-2 sm:py-4">
      <section
        className={`overflow-hidden rounded-2xl border bg-white px-4 py-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.65)] dark:bg-slate-950 sm:px-7 sm:py-7 ${theme.border} ${theme.darkBorder}`}
        style={themeVariables}
      >
        <div className="text-center">
          <span
            aria-hidden="true"
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full border bg-white shadow-sm dark:bg-slate-950 ${theme.border} ${theme.darkBorder}`}
            style={{ color: theme.primary }}
          >
            <LockKeyhole className="h-6 w-6" />
          </span>
          <h2 className="mt-5 text-2xl font-medium tracking-tight text-slate-950 dark:text-white">{title}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{description}</p>
        </div>

        <form
          className="mt-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) onSubmit();
          }}
        >
          {identityField ? <div className="mb-4 text-left">{identityField}</div> : null}
          {pinDescription ? (
            <p className="mb-2 text-left text-sm font-medium leading-5 text-slate-800 dark:text-slate-100">
              {pinDescription}
            </p>
          ) : null}
          <label
            className="relative flex min-h-16 cursor-text items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-[var(--kiosk-accent)] focus-within:ring-4 focus-within:ring-[var(--kiosk-accent-soft)] dark:border-slate-700 dark:bg-slate-950"
            onClick={() => inputRef.current?.focus()}
          >
            <span className="sr-only">{pinAriaLabel}</span>
            <input
              ref={inputRef}
              aria-label={pinAriaLabel}
              autoComplete="off"
              autoFocus={autoFocusPin}
              className="absolute inset-0 h-full w-full cursor-text opacity-0"
              disabled={disabled || isSubmitting}
              enterKeyHint="done"
              inputMode="numeric"
              maxLength={pinLength}
              onChange={(event) => onPinChange(event.target.value.replace(/\D/g, '').slice(0, pinLength))}
              type="password"
              value={pinValue}
            />
            {Array.from({ length: pinLength }, (_, index) => (
              <span
                aria-hidden="true"
                className={`h-4 w-4 rounded-full border-2 transition-all duration-150 sm:h-[1.125rem] sm:w-[1.125rem] ${
                  index < pinValue.length
                    ? 'scale-90'
                    : 'border-slate-400 bg-transparent dark:border-slate-500'
                }`}
                key={index}
                style={index < pinValue.length ? { backgroundColor: theme.primary, borderColor: theme.primary } : undefined}
              />
            ))}
          </label>

          <div className="mt-4">
            <KioskPinKeypad
              backspaceLabel={backspaceLabel}
              clearLabel={clearLabel}
              deleteLabel={clearLabel}
              disabled={disabled || isSubmitting}
              maxLength={pinLength}
              onChange={onPinChange}
              tone={tone}
              value={pinValue}
            />
          </div>

          <button
            className={`mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[var(--kiosk-accent)] px-5 text-base font-medium shadow-[0_12px_24px_-16px_rgba(15,23,42,0.7)] transition hover:bg-[var(--kiosk-accent-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--kiosk-accent-soft)] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none ${usesDarkActionText ? 'text-slate-950' : 'text-white'} ${submitClassName ?? ''}`}
            disabled={!canSubmit}
            type="submit"
          >
            {isSubmitting ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : null}
            <span>{submitLabel}</span>
            {!isSubmitting ? <ArrowRight aria-hidden="true" className="h-5 w-5" /> : null}
          </button>
        </form>

        <div className="mt-5 flex items-start gap-3 border-t border-slate-200/80 pt-5 text-sm font-medium leading-5 text-slate-600 dark:border-slate-800 dark:text-slate-300">
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" style={{ color: theme.primary }} />
          <p>{privacyMessage}</p>
        </div>
      </section>

      <footer className="px-4 pb-[env(safe-area-inset-bottom)] pt-5 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">
        Powered by{' '}
        <a
          className="font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 transition hover:text-[#147514] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147514]/30 dark:text-slate-400 dark:decoration-slate-700 dark:hover:text-emerald-300"
          href="https://www.indiceapp.com"
          rel="noreferrer"
          target="_blank"
        >
          www.indiceapp.com
        </a>
      </footer>
    </div>
  );
}
