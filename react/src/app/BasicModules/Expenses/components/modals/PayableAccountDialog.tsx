import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { Check, File, Landmark, Paperclip, Trash2, Upload, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Input } from '../../../../components/ui/input';
import {
  getDefaultBudgetTaxProfile,
  inferTaxCountryFromCurrency,
  taxRateToPercentInput,
  type BudgetTaxCountry,
} from '../../Budgets/budgetTaxCatalog';
import { DEFAULT_FINANCE_CURRENCY, financeCurrencySelectOptions } from '../../constants/financeCurrencyOptions';
import type { Provider } from '../../types/expenses.types';
import { formatCurrency } from '../../utils/expenses.utils';
import { BudgetTaxControls, type TaxControlDraft } from './BudgetTaxControls';
import { useExpensesTranslations } from '../../Expenses/hooks/useExpensesTranslations';

export type PayableAccountValues = {
  amount: number;
  attachmentFiles: File[];
  concept: string;
  currency: string;
  dueDate: string;
  notes: string;
  providerId: string;
  taxIncluded: boolean;
  taxMode: 'none' | 'auto';
  taxRate?: number;
  taxes: number;
  total: number;
};

type PayableAccountDialogProps = {
  currency: string;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PayableAccountValues) => void | Promise<void>;
  open: boolean;
  providers: Provider[];
};

type PayableDraft = TaxControlDraft & {
  attachments: AttachmentDraft[];
  concept: string;
  dueDate: string;
  notes: string;
  providerId: string;
};

type AttachmentDraft = {
  file?: File;
  id: string;
  isLocalObjectUrl?: boolean;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  url?: string;
};

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-none placeholder:text-slate-400 transition-colors focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100';
const MAX_PAYABLE_ATTACHMENTS = 5;

export function PayableAccountDialog({
  currency,
  isSubmitting,
  onOpenChange,
  onSubmit,
  open,
  providers,
}: PayableAccountDialogProps) {
  const t = useExpensesTranslations();
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const [draft, setDraft] = useState<PayableDraft>(() => createDraft(currency));
  const amount = toMoneyNumber(draft.amount);
  const taxes = draft.taxEnabled ? toMoneyNumber(draft.taxes) : 0;
  const subtotal = draft.taxEnabled && draft.taxIncluded ? Math.max(amount - taxes, 0) : amount;
  const total = draft.taxEnabled && draft.taxIncluded ? amount : amount + taxes;
  const canSubmit = draft.concept.trim().length > 0 && amount > 0 && !isSubmitting;
  const canAttachMoreFiles = draft.attachments.length < MAX_PAYABLE_ATTACHMENTS;

  useEffect(() => {
    if (!open) {
      revokeLocalUrls(objectUrlsRef.current);
      setDraft(createDraft(currency));
    }
  }, [currency, open]);

  useEffect(() => () => revokeLocalUrls(objectUrlsRef.current), []);

  const updateDraft = (updates: Partial<PayableDraft>) => {
    setDraft(current => ({ ...current, ...updates }));
  };

  const updateCurrency = (budgetCurrencyCode: string) => {
    const taxCountry = normalizeTaxCountry(inferTaxCountryFromCurrency(budgetCurrencyCode));
    const defaultTaxProfile = getDefaultBudgetTaxProfile(taxCountry);
    updateDraft({
      budgetCurrencyCode,
      taxCountry,
      taxProfileId: defaultTaxProfile?.id ?? '',
      taxRate: defaultTaxProfile ? taxRateToPercentInput(defaultTaxProfile.rate) : '',
    });
  };

  const addAttachments = (files: FileList | null) => {
    if (!files) return;
    const availableSlots = MAX_PAYABLE_ATTACHMENTS - draft.attachments.length;
    const nextFiles = Array.from(files).slice(0, availableSlots).map((file, index) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.add(url);
      return {
        id: `payable-file-${Date.now()}-${index}`,
        file,
        isLocalObjectUrl: true,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
        url,
      };
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    void onSubmit({
      amount: subtotal,
      attachmentFiles: draft.attachments.map(attachment => attachment.file).filter((file): file is File => Boolean(file)),
      concept: draft.concept.trim(),
      currency: draft.budgetCurrencyCode,
      dueDate: draft.dueDate,
      notes: draft.notes.trim(),
      providerId: draft.providerId,
      taxIncluded: draft.taxEnabled ? draft.taxIncluded : false,
      taxMode: draft.taxEnabled ? 'auto' : 'none',
      taxRate: draft.taxEnabled ? toPercentNumber(draft.taxRate) : undefined,
      taxes,
      total,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="max-h-[calc(100vh-3rem)] max-w-[720px] overflow-hidden rounded-[28px] border border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="flex items-start justify-between gap-4 bg-[#147514] px-6 py-4 text-white dark:bg-[#0b3f1b]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm">
              <Landmark className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-bold text-white">{t.expenses.payableAccount.title}</DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-5 text-white/80">
                {t.expenses.payableAccount.subtitle}
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label={t.columnModal.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[calc(100vh-13rem)] space-y-5 overflow-y-auto bg-slate-50/70 px-6 py-6 dark:bg-slate-950/40">
            <section className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/55">
              <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">{t.expenses.payableAccount.mainData}</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label={t.expenses.payableAccount.provider}>
                  <select value={draft.providerId} onChange={(event) => updateDraft({ providerId: event.target.value })} className={inputClass}>
                    <option value="">{t.expenses.payableAccount.unassignedProvider}</option>
                    {providers.filter(provider => provider.status !== 'inactive').map(provider => (
                      <option key={provider.id} value={provider.id}>{provider.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t.expenses.payableAccount.dueDate}>
                  <input type="date" value={draft.dueDate} onChange={(event) => updateDraft({ dueDate: event.target.value })} className={inputClass} />
                </Field>
                <div className="md:col-span-2">
                  <Field label={t.expenses.modal.concept} required>
                    <Input
                      autoFocus
                      maxLength={160}
                      value={draft.concept}
                      onChange={(event) => updateDraft({ concept: event.target.value })}
                      placeholder={t.expenses.payableAccount.conceptPlaceholder}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </section>

            <section className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/55">
              <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">{t.expenses.payableAccount.sectionAmount}</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label={t.expenses.modal.amount} required>
                  <input
                    min={0.01}
                    step="0.01"
                    type="number"
                    value={draft.amount}
                    onChange={(event) => updateDraft({ amount: event.target.value })}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </Field>
                <Field label={t.expenses.modal.currency} required>
                  <select value={draft.budgetCurrencyCode} onChange={(event) => updateCurrency(event.target.value)} className={inputClass}>
                    {financeCurrencySelectOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
                <BudgetTaxControls draft={draft} onDraftChange={updateDraft} />
                <div className="md:col-span-2 grid gap-3 rounded-[22px] border border-[#147514]/20 bg-[#147514]/5 p-4 md:grid-cols-3">
                  <SummaryMetric label={t.expenses.modal.summarySubtotal} value={formatCurrency(subtotal, draft.budgetCurrencyCode)} />
                  <SummaryMetric label={t.expenses.payableAccount.taxTotal} value={formatCurrency(taxes, draft.budgetCurrencyCode)} />
                  <SummaryMetric label={t.expenses.payableAccount.totalPayable} strong value={formatCurrency(total, draft.budgetCurrencyCode)} />
                </div>
              </div>
            </section>

            <section className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/55">
              <div className="mb-4 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-[#147514]" />
                <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">{t.expenses.payableAccount.evidence}</h4>
              </div>
              <label className={`flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed bg-slate-50 px-4 py-6 text-center transition ${
                canAttachMoreFiles
                  ? 'border-[#147514]/25 hover:border-[#147514]/45 hover:bg-[#147514]/5'
                  : 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-70'
              }`}>
                <input
                  type="file"
                  multiple
                  disabled={!canAttachMoreFiles}
                  onChange={(event) => {
                    addAttachments(event.target.files);
                    event.target.value = '';
                  }}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                />
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#147514]/10 text-[#147514]">
                  <Upload className="h-5 w-5" />
                </span>
                <span className="mt-3 text-sm font-bold text-slate-900 dark:text-white">{t.expenses.payableAccount.uploadFile}</span>
                <span className="mt-1 text-xs font-medium text-slate-500">{t.expenses.payableAccount.attachmentHint}</span>
              </label>
              {draft.attachments.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {draft.attachments.map(attachment => (
                    <div key={attachment.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800">
                        <File className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{attachment.name}</p>
                        <p className="text-xs font-medium text-slate-500">{formatFileSize(attachment.size)}</p>
                      </div>
                      <button type="button" onClick={() => removeAttachment(attachment.id)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100" aria-label={t.expenses.payableAccount.attachmentDelete}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <Field label={t.expenses.payableAccount.notes}>
              <textarea
                value={draft.notes}
                onChange={(event) => updateDraft({ notes: event.target.value })}
                placeholder={t.expenses.payableAccount.notesPlaceholder}
                className={`${inputClass} min-h-24 resize-y`}
              />
            </Field>
          </div>

          <DialogFooter className="gap-3 bg-[#147514] px-6 py-4 dark:bg-[#0b3f1b]">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-white/30 bg-white/10 px-4 text-sm font-semibold text-white shadow-none hover:bg-white/20 hover:text-white"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              {t.expenses.payableAccount.cancel}
            </Button>
            <Button
              type="submit"
              className="h-10 rounded-xl bg-white px-4 text-sm font-semibold text-[#147514] shadow-sm hover:bg-slate-100 hover:text-[#147514] disabled:bg-white/40 disabled:text-[#147514]/50"
              disabled={!canSubmit}
            >
              <Check className="h-4 w-4" />
              {isSubmitting ? t.expenses.payableAccount.saving : t.expenses.payableAccount.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function createDraft(currency: string): PayableDraft {
  const budgetCurrencyCode = currency || DEFAULT_FINANCE_CURRENCY;
  const taxCountry = normalizeTaxCountry(inferTaxCountryFromCurrency(budgetCurrencyCode));
  const defaultTaxProfile = getDefaultBudgetTaxProfile(taxCountry);
  return {
    amount: '',
    attachments: [],
    budgetCurrencyCode,
    concept: '',
    dueDate: '',
    notes: '',
    providerId: '',
    taxes: '',
    taxCountry,
    taxEnabled: false,
    taxIncluded: false,
    taxMode: 'none',
    taxProfileId: defaultTaxProfile?.id ?? '',
    taxRate: defaultTaxProfile ? taxRateToPercentInput(defaultTaxProfile.rate) : '',
    taxSpecialAmount: '',
  };
}

function Field({ children, label, required }: { children: ReactNode; label: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}{required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}

function SummaryMetric({ label, strong, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className={`mt-1 text-sm ${strong ? 'font-extrabold text-[#147514]' : 'font-bold text-slate-900 dark:text-slate-100'}`}>{value}</p>
    </div>
  );
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

function toPercentNumber(value: string) {
  const parsedValue = Number(value.replace('%', '').replace(',', '.').trim());
  return Number.isFinite(parsedValue) ? parsedValue / 100 : 0;
}
