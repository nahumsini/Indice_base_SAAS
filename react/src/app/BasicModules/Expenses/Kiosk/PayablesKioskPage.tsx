import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { ArrowLeft, Check, File, KeyRound, Landmark, Loader2, Paperclip, Store, Trash2, Upload, UserPlus } from 'lucide-react';
import { FailureToast } from '../../../components/FailureToast';
import { SuccessToast } from '../../../components/SuccessToast';
import { Button } from '../../../components/ui/button';
import {
  getDefaultBudgetTaxProfile,
  inferTaxCountryFromCurrency,
  taxRateToPercentInput,
  type BudgetTaxCountry,
} from '../Budgets/budgetTaxCatalog';
import { DEFAULT_FINANCE_CURRENCY } from '../constants/financeCurrencyOptions';
import { publicPayableKioskService, type PayableKioskBootstrap } from '../services';
import { formatCurrency } from '../utils/expenses.utils';
import { BudgetTaxControls, type TaxControlDraft } from '../components/modals/BudgetTaxControls';

type ScreenMode = 'access' | 'provider-registration' | 'payable';

type PayableDraft = TaxControlDraft & {
  attachments: AttachmentDraft[];
  concept: string;
  dueDate: string;
  externalReference: string;
  notes: string;
};

type ProviderDraft = {
  contactName: string;
  email: string;
  legalName: string;
  name: string;
  notes: string;
  phone: string;
  taxId: string;
};

type AttachmentDraft = {
  file?: File;
  id: string;
  isLocalObjectUrl?: boolean;
  name: string;
  size: number;
  url?: string;
};

const inputClass = 'min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 shadow-sm placeholder:text-slate-400 transition-colors focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-[#147514]/15';
const MAX_ATTACHMENTS = 5;

export default function PayablesKioskPage() {
  const { token = '' } = useParams();
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const payableSubmissionLockRef = useRef(false);
  const [bootstrap, setBootstrap] = useState<PayableKioskBootstrap | null>(null);
  const [draft, setDraft] = useState<PayableDraft>(() => createPayableDraft(DEFAULT_FINANCE_CURRENCY));
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<ScreenMode>('access');
  const [pin, setPin] = useState('');
  const [providerDraft, setProviderDraft] = useState<ProviderDraft>(createProviderDraft());
  const [successToastMessage, setSuccessToastMessage] = useState('');

  const currency = draft.budgetCurrencyCode;
  const amount = toMoneyNumber(draft.amount);
  const taxes = draft.taxEnabled ? toMoneyNumber(draft.taxes) : 0;
  const subtotal = draft.taxEnabled && draft.taxIncluded ? Math.max(amount - taxes, 0) : amount;
  const total = draft.taxEnabled && draft.taxIncluded ? amount : amount + taxes;
  const canSubmitPayable = isAuthorized && draft.concept.trim().length > 0 && amount > 0 && !isSubmitting;
  const canSubmitProvider = providerDraft.name.trim().length > 0 && !isSubmitting;
  const canAttachMoreFiles = draft.attachments.length < MAX_ATTACHMENTS;
  const canRegisterProvider = Boolean(bootstrap?.kiosk.allowProviderRegistration);
  const title = bootstrap?.kiosk.name ?? 'Cuenta por pagar';

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    publicPayableKioskService.bootstrap(token)
      .then(response => {
        setBootstrap(response);
        setDraft(createPayableDraft(response.kiosk.currencyCode || DEFAULT_FINANCE_CURRENCY));
      })
      .catch(error => setFailureToastMessage(error instanceof Error ? error.message : 'No se pudo cargar el kiosko.'))
      .finally(() => setIsLoading(false));

    return () => revokeLocalUrls(objectUrlsRef.current);
  }, [token]);

  const updateDraft = (updates: Partial<PayableDraft>) => setDraft(current => ({ ...current, ...updates }));

  const authenticate = async () => {
    if (!pin.trim() || !token) return;
    setIsSubmitting(true);
    try {
      const response = await publicPayableKioskService.authenticate(token, pin);
      setBootstrap(response);
      setIsAuthorized(true);
      setMode('payable');
      setSuccessToastMessage('Acceso validado.');
    } catch (error) {
      setFailureToastMessage(error instanceof Error ? error.message : 'PIN no valido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addAttachments = (files: FileList | null) => {
    if (!files) return;
    const availableSlots = MAX_ATTACHMENTS - draft.attachments.length;
    const nextFiles = Array.from(files).slice(0, availableSlots).map((file, index) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.add(url);
      return { id: `payable-kiosk-file-${Date.now()}-${index}`, file, isLocalObjectUrl: true, name: file.name, size: file.size, url };
    });
    updateDraft({ attachments: [...draft.attachments, ...nextFiles] });
  };

  const removeAttachment = (attachmentId: string) => {
    const attachment = draft.attachments.find(item => item.id === attachmentId);
    if (attachment?.isLocalObjectUrl && attachment.url) {
      URL.revokeObjectURL(attachment.url);
      objectUrlsRef.current.delete(attachment.url);
    }
    updateDraft({ attachments: draft.attachments.filter(item => item.id !== attachmentId) });
  };

  const submitProvider = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !canSubmitProvider) return;
    setIsSubmitting(true);
    try {
      await publicPayableKioskService.registerProvider(token, providerDraft);
      setProviderDraft(createProviderDraft());
      setSuccessToastMessage('Registro enviado. La empresa podra revisar y compartirte un PIN.');
      setMode('access');
    } catch (error) {
      setFailureToastMessage(error instanceof Error ? error.message : 'No se pudo registrar el proveedor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitPayable = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !canSubmitPayable || payableSubmissionLockRef.current) return;
    payableSubmissionLockRef.current = true;
    setFailureToastMessage('');
    setSuccessToastMessage('');
    setIsSubmitting(true);
    try {
      const response = await publicPayableKioskService.createPayable(token, {
        concept: draft.concept.trim(),
        currencyCode: currency,
        description: draft.notes.trim(),
        dueDate: draft.dueDate || undefined,
        externalReference: draft.externalReference.trim(),
        subtotalAmount: subtotal,
        taxAmount: taxes,
        totalAmount: total,
      });
      const filesToUpload = draft.attachments.flatMap(attachment => attachment.file ? [attachment.file] : []);
      let failedUploads = 0;
      for (const file of filesToUpload) {
        try {
          await publicPayableKioskService.uploadAttachment(token, response.expenseId, file);
        } catch {
          failedUploads += 1;
        }
      }
      revokeLocalUrls(objectUrlsRef.current);
      setDraft(createPayableDraft(currency));
      if (failedUploads > 0) {
        setSuccessToastMessage(`Cuenta por pagar guardada. ${failedUploads === 1 ? 'La evidencia no pudo cargarse' : `${failedUploads} evidencias no pudieron cargarse`}; avisa al administrador para adjuntarla.`);
      } else {
        setSuccessToastMessage(filesToUpload.length > 0 ? 'Cuenta por pagar y evidencia enviadas para revision.' : 'Cuenta por pagar enviada para revision.');
      }
    } catch (error) {
      setFailureToastMessage(error instanceof Error ? error.message : 'No se pudo registrar la cuenta por pagar.');
    } finally {
      payableSubmissionLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <KioskShell title="Kiosko CxP" subtitle="Abre este flujo desde un acceso configurado en Expenses.">
        <EmptyState title="Acceso requerido" description="Crea o abre un kiosko desde la pestaña Gastos para obtener un link controlado." />
      </KioskShell>
    );
  }

  return (
    <KioskShell title={title} subtitle="Captura cuentas por pagar, facturas y datos de proveedor para revision financiera.">
      {isLoading ? (
        <div className="flex min-h-80 items-center justify-center">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-[#147514]" /> Preparando kiosko
        </div>
      ) : (
        <>
          {!isAuthorized && mode === 'access' ? (
            <section className="space-y-3">
              <ModeCard active description="Usa el PIN que te compartió la empresa." icon={<KeyRound />} label="Ingresar con PIN" onClick={() => setMode('access')} />
              <ModeCard active={false} description="Envía tus datos para revisión y espera tu PIN." disabled={!canRegisterProvider} icon={<UserPlus />} label="Registrarme como proveedor" onClick={() => setMode('provider-registration')} />
            </section>
          ) : null}

          {mode === 'access' ? (
            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">Entrar con PIN</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Tu PIN identifica de forma segura a tu proveedor.</p>
              <div className="mt-5 space-y-3">
                <input autoComplete="one-time-code" inputMode="numeric" maxLength={6} className={`${inputClass} text-center text-2xl font-black tracking-[0.3em]`} value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" type="password" />
                <Button type="button" onClick={authenticate} disabled={!pin.trim() || isSubmitting} className="h-12 w-full rounded-xl bg-[#147514] px-6 font-black text-white hover:bg-[#105010]">
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                  Entrar
                </Button>
              </div>
            </section>
          ) : null}

          {mode === 'provider-registration' ? (
            <form onSubmit={submitProvider} className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <button type="button" onClick={() => setMode('access')} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500"><ArrowLeft className="h-4 w-4" />Volver al acceso</button>
              <h2 className="text-xl font-black text-slate-950">Registro de proveedor</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Tus datos quedaran pendientes de revision antes de habilitar acceso.</p>
              <div className="mt-5 grid gap-4">
                <Field label="Nombre comercial" required><input className={inputClass} value={providerDraft.name} onChange={event => setProviderDraft({ ...providerDraft, name: event.target.value })} /></Field>
                <Field label="Razon social"><input className={inputClass} value={providerDraft.legalName} onChange={event => setProviderDraft({ ...providerDraft, legalName: event.target.value })} /></Field>
                <Field label="RFC / Tax ID"><input className={inputClass} value={providerDraft.taxId} onChange={event => setProviderDraft({ ...providerDraft, taxId: event.target.value })} /></Field>
                <Field label="Email"><input type="email" inputMode="email" autoComplete="email" className={inputClass} value={providerDraft.email} onChange={event => setProviderDraft({ ...providerDraft, email: event.target.value })} /></Field>
                <Field label="Telefono"><input type="tel" inputMode="tel" autoComplete="tel" className={inputClass} value={providerDraft.phone} onChange={event => setProviderDraft({ ...providerDraft, phone: event.target.value })} /></Field>
                <Field label="Contacto"><input className={inputClass} value={providerDraft.contactName} onChange={event => setProviderDraft({ ...providerDraft, contactName: event.target.value })} /></Field>
                <Field label="Notas"><textarea className={`${inputClass} min-h-24 resize-y`} value={providerDraft.notes} onChange={event => setProviderDraft({ ...providerDraft, notes: event.target.value })} /></Field>
              </div>
              <Button type="submit" disabled={!canSubmitProvider} className="mt-5 h-12 w-full rounded-xl bg-[#147514] font-black text-white hover:bg-[#105010]">Enviar registro</Button>
            </form>
          ) : null}

          {mode === 'payable' ? (
            <form onSubmit={submitPayable} className="space-y-5">
              <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div><h2 className="text-xl font-black text-slate-950">Cuenta por pagar</h2><p className="mt-1 text-sm font-semibold text-slate-500">{bootstrap?.provider?.name}</p></div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{currency}</span>
                </div>
                <div className="mt-5 grid gap-4">
                  <Field label="Fecha compromiso"><input type="date" value={draft.dueDate} onChange={event => updateDraft({ dueDate: event.target.value })} className={inputClass} /></Field>
                  <Field label="Referencia"><input value={draft.externalReference} onChange={event => updateDraft({ externalReference: event.target.value })} className={inputClass} placeholder="Factura, nota o folio externo" /></Field>
                  <Field label="Concepto" required><input required value={draft.concept} onChange={event => updateDraft({ concept: event.target.value })} placeholder="Ej. Servicio pendiente de pago" className={inputClass} /></Field>
                </div>
              </section>

              <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">Importe</h2>
                <div className="mt-5 grid gap-4">
                  <Field label="Monto" required><input required min={0.01} step="0.01" type="number" value={draft.amount} onChange={event => updateDraft({ amount: event.target.value })} placeholder="0.00" className={inputClass} /></Field>
                  <BudgetTaxControls draft={draft} onDraftChange={updateDraft} />
                  <div className="grid grid-cols-3 gap-2 rounded-[22px] border border-[#147514]/20 bg-[#147514]/5 p-3">
                    <SummaryMetric label="Subtotal" value={formatCurrency(subtotal, currency)} />
                    <SummaryMetric label="Impuestos" value={formatCurrency(taxes, currency)} />
                    <SummaryMetric strong label="Total" value={formatCurrency(total, currency)} />
                  </div>
                </div>
              </section>

              <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2"><Paperclip className="h-4 w-4 text-[#147514]" /><h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Evidencia</h2></div>
                <label className={`flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed bg-slate-50 px-4 py-6 text-center transition ${canAttachMoreFiles ? 'border-[#147514]/25 hover:bg-[#147514]/5' : 'cursor-not-allowed opacity-60'}`}>
                  <input type="file" multiple disabled={!canAttachMoreFiles} onChange={event => { addAttachments(event.target.files); event.target.value = ''; }} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" />
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#147514]/10 text-[#147514]"><Upload className="h-5 w-5" /></span>
                  <span className="mt-3 text-sm font-bold text-slate-900">Adjuntar evidencia</span>
                  <span className="mt-1 text-xs font-medium text-slate-500">Facturas, notas, fotos o archivos. Maximo 5 archivos de 10MB.</span>
                </label>
                {draft.attachments.length > 0 ? <div className="mt-3 space-y-2">{draft.attachments.map(attachment => <AttachmentRow key={attachment.id} attachment={attachment} onRemove={() => removeAttachment(attachment.id)} />)}</div> : null}
              </section>

              <Field label="Notas"><textarea value={draft.notes} onChange={event => updateDraft({ notes: event.target.value })} placeholder="Condiciones, instrucciones o detalles para revision." className={`${inputClass} min-h-28 resize-y`} /></Field>
              <div className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
                <Button type="submit" disabled={!canSubmitPayable} className="h-12 w-full rounded-2xl bg-[#147514] text-base font-black text-white shadow-lg shadow-[#147514]/20 hover:bg-[#105010]">
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                  Enviar cuenta por pagar
                </Button>
              </div>
            </form>
          ) : null}
        </>
      )}
      <SuccessToast isVisible={Boolean(successToastMessage)} message={successToastMessage} onClose={() => setSuccessToastMessage('')} />
      <FailureToast isVisible={Boolean(failureToastMessage)} message={failureToastMessage} onClose={() => setFailureToastMessage('')} />
    </KioskShell>
  );
}

function KioskShell({ children, subtitle, title }: { children: ReactNode; subtitle: string; title: string }) {
  return (
    <main className="min-h-[100dvh] bg-slate-100 px-3 py-3 text-slate-950 sm:py-5">
      <section className="mx-auto flex w-full max-w-[480px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
        <header className="bg-[#147514] px-5 py-5 text-white">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15"><Landmark className="h-6 w-6" /></span>
            <div><p className="text-sm font-black uppercase tracking-[0.18em] text-white/70">Expenses kiosk</p><h1 className="mt-1 text-2xl font-black">{title}</h1><p className="mt-1 text-sm font-semibold leading-6 text-white/80">{subtitle}</p></div>
          </div>
        </header>
        <div className="space-y-5 bg-slate-50/80 p-5">{children}</div>
      </section>
    </main>
  );
}

function ModeCard({ active, description, disabled, icon, label, onClick }: { active: boolean; description: string; disabled?: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left shadow-sm transition ${active ? 'border-[#147514]/30 bg-white text-slate-900' : 'border-slate-200 bg-white text-slate-700 hover:border-[#147514]/40'} disabled:cursor-not-allowed disabled:opacity-50`}><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#147514]/10 text-[#147514] [&>svg]:h-5 [&>svg]:w-5">{icon}</span><span><span className="block text-base font-black">{label}</span><span className="mt-1 block text-xs font-semibold text-slate-500">{description}</span></span></button>;
}

function EmptyState({ description, title }: { description: string; title: string }) {
  return <div className="rounded-[22px] border border-dashed border-slate-300 bg-white p-10 text-center"><Store className="mx-auto h-8 w-8 text-[#147514]" /><p className="mt-4 text-lg font-black text-slate-950">{title}</p><p className="mt-1 text-sm font-semibold text-slate-500">{description}</p></div>;
}

function Field({ children, label, required }: { children: ReactNode; label: string; required?: boolean }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">{label}{required ? ' *' : ''}</span>{children}</label>;
}

function SummaryMetric({ label, strong, value }: { label: string; strong?: boolean; value: string }) {
  return <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-2 py-3"><p className="truncate text-[10px] font-bold uppercase text-slate-500">{label}</p><p title={value} className={`mt-1 truncate text-xs ${strong ? 'font-black text-[#147514]' : 'font-bold text-slate-900'}`}>{value}</p></div>;
}

function AttachmentRow({ attachment, onRemove }: { attachment: AttachmentDraft; onRemove: () => void }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><File className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{attachment.name}</p><p className="text-xs font-medium text-slate-500">{formatFileSize(attachment.size)}</p></div><button type="button" onClick={onRemove} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100" aria-label="Eliminar archivo"><Trash2 className="h-4 w-4" /></button></div>;
}

function createPayableDraft(currency: string): PayableDraft {
  const budgetCurrencyCode = currency || DEFAULT_FINANCE_CURRENCY;
  const taxCountry = normalizeTaxCountry(inferTaxCountryFromCurrency(budgetCurrencyCode));
  const defaultTaxProfile = getDefaultBudgetTaxProfile(taxCountry);
  return { amount: '', attachments: [], budgetCurrencyCode, concept: '', dueDate: '', externalReference: '', notes: '', taxes: '', taxCountry, taxEnabled: false, taxIncluded: false, taxMode: 'none', taxProfileId: defaultTaxProfile?.id ?? '', taxRate: defaultTaxProfile ? taxRateToPercentInput(defaultTaxProfile.rate) : '', taxSpecialAmount: '' };
}

function createProviderDraft(): ProviderDraft {
  return { contactName: '', email: '', legalName: '', name: '', notes: '', phone: '', taxId: '' };
}

function revokeLocalUrls(urls: Set<string>) {
  urls.forEach(url => URL.revokeObjectURL(url));
  urls.clear();
}

function formatFileSize(bytes: number) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeTaxCountry(value: string): BudgetTaxCountry {
  return ['MX', 'US', 'CA', 'CO', 'BR', 'INTL'].includes(value) ? value as BudgetTaxCountry : 'INTL';
}

function toMoneyNumber(value: string) {
  const parsedValue = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}
