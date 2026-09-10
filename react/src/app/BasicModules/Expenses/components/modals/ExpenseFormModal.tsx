import { ExpenseAccountSelect } from '../table/ExpenseAccountSelect';
import { Camera, Check, ChevronDown, File, Pencil, Plus, SlidersHorizontal, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { IndiceModalFrame, IndiceModalSummary, IndiceModalValidation } from '../../../../components/indice-modal';
import {
  getBudgetTaxProfile,
  getDefaultBudgetTaxProfile,
  inferTaxCountryFromCurrency,
  taxRateToPercentInput,
  type BudgetTaxCountry,
} from '../../Budgets/budgetTaxCatalog';
import {
  DEFAULT_FINANCE_CURRENCY,
  financeCurrencySelectOptions,
  isFinanceCurrencyOption,
} from '../../constants/financeCurrencyOptions';
import type { PaymentAccount } from '../../PaymentAccounts/types';
import { toFinanceApiErrorMessage } from '../../services/finance-api.errors';
import type { Expense, ExpenseStatus, PaymentMethod, Provider } from '../../types/expenses.types';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import { formatCurrency } from '../../utils/expenses.utils';
import { BudgetTaxControls, type TaxControlDraft } from './BudgetTaxControls';
import { useExpensesTranslations } from '../../Expenses/hooks/useExpensesTranslations';
import {
  FinanceFieldLabel,
  FinanceModalSection,
  financeModalInputClass,
  financeModalPrimaryButtonClass,
  financeModalSecondaryButtonClass,
} from './FinanceModalPrimitives';
import { QuickProviderField } from './QuickProviderField';

export type ExpenseFormValues = {
  accountingAccount: string;
  amount: number;
  attachmentFiles: File[];
  attachments?: string[];
  business: string;
  businessUnit: string;
  concept: string;
  currency: string;
  description: string;
  dueDate: string;
  expenseDate: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  paymentAccountId: string;
  providerId: string;
  status: ExpenseStatus;
  taxes: number;
  taxCountry?: string;
  taxIncluded?: boolean;
  taxMode?: Expense['taxMode'];
  taxName?: string;
  taxProfileId?: string;
  taxRate?: number;
  taxRegion?: string;
  taxSpecialAmount?: number;
  total: number;
};

type ExpenseFormModalProps = {
  accountingAccountOptions?: FinanceReferenceOption[];
  businessOptions?: FinanceReferenceOption[];
  editingExpense: Expense | null;
  initialExpense?: Expense | null;
  onClose: () => void;
  onCreateProvider?: (name: string) => Promise<Provider>;
  preferredCurrency?: string;
  paymentAccounts?: PaymentAccount[];
  providers?: Provider[];
  unitOptions?: FinanceReferenceOption[];
  onSubmitExpense: (values: ExpenseFormValues) => void | Promise<void>;
};

type ExpenseDraftState = TaxControlDraft & {
  accountingAccount: string;
  business: string;
  businessUnit: string;
  concept: string;
  description: string;
  dueDate: string;
  expenseDate: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  paymentAccountId: string;
  providerId: string;
  status: ExpenseStatus;
};

export function ExpenseFormModal({
  accountingAccountOptions = [],
  businessOptions = [],
  editingExpense,
  initialExpense = null,
  onClose,
  onCreateProvider,
  preferredCurrency = DEFAULT_FINANCE_CURRENCY,
  providers = [],
  paymentAccounts = [],
  unitOptions = [],
  onSubmitExpense,
}: ExpenseFormModalProps) {
  const t = useExpensesTranslations();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(Boolean(editingExpense));
  const [errorMessage, setErrorMessage] = useState('');
  const savingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<ExpenseDraftState>(() => createExpenseDraftState(editingExpense ?? initialExpense, preferredCurrency));
  const isEditMode = Boolean(editingExpense);
  const amount = toMoneyNumber(draft.amount);
  const taxes = draft.taxEnabled ? toMoneyNumber(draft.taxes) : 0;
  const subtotal = draft.taxEnabled && draft.taxIncluded ? roundMoney(Math.max(amount - taxes, 0)) : amount;
  const total = draft.taxEnabled && draft.taxIncluded ? amount : roundMoney(amount + taxes);
  const existingAttachmentCount = Math.max(
    editingExpense?.attachmentCount ?? 0,
    editingExpense?.attachments?.length ?? 0,
  );
  const canAttachMoreFiles = existingAttachmentCount + attachmentFiles.length < MAX_EXPENSE_ATTACHMENTS;
  const canSubmit = draft.concept.trim().length > 0
    && amount > 0
    && draft.expenseDate.trim().length > 0
    && draft.budgetCurrencyCode.trim().length > 0
    && !attachmentError
    && !isSaving;
  const scopedBusinessOptions = filterBusinessesForUnit(businessOptions, draft.businessUnit);
  const accountingOptions = accountingAccountOptions.length > 0
    ? accountingAccountOptions
    : createFallbackAccountingOptions(editingExpense?.accountingAccount);
  const updateDraft = (updates: Partial<ExpenseDraftState>) => {
    setErrorMessage('');
    setDraft(current => ({ ...current, ...updates }));
  };

  const updateCurrency = (budgetCurrencyCode: string) => {
    const taxCountry = inferTaxCountryFromCurrency(budgetCurrencyCode);
    const defaultTaxProfile = getDefaultBudgetTaxProfile(taxCountry);
    updateDraft({
      budgetCurrencyCode,
      paymentAccountId: '',
      taxCountry,
      taxProfileId: defaultTaxProfile?.id ?? '',
      taxRate: defaultTaxProfile ? taxRateToPercentInput(defaultTaxProfile.rate) : '',
    });
  };

  const updateBusinessUnit = (businessUnit: string) => {
    const nextBusinesses = filterBusinessesForUnit(businessOptions, businessUnit);
    const keepBusiness = nextBusinesses.some(option => option.value === draft.business);
    updateDraft({ businessUnit, business: keepBusiness ? draft.business : '' });
  };

  const addAttachments = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const uniqueFiles = Array.from(files).filter(file => (
      !attachmentFiles.some(current => (
        current.name === file.name
        && current.size === file.size
        && current.lastModified === file.lastModified
      ))
    ));
    const oversizedFile = uniqueFiles.find(file => file.size > MAX_EXPENSE_ATTACHMENT_BYTES);
    if (oversizedFile) {
      setAttachmentError(`El archivo "${oversizedFile.name}" supera el límite de 10 MB.`);
      return;
    }

    const availableSlots = Math.max(
      MAX_EXPENSE_ATTACHMENTS - existingAttachmentCount - attachmentFiles.length,
      0,
    );
    if (uniqueFiles.length > availableSlots) {
      setAttachmentError(`Puedes guardar hasta ${MAX_EXPENSE_ATTACHMENTS} evidencias por gasto.`);
      return;
    }

    setAttachmentError('');
    setAttachmentFiles(current => [...current, ...uniqueFiles]);
  };

  const handleAttachmentSelection = (event: ChangeEvent<HTMLInputElement>) => {
    addAttachments(event.target.files);
    event.target.value = '';
  };

  const removeAttachment = (fileToRemove: File) => {
    setAttachmentError('');
    setAttachmentFiles(current => current.filter(file => file !== fileToRemove));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || savingRef.current) return;
    savingRef.current = true;

    const taxProfile = draft.taxEnabled ? getBudgetTaxProfile(draft.taxProfileId, draft.taxCountry) : undefined;
    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSubmitExpense({
        accountingAccount: draft.accountingAccount,
        amount: subtotal,
        attachmentFiles,
        attachments: editingExpense?.attachments ?? [],
        business: draft.business,
        businessUnit: draft.businessUnit,
        concept: draft.concept.trim(),
        currency: draft.budgetCurrencyCode,
        description: draft.description.trim(),
        dueDate: isEditMode ? draft.dueDate : draft.expenseDate,
        expenseDate: draft.expenseDate,
        paymentDate: isEditMode ? draft.paymentDate : draft.expenseDate,
        paymentMethod: draft.paymentMethod,
        paymentAccountId: draft.paymentAccountId,
        providerId: draft.providerId,
        status: isEditMode ? draft.status : 'paid',
        taxes,
        taxCountry: draft.taxEnabled ? draft.taxCountry : undefined,
        taxIncluded: draft.taxEnabled ? draft.taxIncluded : false,
        taxMode: draft.taxEnabled ? draft.taxMode : 'none',
        taxName: draft.taxEnabled ? taxProfile?.shortName ?? taxProfile?.label : undefined,
        taxProfileId: draft.taxEnabled ? draft.taxProfileId : undefined,
        taxRate: draft.taxEnabled ? toPercentNumber(draft.taxRate) : undefined,
        taxRegion: taxProfile?.region,
        taxSpecialAmount: draft.taxEnabled ? toMoneyNumber(draft.taxSpecialAmount) : undefined,
        total,
      });
    } catch (error) {
      setErrorMessage(toFinanceApiErrorMessage(error, isEditMode ? t.expenses.messages.updateFailed : t.expenses.messages.createFailed));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const formId = `expense-form-${editingExpense?.id ?? 'new'}`;
  return (
    <IndiceModalFrame
      busy={isSaving}
      closeLabel={t.columnModal.close}
      description={isEditMode ? t.expenses.modal.editSubtitle : t.expenses.modal.subtitle}
      footer={(
        <>
          <button type="button" className={financeModalSecondaryButtonClass} disabled={isSaving} onClick={onClose}>{t.common.cancel}</button>
          <button type="submit" form={formId} disabled={!canSubmit} className={financeModalPrimaryButtonClass}>
            <Check className="h-4 w-4" />
            {isSaving ? 'Guardando…' : isEditMode ? t.common.saveChanges : t.expenses.modal.register}
          </button>
        </>
      )}
      footerSummary={`${draft.concept.trim() || t.expenses.modal.emptyConcept} · ${formatCurrency(total, draft.budgetCurrencyCode)}${isEditMode ? '' : ` · ${formatDateSummary(draft.expenseDate)}`}`}
      icon={isEditMode ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      onOpenChange={(open) => !open && onClose()}
      open
      title={isEditMode ? t.expenses.modal.edit : t.expenses.headerButton}
      tone="green"
    >
      <form id={formId} className="space-y-4" onSubmit={handleSubmit}>
        <IndiceModalValidation messages={errorMessage ? [errorMessage] : []} title="No se pudo guardar" />
        <FinanceModalSection title={t.expenses.modal.mainTitle} description={t.expenses.modal.description}>
          <DateInput label={t.expenses.modal.date} required value={draft.expenseDate} onChange={(expenseDate) => updateDraft({ expenseDate })} />
          <TextInput label={t.expenses.modal.concept} required value={draft.concept} onChange={(concept) => updateDraft({ concept })} placeholder={t.expenses.modal.placeholderConcept} />
          <MoneyInput label={t.expenses.modal.amount} required value={draft.amount} onChange={(nextAmount) => updateDraft({ amount: nextAmount })} placeholder="0.00" />
          <SelectInput label={t.expenses.modal.currency} disabled={Boolean(editingExpense && ((editingExpense.amountPaid ?? 0) > 0 || editingExpense.budgetLineId))} required value={draft.budgetCurrencyCode} onChange={updateCurrency} options={financeCurrencySelectOptions} />
          {!isEditMode && <SelectInput searchable label={t.paymentAccounts.headerTitle} value={draft.paymentAccountId}
            onChange={(paymentAccountId) => updateDraft({ paymentAccountId })}
            options={[{ value: '', label: t.common.unassigned }, ...paymentAccounts.filter(account => account.isActive
              && account.currency === draft.budgetCurrencyCode && account.backendType !== 'PETTY_CASH'
              && account.source !== 'petty_cash' && !account.linkedFundId).map(account => ({ value: account.id, label: account.name }))]} />}
          <QuickProviderField
            emptyLabel={t.common.unassigned}
            label={t.filters.provider}
            onChange={(providerId) => updateDraft({ providerId })}
            onCreateProvider={onCreateProvider}
            providers={providers}
            value={draft.providerId}
          />
          <SelectInput label={t.expenses.columns.paymentMethod?.label ?? 'Método de pago'} value={draft.paymentMethod} onChange={(paymentMethod) => updateDraft({ paymentMethod: paymentMethod as PaymentMethod })} options={createPaymentMethodOptions(t.expenses.table.paymentMethods)} />
          <details className="md:col-span-2 group/notes" open={Boolean(editingExpense?.description) || undefined}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-medium text-slate-600 dark:text-slate-300 [&::-webkit-details-marker]:hidden">
              {t.expenses.columns.description?.label}<ChevronDown className="h-4 w-4 transition-transform group-open/notes:rotate-180" />
            </summary>
            <TextareaInput label={t.expenses.columns.description?.label ?? 'Descripción'} value={draft.description} onChange={(description) => updateDraft({ description })} placeholder={t.expenses.modal.descriptionPlaceholder} />
          </details>
        </FinanceModalSection>

        <details
          className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
          open={isAdvancedOpen}
          onToggle={(event) => setIsAdvancedOpen(event.currentTarget.open)}
        >
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 text-left [&::-webkit-details-marker]:hidden">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#147514] dark:bg-emerald-950/40"><SlidersHorizontal className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-950 dark:text-white">{t.expenses.modal.advancedTitle}</span>
              <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{t.expenses.modal.advancedDescription}</span>
            </span>
            <ChevronDown className="h-5 w-5 text-slate-500 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-4 border-t border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/30">
            {isEditMode ? (
              <FinanceModalSection title={t.expenses.modal.controlTitle} description={t.expenses.modal.controlDescription}>
                <DateInput label={t.expenses.columns.dueDate?.label ?? 'Fecha de vencimiento'} value={draft.dueDate} onChange={(dueDate) => updateDraft({ dueDate })} />
              </FinanceModalSection>
            ) : null}
            <FinanceModalSection title={t.expenses.modal.contextTitle} description={t.expenses.modal.contextDescription}>
              <SelectInput searchable label={t.filters.unit} value={draft.businessUnit} onChange={updateBusinessUnit} options={[{ value: '', label: t.common.unassigned }, ...unitOptions]} />
              <SelectInput searchable label={t.filters.business} value={draft.business} onChange={(business) => updateDraft({ business })} options={[{ value: '', label: t.common.unassigned }, ...scopedBusinessOptions]} />
              <SelectInput searchable label={t.expenses.columns.accountingAccount?.label ?? 'Cuenta contable'} value={draft.accountingAccount} onChange={(accountingAccount) => updateDraft({ accountingAccount })} options={[{ value: '', label: t.common.unassigned }, ...accountingOptions]} />
            </FinanceModalSection>
            <FinanceModalSection title={t.expenses.modal.taxTitle} description={t.expenses.modal.taxDescription}>
              <BudgetTaxControls draft={draft} onDraftChange={updateDraft} />
              <IndiceModalSummary
                className="md:col-span-2"
                columns={3}
                items={[
                  { label: t.expenses.modal.summarySubtotal, value: formatCurrency(subtotal, draft.budgetCurrencyCode) },
                  { label: t.expenses.modal.summaryTaxes, value: formatCurrency(taxes, draft.budgetCurrencyCode) },
                  { emphasized: true, label: t.expenses.modal.summaryTotal, value: formatCurrency(total, draft.budgetCurrencyCode) },
                ]}
                variant="success"
              />
            </FinanceModalSection>
            <FinanceModalSection
              title={t.expenses.modal.evidenceTitle}
              description={t.expenses.modal.evidenceDescription(MAX_EXPENSE_ATTACHMENTS)}
            >
          <div className="md:col-span-2">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={!canAttachMoreFiles}
              onChange={handleAttachmentSelection}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_EXPENSE_ATTACHMENTS}
              className="hidden"
              disabled={!canAttachMoreFiles}
              onChange={handleAttachmentSelection}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={!canAttachMoreFiles}
                onClick={() => cameraInputRef.current?.click()}
                className={attachmentActionClass}
              >
                <Camera className="h-5 w-5" />
                <span>
                  <strong className="block text-sm">Tomar foto</strong>
                  <span className="mt-0.5 block text-xs font-medium text-slate-500">Usa la cámara del dispositivo</span>
                </span>
              </button>
              <button
                type="button"
                disabled={!canAttachMoreFiles}
                onClick={() => fileInputRef.current?.click()}
                className={attachmentActionClass}
              >
                <Upload className="h-5 w-5" />
                <span>
                  <strong className="block text-sm">Elegir archivo</strong>
                  <span className="mt-0.5 block text-xs font-medium text-slate-500">Imagen, PDF, Office, CSV o texto</span>
                </span>
              </button>
            </div>

            {existingAttachmentCount > 0 ? (
              <p className="mt-3 text-xs font-medium text-slate-500">
                {existingAttachmentCount} {existingAttachmentCount === 1 ? 'archivo guardado' : 'archivos guardados'} en este gasto.
              </p>
            ) : null}

            {attachmentFiles.length > 0 ? (
              <div className="mt-3 space-y-2">
                {attachmentFiles.map(file => (
                  <div
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#147514] dark:bg-emerald-950/40">
                      <File className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{file.name}</p>
                      <p className="text-xs font-medium text-slate-500">{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(file)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100"
                      aria-label={`Quitar ${file.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            {attachmentError ? <p className="mt-3 text-sm font-medium text-red-600">{attachmentError}</p> : null}
          </div>
            </FinanceModalSection>
          </div>
        </details>
      </form>
    </IndiceModalFrame>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return <FinanceFieldLabel label={label} required={required} />;
}

function TextInput({ label, onChange, placeholder, required, value }: { label: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; value: string }) {
  return (
    <label>
      <FieldLabel label={label} required={required} />
      <input required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={financeModalInputClass} />
    </label>
  );
}

function MoneyInput({ label, onChange, placeholder, required, value }: { label: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; value: string }) {
  return (
    <label>
      <FieldLabel label={label} required={required} />
      <input required={required} min={required ? 0.01 : 0} step="0.01" type="number" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={financeModalInputClass} />
    </label>
  );
}

function DateInput({ label, onChange, required, value }: { label: string; onChange: (value: string) => void; required?: boolean; value: string }) {
  return (
    <label>
      <FieldLabel label={label} required={required} />
      <input required={required} type="date" value={value} onChange={(event) => onChange(event.target.value)} className={financeModalInputClass} />
    </label>
  );
}

function TextareaInput({ label, onChange, placeholder, value }: { label: string; onChange: (value: string) => void; placeholder?: string; value: string }) {
  return (
    <label>
      <FieldLabel label={label} />
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${financeModalInputClass} min-h-24 resize-y`} />
    </label>
  );
}

function SelectInput({
  label,
  onChange,
  options,
  required,
  disabled,
  searchable,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  value: string;
}) {
  return (
    <label>
      <FieldLabel label={label} required={required} />
      {searchable ? <ExpenseAccountSelect label={label} value={value} onChange={onChange} options={options} disabled={disabled}
        allowEmpty={options.some(option => !option.value)} emptyLabel={options.find(option => !option.value)?.label} /> : <select disabled={disabled} required={required} value={value} onChange={(event) => onChange(event.target.value)} className={financeModalInputClass}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>}
    </label>
  );
}

function createExpenseDraftState(expense: Expense | null, preferredCurrency: string): ExpenseDraftState {
  const currency = expense?.currency || (isFinanceCurrencyOption(preferredCurrency) ? preferredCurrency : DEFAULT_FINANCE_CURRENCY);
  const taxCountry = normalizeTaxCountry(expense?.taxCountry || inferTaxCountryFromCurrency(currency));
  const defaultTaxProfile = getDefaultBudgetTaxProfile(taxCountry);
  const hasTaxMetadata = Boolean((expense?.taxMode && expense.taxMode !== 'none') || expense?.taxProfileId || expense?.taxRate || expense?.taxSpecialAmount);
  const hasTaxAmount = (expense?.taxes ?? 0) > 0;

  return {
    accountingAccount: expense?.accountingAccount ?? '',
    amount: expense ? String(expense.taxIncluded ? expense.total : expense.amount ?? 0) : '',
    business: expense?.business ?? '',
    businessUnit: expense?.businessUnit ?? '',
    budgetCurrencyCode: currency,
    concept: expense?.concept ?? '',
    description: expense?.description ?? '',
    dueDate: formatDateInputValue(expense?.dueDate),
    expenseDate: formatDateInputValue(expense?.date ?? new Date()),
    paymentDate: formatDateInputValue(expense?.paymentDate),
    paymentMethod: expense?.paymentMethod ?? 'transfer',
    paymentAccountId: expense?.paymentAccountId ?? '',
    providerId: expense?.providerId ?? '',
    status: expense?.status ?? 'paid',
    taxes: expense ? String(expense.taxes ?? '') : '',
    taxCountry,
    taxEnabled: hasTaxMetadata || hasTaxAmount,
    taxIncluded: Boolean(expense?.taxIncluded),
    taxMode: expense?.taxMode ?? (hasTaxAmount ? 'manual' : 'none'),
    taxProfileId: expense?.taxProfileId ?? defaultTaxProfile?.id ?? '',
    taxRate: taxRateToPercentInput(expense?.taxRate ?? defaultTaxProfile?.rate ?? 0),
    taxSpecialAmount: String(expense?.taxSpecialAmount ?? ''),
  };
}

function filterBusinessesForUnit(options: FinanceReferenceOption[], unitId: string) {
  if (!unitId) return options;
  return options.filter(option => !option.unitId || option.unitId === unitId);
}

function createFallbackAccountingOptions(currentAccount?: string) {
  return currentAccount ? [{ value: currentAccount, label: currentAccount }] : [];
}

function createPaymentMethodOptions(paymentMethods: Record<string, string>) {
  return Object.entries(paymentMethods).map(([value, label]) => ({ value, label }));
}

function normalizeTaxCountry(value: string): BudgetTaxCountry {
  return ['MX', 'US', 'CA', 'CO', 'BR', 'INTL'].includes(value) ? value as BudgetTaxCountry : 'INTL';
}

function toMoneyNumber(value: string) {
  const normalizedValue = value.replace(/,/g, '').trim();
  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toPercentNumber(value: string) {
  const parsedValue = Number(value.replace('%', '').replace(',', '.').trim());
  return Number.isFinite(parsedValue) ? parsedValue / 100 : 0;
}

function formatDateInputValue(value?: Date) {
  if (!value || Number.isNaN(value.getTime())) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateSummary(value: string) {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

const MAX_EXPENSE_ATTACHMENTS = 5;
const MAX_EXPENSE_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXPENSE_ATTACHMENTS = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt';
const attachmentActionClass = 'flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-slate-900 transition hover:border-[#147514]/35 hover:bg-[#147514]/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white';

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
