import { CheckCircle2, KeyRound, Mail, TriangleAlert, X } from 'lucide-react';
import { useId, type FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog';
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

export function PasswordResetModal({ copy, resetEmail, isResetSubmitting, canSubmitReset,
  showResetEmailError, resetMessage, resetErrorMessage, onClose, onEmailChange, onEmailBlur, onSubmit,
}: PasswordResetModalProps) {
  const id = useId();
  return (
    <Dialog open onOpenChange={(open)=>{if(!open && !isResetSubmitting) onClose();}}>
      <DialogContent hideCloseButton className="group/recovery flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md flex-col gap-0 overflow-hidden rounded-[28px] border-slate-200 bg-white p-0 text-slate-900 shadow-[0_28px_90px_-44px_rgba(15,23,42,0.55)]" onEscapeKeyDown={(event)=>{if(isResetSubmitting)event.preventDefault();}} onPointerDownOutside={(event)=>{if(isResetSubmitting)event.preventDefault();}}>
        <div className="shrink-0 bg-[var(--indice-brand-action)] px-5 py-4 group-data-[dialog-compact-viewport=true]/recovery:py-3 text-white sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 group-data-[dialog-compact-viewport=true]/recovery:hidden px-3 py-1 text-sm font-bold">
                <KeyRound className="h-4 w-4" />{copy.resetBadge}
              </div>
              <DialogTitle className="text-2xl font-bold leading-tight tracking-tight text-white group-data-[dialog-compact-viewport=true]/recovery:text-xl">{copy.resetTitle}</DialogTitle>
              <DialogDescription className="text-sm leading-6 text-white/82 group-data-[dialog-compact-viewport=true]/recovery:hidden">{copy.resetDescription}</DialogDescription>
            </div>
            <button type="button" onClick={onClose} disabled={isResetSubmitting} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-60" aria-label={copy.resetCloseLabel}><X className="h-4 w-4" /></button>
          </div>
        </div>
        <form id={`${id}-form`} noValidate onSubmit={onSubmit} className="min-h-0 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="space-y-2">
            <label htmlFor={`${id}-email`} className="text-sm font-semibold text-slate-700">{copy.emailLabel}</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input id={`${id}-email`} type="email" inputMode="email" disabled={isResetSubmitting} maxLength={120} value={resetEmail} onChange={(event)=>onEmailChange(event.target.value)} onBlur={onEmailBlur} placeholder={copy.emailPlaceholder} className="h-12 rounded-xl border-slate-200 bg-white pl-10 text-base sm:text-sm shadow-sm focus-visible:border-[var(--indice-brand-aqua)] focus-visible:ring-[var(--indice-brand-aqua)]/25" autoComplete="email" aria-invalid={showResetEmailError} aria-describedby={showResetEmailError?`${id}-error`:undefined} autoFocus />
            </div>
            {showResetEmailError ? <p id={`${id}-error`} role="alert" className="text-sm text-red-600">{copy.emailError}</p> : null}
          </div>
          {resetMessage ? <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0"/><span>{resetMessage}</span></div> : null}
          {resetErrorMessage ? <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0"/><span>{resetErrorMessage}</span></div> : null}
        </form>
        <div className="flex shrink-0 flex-col-reverse group-data-[dialog-compact-viewport=true]/recovery:flex-row gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={isResetSubmitting} className="min-h-11 h-auto whitespace-normal rounded-xl border-slate-200 group-data-[dialog-compact-viewport=true]/recovery:flex-1">{copy.resetCancel}</Button>
          <Button type="submit" form={`${id}-form`} disabled={!canSubmitReset} className="min-h-11 h-auto whitespace-normal group-data-[dialog-compact-viewport=true]/recovery:flex-1 rounded-xl bg-[var(--indice-brand-action)] text-white hover:bg-[var(--indice-brand-action-hover)]">{isResetSubmitting?copy.resetSubmitting:copy.resetSubmit}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
