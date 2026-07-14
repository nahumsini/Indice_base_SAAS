import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { Plus, ReceiptText, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../../../../components/ui/dialog';
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    const taxProfile = draft.taxEnabled ? getBudgetTaxProfile(draft.taxProfileId, draft.taxCountry) : undefined;
    void onSubmit({
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="max-w-[480px] overflow-hidden rounded-[28px] border border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start justify-between gap-4 bg-[#147514] px-5 py-4 text-white dark:bg-[#0b3f1b]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm">
              <ReceiptText className="h-5 w-5" />
            </span>
            <div>
            <DialogTitle className="text-lg font-bold text-white">{t.expenses.quick.title}</DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-white/80">
                {t.expenses.quick.description}
            </DialogDescription>
            </div>
          </div>
          <button type="button" onClick={() => onOpenChange(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20" aria-label={t.columnModal.close}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid max-h-[calc(100vh-13rem)] gap-4 overflow-y-auto bg-slate-50/70 px-5 py-5 dark:bg-slate-950/40">
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
          </div>
          <DialogFooter className="gap-3 bg-[#147514] px-5 py-4 dark:bg-[#0b3f1b]">
            <Button type="button" variant="outline" className="h-10 rounded-xl border-white/30 bg-white/10 px-4 text-sm font-semibold text-white shadow-none hover:bg-white/20 hover:text-white" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" className="h-10 rounded-xl bg-white px-4 text-sm font-semibold text-[#147514] shadow-sm hover:bg-slate-100 hover:text-[#147514] disabled:bg-white/40 disabled:text-[#147514]/50" disabled={!canSubmit}>
              <Plus className="h-4 w-4" />
              {isSubmitting ? t.expenses.quick.saving : t.expenses.quick.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
      <p className="truncate text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 truncate text-sm font-bold ${strong ? 'text-[#147514] dark:text-emerald-300' : 'text-slate-900 dark:text-slate-100'}`}>{value}</p>
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
