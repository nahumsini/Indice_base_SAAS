import { Check, Pencil, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
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
  const t = useExpensesTranslations();
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<ExpenseDraftState>(() => createExpenseDraftState(editingExpense ?? initialExpense, preferredCurrency));
  const isEditMode = Boolean(editingExpense);
  const amount = toMoneyNumber(draft.amount);
  const taxes = draft.taxEnabled ? toMoneyNumber(draft.taxes) : 0;
  const subtotal = draft.taxEnabled && draft.taxIncluded ? Math.max(amount - taxes, 0) : amount;
  const total = draft.taxEnabled && draft.taxIncluded ? amount : amount + taxes;
  const canSubmit = draft.concept.trim().length > 0 && amount > 0 && draft.budgetCurrencyCode.trim().length > 0 && !isSaving;
  const scopedBusinessOptions = filterBusinessesForUnit(businessOptions, draft.businessUnit);
  const providerOptions = providers
    .filter(provider => provider.status !== 'inactive')
    .map(provider => ({ value: provider.id, label: provider.name }));
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const taxProfile = draft.taxEnabled ? getBudgetTaxProfile(draft.taxProfileId, draft.taxCountry) : undefined;
    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSubmitExpense({
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
    } catch {
      setErrorMessage(isEditMode ? t.expenses.messages.updateFailed : t.expenses.messages.createFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const formId = `expense-form-${editingExpense?.id ?? 'new'}`;
  return (
    <IndiceModalFrame
      busy={isSaving}
      closeLabel={t.columnModal.close}
      description={t.expenses.modal.subtitle}
      footer={(
        <>
          <button type="button" className={financeModalSecondaryButtonClass} disabled={isSaving} onClick={onClose}>{t.common.cancel}</button>
          <button type="submit" form={formId} disabled={!canSubmit} className={financeModalPrimaryButtonClass}>
            <Check className="h-4 w-4" />
            {isSaving ? 'Guardando…' : isEditMode ? t.common.saveChanges : t.expenses.modal.create}
          </button>
        </>
      )}
      footerSummary={`${draft.concept.trim() || 'Gasto sin concepto'} · ${formatCurrency(total, draft.budgetCurrencyCode)}`}
      icon={isEditMode ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      onOpenChange={(open) => !open && onClose()}
      open
      title={isEditMode ? t.expenses.modal.edit : t.expenses.headerButton}
      tone="green"
    >
      <form id={formId} className="space-y-4" onSubmit={handleSubmit}>
        <IndiceModalValidation messages={errorMessage ? [errorMessage] : []} title="No se pudo guardar" />
        <FinanceModalSection title={t.expenses.modal.mainTitle} description={t.expenses.modal.description}>
          <TextInput label={t.expenses.modal.concept} required value={draft.concept} onChange={(concept) => updateDraft({ concept })} placeholder={t.expenses.modal.placeholderConcept} />
          {isEditMode ? (
            <SelectInput label={t.expenses.columns.status?.label ?? t.filters.status} value={draft.status} onChange={(status) => updateDraft({ status: status as ExpenseStatus })} options={createStatusOptions(t.expenses.table.statuses)} />
          ) : (
            <ReadOnlyInput
              label={t.expenses.columns.status?.label ?? t.filters.status}
              value={t.expenses.table.statuses.paid}
            />
          )}
          <DateInput label={t.expenses.columns.dueDate?.label ?? 'Fecha de vencimiento'} value={draft.dueDate} onChange={(dueDate) => updateDraft({ dueDate })} />
          <SelectInput label={t.expenses.columns.paymentMethod?.label ?? 'Método de pago'} value={draft.paymentMethod} onChange={(paymentMethod) => updateDraft({ paymentMethod: paymentMethod as PaymentMethod })} options={createPaymentMethodOptions(t.expenses.table.paymentMethods)} />
          <div className="md:col-span-2">
            <TextareaInput label={t.expenses.columns.description?.label ?? 'Descripción'} value={draft.description} onChange={(description) => updateDraft({ description })} placeholder={t.expenses.modal.placeholderConcept} />
          </div>
        </FinanceModalSection>

        <FinanceModalSection title={t.filters.title} description={t.expenses.headerSubtitle}>
          <SelectInput label={t.filters.unit} value={draft.businessUnit} onChange={updateBusinessUnit} options={[{ value: '', label: t.common.unassigned }, ...unitOptions]} />
          <SelectInput label={t.filters.business} value={draft.business} onChange={(business) => updateDraft({ business })} options={[{ value: '', label: t.common.unassigned }, ...scopedBusinessOptions]} />
          <SelectInput label={t.filters.provider} value={draft.providerId} onChange={(providerId) => updateDraft({ providerId })} options={[{ value: '', label: t.common.unassigned }, ...providerOptions]} />
          <SelectInput label={t.expenses.columns.accountingAccount?.label ?? 'Cuenta contable'} value={draft.accountingAccount} onChange={(accountingAccount) => updateDraft({ accountingAccount })} options={[{ value: '', label: t.common.unassigned }, ...accountingOptions]} />
        </FinanceModalSection>

        <FinanceModalSection title={t.expenses.modal.summaryTotal} description={t.expenses.modal.description}>
          <MoneyInput label={t.expenses.modal.amount} required value={draft.amount} onChange={(nextAmount) => updateDraft({ amount: nextAmount })} placeholder="0.00" />
          <SelectInput label={t.expenses.modal.currency} required value={draft.budgetCurrencyCode} onChange={updateCurrency} options={financeCurrencySelectOptions} />
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

function DateInput({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label>
      <FieldLabel label={label} />
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className={financeModalInputClass} />
    </label>
  );
}

function ReadOnlyInput({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <FieldLabel label={label} />
      <div className={`${financeModalInputClass} flex items-center bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200`}>
        {value}
      </div>
    </div>
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
      <select required={required} value={value} onChange={(event) => onChange(event.target.value)} className={financeModalInputClass}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
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
