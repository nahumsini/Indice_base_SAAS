import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { Plus, ReceiptText } from 'lucide-react';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import { Input } from '../../../../components/ui/input';
import {
  getBudgetTaxProfile,
  getDefaultBudgetTaxProfile,
  inferTaxCountryFromCurrency,
  taxRateToPercentInput,
} from '../../Budgets/budgetTaxCatalog';
import { formatCurrency } from '../../utils/expenses.utils';
import { BudgetTaxControls, type TaxControlDraft } from './BudgetTaxControls';
import { useExpensesTranslations } from '../../Expenses/hooks/useExpensesTranslations';

export type QuickExpenseValues = {
  amount: number;
  attachmentFiles: File[];
  business: string;
  businessUnit: string;
  concept: string;
  currency: string;
  description: string;
  taxes: number;
  taxCountry?: string;
  taxIncluded: boolean;
  taxMode: TaxControlDraft['taxMode'];
  taxName?: string;
  taxProfileId?: string;
  taxRate?: number;
  taxRegion?: string;
  total: number;
};

type QuickExpenseDialogProps = {
  currency: string;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: QuickExpenseValues) => void | Promise<void>;
  open: boolean;
};

export function QuickExpenseDialog({
  currency,
  isSubmitting,
  onOpenChange,
  onSubmit,
  open,
}: QuickExpenseDialogProps) {
  const t = useExpensesTranslations();
  const [concept, setConcept] = useState('');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<TaxControlDraft>(() => createQuickTaxDraft(currency));
  const enteredAmount = toMoneyNumber(draft.amount);
  const taxes = draft.taxEnabled ? toMoneyNumber(draft.taxes) : 0;
  const subtotal = draft.taxEnabled && draft.taxIncluded ? Math.max(enteredAmount - taxes, 0) : enteredAmount;
  const total = draft.taxEnabled && !draft.taxIncluded ? enteredAmount + taxes : enteredAmount;
  const canSubmit = concept.trim().length > 0 && enteredAmount > 0 && !isSubmitting;
  const updateDraft = (updates: Partial<TaxControlDraft>) => setDraft(current => ({ ...current, ...updates }));

  useEffect(() => {
    if (!open) {
      setConcept('');
      setDraft(createQuickTaxDraft(currency));
    }
  }, [currency, open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    const taxProfile = draft.taxEnabled ? getBudgetTaxProfile(draft.taxProfileId, draft.taxCountry) : undefined;
    setError('');
    try {
      await onSubmit({
        amount: subtotal,
        attachmentFiles: [],
        business: '',
        businessUnit: '',
        concept: concept.trim(),
        currency,
        description: '',
        taxes,
        taxCountry: draft.taxEnabled ? draft.taxCountry : undefined,
        taxIncluded: draft.taxEnabled ? draft.taxIncluded : false,
        taxMode: draft.taxEnabled ? draft.taxMode : 'none',
        taxName: draft.taxEnabled ? taxProfile?.shortName ?? taxProfile?.label : undefined,
        taxProfileId: draft.taxEnabled ? draft.taxProfileId : undefined,
        taxRate: draft.taxEnabled ? toPercentNumber(draft.taxRate) : undefined,
        taxRegion: taxProfile?.region,
        total,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo crear el gasto.');
    }
  };

  return (
    <IndiceModalFrame
      busy={isSubmitting}
      contentClassName="sm:max-w-[480px]"
      description={t.expenses.quick.description}
      footer={(
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <button type="button" className="h-10 rounded-xl border border-white/30 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50" disabled={isSubmitting} onClick={() => onOpenChange(false)}>{t.common.cancel}</button>
          <button form="quick-expense-form" type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#147514] transition hover:bg-slate-100 disabled:opacity-50" disabled={!canSubmit}>
            <Plus className="h-4 w-4" />
            {isSubmitting ? t.expenses.quick.saving : t.expenses.quick.create}
          </button>
        </div>
      )}
      footerSummary={formatCurrency(total, currency)}
      icon={<ReceiptText className="h-5 w-5" />}
      modalType="standard-form"
      onOpenChange={onOpenChange}
      open={open}
      title={t.expenses.quick.title}
      tone="green"
    >
        <form id="quick-expense-form" className="grid gap-4" onSubmit={handleSubmit}>
            {error ? <IndiceModalValidation messages={[error]} tone="error" /> : null}
            <Field label={t.expenses.modal.concept}>
              <Input autoFocus maxLength={160} value={concept} onChange={(event) => setConcept(event.target.value)} placeholder={t.expenses.modal.placeholderConcept} className={inputClass} />
            </Field>
            <Field label={`${t.expenses.modal.amount} · ${currency}`}>
              <Input min={0.01} step="0.01" type="number" value={draft.amount} onChange={(event) => updateDraft({ amount: event.target.value })} placeholder="0.00" className={inputClass} />
            </Field>
            <BudgetTaxControls compact draft={draft} onDraftChange={updateDraft} />
            {draft.taxEnabled ? (
              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[#147514]/20 bg-[#147514]/5 p-3 dark:border-emerald-500/25 dark:bg-emerald-500/10">
                <QuickSummary label={t.expenses.modal.summarySubtotal} value={formatCurrency(subtotal, currency)} />
                <QuickSummary label={t.expenses.modal.summaryTaxes} value={formatCurrency(taxes, currency)} />
                <QuickSummary label={t.expenses.modal.summaryTotal} value={formatCurrency(total, currency)} strong />
              </div>
            ) : null}
        </form>
    </IndiceModalFrame>
  );
}

const inputClass = 'h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100';

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      {children}
    </label>
  );
}

function QuickSummary({ label, strong, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
      <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 truncate text-sm font-semibold ${strong ? 'text-[#147514] dark:text-emerald-300' : 'text-slate-900 dark:text-slate-100'}`}>{value}</p>
    </div>
  );
}

function createQuickTaxDraft(currency: string): TaxControlDraft {
  const taxCountry = inferTaxCountryFromCurrency(currency);
  const defaultTaxProfile = getDefaultBudgetTaxProfile(taxCountry);
  return {
    amount: '',
    budgetCurrencyCode: currency,
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

function toMoneyNumber(value: string) {
  const parsedValue = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function toPercentNumber(value: string) {
  const parsedValue = Number(value.replace('%', '').replace(',', '.').trim());
  return Number.isFinite(parsedValue) ? parsedValue / 100 : 0;
}
