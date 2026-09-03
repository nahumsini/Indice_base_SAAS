import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Check, FileText, LoaderCircle, Paperclip, Trash2, Upload, WalletCards } from 'lucide-react';
import type { MultiKioskChildWorkspace } from '../api/multiKiosks';
import { multiKioskPublicApi } from '../api/multiKiosks';
import {
  getDefaultBudgetTaxProfile,
  inferTaxCountryFromCurrency,
  taxRateToPercentInput,
  type BudgetTaxCountry,
} from '../BasicModules/Expenses/Budgets/budgetTaxCatalog';
import {
  BudgetTaxControls,
  type TaxControlDraft,
} from '../BasicModules/Expenses/components/modals/BudgetTaxControls';
import { useExpensesTranslations } from '../BasicModules/Expenses/Expenses/hooks/useExpensesTranslations';
import { Button } from '../components/ui/button';
import {
  uploadPresignedKioskFile,
  type KioskPresignedUpload,
} from './multiKioskWorkspaceUploads';

interface PayablesMultiKioskWorkspaceProps {
  kioskId: number;
  onAuthorizationFailure: (error: unknown) => boolean;
  onRefresh: () => Promise<void>;
  token: string;
  workspace: MultiKioskChildWorkspace;
}

type PayableDraft = TaxControlDraft & {
  concept: string;
  dueDate: string;
  externalReference: string;
  notes: string;
  providerId: number | null;
};

type PresignResponse = KioskPresignedUpload & {
  objectKey?: string;
  uploadUrl?: string;
  uploadHeaders?: Record<string, string>;
};

const capabilities = {
  create: 'payables.submission.create@1',
  presign: 'payables.attachment.presign@1',
  register: 'payables.attachment.register@1',
};
const maxAttachments = 5;
const maxAttachmentSize = 10 * 1024 * 1024;
const inputClass = 'min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

function csrfFor(token: string) {
  try { return sessionStorage.getItem(`indice.multi-kiosk.${token}.csrf`) ?? ''; } catch { return ''; }
}

function normalizeCountry(value: string): BudgetTaxCountry {
  return ['MX', 'US', 'CA', 'CO', 'BR', 'INTL'].includes(value)
    ? value as BudgetTaxCountry
    : 'INTL';
}

function initialDraft(currency: string, providerId: number | null): PayableDraft {
  const taxCountry = normalizeCountry(inferTaxCountryFromCurrency(currency));
  const profile = getDefaultBudgetTaxProfile(taxCountry);
  return {
    amount: '', budgetCurrencyCode: currency, concept: '', dueDate: '', externalReference: '',
    notes: '', providerId, taxes: '', taxCountry, taxEnabled: false, taxIncluded: false,
    taxMode: 'none', taxProfileId: profile?.id ?? '',
    taxRate: profile ? taxRateToPercentInput(profile.rate) : '', taxSpecialAmount: '',
  };
}

function numberValue(value: string) {
  const parsed = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value);
}

function contentType(file: File) {
  return file.type || ({
    pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    webp: 'image/webp', csv: 'text/csv', txt: 'text/plain',
  } as Record<string, string>)[file.name.split('.').pop()?.toLowerCase() ?? ''] || 'application/octet-stream';
}

export function PayablesMultiKioskWorkspace({
  token,
  kioskId,
  workspace,
  onAuthorizationFailure,
  onRefresh,
}: PayablesMultiKioskWorkspaceProps) {
  const t = useExpensesTranslations();
  const copy = t.expenses.payablesKiosk.publicWorkspace;
  const bootstrap = workspace.bootstrap;
  const providers = bootstrap?.providers ?? [];
  const currency = bootstrap?.kiosk?.currencyCode ?? 'MXN';
  const firstProviderId = providers[0]?.id ?? null;
  const [draft, setDraft] = useState<PayableDraft>(() => initialDraft(currency, firstProviderId));
  const [attachments, setAttachments] = useState<File[]>([]);
  const [pendingExpenseId, setPendingExpenseId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const submitLock = useRef(false);
  const updateDraft = (change: Partial<PayableDraft>) => setDraft(current => ({ ...current, ...change }));
  const granted = workspace.session.capabilities;
  const amount = numberValue(draft.amount);
  const tax = draft.taxEnabled ? numberValue(draft.taxes) : 0;
  const totals = useMemo(() => ({
    subtotal: draft.taxEnabled && draft.taxIncluded ? Math.max(0, amount - tax) : amount,
    tax,
    total: draft.taxEnabled && draft.taxIncluded ? amount : amount + tax,
  }), [amount, draft.taxEnabled, draft.taxIncluded, tax]);
  const canAttach = granted.includes(capabilities.presign) && granted.includes(capabilities.register);
  const retryingEvidence = pendingExpenseId !== null;
  const canCreate = retryingEvidence
    ? canAttach && attachments.length > 0 && !busy
    : granted.includes(capabilities.create)
      && draft.providerId !== null && draft.concept.trim().length > 0 && totals.total > 0 && !busy;

  const action = async <T,>(capability: string, payload: Record<string, unknown>) => {
    try {
      return await multiKioskPublicApi.action<T>(
        token, kioskId, capability, payload, csrfFor(token));
    } catch (failure) {
      onAuthorizationFailure(failure);
      throw failure;
    }
  };

  const selectFiles = (event: ChangeEvent<HTMLInputElement>) => {
    if (!canAttach) {
      setError(copy.errors.filesInvalid);
      event.target.value = '';
      return;
    }
    const available = maxAttachments - attachments.length;
    const selected = Array.from(event.target.files ?? [])
      .filter(file => file.size > 0 && file.size <= maxAttachmentSize
        && contentType(file) !== 'application/octet-stream')
      .slice(0, Math.max(0, available));
    setAttachments(current => [...current, ...selected].slice(0, maxAttachments));
    if (selected.length !== (event.target.files?.length ?? 0)) setError(copy.errors.filesInvalid);
    event.target.value = '';
  };

  const uploadEvidence = async (expenseId: number, file: File) => {
    const mimeType = contentType(file);
    const presigned = await action<PresignResponse>(capabilities.presign, {
      resource_id: expenseId,
      fileName: file.name,
      contentType: mimeType,
      sizeBytes: file.size,
    });
    const upload: KioskPresignedUpload = {
      object_key: presigned.object_key ?? presigned.objectKey ?? '',
      upload_url: presigned.upload_url ?? presigned.uploadUrl ?? '',
      upload_headers: presigned.upload_headers ?? presigned.uploadHeaders,
      expires_at: presigned.expires_at,
    };
    if (!upload.object_key || !upload.upload_url) throw new Error(copy.errors.filesInvalid);
    await uploadPresignedKioskFile(upload, file, mimeType, { timeoutMs: 30_000 });
    await action(capabilities.register, {
      resource_id: expenseId,
      objectKey: upload.object_key,
      originalFilename: file.name,
      mimeType,
      sizeBytes: file.size,
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canCreate || submitLock.current) return;
    submitLock.current = true;
    setBusy(true); setError(''); setSuccess('');
    try {
      let expenseId = pendingExpenseId;
      if (expenseId === null) {
        const result = await action<{ expenseId: number }>(capabilities.create, {
          providerId: draft.providerId,
          concept: draft.concept.trim(),
          description: draft.notes.trim(),
          subtotalAmount: totals.subtotal,
          taxAmount: totals.tax,
          totalAmount: totals.total,
          currencyCode: currency,
          dueDate: draft.dueDate || null,
          externalReference: draft.externalReference.trim() || null,
        });
        expenseId = result.expenseId;
      }
      const failedFiles: File[] = [];
      for (const file of attachments) {
        try { await uploadEvidence(expenseId, file); } catch (failure) {
          if (onAuthorizationFailure(failure)) throw failure;
          failedFiles.push(file);
        }
      }
      if (failedFiles.length > 0) {
        setPendingExpenseId(expenseId);
        setAttachments(failedFiles);
        setSuccess(copy.uploadPartial(failedFiles.length));
        await onRefresh().catch(() => undefined);
        return;
      }
      setPendingExpenseId(null);
      setDraft(initialDraft(currency, firstProviderId));
      setAttachments([]);
      setSuccess(copy.submissionSuccess);
      await onRefresh().catch(() => undefined);
    } catch (failure) {
      if (!onAuthorizationFailure(failure)) setError(copy.errors.submission);
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" data-multi-kiosk-payables>
      {error ? <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {success ? <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p> : null}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><WalletCards className="h-5 w-5" /></span>
          <div className="min-w-0"><h3 className="text-base font-medium text-slate-950 dark:text-white">{copy.payableTitle}</h3><p className="truncate text-xs text-slate-500">{bootstrap?.scope_label}</p></div>
          <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{currency}</span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{copy.provider} *</span><select required className={inputClass} value={draft.providerId ?? ''} onChange={event => updateDraft({ providerId: event.target.value ? Number(event.target.value) : null })}><option value="">{copy.providerPlaceholder}</option>{providers.map(provider => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label>
          <label><span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{copy.dueDate}</span><input className={inputClass} type="date" value={draft.dueDate} onChange={event => updateDraft({ dueDate: event.target.value })} /></label>
          <label><span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{copy.externalReference}</span><input className={inputClass} value={draft.externalReference} onChange={event => updateDraft({ externalReference: event.target.value })} /></label>
          <label className="sm:col-span-2"><span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{copy.concept} *</span><input required className={inputClass} value={draft.concept} onChange={event => updateDraft({ concept: event.target.value })} placeholder={copy.conceptPlaceholder} /></label>
          <label><span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{t.expenses.modal.amount} *</span><input required min="0.01" step="0.01" inputMode="decimal" type="number" className={inputClass} value={draft.amount} onChange={event => updateDraft({ amount: event.target.value })} placeholder="0.00" /></label>
          <div className="sm:col-span-2"><BudgetTaxControls draft={draft} onDraftChange={updateDraft} /></div>
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 sm:col-span-2"><Metric label={t.expenses.modal.summarySubtotal} value={money(totals.subtotal, currency)} /><Metric label={copy.taxAmount} value={money(totals.tax, currency)} /><Metric label={copy.totalAmount} value={money(totals.total, currency)} /></div>
          <label className="sm:col-span-2"><span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{copy.notes}</span><textarea className={`${inputClass} min-h-24 resize-y`} value={draft.notes} onChange={event => updateDraft({ notes: event.target.value })} /></label>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200"><Paperclip className="h-4 w-4 text-emerald-700" />{copy.evidence}</div>
        <label className="mt-3 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-4 text-center"><input type="file" multiple className="hidden" disabled={!canAttach || busy || attachments.length >= maxAttachments} onChange={selectFiles} accept="image/png,image/jpeg,image/webp,.pdf,.csv,.txt" /><Upload className="h-5 w-5 text-emerald-700" /><span className="mt-2 text-sm font-medium text-slate-900">{copy.attachmentAction}</span><span className="mt-1 text-xs text-slate-500">{copy.attachmentHint}</span></label>
        {attachments.length ? <ul className="mt-3 space-y-2">{attachments.map(file => <li key={`${file.name}-${file.lastModified}`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><FileText className="h-4 w-4 shrink-0 text-slate-500" /><span className="min-w-0 flex-1 truncate text-sm">{file.name}</span><button type="button" aria-label={t.common.delete} disabled={busy || (retryingEvidence && attachments.length === 1)} onClick={() => setAttachments(current => current.filter(candidate => candidate !== file))} className="grid h-10 w-10 place-items-center rounded-xl text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4" /></button></li>)}</ul> : null}
      </section>
      <div className="sticky bottom-0 z-20 -mx-1 border-t border-slate-200 bg-slate-50/95 px-1 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <Button type="submit" disabled={!canCreate} className="min-h-12 w-full rounded-2xl bg-emerald-700 text-base text-white hover:bg-emerald-800">{busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}{retryingEvidence ? copy.retryEvidence : copy.submitPayable}</Button>
      </div>
    </form>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="truncate text-[11px] text-slate-500">{label}</p><p className="mt-1 truncate text-xs font-medium text-slate-950">{value}</p></div>;
}
