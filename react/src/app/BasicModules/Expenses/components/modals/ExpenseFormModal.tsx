import { Check, FileText, Pencil, Plus, X } from 'lucide-react';
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
import type { Expense, ExpenseStatus, PaymentMethod } from '../../types/expenses.types';
import { formatCurrency } from '../../utils/expenses.utils';
import { BudgetTaxControls, type TaxControlDraft } from './BudgetTaxControls';

export type ExpenseFormValues = {
  accountingAccount: string;
  amount: number;
  business: string;
  businessUnit: string;
  concept: string;
  currency: string;
  description: string;
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
  editingExpense: Expense | null;
  onClose: () => void;
  preferredCurrency?: string;
  onSubmitExpense: (values: ExpenseFormValues) => void | Promise<void>;
};

type ExpenseDraftState = TaxControlDraft & {
  concept: string;
};

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-none placeholder:text-slate-400 transition-colors focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100';

export function ExpenseFormModal({
  editingExpense,
  onClose,
  preferredCurrency = DEFAULT_FINANCE_CURRENCY,
  onSubmitExpense,
}: ExpenseFormModalProps) {
  const [draft, setDraft] = useState<ExpenseDraftState>(() => createExpenseDraftState(editingExpense, preferredCurrency));
  const isEditMode = Boolean(editingExpense);
  const amount = toMoneyNumber(draft.amount);
  const taxes = draft.taxEnabled ? toMoneyNumber(draft.taxes) : 0;
  const subtotal = draft.taxEnabled && draft.taxIncluded ? Math.max(amount - taxes, 0) : amount;
  const total = draft.taxEnabled && draft.taxIncluded ? amount : amount + taxes;
  const canSubmit = draft.concept.trim().length > 0 && amount > 0 && draft.budgetCurrencyCode.trim().length > 0;

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const taxProfile = draft.taxEnabled ? getBudgetTaxProfile(draft.taxProfileId, draft.taxCountry) : undefined;
    void onSubmitExpense({
      accountingAccount: editingExpense?.accountingAccount ?? '',
      amount: subtotal,
      business: editingExpense?.business ?? '',
      businessUnit: editingExpense?.businessUnit ?? '',
      concept: draft.concept.trim(),
      currency: draft.budgetCurrencyCode,
      description: editingExpense?.description ?? '',
      paymentDate: formatDateInputValue(editingExpense?.paymentDate),
      paymentMethod: editingExpense?.paymentMethod ?? 'transfer',
      providerId: editingExpense?.providerId ?? '',
      status: editingExpense?.status ?? 'pending',
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
              <h3 className="text-xl font-bold text-white">{isEditMode ? 'Editar gasto' : 'Agregar gasto'}</h3>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-white/80">Captura rápida del gasto base.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20" aria-label="Cerrar modal de gasto">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/70 px-6 py-6 dark:bg-slate-950/40">
          <StepCard>
            <FieldGroup title="Gasto base">
              <TextInput label="Concepto" required value={draft.concept} onChange={(concept) => updateDraft({ concept })} placeholder="Ej. Renta mensual" />
              <MoneyInput label="Monto" required value={draft.amount} onChange={(nextAmount) => updateDraft({ amount: nextAmount })} placeholder="0.00" />
              <SelectInput label="Moneda" required value={draft.budgetCurrencyCode} onChange={updateCurrency} options={financeCurrencySelectOptions} />
              <BudgetTaxControls draft={draft} onDraftChange={updateDraft} />
              <div className="md:col-span-2 grid gap-3 rounded-[22px] border border-[#147514]/20 bg-[#147514]/5 p-4 md:grid-cols-3">
                <SummaryMetric label="Subtotal" value={formatCurrency(subtotal, draft.budgetCurrencyCode)} />
                <SummaryMetric label="Impuestos" value={formatCurrency(taxes, draft.budgetCurrencyCode)} />
                <SummaryMetric label="Total" value={formatCurrency(total, draft.budgetCurrencyCode)} strong />
              </div>
            </FieldGroup>
          </StepCard>
        </div>

        <div className="flex shrink-0 flex-col gap-3 bg-[#147514] px-6 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-[#0b3f1b]">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white shadow-none transition hover:bg-white/20 hover:text-white">Cancelar</button>
          <button type="submit" disabled={!canSubmit} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#147514] shadow-sm transition hover:bg-slate-100 hover:text-[#147514] disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-[#147514]/50">
            <Check className="h-4 w-4" />
            {isEditMode ? 'Guardar cambios' : 'Crear gasto'}
          </button>
        </div>
      </form>
    </div>
  );
}

function StepCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#147514]/10 text-[#147514]">
          <FileText className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-bold text-slate-950 dark:text-white">Datos principales</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">Concepto, monto y moneda.</p>
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
    amount: expense ? String(expense.taxIncluded ? expense.total : expense.amount ?? 0) : '',
    budgetCurrencyCode: currency,
    concept: expense?.concept ?? '',
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
