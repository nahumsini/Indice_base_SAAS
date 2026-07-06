import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { Paperclip, Plus, ReceiptText, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../../../../components/ui/dialog';
import { Input } from '../../../../components/ui/input';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import { financeCurrencySelectOptions } from '../../constants/financeCurrencyOptions';
import { useFinanceTranslations } from '../../hooks/useFinanceTranslations';

export type QuickExpenseValues = {
  amount: number;
  attachmentFiles: File[];
  business: string;
  businessUnit: string;
  concept: string;
  currency: string;
  description: string;
};

type QuickExpenseDialogProps = {
  businessOptions: FinanceReferenceOption[];
  currency: string;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: QuickExpenseValues) => void | Promise<void>;
  open: boolean;
  unitOptions: FinanceReferenceOption[];
};

export function QuickExpenseDialog({
  businessOptions,
  currency,
  isSubmitting,
  onOpenChange,
  onSubmit,
  open,
  unitOptions,
}: QuickExpenseDialogProps) {
  const t = useFinanceTranslations();
  const [amount, setAmount] = useState('');
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [business, setBusiness] = useState('');
  const [businessUnit, setBusinessUnit] = useState('');
  const [concept, setConcept] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [description, setDescription] = useState('');
  const parsedAmount = toMoneyNumber(amount);
  const canSubmit = concept.trim().length > 0 && parsedAmount > 0 && !isSubmitting;

  useEffect(() => {
    if (!open) {
      setAmount('');
      setAttachmentFiles([]);
      setBusiness('');
      setBusinessUnit('');
      setConcept('');
      setDescription('');
      setSelectedCurrency(currency);
    }
  }, [currency, open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    void onSubmit({
      amount: parsedAmount,
      attachmentFiles,
      business,
      businessUnit,
      concept: concept.trim(),
      currency: selectedCurrency,
      description: description.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="max-w-[560px] overflow-hidden rounded-[28px] border border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start justify-between gap-4 bg-[#147514] px-5 py-4 text-white dark:bg-[#0b3f1b]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm">
              <ReceiptText className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold text-white">{t.expenses.quick.title}</DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-5 text-white/80">
                Register a paid expense with the minimum required information.
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
            <Field label={t.expenses.modal.description}>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className={`${inputClass} h-auto resize-none`} placeholder="What was paid and why?" />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t.filters.unit}>
                <select value={businessUnit} onChange={(event) => setBusinessUnit(event.target.value)} className={inputClass}>
                  <option value="">No unit</option>
                  {unitOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
              <Field label={t.filters.business}>
                <select value={business} onChange={(event) => setBusiness(event.target.value)} className={inputClass}>
                  <option value="">No business</option>
                  {businessOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t.expenses.modal.amount}>
                <Input min={0.01} step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" className={inputClass} />
              </Field>
              <Field label={t.expenses.modal.currency}>
                <select value={selectedCurrency} onChange={(event) => setSelectedCurrency(event.target.value)} className={inputClass}>
                  {financeCurrencySelectOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
            </div>
            <label className="rounded-2xl border border-dashed border-[#147514]/30 bg-white p-4 text-sm font-semibold text-slate-700 transition hover:bg-[#147514]/5">
              <span className="mb-2 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-[#147514]" />
                Attach evidence
              </span>
              <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={(event) => setAttachmentFiles(Array.from(event.target.files ?? []).slice(0, 5))} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-[#147514] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white" />
              <span className="mt-2 block text-xs font-medium text-slate-500">{attachmentFiles.length} files selected. Maximum 5 files.</span>
            </label>
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

function toMoneyNumber(value: string) {
  const parsedValue = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}
