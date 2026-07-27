import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  type LucideIcon,
} from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import type { LoginPageCopy } from './loginTypes';

type LoginFormPanelProps = {
  copy: LoginPageCopy;
  companyName: string;
  email: string;
  password: string;
  showPassword: boolean;
  isSubmitting: boolean;
  canSubmit: boolean;
  showCompanyNameError: boolean;
  showEmailError: boolean;
  errorMessage: string;
  sessionMessage: string;
  onCompanyNameChange: (value: string) => void;
  onCompanyNameBlur: () => void;
  onEmailChange: (value: string) => void;
  onEmailBlur: () => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onOpenResetModal: () => void;
  onOpenSignupMode: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function LoginFormPanel({
  copy,
  companyName,
  email,
  password,
  showPassword,
  isSubmitting,
  canSubmit,
  showCompanyNameError,
  showEmailError,
  errorMessage,
  sessionMessage,
  onCompanyNameChange,
  onCompanyNameBlur,
  onEmailChange,
  onEmailBlur,
  onPasswordChange,
  onTogglePassword,
  onOpenResetModal,
  onOpenSignupMode,
  onSubmit,
}: LoginFormPanelProps) {
  return (
    <section className="order-1 flex items-start lg:order-2 lg:items-center">
      <div className="w-full rounded-[24px] border border-white/90 bg-white/95 p-5 shadow-[0_24px_70px_-42px_rgba(34,40,49,0.42)] backdrop-blur sm:p-6 lg:rounded-[28px] xl:p-7">
        <div className="mb-5 space-y-2.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--indice-brand-border)] bg-[var(--indice-brand-soft)] px-3 py-1 text-sm font-bold text-[var(--indice-brand-action)]">
            <KeyRound className="h-4 w-4" />
            {copy.accessBadge}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#222831] sm:text-3xl">
            {copy.welcomeTitle}
          </h2>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            {copy.welcomeText}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {sessionMessage ? (
            <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              {sessionMessage}
            </div>
          ) : null}
          <IconInput
            icon={Building2}
            label={copy.companyLabel}
            value={companyName}
            onChange={onCompanyNameChange}
            onBlur={onCompanyNameBlur}
            placeholder={copy.companyPlaceholder}
            autoComplete="organization"
            ariaInvalid={showCompanyNameError}
            required
          />
          {showCompanyNameError ? (
            <p className="-mt-2 text-sm text-red-600">{copy.companyError}</p>
          ) : null}
          <IconInput
            icon={Mail}
            label={copy.emailLabel}
            type="email"
            value={email}
            onChange={onEmailChange}
            onBlur={onEmailBlur}
            placeholder={copy.emailPlaceholder}
            autoComplete="email"
            ariaInvalid={showEmailError}
          />
          {showEmailError ? (
            <p className="-mt-2 text-sm text-red-600">{copy.emailError}</p>
          ) : null}
          <PasswordInput
            copy={copy}
            label={copy.passwordLabel}
            value={password}
            autoComplete="current-password"
            showPassword={showPassword}
            onChange={onPasswordChange}
            onTogglePassword={onTogglePassword}
            action={(
              <button
                type="button"
                onClick={onOpenResetModal}
                className="text-sm font-bold text-[var(--indice-structural-blue)] underline-offset-4 transition hover:text-[var(--indice-structural-blue-hover)] hover:underline"
              >
                {copy.forgotPassword}
              </button>
            )}
          />

          {errorMessage ? (
            <ErrorBox message={errorMessage} />
          ) : null}

          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-12 w-full rounded-xl bg-[var(--indice-brand-action)] text-white shadow-sm shadow-emerald-950/15 hover:bg-[var(--indice-brand-action-hover)]"
          >
            {isSubmitting ? copy.signingIn : (
              <>
                {copy.signIn}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-600">
          <span>{copy.newAccountPrompt}</span>
          <button
            type="button"
            onClick={onOpenSignupMode}
            className="font-bold text-[var(--indice-structural-blue)] underline-offset-4 transition hover:text-[var(--indice-structural-blue-hover)] hover:underline"
          >
            {copy.createAccount}
          </button>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 border-t border-slate-100 pt-4" aria-label={copy.frameworkLabel}>
          {['#59C3A5', '#F4C84A', '#FF6B5E', '#147514'].map((color) => (
            <span
              key={color}
              className="h-2.5 w-8 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
          ))}
          <span className="ml-1 hidden text-xs font-semibold text-slate-500 sm:inline">
            {copy.visualMetricLabel}
          </span>
        </div>
      </div>
    </section>
  );
}

function IconInput({
  icon: Icon,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  autoComplete,
  ariaInvalid,
  required,
}: {
  icon: LucideIcon;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  autoComplete?: string;
  ariaInvalid?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={ariaInvalid}
          required={required}
          className="h-12 rounded-xl border-slate-200 bg-white pl-10 shadow-sm focus-visible:border-[var(--indice-brand-aqua)] focus-visible:ring-[var(--indice-brand-aqua)]/25"
        />
      </span>
    </label>
  );
}

function PasswordInput({
  copy,
  label,
  value,
  autoComplete,
  showPassword,
  onChange,
  onTogglePassword,
  action,
}: {
  copy: LoginPageCopy;
  label: string;
  value: string;
  autoComplete: string;
  showPassword: boolean;
  onChange: (value: string) => void;
  onTogglePassword: () => void;
  action?: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {action}
      </span>
      <span className="relative block">
        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={copy.passwordPlaceholder}
          autoComplete={autoComplete}
          className="h-12 rounded-xl border-slate-200 bg-white pl-10 pr-12 shadow-sm focus-visible:border-[var(--indice-brand-aqua)] focus-visible:ring-[var(--indice-brand-aqua)]/25"
          required
        />
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          aria-label={showPassword ? copy.hidePassword : copy.showPassword}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
      {message}
    </div>
  );
}
