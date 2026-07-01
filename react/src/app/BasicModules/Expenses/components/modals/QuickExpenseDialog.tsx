import { type FormEvent, useEffect, useState } from 'react';
import { Plus, ReceiptText, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Input } from '../../../../components/ui/input';
import { useFinanceTranslations } from '../../hooks/useFinanceTranslations';

export type QuickExpenseValues = {
  amount: number;
  concept: string;
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
  const t = useFinanceTranslations();
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const parsedAmount = toMoneyNumber(amount);
  const canSubmit = concept.trim().length > 0 && parsedAmount > 0 && !isSubmitting;

  useEffect(() => {
    if (!open) {
      setAmount('');
      setConcept('');
    }
  }, [open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    void onSubmit({ amount: parsedAmount, concept: concept.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="max-w-[480px] overflow-hidden rounded-[28px] border border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
      >
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
          <div className="space-y-4 bg-slate-50/70 px-5 py-5 dark:bg-slate-950/40">
            <div className="rounded-2xl border border-[#147514]/20 bg-[#147514]/5 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t.expenses.quick.currency}</p>
              <p className="mt-1 text-base font-extrabold text-[#147514]">{currency}</p>
            </div>
            <label className="block space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span>{t.expenses.modal.concept}</span>
              <Input
                autoFocus
                maxLength={160}
                value={concept}
                onChange={(event) => setConcept(event.target.value)}
                placeholder={t.expenses.modal.placeholderConcept}
                className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </label>
            <label className="block space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span>{t.expenses.modal.amount}</span>
              <Input
                min={0.01}
                step="0.01"
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </label>
          </div>
          <DialogFooter className="gap-3 bg-[#147514] px-5 py-4 dark:bg-[#0b3f1b]">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-white/30 bg-white/10 px-4 text-sm font-semibold text-white shadow-none hover:bg-white/20 hover:text-white"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              className="h-10 rounded-xl bg-white px-4 text-sm font-semibold text-[#147514] shadow-sm hover:bg-slate-100 hover:text-[#147514] disabled:bg-white/40 disabled:text-[#147514]/50"
              disabled={!canSubmit}
            >
              <Plus className="h-4 w-4" />
              {isSubmitting ? t.expenses.quick.saving : t.expenses.quick.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toMoneyNumber(value: string) {
  const parsedValue = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}
