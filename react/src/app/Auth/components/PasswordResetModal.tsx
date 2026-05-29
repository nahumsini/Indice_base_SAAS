import { CheckCircle2, KeyRound, Mail, TriangleAlert, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import type { LoginPageCopy } from './loginTypes';

type PasswordResetModalProps = {
  copy: LoginPageCopy;
  resetEmail: string;
  isResetSubmitting: boolean;
  canSubmitReset: boolean;
  showResetEmailError: boolean;
  resetMessage: string;
  resetErrorMessage: string;
  onClose: () => void;
  onEmailChange: (value: string) => void;
  onEmailBlur: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function PasswordResetModal({
  copy,
  resetEmail,
  isResetSubmitting,
  canSubmitReset,
  showResetEmailError,
  resetMessage,
  resetErrorMessage,
  onClose,
  onEmailChange,
  onEmailBlur,
  onSubmit,
}: PasswordResetModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
      <section className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white text-slate-900 shadow-[0_28px_90px_-44px_rgba(15,23,42,0.55)]">
        <div className="bg-[#155CFF] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-bold">
                <KeyRound className="h-4 w-4" />
                {copy.resetBadge}
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{copy.resetTitle}</h2>
              <p className="text-sm leading-6 text-white/82">{copy.resetDescription}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isResetSubmitting}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={copy.resetCloseLabel}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">{copy.emailLabel}</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="email"
                value={resetEmail}
                onChange={(event) => onEmailChange(event.target.value)}
                onBlur={onEmailBlur}
                placeholder={copy.emailPlaceholder}
                className="h-12 rounded-xl border-slate-200 bg-white pl-10 text-sm shadow-sm focus-visible:ring-[#155CFF]/30"
                autoComplete="email"
                aria-invalid={showResetEmailError}
                autoFocus
              />
            </div>
            {showResetEmailError ? (
              <p className="text-sm text-red-600">{copy.emailError}</p>
            ) : null}
          </div>

          {resetMessage ? (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{resetMessage}</span>
            </div>
          ) : null}

          {resetErrorMessage ? (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{resetErrorMessage}</span>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isResetSubmitting}
              className="h-11 rounded-xl border-slate-200"
            >
              {copy.resetCancel}
            </Button>
            <Button
              type="submit"
              disabled={!canSubmitReset}
              className="h-11 rounded-xl bg-[#155CFF] text-white hover:bg-[#0B45CC]"
            >
              {isResetSubmitting ? copy.resetSubmitting : copy.resetSubmit}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
