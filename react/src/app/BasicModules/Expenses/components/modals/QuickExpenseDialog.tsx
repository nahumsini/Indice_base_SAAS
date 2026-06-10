import { type FormEvent, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Input } from '../../../../components/ui/input';

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
        className="max-w-[460px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="bg-[#147514] px-5 py-4 text-white">
          <DialogTitle className="text-lg font-bold text-white">Gasto rápido</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-white/80">
            Registra concepto y monto. La divisa favorita se aplica automáticamente.
          </DialogDescription>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-2xl border border-[#147514]/20 bg-[#147514]/5 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Divisa favorita</p>
              <p className="mt-1 text-base font-extrabold text-[#147514]">{currency}</p>
            </div>
            <label className="block space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span>Concepto</span>
              <Input
                autoFocus
                maxLength={160}
                value={concept}
                onChange={(event) => setConcept(event.target.value)}
                placeholder="Ej. Renta mensual"
                className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </label>
            <label className="block space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span>Monto</span>
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
          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/60">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-10 rounded-xl bg-[#147514] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#105010]"
              disabled={!canSubmit}
            >
              <Plus className="h-4 w-4" />
              {isSubmitting ? 'Guardando' : 'Crear gasto'}
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
