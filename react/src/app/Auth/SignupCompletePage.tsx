import { CheckCircle2, CircleAlert, Loader2, LogIn, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { billingSignupApi, type BillingSignupStatus } from '../api/billingSignup';
import { Button } from '../components/ui/button';

export default function SignupCompletePage() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference')
    ?? sessionStorage.getItem('indice:billing-signup-reference')
    ?? '';
  const [status, setStatus] = useState<BillingSignupStatus | null>(null);
  const [error, setError] = useState(reference ? '' : 'No encontramos la referencia segura de este registro.');

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

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(21,92,255,0.11),_transparent_38%),linear-gradient(135deg,_#F8FAFC,_#EEF3F8)] px-4 py-10 text-[#222831]">
      <section className="w-full max-w-xl rounded-[32px] border border-white/80 bg-white/95 p-7 text-center shadow-[0_30px_90px_-50px_rgba(34,40,49,0.5)] sm:p-10">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${ready ? 'bg-emerald-50 text-emerald-600' : review || error ? 'bg-amber-50 text-amber-600' : 'bg-[#155CFF]/10 text-[#155CFF]'}`}>
          {ready ? <CheckCircle2 className="h-8 w-8" /> : review || error ? <CircleAlert className="h-8 w-8" /> : <Loader2 className="h-8 w-8 animate-spin" />}
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-[#155CFF]">Registro Índice</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          {ready ? 'Tu espacio está listo' : review ? 'Necesitamos verificar tu correo' : 'Estamos preparando tu cuenta'}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm font-medium leading-6 text-slate-600">
          {status?.message ?? error ?? 'Stripe confirmó el regreso. Esperamos el evento firmado que activa tu cuenta de forma segura.'}
        </p>

        {!ready && !review ? (
          <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#59C3A5]" />
              <div>
                <p className="text-sm font-bold">No cierres esta página todavía</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">La verificación es automática e idempotente. Recargar no duplicará tu cuenta ni tu suscripción.</p>
              </div>
            </div>
          </div>
        ) : null}

        {ready ? (
          <Button asChild className="mt-8 h-12 w-full rounded-xl bg-[#155CFF] text-white hover:bg-[#0B45CC]">
            <Link to="/login"><LogIn className="h-5 w-5" /> Iniciar sesión</Link>
          </Button>
        ) : (
          <Link to="/login" className="mt-8 inline-block text-sm font-bold text-[#155CFF] underline-offset-4 hover:underline">Ir al inicio de sesión</Link>
        )}
      </section>
    </main>
  );
}
