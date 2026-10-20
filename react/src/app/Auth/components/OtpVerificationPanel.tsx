import {useEffect, useId, useRef, type FormEvent} from 'react';
import {ArrowLeft, ArrowRight, KeyRound, RefreshCw, ShieldCheck} from 'lucide-react';
import {Button} from '../../components/ui/button';
import {Input} from '../../components/ui/input';
import type {LoginVerificationCopy} from '../loginVerificationCopy';

export function OtpVerificationPanel({copy, maskedDestination, otpCode, isSubmitting, isResending, canSubmit, resendAvailableIn, expiresIn, unavailable, errorMessage, statusMessage, uncertain, onOtpChange, onSubmit, onResend, onBack}: {
  copy: LoginVerificationCopy; maskedDestination: string; otpCode: string;
  isSubmitting: boolean; isResending: boolean; canSubmit: boolean; resendAvailableIn: number; expiresIn: number;
  unavailable: boolean; errorMessage: string; statusMessage: string; uncertain: boolean;
  onOtpChange: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResend: () => void; onBack: () => void;
}) {
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(()=>{ heading.current?.focus(); }, []);
  const busy = isSubmitting || isResending;
  const expired = expiresIn <= 0;
  return <section className="order-1 flex min-w-0 items-start lg:order-2 lg:items-center">
    <div className="w-full rounded-[24px] border border-white/90 bg-white/95 p-5 shadow-[0_24px_70px_-42px_rgba(34,40,49,0.42)] backdrop-blur sm:p-6 lg:rounded-[28px] xl:p-7">
      <button type="button" onClick={onBack} disabled={busy} className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--indice-structural-blue)] underline-offset-4 hover:underline disabled:opacity-50">
        <ArrowLeft className="h-4 w-4 shrink-0"/>{copy.back}
      </button>
      <div className="mb-5 space-y-2.5">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--indice-brand-border)] bg-[var(--indice-brand-soft)] px-3 py-1 text-sm font-bold text-[var(--indice-brand-action)]"><ShieldCheck className="h-4 w-4"/>{copy.badge}</div>
        <h2 ref={heading} tabIndex={-1} className="text-2xl font-bold tracking-tight text-[#222831] outline-none sm:text-3xl">{copy.title}</h2>
        <p className="text-sm leading-6 text-slate-600">{copy.sent} <strong className="break-all">{maskedDestination}</strong>.</p>
      </div>
      <form onSubmit={onSubmit} aria-busy={busy} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor={id} className="text-sm font-semibold text-slate-700">{copy.code}</label>
          <span className="relative block"><KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>
            <Input id={id} name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" enterKeyHint="go" value={otpCode} onChange={e=>onOtpChange(e.target.value)} placeholder="000000" disabled={busy || expired || unavailable} aria-invalid={errorMessage === copy.invalid} aria-describedby={`${id}-help${errorMessage || expired ? ` ${id}-error` : ''}`} className="h-12 rounded-xl border-slate-200 bg-white pl-10 text-center text-lg font-bold tracking-[0.35em] shadow-sm focus-visible:border-[var(--indice-brand-aqua)] focus-visible:ring-[var(--indice-brand-aqua)]/25" required/>
          </span>
          <p id={`${id}-help`} className="text-sm leading-5 text-slate-500">{copy.hint}</p>
          {!expired && !unavailable ? <p className="text-sm font-semibold text-slate-600">{copy.expires} {Math.floor(expiresIn/60)}:{String(expiresIn%60).padStart(2,'0')}</p> : null}
        </div>
        {errorMessage || expired ? <div role="alert" id={`${id}-error`} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{expired ? copy.expired : errorMessage}</div> : null}
        {statusMessage ? <p role="status" className="text-sm font-semibold text-emerald-700">{statusMessage}</p> : null}
        <Button type="submit" disabled={!canSubmit} className="h-12 w-full rounded-xl bg-[var(--indice-brand-action)] text-white shadow-sm hover:bg-[var(--indice-brand-action-hover)]">{isSubmitting ? copy.verifying : <>{copy.verify}<ArrowRight className="h-4 w-4"/></>}</Button>
        {uncertain ? <Button type="button" variant="outline" className="min-h-11 w-full" disabled={busy} onClick={()=>window.location.reload()}>{copy.reload}</Button> : null}
      </form>
      <div className="mt-4 flex justify-center text-sm text-slate-600">
        <button type="button" onClick={onResend} disabled={busy || expired || unavailable || resendAvailableIn>0} className="inline-flex min-h-11 items-center gap-2 font-bold text-[var(--indice-structural-blue)] hover:underline disabled:text-slate-400 disabled:no-underline"><RefreshCw className={`h-4 w-4 shrink-0 ${isResending?'animate-spin':''}`}/>{isResending ? copy.resending : resendAvailableIn>0 ? `${copy.resendIn} ${resendAvailableIn}s` : copy.resend}</button>
      </div>
    </div>
  </section>;
}
