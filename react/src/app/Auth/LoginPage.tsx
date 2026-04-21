import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { authApi } from '../api/auth';
import {
  LoadingBarOverlay,
  runWithMinimumDuration,
} from '../components/LoadingBarOverlay';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { languages, useLanguage } from '../shared/context';
import { isValidEmail, normalizeEmail } from '../shared/validation/email';

const modulePillTones = [
  'bg-white/80 text-[#143675]',
  'bg-[#143675]/10 text-[#143675]',
  'bg-emerald-50 text-emerald-700',
  'bg-amber-50 text-amber-700',
] as const;

const LOGIN_MINIMUM_LOADING_MS = 2500;

export default function LoginPage() {
  const navigate = useNavigate();
  const { currentLanguage, setCurrentLanguage, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const copy = t.loginPage;

  const normalizedEmail = normalizeEmail(email);
  const emailIsValid = isValidEmail(normalizedEmail);
  const showEmailError = emailTouched && normalizedEmail.length > 0 && !emailIsValid;

  const canSubmit = useMemo(
    () => normalizedEmail.length > 0 && emailIsValid && password.trim().length > 0 && !isSubmitting,
    [emailIsValid, isSubmitting, normalizedEmail, password],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setEmailTouched(true);

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await runWithMinimumDuration(
        authApi.login({
          email: normalizedEmail,
          password,
        }),
        LOGIN_MINIMUM_LOADING_MS,
      );

      navigate('/dashboard', {
        state: {
          successToast: copy.successToast,
        },
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.errorFallback);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,54,117,0.16),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(85,141,189,0.16),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef3f8_100%)] px-4 py-6 text-slate-900">
        <div className="mx-auto mb-4 flex max-w-6xl justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 rounded-full border-slate-200 bg-white/85 px-4 text-[#143675] shadow-sm">
                <Globe className="h-4 w-4" />
                <span className="text-base">{currentLanguage.flag}</span>
                <span>{currentLanguage.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {languages.map((language) => (
                <DropdownMenuItem
                  key={language.code}
                  onClick={() => setCurrentLanguage(language)}
                  className={currentLanguage.code === language.code ? 'bg-gray-100' : ''}
                >
                  <span className="mr-2 text-xl">{language.flag}</span>
                  {language.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/80 p-8 shadow-[0_24px_80px_-40px_rgba(20,54,117,0.5)] backdrop-blur xl:p-10">
            <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-[#143675]/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-52 w-52 rounded-full bg-[#558DBD]/12 blur-3xl" />

            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-3 rounded-full border border-[#143675]/15 bg-white/85 px-4 py-2 text-sm font-medium text-[#143675] shadow-sm">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#143675] text-white">
                    <Building2 className="h-4 w-4" />
                  </span>
                  {copy.workspaceBadge}
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                    {copy.title}
                  </h1>
                  <p className="max-w-2xl text-lg leading-8 text-slate-600">
                    {copy.subtitle}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {copy.modulePills.map((label, index) => (
                    <span
                      key={`${label}-${index}`}
                      className={`rounded-full border border-slate-200 px-4 py-2 text-sm font-medium shadow-sm ${modulePillTones[index] ?? modulePillTones[0]}`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {copy.featureCards.map((feature, index) => {
                  const Icon = index === 0 ? ShieldCheck : Sparkles;

                  return (
                    <article
                      key={feature.title}
                      className="rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur"
                    >
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#143675] text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="mb-2 text-lg font-semibold text-slate-950">{feature.title}</h2>
                      <p className="text-sm leading-6 text-slate-600">{feature.description}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="flex items-center">
            <div className="w-full rounded-[28px] border border-slate-200/80 bg-white/90 p-8 shadow-[0_20px_60px_-36px_rgba(20,54,117,0.45)] backdrop-blur xl:p-10">
              <div className="mb-8 space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#143675]/8 px-3 py-1 text-sm font-medium text-[#143675]">
                  <KeyRound className="h-4 w-4" />
                  {copy.accessBadge}
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{copy.welcomeTitle}</h2>
                <p className="text-sm leading-6 text-slate-600">
                  {copy.welcomeText}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{copy.emailLabel}</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      onBlur={() => setEmailTouched(true)}
                      placeholder={copy.emailPlaceholder}
                      className="h-12 rounded-xl border-slate-200 bg-white pl-10 text-sm shadow-sm"
                      autoComplete="email"
                      aria-invalid={showEmailError}
                    />
                  </div>
                  {showEmailError ? (
                    <p className="text-sm text-red-600">{copy.emailError}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{copy.passwordLabel}</label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={copy.passwordPlaceholder}
                      className="h-12 rounded-xl border-slate-200 bg-white pl-10 pr-12 text-sm shadow-sm"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
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
                  className="h-12 w-full rounded-xl bg-[#143675] text-white hover:bg-[#0f2855]"
                >
                  {isSubmitting ? copy.signingIn : (
                    <>
                      {copy.signIn}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 text-sm text-slate-600">
                <p className="font-medium text-slate-800">{copy.insideTitle}</p>
                <p className="mt-1 leading-6">
                  {copy.insideText}
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <LoadingBarOverlay
        isVisible={isSubmitting}
        title={copy.signingIn}
      />
    </>
  );
}
