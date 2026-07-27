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
    <section className="flex items-center">
      <div className="w-full rounded-[32px] border border-white/80 bg-white/92 p-6 shadow-[0_24px_70px_-42px_rgba(34,40,49,0.42)] backdrop-blur xl:p-8">
        <div className="mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#155CFF]/8 px-3 py-1 text-sm font-bold text-[#155CFF]">
            <KeyRound className="h-4 w-4" />
            {copy.accessBadge}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-[#222831]">
            {copy.welcomeTitle}
          </h2>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            {copy.welcomeText}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {sessionMessage ? (
            <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              {sessionMessage}
            </div>
          ) : null}
          <IconInput
            icon={Building2}
            label="Company name"
            value={companyName}
            onChange={onCompanyNameChange}
            onBlur={onCompanyNameBlur}
            placeholder="Enter your company name"
            autoComplete="organization"
            ariaInvalid={showCompanyNameError}
            required
          />
          {showCompanyNameError ? (
            <p className="text-sm text-red-600">Enter your company name.</p>
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
            <p className="text-sm text-red-600">{copy.emailError}</p>
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
                className="text-sm font-bold text-[#155CFF] underline-offset-4 transition hover:text-[#0B45CC] hover:underline"
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

        <div className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-600">
          <span>New to Indice?</span>
          <button
            type="button"
            onClick={onOpenSignupMode}
            className="font-bold text-[#155CFF] underline-offset-4 transition hover:text-[#0B45CC] hover:underline"
          >
            Create account
          </button>
        </div>

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
          className="h-12 rounded-xl border-slate-200 bg-white pl-10 shadow-sm"
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
          className="h-12 rounded-xl border-slate-200 bg-white pl-10 pr-12 shadow-sm"
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
