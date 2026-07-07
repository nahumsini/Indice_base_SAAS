import { Building2, Check, FileText, Pencil, Plus, ReceiptText, X } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
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
import type { Expense, ExpenseStatus, PaymentMethod, Provider } from '../../types/expenses.types';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import { formatCurrency } from '../../utils/expenses.utils';
import { BudgetTaxControls, type TaxControlDraft } from './BudgetTaxControls';
import { useFinanceTranslations } from '../../hooks/useFinanceTranslations';

export type ExpenseFormValues = {
  accountingAccount: string;
  amount: number;
  attachments?: string[];
  business: string;
  businessUnit: string;
  concept: string;
  currency: string;
  description: string;
  dueDate: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
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
  preferredCurrency?: string;
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
  paymentDate: string;
  paymentMethod: PaymentMethod;
  providerId: string;
  status: ExpenseStatus;
};

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-none placeholder:text-slate-400 transition-colors focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100';

export function ExpenseFormModal({
  accountingAccountOptions = [],
  businessOptions = [],
  editingExpense,
  initialExpense = null,
  onClose,
  preferredCurrency = DEFAULT_FINANCE_CURRENCY,
  providers = [],
  unitOptions = [],
  onSubmitExpense,
}: ExpenseFormModalProps) {
  const t = useFinanceTranslations();
  const [draft, setDraft] = useState<ExpenseDraftState>(() => createExpenseDraftState(editingExpense ?? initialExpense, preferredCurrency));
  const isEditMode = Boolean(editingExpense);
  const amount = toMoneyNumber(draft.amount);
  const taxes = draft.taxEnabled ? toMoneyNumber(draft.taxes) : 0;
  const subtotal = draft.taxEnabled && draft.taxIncluded ? Math.max(amount - taxes, 0) : amount;
  const total = draft.taxEnabled && draft.taxIncluded ? amount : amount + taxes;
  const canSubmit = draft.concept.trim().length > 0 && amount > 0 && draft.budgetCurrencyCode.trim().length > 0;
  const scopedBusinessOptions = filterBusinessesForUnit(businessOptions, draft.businessUnit);
  const providerOptions = providers
    .filter(provider => provider.status !== 'inactive')
    .map(provider => ({ value: provider.id, label: provider.name }));
  const accountingOptions = accountingAccountOptions.length > 0
    ? accountingAccountOptions
    : createFallbackAccountingOptions(editingExpense?.accountingAccount);
  const updateDraft = (updates: Partial<ExpenseDraftState>) => {
    setDraft(current => ({ ...current, ...updates }));
  };

  const updateCurrency = (budgetCurrencyCode: string) => {
    const taxCountry = inferTaxCountryFromCurrency(budgetCurrencyCode);
    const defaultTaxProfile = getDefaultBudgetTaxProfile(taxCountry);
    updateDraft({
      budgetCurrencyCode,
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const taxProfile = draft.taxEnabled ? getBudgetTaxProfile(draft.taxProfileId, draft.taxCountry) : undefined;
    void onSubmitExpense({
      accountingAccount: draft.accountingAccount,
      amount: subtotal,
      attachments: editingExpense?.attachments ?? [],
      business: draft.business,
      businessUnit: draft.businessUnit,
      concept: draft.concept.trim(),
      currency: draft.budgetCurrencyCode,
      description: draft.description.trim(),
      dueDate: draft.dueDate,
      paymentDate: draft.paymentDate,
      paymentMethod: draft.paymentMethod,
      providerId: draft.providerId,
      status: draft.status,
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()} className="flex max-h-[calc(100vh-3rem)] w-full max-w-[760px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex shrink-0 items-start justify-between gap-4 bg-[#147514] px-6 py-4 text-white dark:bg-[#0b3f1b]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm">
              {isEditMode ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </span>
            <div>
              <h3 className="text-xl font-bold text-white">{isEditMode ? t.expenses.modal.edit : t.expenses.headerButton}</h3>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-white/80">{t.expenses.modal.subtitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20" aria-label={t.columnModal.close}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/70 px-6 py-6 dark:bg-slate-950/40">
          <div className="space-y-5">
            <StepCard description={t.expenses.modal.description} icon={<ReceiptText className="h-5 w-5" />} title={t.expenses.modal.mainTitle}>
              <FieldGroup title={t.expenses.modal.groupTitle}>
                <TextInput label={t.expenses.modal.concept} required value={draft.concept} onChange={(concept) => updateDraft({ concept })} placeholder={t.expenses.modal.placeholderConcept} />
                <SelectInput label={t.expenses.columns.status?.label ?? t.filters.status} value={draft.status} onChange={(status) => updateDraft({ status: status as ExpenseStatus })} options={createStatusOptions(t.expenses.table.statuses)} />
                <DateInput label={t.expenses.columns.dueDate?.label ?? 'Due date'} value={draft.dueDate} onChange={(dueDate) => updateDraft({ dueDate })} />
                <SelectInput label={t.expenses.columns.paymentMethod?.label ?? 'Payment method'} value={draft.paymentMethod} onChange={(paymentMethod) => updateDraft({ paymentMethod: paymentMethod as PaymentMethod })} options={createPaymentMethodOptions(t.expenses.table.paymentMethods)} />
                <div className="md:col-span-2">
                  <TextareaInput label={t.expenses.columns.description?.label ?? 'Description'} value={draft.description} onChange={(description) => updateDraft({ description })} placeholder={t.expenses.modal.placeholderConcept} />
                </div>
              </FieldGroup>
            </StepCard>

            <StepCard description={t.expenses.headerSubtitle} icon={<Building2 className="h-5 w-5" />} title={t.filters.title}>
              <FieldGroup title={t.filters.title}>
                <SelectInput label={t.filters.unit} value={draft.businessUnit} onChange={updateBusinessUnit} options={[{ value: '', label: t.common.unassigned }, ...unitOptions]} />
                <SelectInput label={t.filters.business} value={draft.business} onChange={(business) => updateDraft({ business })} options={[{ value: '', label: t.common.unassigned }, ...scopedBusinessOptions]} />
                <SelectInput label={t.filters.provider} value={draft.providerId} onChange={(providerId) => updateDraft({ providerId })} options={[{ value: '', label: t.common.unassigned }, ...providerOptions]} />
                <SelectInput label={t.expenses.columns.accountingAccount?.label ?? 'Accounting account'} value={draft.accountingAccount} onChange={(accountingAccount) => updateDraft({ accountingAccount })} options={[{ value: '', label: t.common.unassigned }, ...accountingOptions]} />
              </FieldGroup>
            </StepCard>

            <StepCard description={t.expenses.modal.description} icon={<FileText className="h-5 w-5" />} title={t.expenses.modal.summaryTotal}>
              <FieldGroup title={t.expenses.modal.groupTitle}>
                <MoneyInput label={t.expenses.modal.amount} required value={draft.amount} onChange={(nextAmount) => updateDraft({ amount: nextAmount })} placeholder="0.00" />
                <SelectInput label={t.expenses.modal.currency} required value={draft.budgetCurrencyCode} onChange={updateCurrency} options={financeCurrencySelectOptions} />
                <BudgetTaxControls draft={draft} onDraftChange={updateDraft} />
                <div className="md:col-span-2 grid gap-3 rounded-[22px] border border-[#147514]/20 bg-[#147514]/5 p-4 md:grid-cols-3">
                  <SummaryMetric label={t.expenses.modal.summarySubtotal} value={formatCurrency(subtotal, draft.budgetCurrencyCode)} />
                  <SummaryMetric label={t.expenses.modal.summaryTaxes} value={formatCurrency(taxes, draft.budgetCurrencyCode)} />
                  <SummaryMetric label={t.expenses.modal.summaryTotal} value={formatCurrency(total, draft.budgetCurrencyCode)} strong />
                </div>
              </FieldGroup>
            </StepCard>

          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 bg-[#147514] px-6 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-[#0b3f1b]">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white shadow-none transition hover:bg-white/20 hover:text-white">{t.common.cancel}</button>
          <button type="submit" disabled={!canSubmit} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#147514] shadow-sm transition hover:bg-slate-100 hover:text-[#147514] disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-[#147514]/50">
            <Check className="h-4 w-4" />
            {isEditMode ? t.common.saveChanges : t.expenses.modal.create}
          </button>
        </div>
      </form>
    </div>
  );
}

function StepCard({ children, description, icon, title }: { children: ReactNode; description: string; icon: ReactNode; title: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#147514]/10 text-[#147514]">
          {icon}
        </span>
        <div>
          <h3 className="text-base font-bold text-slate-950 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function FieldGroup({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/45">
      <h4 className="mb-4 text-sm font-bold text-slate-950 dark:text-white">{title}</h4>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}{required ? ' *' : ''}</span>;
}

function TextInput({ label, onChange, placeholder, required, value }: { label: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; value: string }) {
  return (
    <label>
      <FieldLabel label={label} required={required} />
      <input required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={inputClass} />
    </label>
  );
}

function MoneyInput({ label, onChange, placeholder, required, value }: { label: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; value: string }) {
  return (
    <label>
      <FieldLabel label={label} required={required} />
      <input required={required} min={required ? 0.01 : 0} step="0.01" type="number" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={inputClass} />
    </label>
  );
}

function DateInput({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label>
      <FieldLabel label={label} />
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />
    </label>
  );
}

function TextareaInput({ label, onChange, placeholder, value }: { label: string; onChange: (value: string) => void; placeholder?: string; value: string }) {
  return (
    <label>
      <FieldLabel label={label} />
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${inputClass} min-h-24 resize-y`} />
    </label>
  );
}

function SelectInput({
  label,
  onChange,
  options,
  required,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  value: string;
}) {
  return (
    <label>
      <FieldLabel label={label} required={required} />
      <select required={required} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
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

function createExpenseDraftState(expense: Expense | null, preferredCurrency: string): ExpenseDraftState {
  const currency = expense?.currency || (isFinanceCurrencyOption(preferredCurrency) ? preferredCurrency : DEFAULT_FINANCE_CURRENCY);
  const taxCountry = normalizeTaxCountry(expense?.taxCountry || inferTaxCountryFromCurrency(currency));
  const defaultTaxProfile = getDefaultBudgetTaxProfile(taxCountry);
  const hasTaxMetadata = Boolean(expense?.taxMode || expense?.taxProfileId || expense?.taxRate || expense?.taxSpecialAmount);
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
    paymentDate: formatDateInputValue(expense?.paymentDate),
    paymentMethod: expense?.paymentMethod ?? 'transfer',
    providerId: expense?.providerId ?? '',
    status: expense?.status ?? 'pending',
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

function createStatusOptions(statuses: Record<string, string>) {
  return Object.entries(statuses).map(([value, label]) => ({ value, label }));
}

function normalizeTaxCountry(value: string): BudgetTaxCountry {
  return ['MX', 'US', 'CA', 'CO', 'BR', 'INTL'].includes(value) ? value as BudgetTaxCountry : 'INTL';
}

function toMoneyNumber(value: string) {
  const normalizedValue = value.replace(/,/g, '').trim();
  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
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
