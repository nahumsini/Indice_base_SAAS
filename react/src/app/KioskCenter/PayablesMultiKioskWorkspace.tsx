import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  CalendarClock,
  Check,
  ChevronDown,
  CircleDollarSign,
  FileText,
  LoaderCircle,
  Paperclip,
  ReceiptText,
  Trash2,
  Upload,
  WalletCards,
} from 'lucide-react';
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
  KioskFileDropzone,
  KioskStickyActionBar,
  KioskToolWorkspaceFrame,
  KioskWorkspaceContextBar,
  KioskWorkspaceNotice,
  KioskWorkspaceSectionHeader,
  KioskWorkspaceSurface,
} from '../components/kiosk-engine/KioskToolWorkspace';
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
const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#147514] focus:ring-4 focus:ring-[#147514]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

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
  const selectedProvider = providers.find(provider => provider.id === draft.providerId);

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
    <KioskToolWorkspaceFrame>
      <form aria-busy={busy || undefined} onSubmit={submit} className="space-y-3" data-multi-kiosk-payables>

      <div data-payables-overview>
        <KioskWorkspaceContextBar
          density="compact"
          description={bootstrap?.scope_label}
          eyebrow={copy.provider}
          icon={<WalletCards className="h-5 w-5" />}
          meta={(
            <div className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
              <span>{currency}</span>
              <span>{copy.totalAmount}: <strong className="text-sm font-medium text-[#147514] dark:text-emerald-300">{money(totals.total, currency)}</strong></span>
            </div>
          )}
          title={selectedProvider?.name ?? copy.providerPlaceholder}
          tone="green"
        />
      </div>

      <KioskWorkspaceSurface className="space-y-3" data-payables-section="primary">
        <KioskWorkspaceSectionHeader
          description={copy.payableDescription}
          icon={<ReceiptText className="h-4 w-4" />}
          title={copy.payableTitle}
          tone="green"
        />
        <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{copy.provider} *</span><select required className={inputClass} value={draft.providerId ?? ''} onChange={event => updateDraft({ providerId: event.target.value ? Number(event.target.value) : null })}><option value="">{copy.providerPlaceholder}</option>{providers.map(provider => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label>
        <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{copy.concept} *</span><input required className={inputClass} value={draft.concept} onChange={event => updateDraft({ concept: event.target.value })} placeholder={copy.conceptPlaceholder} /></label>
      </KioskWorkspaceSurface>

      <KioskWorkspaceSurface className="space-y-3" data-payables-section="amount">
        <KioskWorkspaceSectionHeader
          action={<span className="rounded-xl bg-[#147514]/10 px-3 py-1.5 text-sm font-medium text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300">{money(totals.total, currency)}</span>}
          icon={<CircleDollarSign className="h-4 w-4" />}
          title={copy.totalAmount}
          tone="green"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{t.expenses.modal.amount} *</span><input required min="0.01" step="0.01" inputMode="decimal" type="number" className={`${inputClass} text-base font-medium`} value={draft.amount} onChange={event => updateDraft({ amount: event.target.value })} placeholder="0.00" /></label>
          <label className="block"><span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"><CalendarClock className="h-3.5 w-3.5" />{copy.dueDate}</span><input className={inputClass} type="date" value={draft.dueDate} onChange={event => updateDraft({ dueDate: event.target.value })} /></label>
        </div>
        <details className="group overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700" data-payables-section="taxes">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3 py-2 outline-none focus-visible:ring-4 focus-visible:ring-[#147514]/10 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-900 dark:text-white">{copy.taxAmount}</span>
              <span className="block truncate text-xs text-slate-500">{draft.taxEnabled ? money(totals.tax, currency) : currency}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
          </summary>
          <div className="border-t border-slate-200 p-2 dark:border-slate-700"><BudgetTaxControls compact presentation="choice" draft={draft} onDraftChange={updateDraft} /></div>
        </details>
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#147514]/5 p-3 dark:bg-emerald-400/5" data-payables-totals><Metric label={t.expenses.modal.summarySubtotal} value={money(totals.subtotal, currency)} /><Metric label={copy.taxAmount} value={money(totals.tax, currency)} /><Metric strong label={copy.totalAmount} value={money(totals.total, currency)} /></div>
      </KioskWorkspaceSurface>

      <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950" data-payables-section="additional">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3 py-2 outline-none focus-visible:ring-4 focus-visible:ring-[#147514]/10 sm:px-5 [&::-webkit-details-marker]:hidden">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><FileText className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-950 dark:text-white">{copy.externalReference} · {copy.notes}</span><span className="block truncate text-xs text-slate-500">{draft.externalReference || draft.notes || copy.externalReferencePlaceholder}</span></span>
          <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
        </summary>
        <div className="grid gap-3 border-t border-slate-200 p-3 dark:border-slate-700 sm:p-5">
          <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{copy.externalReference}</span><input className={inputClass} value={draft.externalReference} onChange={event => updateDraft({ externalReference: event.target.value })} placeholder={copy.externalReferencePlaceholder} /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{copy.notes}</span><textarea className={`${inputClass} h-auto min-h-20 resize-y py-2.5`} value={draft.notes} onChange={event => updateDraft({ notes: event.target.value })} placeholder={copy.notesPlaceholder} /></label>
        </div>
      </details>

      <KioskWorkspaceSurface data-payables-section="evidence">
        <KioskWorkspaceSectionHeader
          action={<span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{attachments.length}/{maxAttachments}</span>}
          icon={<Paperclip className="h-4 w-4" />}
          title={copy.evidence}
          tone="green"
        />
        <KioskFileDropzone
          accept="image/png,image/jpeg,image/webp,.pdf,.csv,.txt"
          className="mt-3"
          description={copy.attachmentHint}
          disabled={!canAttach || busy || attachments.length >= maxAttachments}
          icon={<Upload className="h-5 w-5" />}
          multiple
          onChange={selectFiles}
          title={copy.attachmentAction}
          tone="green"
        />
        {attachments.length ? <ul className="mt-3 space-y-2">{attachments.map(file => <li key={`${file.name}-${file.lastModified}`} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700"><FileText className="h-4 w-4 shrink-0 text-[#147514] dark:text-emerald-300" /><span className="min-w-0 flex-1"><span className="block truncate text-sm text-slate-700 dark:text-slate-200">{file.name}</span><span className="mt-0.5 block text-[11px] text-slate-400">{Math.max(1, file.size / 1024).toFixed(0)} KB · listo para enviar</span></span><button type="button" aria-label={t.common.delete} disabled={busy || (retryingEvidence && attachments.length === 1)} onClick={() => setAttachments(current => current.filter(candidate => candidate !== file))} className="grid h-10 w-10 place-items-center rounded-xl text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /></button></li>)}</ul> : null}
      </KioskWorkspaceSurface>

      {error ? <KioskWorkspaceNotice kind="error">{error}</KioskWorkspaceNotice> : null}
      {success ? <KioskWorkspaceNotice kind="success">{success}</KioskWorkspaceNotice> : null}
      <KioskStickyActionBar
        data-payables-sticky-summary
        summary={<div className="flex items-center justify-between gap-3 text-xs text-slate-500"><span>{attachments.length ? `${copy.evidence}: ${attachments.length}` : copy.evidence}</span><span>{copy.totalAmount} <strong className="ml-1 text-sm font-medium text-slate-950 dark:text-white">{money(totals.total, currency)}</strong></span></div>}
      >
        <Button type="submit" disabled={!canCreate} className="min-h-12 w-full rounded-xl bg-[#147514] text-base text-white shadow-lg shadow-[#147514]/15 hover:bg-[#105010]">{busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}{retryingEvidence ? copy.retryEvidence : copy.submitPayable}</Button>
      </KioskStickyActionBar>
      </form>
    </KioskToolWorkspaceFrame>
  );
}

function Metric({ label, strong = false, value }: { label: string; strong?: boolean; value: string }) {
  return <div className={`min-w-0 ${strong ? 'text-right' : ''}`}><p className="truncate text-[10px] text-slate-500">{label}</p><p className={`mt-1 truncate text-xs font-medium ${strong ? 'text-[#147514] dark:text-emerald-300' : 'text-slate-950 dark:text-white'}`}>{value}</p></div>;
}
