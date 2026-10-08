import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Check, CheckCircle2, Clock3, Mail, ShieldCheck } from 'lucide-react';
import { publicTrialEntryApi, type TrialEntryConfig, type TrialEntryResult, type TrialInterest } from '../api/publicTrialEntry';
import type { BillingSignupEmailVerificationResponse } from '../api/billingSignup';
import { ApiClientError } from '../lib/apiClient';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useLanguage } from '../shared/context';
import { LoginSiteHeader } from './components/LoginSiteHeader';
import { LoginSiteFooter } from './components/LoginSiteFooter';
import { PUBLIC_DIAGNOSIS_URL, PUBLIC_SITE_URL } from './components/loginSiteLinks';
import { getLoginShellCopy } from './translations/loginShell';
import { getTrialEntryCopy } from './translations/trialEntry';

const newEntryKey = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
const fieldClass = 'h-12 rounded-xl border-slate-200 bg-white text-base focus-visible:ring-[var(--indice-brand-action)]';
const actionClass = 'min-h-12 rounded-xl bg-[var(--indice-brand-action)] px-5 text-base text-white hover:bg-[var(--indice-brand-action-hover)]';

export default function TrialStartPage() {
  const [params] = useSearchParams();
  const { currentLanguage } = useLanguage();
  const copy = getTrialEntryCopy(currentLanguage.code);
  const shell = { ...getLoginShellCopy(currentLanguage.code), chooseLanguage: copy.language };
  const [config, setConfig] = useState<TrialEntryConfig | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [key] = useState(newEntryKey);
  const [form, setForm] = useState<TrialInterest>(() => ({
    fullName: '', companyName: '', email: '', confirmEmail: '', phone: '', challenge: '', contactConsent: false,
    countryCode: params.get('market') === 'CA' ? 'CA' : 'MX',
    planInterest: ['CONTROLA', 'ESCALA', 'CORPORATIVO'].includes((params.get('plan') ?? '').toUpperCase())
      ? (params.get('plan') ?? '').toUpperCase() : '',
    utmSource: (params.get('utm_source') ?? '').slice(0, 100),
    utmMedium: (params.get('utm_medium') ?? '').slice(0, 100),
    utmCampaign: (params.get('utm_campaign') ?? '').slice(0, 150),
  }));
  const [step, setStep] = useState(0);
  const [entry, setEntry] = useState('');
  const [verification, setVerification] = useState<BillingSignupEmailVerificationResponse | null>(null);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [result, setResult] = useState<TrialEntryResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'error' | 'codeError' | 'review' | 'unavailable' | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let live = true;
    publicTrialEntryApi.config().then(value => { if (live) setConfig(value); })
      .catch(() => { if (live) setError('unavailable'); })
      .finally(() => { if (live) setLoaded(true); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (resendAt <= now) return;
    const timer = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(timer);
  }, [resendAt, now]);

  const report = (failure: unknown) => setError(failure instanceof ApiClientError && failure.code === 'EMAIL_ALREADY_REGISTERED'
    ? 'review' : failure instanceof ApiClientError && failure.status === 503 ? 'unavailable' : 'error');
  const keepVerification = (value: BillingSignupEmailVerificationResponse) => {
    setVerification(value);
    setResendAt(Date.now() + value.resendAvailableInSeconds * 1000);
    setNow(Date.now());
  };
  const sendVerification = async (reference: string) => keepVerification(await publicTrialEntryApi.startVerification(reference));
  const capture = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !config?.enabled) return;
    setBusy(true); setError(null);
    try {
      const saved = await publicTrialEntryApi.interest(form, key);
      setEntry(saved.entryReference); setStep(1);
      await sendVerification(saved.entryReference);
    } catch (failure) { report(failure); }
    finally { setBusy(false); }
  };
  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !verification) return;
    setBusy(true); setError(null);
    try {
      const value = await publicTrialEntryApi.verify(entry, verification.verificationReference, otp);
      // The legacy owner returns an empty reference on a wrong OTP. Keep the pending
      // challenge so a failed attempt does not destroy the user's ability to retry.
      if (value.verified || (value.started && value.verificationReference)) keepVerification(value);
      if (!value.verified) setError('codeError');
      if (value.blocked) setVerification(null);
      setOtp('');
    } catch (failure) { report(failure); }
    finally { setBusy(false); }
  };
  const sendAgain = async () => {
    if (busy || resendAt > Date.now()) return;
    setBusy(true); setError(null);
    try {
      if (verification) {
        const value = await publicTrialEntryApi.resend(entry, verification.verificationReference);
        if (value.started && value.verificationReference) keepVerification(value);
        else { setVerification(null); setResendAt(0); setError('codeError'); }
      } else await sendVerification(entry);
    } catch (failure) { report(failure); }
    finally { setBusy(false); }
  };
  const activate = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !verification?.verified || !accepted) return;
    if (new TextEncoder().encode(password).length > 72) { setError('error'); return; }
    setBusy(true); setError(null);
    try {
      const created = await publicTrialEntryApi.activate(entry, verification.verificationReference, password, accepted);
      if (!created.provisioned) { setError(created.requiresReview ? 'review' : 'error'); return; }
      setResult(created); setPassword(''); setVerification(null); setStep(2);
    } catch (failure) { report(failure); }
    finally { setBusy(false); }
  };

  return <div className="min-h-screen bg-[#f5f8fc] text-slate-900">
    <LoginSiteHeader copy={shell} signInActive={false} />
    <main id="login-main" aria-labelledby="trial-entry-title" className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6 sm:py-12">
      <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[var(--indice-brand-action)]"><ShieldCheck aria-hidden="true" /></span>
          <div><h1 id="trial-entry-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">{copy.title}</h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">{copy.summary}</p></div>
        </div>
        <ol className="mt-7 grid gap-3 sm:grid-cols-3" aria-label={copy.title}>
          {[copy.details, copy.verify, copy.ready].map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined}
            className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-sm font-medium ${index === step ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-500'}`}>
            <span className={`grid h-7 w-7 place-items-center rounded-full ${index < step ? 'bg-emerald-50 text-emerald-700' : index === step ? 'bg-[var(--indice-brand-action)] text-white' : 'bg-slate-100'}`}>
              {index < step ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}</span>{label}</li>)}
        </ol>
      </section>
      {loaded && !config?.enabled ? <p role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{copy.unavailable} <a href={PUBLIC_DIAGNOSIS_URL} className="font-semibold underline">{shell.diagnosis}</a></p> : null}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_300px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-busy={busy}>
          <h2 className="text-xl font-semibold">{step === 0 ? copy.details : step === 1 ? copy.verify : copy.readyTitle}</h2>
          {error ? <p role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-800">{copy[error]}</p> : null}
          {step === 0 ? <form onSubmit={capture} className="mt-5 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {(['fullName', 'companyName', 'email', 'confirmEmail'] as const).map(name => <label key={name} className="grid gap-2 text-sm font-medium text-slate-700">
                {copy[name]}<Input name={name} type={name.includes('Email') || name === 'email' ? 'email' : 'text'} required minLength={name.includes('Name') ? 2 : undefined}
                  maxLength={name === 'fullName' ? 100 : name === 'companyName' ? 120 : 190} autoComplete={name === 'fullName' ? 'name' : name === 'companyName' ? 'organization' : name === 'email' ? 'email' : 'off'}
                  className={fieldClass} value={form[name]} onChange={event => setForm({ ...form, [name]: event.target.value })} disabled={busy} /></label>)}
              <label className="grid gap-2 text-sm font-medium text-slate-700">{copy.phone}<Input type="tel" autoComplete="tel" name="phone" maxLength={40} className={fieldClass} value={form.phone} disabled={busy} onChange={event => setForm({ ...form, phone: event.target.value })} /></label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">{copy.market}<select name="countryCode" className={`${fieldClass} border px-3`} value={form.countryCode} disabled={busy} onChange={event => setForm({ ...form, countryCode: event.target.value })}>
                <option value="MX">{copy.mexico}</option><option value="CA">{copy.canada}</option></select></label>
            </div>
            <p className="text-sm leading-6 text-slate-500">{copy.marketHelp}</p>
            <label className="grid gap-2 text-sm font-medium text-slate-700">{copy.challenge}<textarea name="challenge" required maxLength={3000} rows={3} className="resize-y rounded-xl border border-slate-200 p-3 text-base focus:outline-blue-500" value={form.challenge} disabled={busy} onChange={event => setForm({ ...form, challenge: event.target.value })} /></label>
            <label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-slate-600"><input type="checkbox" required checked={form.contactConsent} disabled={busy} onChange={event => setForm({ ...form, contactConsent: event.target.checked })} className="mt-1 h-5 w-5 shrink-0 accent-blue-600" />{copy.consent}</label>
            <a href={`${PUBLIC_SITE_URL}/privacidad.php`} className="inline-flex min-h-11 items-center text-sm font-medium text-blue-700 underline">{shell.privacy}</a>
            <Button type="submit" className={`${actionClass} w-full`} disabled={busy || !config?.enabled}>{busy ? copy.working : copy.continue}</Button>
          </form> : null}
          {step === 1 && !verification?.verified ? <div className="mt-5 space-y-5">
            <p className="flex items-center gap-2 text-sm text-slate-600"><Mail className="h-4 w-4" aria-hidden="true" />{verification?.maskedEmail ?? form.email}</p>
            {verification ? <form onSubmit={verify} className="space-y-5">
              <label className="grid gap-2 text-sm font-medium text-slate-700">{copy.otp}<Input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required minLength={6} maxLength={6} className={fieldClass} value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, ''))} disabled={busy} /></label>
              <Button type="submit" className={`${actionClass} w-full`} disabled={busy}>{busy ? copy.working : copy.verifyCode}</Button>
            </form> : null}
            <Button variant="outline" onClick={sendAgain} disabled={busy || resendAt > now} className="min-h-12 rounded-xl">{verification ? copy.resend : copy.sendCode}{resendAt > now ? ` (${Math.ceil((resendAt - now) / 1000)} s)` : ''}</Button>
          </div> : null}
          {step === 1 && verification?.verified ? <form onSubmit={activate} className="mt-5 space-y-5">
            <p role="status" className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-5 w-5" aria-hidden="true" />{verification.maskedEmail}</p>
            <label className="grid gap-2 text-sm font-medium text-slate-700">{copy.password}<Input type="password" autoComplete="new-password" required minLength={10} maxLength={72} className={fieldClass} value={password} disabled={busy} onChange={event => setPassword(event.target.value)} aria-describedby="trial-password-help" /></label>
            <p id="trial-password-help" className="text-sm text-slate-500">{copy.passwordHelp}</p>
            <label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-slate-600"><input type="checkbox" required checked={accepted} onChange={event => setAccepted(event.target.checked)} disabled={busy} className="mt-1 h-5 w-5 shrink-0 accent-blue-600" />{copy.terms}</label>
            <a href={`${PUBLIC_SITE_URL}/terminos.php`} className="inline-flex min-h-11 items-center text-sm font-medium text-blue-700 underline">{shell.terms}</a>
            <Button type="submit" className={`${actionClass} w-full`} disabled={busy || !accepted}>{busy ? copy.working : copy.activate}</Button>
          </form> : null}
          {step === 2 && result ? <div className="mt-5 space-y-5">
            <p role="status" className="text-base leading-7 text-slate-600">{copy.readySummary}</p>
            {result.trialEndsAt ? <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">{copy.expiry}: <strong>{new Intl.DateTimeFormat(currentLanguage.code, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(result.trialEndsAt))}</strong></p> : null}
            <Button asChild className={`${actionClass} w-full`}><Link to="/login">{shell.signIn}</Link></Button>
          </div> : null}
        </section>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5"><Clock3 className="h-6 w-6 text-blue-600" aria-hidden="true" /><p className="mt-3 text-sm leading-6 text-slate-700">{copy.scope}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">{copy.noCard}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{copy.noCardDetail}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">{copy.diagnosis}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{copy.diagnosisDetail}</p><a href={PUBLIC_DIAGNOSIS_URL} className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-blue-700 underline">{shell.diagnosis}</a></div>
          {config && !config.paidActivationReady ? <p className="px-2 text-xs leading-5 text-slate-500">{copy.paymentNotice}</p> : null}
        </aside>
      </div>
    </main>
    <LoginSiteFooter copy={shell} signInHref="/login" />
  </div>;
}
