import { CheckCircle2, CircleAlert, Loader2, LogIn, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { billingSignupApi, type BillingSignupStatus } from '../api/billingSignup';
import { Button } from '../components/ui/button';
import { IndiceBrandLogo } from './components/IndiceBrandLogo';

const LOGIN_SIGNUP_DRAFT_STORAGE_KEY = 'indice.auth.signupDraft.v1';
const BILLING_SIGNUP_REFERENCE_STORAGE_KEY = 'indice:billing-signup-reference';

type LoginPrefill = {
  companyName: string;
  email: string;
};

const readLoginPrefill = (): LoginPrefill => {
  if (typeof window === 'undefined') {
    return { companyName: '', email: '' };
  }
  const rawDraft = window.sessionStorage.getItem(LOGIN_SIGNUP_DRAFT_STORAGE_KEY)
    ?? window.localStorage.getItem(LOGIN_SIGNUP_DRAFT_STORAGE_KEY);
  if (!rawDraft) {
    return { companyName: '', email: '' };
  }
  try {
    const draft = JSON.parse(rawDraft) as { companyName?: unknown; email?: unknown };
    return {
      companyName: typeof draft.companyName === 'string' ? draft.companyName.trim() : '',
      email: typeof draft.email === 'string' ? draft.email.trim().toLowerCase() : '',
    };
  } catch {
    return { companyName: '', email: '' };
  }
};

export default function SignupCompletePage() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference')
    ?? sessionStorage.getItem(BILLING_SIGNUP_REFERENCE_STORAGE_KEY)
    ?? '';
  const [status, setStatus] = useState<BillingSignupStatus | null>(null);
  const [error, setError] = useState(reference ? '' : 'No encontramos la referencia segura de este registro.');
  const [loginPrefill] = useState(readLoginPrefill);

  useEffect(() => {
    if (!reference || status?.loginReady || status?.requiresReview) {
      return undefined;
    }
    let active = true;
    let timer: number | undefined;
    const check = async () => {
      try {
        const next = await billingSignupApi.status(reference);
        if (!active) return;
        setStatus(next);
        setError('');
        if (!next.loginReady && !next.requiresReview) {
          timer = window.setTimeout(check, 2000);
        }
      } catch (reason) {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'No pudimos consultar el estado de tu cuenta.');
        timer = window.setTimeout(check, 4000);
      }
    };
    void check();
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [reference, status?.loginReady, status?.requiresReview]);

  const ready = status?.loginReady;
  const review = status?.requiresReview;

  useEffect(() => {
    if (!ready || typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem(LOGIN_SIGNUP_DRAFT_STORAGE_KEY);
    window.sessionStorage.removeItem(LOGIN_SIGNUP_DRAFT_STORAGE_KEY);
    window.sessionStorage.removeItem(BILLING_SIGNUP_REFERENCE_STORAGE_KEY);
  }, [ready]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(89,195,165,0.14),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.08),_transparent_30%),linear-gradient(135deg,_#F8FAFC,_#EEF3F8)] px-4 py-5 font-sans text-[#222831] sm:px-6 lg:px-8 lg:py-7">
      <div className="mx-auto max-w-[1280px]">
        <Link to="/login" aria-label="Índice" className="inline-block">
          <IndiceBrandLogo alt="Índice" className="h-11 w-44" imageClassName="w-[202px]" />
        </Link>

        <ol className="mx-auto my-6 grid max-w-2xl grid-cols-3" aria-label="Progreso del registro">
          {['Cuenta', 'Configuración', 'Activación'].map((step, index) => (
            <li key={step} className="relative flex flex-col items-center gap-1.5 text-center">
              {index > 0 ? <span className="absolute right-1/2 top-4 h-px w-full bg-[var(--indice-brand-aqua)]" aria-hidden="true" /> : null}
              <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--indice-brand-action)] bg-[var(--indice-brand-action)] text-xs font-medium text-white" aria-current={index === 2 && !ready ? 'step' : undefined}>
                {index < 2 || ready ? <CheckCircle2 className="h-4 w-4" /> : 3}
              </span>
              <span className="text-xs font-medium text-slate-800 sm:text-sm">{step}</span>
            </li>
          ))}
        </ol>

        <section className="mx-auto w-full max-w-xl overflow-hidden rounded-[28px] border border-white/90 bg-white/95 text-center shadow-[0_30px_90px_-50px_rgba(34,40,49,0.5)] backdrop-blur">
          <div className="h-1.5 bg-[linear-gradient(90deg,#59C3A5_0_25%,#F4C84A_25%_50%,#FF6B5E_50%_75%,#2563EB_75%)]" aria-hidden="true" />
          <div className="p-7 sm:p-10">
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${ready ? 'bg-emerald-50 text-emerald-600' : review || error ? 'bg-amber-50 text-amber-600' : 'bg-[var(--indice-brand-soft)] text-[var(--indice-brand-action)]'}`}>
              {ready ? <CheckCircle2 className="h-8 w-8" /> : review || error ? <CircleAlert className="h-8 w-8" /> : <Loader2 className="h-8 w-8 animate-spin" />}
            </div>
            <p className="mt-6 text-sm font-medium text-[var(--indice-brand-action)]">Activación Índice</p>
            <h1 className="mt-2 text-3xl font-medium tracking-tight">
              {ready ? 'Tu espacio está listo' : review ? 'Necesitamos verificar tu correo' : 'Estamos preparando tu cuenta'}
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm font-normal leading-6 text-slate-600">
              {status?.message ?? error ?? 'Stripe confirmó el regreso. Esperamos el evento firmado que activa tu cuenta de forma segura.'}
            </p>

            {!ready && !review ? (
              <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#59C3A5]" />
                  <div>
                    <p className="text-sm font-medium">No cierres esta página todavía</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">La verificación es automática e idempotente. Recargar no duplicará tu cuenta ni tu suscripción.</p>
                  </div>
                </div>
              </div>
            ) : null}

            {ready ? (
              <Button asChild className="mt-8 h-12 w-full rounded-xl bg-[var(--indice-brand-action)] text-white hover:bg-[var(--indice-brand-action-hover)]">
                <Link
                  to="/login"
                  state={{
                    companyName: loginPrefill.companyName,
                    email: loginPrefill.email,
                  }}
                >
                  <LogIn className="h-5 w-5" /> Iniciar sesión
                </Link>
              </Button>
            ) : (
              <Link to="/login" className="mt-8 inline-block text-sm font-medium text-[var(--indice-structural-blue)] underline-offset-4 hover:text-[var(--indice-structural-blue-hover)] hover:underline">Ir al inicio de sesión</Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
