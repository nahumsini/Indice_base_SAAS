import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  LoaderCircle,
  Send,
} from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { KioskIdentityGate } from '../../components/kiosk-engine/KioskIdentityGate';
import type { ProviderCenterPublicCopy } from '../providerCenterPublicTranslations';

export type ProviderRegistrationPayload = {
  name: string;
  legal_name?: string;
  tax_id?: string;
  email: string;
  phone?: string;
  contact_name: string;
  notes?: string;
};

interface ProviderCenterAccessGateProps {
  allowRegistration: boolean;
  busy: boolean;
  backspaceLabel: string;
  clearLabel: string;
  companyName: string;
  copy: ProviderCenterPublicCopy;
  error: string;
  onClearError: () => void;
  onRegister: (payload: ProviderRegistrationPayload) => Promise<string>;
  onSubmit: (providerName: string, pin: string) => Promise<void>;
}

const inputClassName = 'mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[15px] font-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#177D66] focus:ring-4 focus:ring-[#59C3A5]/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900';

export function ProviderCenterAccessGate({
  allowRegistration,
  backspaceLabel,
  busy,
  clearLabel,
  companyName,
  copy,
  error,
  onClearError,
  onRegister,
  onSubmit,
}: ProviderCenterAccessGateProps) {
  const [view, setView] = useState<'access' | 'registration' | 'success'>('access');
  const [providerName, setProviderName] = useState('');
  const [pin, setPin] = useState('');
  const [registering, setRegistering] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [registrationError, setRegistrationError] = useState('');

  const showAccess = () => {
    setView('access');
    setRegistrationError('');
    onClearError();
  };

  const register = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (registering) return;
    const values = new FormData(event.currentTarget);
    setRegistering(true);
    setRegistrationError('');
    try {
      const message = await onRegister({
        name: String(values.get('name') ?? '').trim(),
        legal_name: String(values.get('legal_name') ?? '').trim(),
        tax_id: String(values.get('tax_id') ?? '').trim(),
        email: String(values.get('email') ?? '').trim(),
        phone: String(values.get('phone') ?? '').trim(),
        contact_name: String(values.get('contact_name') ?? '').trim(),
        notes: String(values.get('notes') ?? '').trim(),
      });
      setRegistrationMessage(message);
      setView('success');
    } catch (failure) {
      setRegistrationError(failure instanceof Error && failure.message
        ? failure.message
        : copy.registration.genericError);
    } finally {
      setRegistering(false);
    }
  };

  if (view === 'success') {
    return (
      <div className="mx-auto my-auto w-full max-w-xl px-1 py-5 sm:px-4">
        <section className="rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-[0_18px_50px_-38px_rgba(15,23,42,0.65)] dark:border-emerald-900 dark:bg-slate-950 sm:p-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#59C3A5]/15 text-[#177D66] dark:text-emerald-300">
            <CheckCircle2 aria-hidden="true" className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-2xl font-medium text-slate-950 dark:text-white">{copy.registration.successTitle}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">{registrationMessage}</p>
          <button
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-5 text-sm font-medium text-white transition hover:bg-[#126553] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#59C3A5]/25"
            onClick={showAccess}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {copy.registration.returnToAccess}
          </button>
        </section>
      </div>
    );
  }

  if (view === 'registration') {
    return (
      <div className="mx-auto my-auto w-full max-w-2xl px-1 py-4 sm:px-4 sm:py-6">
        <form className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_55px_-40px_rgba(15,23,42,0.7)] dark:border-slate-800 dark:bg-slate-950" onSubmit={register}>
          <header className="border-b border-[#59C3A5]/35 bg-[#59C3A5]/12 px-4 py-5 sm:px-6">
            <button className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-[#126553] outline-none transition hover:bg-white/60 focus-visible:ring-4 focus-visible:ring-[#59C3A5]/25 dark:text-emerald-300 dark:hover:bg-slate-900/60" onClick={showAccess} type="button">
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              {copy.registration.back}
            </button>
            <div className="mt-3 flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#59C3A5]/35 bg-white text-[#177D66] shadow-sm dark:bg-slate-950 dark:text-emerald-300">
                <Building2 aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-medium text-[#222831] dark:text-white sm:text-2xl">{copy.registration.title}</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.registration.description(companyName)}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{copy.registration.requiredHelp}</p>
              </div>
            </div>
          </header>

          <fieldset className="divide-y divide-slate-200 dark:divide-slate-800" disabled={registering}>
            <FormSection title={copy.registration.businessSection}>
              <label className="sm:col-span-2"><FieldLabel>{copy.registration.commercialName}</FieldLabel><input autoComplete="organization" autoFocus className={inputClassName} maxLength={180} minLength={2} name="name" required /></label>
              <label><FieldLabel>{copy.registration.legalName}</FieldLabel><input autoComplete="organization" className={inputClassName} maxLength={220} name="legal_name" /></label>
              <label><FieldLabel>{copy.registration.taxId}</FieldLabel><input className={inputClassName} maxLength={80} name="tax_id" /></label>
            </FormSection>
            <FormSection title={copy.registration.contactSection}>
              <label><FieldLabel>{copy.registration.contactName}</FieldLabel><input autoComplete="name" className={inputClassName} maxLength={180} minLength={2} name="contact_name" required /></label>
              <label><FieldLabel>{copy.registration.email}</FieldLabel><input autoComplete="email" className={inputClassName} maxLength={180} name="email" required type="email" /></label>
              <label className="sm:col-span-2"><FieldLabel>{copy.registration.phone}</FieldLabel><input autoComplete="tel" className={inputClassName} inputMode="tel" maxLength={60} name="phone" type="tel" /></label>
            </FormSection>
            <FormSection title={copy.registration.supplySection}>
              <label className="sm:col-span-2"><FieldLabel>{copy.registration.supplies}</FieldLabel><textarea className={`${inputClassName} min-h-28 resize-y py-3`} maxLength={4000} name="notes" placeholder={copy.registration.suppliesPlaceholder} rows={4} /></label>
            </FormSection>
          </fieldset>

          <footer className="border-t border-[#59C3A5]/30 bg-[#59C3A5]/10 px-4 py-4 sm:px-6">
            {registrationError ? <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200" role="alert">{registrationError}</p> : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button className="min-h-12 rounded-xl px-4 text-sm font-medium text-slate-600 outline-none hover:bg-white/65 focus-visible:ring-4 focus-visible:ring-[#59C3A5]/25 dark:text-slate-300 dark:hover:bg-slate-900/60" onClick={showAccess} type="button">{copy.registration.back}</button>
              <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-5 text-sm font-medium text-white transition hover:bg-[#126553] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#59C3A5]/25 disabled:cursor-not-allowed disabled:opacity-50" disabled={registering} type="submit">
                {registering ? <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" /> : <Send aria-hidden="true" className="h-4 w-4" />}
                {registering ? copy.registration.submitting : copy.registration.submit}
              </button>
            </div>
          </footer>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto my-auto w-full max-w-xl space-y-3 px-1 py-4 sm:px-4 sm:py-6">
      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200" role="alert">{error}</p> : null}
      <KioskIdentityGate
        autoFocusPin={false}
        backspaceLabel={backspaceLabel}
        clearLabel={clearLabel}
        description={copy.access.description(companyName)}
        disabled={busy || providerName.trim().length < 2}
        identityField={(
          <label className="block">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100"><Building2 aria-hidden="true" className="h-4 w-4 text-[#177D66]" />{copy.access.providerName}</span>
            <span className="mt-1 block text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">{copy.access.providerNameHelp}</span>
            <input
              aria-describedby="provider-company-name-help"
              autoComplete="organization"
              autoFocus
              className={inputClassName}
              disabled={busy}
              maxLength={180}
              minLength={2}
              onChange={event => { setProviderName(event.target.value); if (error) onClearError(); }}
              placeholder={copy.access.providerNamePlaceholder}
              required
              value={providerName}
            />
            <span className="sr-only" id="provider-company-name-help">{copy.access.providerNameHelp}</span>
          </label>
        )}
        isSubmitting={busy}
        onPinChange={value => { setPin(value); if (error) onClearError(); }}
        onSubmit={() => void onSubmit(providerName.trim(), pin)}
        pinAriaLabel={copy.access.pinAriaLabel}
        pinDescription={copy.access.pinDescription}
        pinLength={6}
        pinValue={pin}
        privacyMessage={copy.access.privacy}
        submitLabel={copy.access.submit}
        title={copy.access.title}
        tone="aqua"
      />
      {allowRegistration ? (
        <button
          className="group flex min-h-14 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm outline-none transition hover:border-[#59C3A5] hover:bg-[#59C3A5]/8 focus-visible:ring-4 focus-visible:ring-[#59C3A5]/25 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20"
          onClick={() => { setView('registration'); onClearError(); }}
          type="button"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#59C3A5]/15 text-[#177D66] dark:text-emerald-300"><Building2 aria-hidden="true" className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-900 dark:text-white">{copy.access.requestAccess}</span><span className="mt-0.5 block text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">{copy.access.requestAccessHelp}</span></span>
          <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#177D66]" />
        </button>
      ) : null}
    </div>
  );
}

function FormSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="px-4 py-5 sm:px-6">
      <h3 className="text-base font-medium text-slate-950 dark:text-white">{title}</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-sm font-normal text-slate-700 dark:text-slate-200">{children}</span>;
}
