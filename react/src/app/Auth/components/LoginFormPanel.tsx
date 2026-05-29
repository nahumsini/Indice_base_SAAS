import { ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, Mail } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import type { LoginPageCopy } from './loginTypes';

type LoginFormPanelProps = {
  copy: LoginPageCopy;
  email: string;
  password: string;
  showPassword: boolean;
  isSubmitting: boolean;
  canSubmit: boolean;
  showEmailError: boolean;
  errorMessage: string;
  onEmailChange: (value: string) => void;
  onEmailBlur: () => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onOpenResetModal: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function LoginFormPanel({
  copy,
  email,
  password,
  showPassword,
  isSubmitting,
  canSubmit,
  showEmailError,
  errorMessage,
  onEmailChange,
  onEmailBlur,
  onPasswordChange,
  onTogglePassword,
  onOpenResetModal,
  onSubmit,
}: LoginFormPanelProps) {
  return (
    <section className="flex items-center">
      <div className="w-full rounded-[32px] border border-white/80 bg-white/92 p-6 shadow-[0_24px_70px_-42px_rgba(34,40,49,0.42)] backdrop-blur xl:p-8">
        <div className="mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#155CFF]/8 px-3 py-1 text-sm font-bold text-[#155CFF]">
            <KeyRound className="h-4 w-4" />
            {copy.accessBadge}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-[#222831]">{copy.welcomeTitle}</h2>
          <p className="max-w-xl text-sm leading-6 text-slate-600">{copy.welcomeText}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">{copy.emailLabel}</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                onBlur={onEmailBlur}
                placeholder={copy.emailPlaceholder}
                className="h-12 rounded-xl border-slate-200 bg-white pl-10 text-sm shadow-sm focus-visible:ring-[#155CFF]/30"
                autoComplete="email"
                aria-invalid={showEmailError}
              />
            </div>
            {showEmailError ? (
              <p className="text-sm text-red-600">{copy.emailError}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-semibold text-slate-700">{copy.passwordLabel}</label>
              <button
                type="button"
                onClick={onOpenResetModal}
                className="text-sm font-bold text-[#155CFF] underline-offset-4 transition hover:text-[#0B45CC] hover:underline"
              >
                {copy.forgotPassword}
              </button>
            </div>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder={copy.passwordPlaceholder}
                className="h-12 rounded-xl border-slate-200 bg-white pl-10 pr-12 text-sm shadow-sm focus-visible:ring-[#155CFF]/30"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={onTogglePassword}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label={showPassword ? copy.hidePassword : copy.showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-12 w-full rounded-xl bg-[#155CFF] text-white shadow-sm shadow-[#155CFF]/20 hover:bg-[#0B45CC]"
          >
            {isSubmitting ? copy.signingIn : (
              <>
                {copy.signIn}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50/90 p-5">
          <p className="text-sm font-bold text-[#222831]">{copy.insideTitle}</p>
          <ul className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            {copy.insideItems.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#59C3A5]" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
