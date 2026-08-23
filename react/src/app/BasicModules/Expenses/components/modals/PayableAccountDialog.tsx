import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { Camera, Check, ChevronDown, File, Landmark, Paperclip, SlidersHorizontal, Trash2, Upload } from 'lucide-react';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
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
import { QuickProviderField } from './QuickProviderField';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';

export type PayableAccountValues = {
  amount: number;
  attachmentFiles: File[];
  concept: string;
  currency: string;
  dueDate: string;
  expenseDate: string;
  accountingAccount: string;
  business: string;
  businessUnit: string;
  notes: string;
  providerId: string;
  reference: string;
  taxIncluded: boolean;
  taxMode: 'none' | 'auto';
  taxRate?: number;
  taxes: number;
  total: number;
};

type PayableAccountDialogProps = {
  accountingAccountOptions?: FinanceReferenceOption[];
  businessOptions?: FinanceReferenceOption[];
  currency: string;
  isSubmitting: boolean;
  onCreateProvider?: (name: string) => Promise<Provider>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PayableAccountValues) => void | Promise<void>;
  open: boolean;
  providers: Provider[];
  unitOptions?: FinanceReferenceOption[];
};

type PayableDraft = TaxControlDraft & {
  accountingAccount: string;
  attachments: AttachmentDraft[];
  business: string;
  businessUnit: string;
  concept: string;
  dueDate: string;
  expenseDate: string;
  notes: string;
  providerId: string;
  reference: string;
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
const attachmentActionClass = 'flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-[#147514]/35 hover:bg-[#147514]/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900';
const MAX_PAYABLE_ATTACHMENTS = 5;

export function PayableAccountDialog({
  accountingAccountOptions = [],
  businessOptions = [],
  currency,
  isSubmitting,
  onCreateProvider,
  onOpenChange,
  onSubmit,
  open,
  providers,
  unitOptions = [],
}: PayableAccountDialogProps) {
  const t = useExpensesTranslations();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<PayableDraft>(() => createDraft(currency));
  const amount = toMoneyNumber(draft.amount);
  const taxes = draft.taxEnabled ? toMoneyNumber(draft.taxes) : 0;
  const subtotal = draft.taxEnabled && draft.taxIncluded ? Math.max(amount - taxes, 0) : amount;
  const total = draft.taxEnabled && draft.taxIncluded ? amount : amount + taxes;
  const canSubmit = draft.providerId.trim().length > 0
    && draft.concept.trim().length > 0
    && draft.expenseDate.trim().length > 0
    && draft.dueDate.trim().length > 0
    && amount > 0
    && !isSubmitting;
  const canAttachMoreFiles = draft.attachments.length < MAX_PAYABLE_ATTACHMENTS;
  const selectedProvider = providers.find(provider => provider.id === draft.providerId);
  const scopedBusinessOptions = draft.businessUnit
    ? businessOptions.filter(option => !option.unitId || option.unitId === draft.businessUnit)
    : businessOptions;

  useEffect(() => {
    if (!open) {
      revokeLocalUrls(objectUrlsRef.current);
      setDraft(createDraft(currency));
      setError('');
      setIsAdvancedOpen(false);
      return;
    }

    const preferredCurrency = currency || DEFAULT_FINANCE_CURRENCY;
    setDraft(current => {
      if (current.budgetCurrencyCode === preferredCurrency) return current;
      const taxCountry = normalizeTaxCountry(inferTaxCountryFromCurrency(preferredCurrency));
      const defaultTaxProfile = getDefaultBudgetTaxProfile(taxCountry);
      return {
        ...current,
        budgetCurrencyCode: preferredCurrency,
        taxes: '',
        taxCountry,
        taxProfileId: defaultTaxProfile?.id ?? '',
        taxRate: defaultTaxProfile ? taxRateToPercentInput(defaultTaxProfile.rate) : '',
      };
    });
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError('');
    try {
      await onSubmit({
        accountingAccount: draft.accountingAccount,
        amount: subtotal,
        attachmentFiles: draft.attachments.map(attachment => attachment.file).filter((file): file is File => Boolean(file)),
        business: draft.business,
        businessUnit: draft.businessUnit,
        concept: draft.concept.trim(),
        currency: draft.budgetCurrencyCode,
        dueDate: draft.dueDate,
        expenseDate: draft.expenseDate,
        notes: draft.notes.trim(),
        providerId: draft.providerId,
        reference: draft.reference.trim(),
        taxIncluded: draft.taxEnabled ? draft.taxIncluded : false,
        taxMode: draft.taxEnabled ? 'auto' : 'none',
        taxRate: draft.taxEnabled ? toPercentNumber(draft.taxRate) : undefined,
        taxes,
        total,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo guardar la cuenta por pagar.');
    }
  };

  return (
    <IndiceModalFrame
      busy={isSubmitting}
      contentClassName="sm:max-w-[780px]"
      description={t.expenses.payableAccount.subtitle}
      footer={(
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <button type="button" className="h-10 rounded-xl border border-white/30 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50" disabled={isSubmitting} onClick={() => onOpenChange(false)}>{t.expenses.payableAccount.cancel}</button>
          <button form="payable-account-form" type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-[#147514] transition hover:bg-slate-100 disabled:opacity-50" disabled={!canSubmit}>
            <Check className="h-4 w-4" />
            {isSubmitting ? t.expenses.payableAccount.saving : t.expenses.payableAccount.save}
          </button>
        </div>
      )}
      footerSummary={`${selectedProvider?.name || t.expenses.payableAccount.unassignedProvider} · ${formatCurrency(total, draft.budgetCurrencyCode)} · ${t.expenses.payableAccount.dueSummary} ${formatDateSummary(draft.dueDate)}`}
      icon={<Landmark className="h-5 w-5" />}
      modalType="standard-form"
      onOpenChange={onOpenChange}
      open={open}
      title={t.expenses.payableAccount.title}
      tone="green"
    >
        <form id="payable-account-form" className="space-y-5" onSubmit={handleSubmit}>
          {error ? <IndiceModalValidation messages={[error]} tone="error" /> : null}
          <section className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/55">
            <SectionHeading title={t.expenses.payableAccount.mainData} description={t.expenses.payableAccount.mainDescription} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <QuickProviderField
                emptyLabel={t.expenses.payableAccount.unassignedProvider}
                label={t.expenses.payableAccount.provider}
                onChange={(providerId) => updateDraft({ providerId })}
                onCreateProvider={onCreateProvider}
                providers={providers}
                required
                value={draft.providerId}
              />
              <Field label={t.expenses.payableAccount.reference}>
                <Input maxLength={80} value={draft.reference} onChange={(event) => updateDraft({ reference: event.target.value })} placeholder={t.expenses.payableAccount.referencePlaceholder} className={inputClass} />
              </Field>
              <div className="md:col-span-2">
                <Field label={t.expenses.modal.concept} required>
                  <Input autoFocus maxLength={160} value={draft.concept} onChange={(event) => updateDraft({ concept: event.target.value })} placeholder={t.expenses.payableAccount.conceptPlaceholder} className={inputClass} />
                </Field>
              </div>
              <Field label={t.expenses.payableAccount.recordDate} required>
                <input required type="date" value={draft.expenseDate} onChange={(event) => updateDraft({ expenseDate: event.target.value })} className={inputClass} />
              </Field>
              <Field label={t.expenses.payableAccount.dueDate} required>
                <input required type="date" value={draft.dueDate} onChange={(event) => updateDraft({ dueDate: event.target.value })} className={inputClass} />
              </Field>
              <Field label={t.expenses.modal.amount} required>
                <input required min={0.01} step="0.01" type="number" value={draft.amount} onChange={(event) => updateDraft({ amount: event.target.value })} placeholder="0.00" className={inputClass} />
              </Field>
              <Field label={t.expenses.modal.currency} required>
                <select required value={draft.budgetCurrencyCode} onChange={(event) => updateCurrency(event.target.value)} className={inputClass}>
                  {financeCurrencySelectOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
              <p className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-100">{t.expenses.payableAccount.statusNote}</p>
            </div>
          </section>

          <section className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/55">
            <SectionHeading icon={<Paperclip className="h-4 w-4" />} title={t.expenses.payableAccount.evidence} description={t.expenses.payableAccount.evidenceDescription} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" disabled={!canAttachMoreFiles} onChange={(event) => { addAttachments(event.target.files); event.target.value = ''; }} />
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" disabled={!canAttachMoreFiles} onChange={(event) => { addAttachments(event.target.files); event.target.value = ''; }} />
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" className={attachmentActionClass} disabled={!canAttachMoreFiles} onClick={() => cameraInputRef.current?.click()}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#147514]/10 text-[#147514]"><Camera className="h-5 w-5" /></span>
                <span><span className="block text-sm font-medium text-slate-900 dark:text-white">{t.expenses.payableAccount.cameraAction}</span><span className="mt-1 block text-xs text-slate-500">{t.expenses.payableAccount.cameraHint}</span></span>
              </button>
              <button type="button" className={attachmentActionClass} disabled={!canAttachMoreFiles} onClick={() => fileInputRef.current?.click()}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#147514]/10 text-[#147514]"><Upload className="h-5 w-5" /></span>
                <span><span className="block text-sm font-medium text-slate-900 dark:text-white">{t.expenses.payableAccount.fileAction}</span><span className="mt-1 block text-xs text-slate-500">{t.expenses.payableAccount.fileHint}</span></span>
              </button>
            </div>
              {draft.attachments.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {draft.attachments.map(attachment => (
                    <div key={attachment.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800">
                        <File className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{attachment.name}</p>
                        <p className="text-xs font-medium text-slate-500">{formatFileSize(attachment.size)}</p>
                      </div>
                      <button type="button" onClick={() => removeAttachment(attachment.id)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100" aria-label={t.expenses.payableAccount.attachmentDelete}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            <div className="mt-4">
            <Field label={t.expenses.payableAccount.notes}>
              <textarea value={draft.notes} onChange={(event) => updateDraft({ notes: event.target.value })} placeholder={t.expenses.payableAccount.notesPlaceholder} className={`${inputClass} min-h-20 resize-y`} />
            </Field>
            </div>
          </section>

          <details open={isAdvancedOpen} onToggle={(event) => setIsAdvancedOpen(event.currentTarget.open)} className="group rounded-[22px] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/55">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><SlidersHorizontal className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-900 dark:text-white">{t.expenses.payableAccount.advancedTitle}</span><span className="mt-1 block text-xs text-slate-500">{t.expenses.payableAccount.advancedDescription}</span></span>
              <ChevronDown className="h-4 w-4 text-slate-500 transition group-open:rotate-180" />
            </summary>
            <div className="space-y-5 border-t border-slate-200 p-4 dark:border-slate-700">
              <div>
                <SectionHeading title={t.expenses.payableAccount.classificationTitle} description={t.expenses.payableAccount.classificationDescription} />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={t.filters.unit}>
                    <select value={draft.businessUnit} onChange={(event) => { const businessUnit = event.target.value; const validBusiness = businessOptions.some(option => option.value === draft.business && (!option.unitId || option.unitId === businessUnit)); updateDraft({ businessUnit, business: validBusiness ? draft.business : '' }); }} className={inputClass}>
                      <option value="">{t.common.unassigned}</option>{unitOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </Field>
                  <Field label={t.filters.business}>
                    <select value={draft.business} onChange={(event) => updateDraft({ business: event.target.value })} className={inputClass}>
                      <option value="">{t.common.unassigned}</option>{scopedBusinessOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </Field>
                  <div className="md:col-span-2"><Field label={t.expenses.columns.accountingAccount?.label ?? 'Cuenta contable'}>
                    <select value={draft.accountingAccount} onChange={(event) => updateDraft({ accountingAccount: event.target.value })} className={inputClass}>
                      <option value="">{t.common.unassigned}</option>{accountingAccountOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </Field></div>
                </div>
              </div>
              <div>
                <SectionHeading title={t.expenses.payableAccount.taxTitle} description={t.expenses.payableAccount.taxDescription} />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <BudgetTaxControls draft={draft} onDraftChange={updateDraft} />
                  <div className="md:col-span-2 grid gap-3 rounded-[22px] border border-[#147514]/20 bg-[#147514]/5 p-4 md:grid-cols-3">
                    <SummaryMetric label={t.expenses.modal.summarySubtotal} value={formatCurrency(subtotal, draft.budgetCurrencyCode)} />
                    <SummaryMetric label={t.expenses.payableAccount.taxTotal} value={formatCurrency(taxes, draft.budgetCurrencyCode)} />
                    <SummaryMetric label={t.expenses.payableAccount.totalPayable} strong value={formatCurrency(total, draft.budgetCurrencyCode)} />
                  </div>
                </div>
              </div>
            </div>
          </details>
        </form>
    </IndiceModalFrame>
  );
}

function createDraft(currency: string): PayableDraft {
  const budgetCurrencyCode = currency || DEFAULT_FINANCE_CURRENCY;
  const taxCountry = normalizeTaxCountry(inferTaxCountryFromCurrency(budgetCurrencyCode));
  const defaultTaxProfile = getDefaultBudgetTaxProfile(taxCountry);
  return {
    accountingAccount: '',
    amount: '',
    attachments: [],
    business: '',
    businessUnit: '',
    budgetCurrencyCode,
    concept: '',
    dueDate: '',
    expenseDate: formatDateInputValue(new Date()),
    notes: '',
    providerId: '',
    reference: '',
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

function SectionHeading({ description, icon, title }: { description: string; icon?: ReactNode; title: string }) {
  return <div className="mb-4"><div className="flex items-center gap-2 text-[#147514]">{icon}<h4 className="text-sm font-medium text-slate-900 dark:text-white">{title}</h4></div><p className="mt-1 text-xs text-slate-500">{description}</p></div>;
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateSummary(value: string) {
  if (!value) return '-';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function Field({ children, label, required }: { children: ReactNode; label: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}{required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}

function SummaryMetric({ label, strong, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-medium ${strong ? 'text-[#147514]' : 'text-slate-900 dark:text-slate-100'}`}>{value}</p>
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
