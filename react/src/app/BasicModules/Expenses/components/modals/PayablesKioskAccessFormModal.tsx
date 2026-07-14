import { type ReactNode } from 'react';
import { Loader2, Store, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../../../../components/ui/dialog';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import type { PayableKiosk } from '../../services';
import type { PayableKioskFormState } from './PayablesKioskManagementModal';
import { useExpensesTranslations } from '../../Expenses/hooks/useExpensesTranslations';
import { financeCurrencySelectOptions } from '../../constants/financeCurrencyOptions';

type PayablesKioskAccessFormModalProps = {
  businessOptions: FinanceReferenceOption[];
  editing: PayableKiosk | null;
  form: PayableKioskFormState;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onFormChange: (form: PayableKioskFormState) => void;
  onSave: () => void;
  unitOptions: FinanceReferenceOption[];
};

const inputClass = 'h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
export function PayablesKioskAccessFormModal({
  businessOptions,
  editing,
  form,
  isOpen,
  isSaving,
  onClose,
  onFormChange,
  onSave,
  unitOptions,
}: PayablesKioskAccessFormModalProps) {
  const t = useExpensesTranslations();
  const copy = t.expenses.payablesKiosk;
  const update = (patch: Partial<PayableKioskFormState>) => onFormChange({ ...form, ...patch });
  const visibleBusinessOptions = form.unitId
    ? businessOptions.filter(option => !option.unitId || String(option.unitId) === form.unitId)
    : businessOptions;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent hideCloseButton className="max-h-[calc(100vh-1rem)] w-[min(94vw,560px)] overflow-hidden rounded-[28px] border-0 bg-white p-0 shadow-2xl dark:bg-slate-900">
        <header className="flex items-start justify-between gap-4 bg-[#147514] px-5 py-5 text-white sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <Store className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">
                {editing ? t.common.edit : copy.newAccess}
              </p>
              <DialogTitle className="mt-1 text-2xl font-black text-white">
                {editing ? copy.editTitle : copy.createTitle}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm font-semibold text-white/80">
                {copy.formDescription}
              </DialogDescription>
            </div>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 hover:bg-white/20" type="button" aria-label={t.columnModal.close}>
            <X className="h-5 w-5" />
          </button>
        </header>

        <section className="max-h-[calc(100vh-13rem)] overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950/60 sm:p-5">
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
            <div className="grid gap-4">
              <Field label={copy.name} required>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={event => update({ name: event.target.value })}
                  placeholder={copy.namePlaceholder}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t.filters.unit}>
                  <select className={inputClass} value={form.unitId} onChange={event => update({ unitId: event.target.value, businessId: '' })}>
                    <option value="">{copy.allUnits}</option>
                    {unitOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </Field>
                <Field label={t.filters.business}>
                  <select className={inputClass} value={form.businessId} onChange={event => update({ businessId: event.target.value })}>
                    <option value="">{copy.allBusinesses}</option>
                    {visibleBusinessOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </Field>
              </div>

              <Field label={copy.currency}>
                <select className={inputClass} value={form.currencyCode} onChange={event => update({ currencyCode: event.target.value })}>
                  {financeCurrencySelectOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
            </div>
          </div>
        </section>

        <DialogFooter className="flex-col gap-3 bg-[#147514] px-5 py-4 sm:flex-row sm:px-6">
          <Button type="button" variant="outline" className="h-11 w-full rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:w-auto" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="button" disabled={isSaving} className="h-11 w-full rounded-xl bg-white text-[#147514] hover:bg-slate-100 sm:w-auto" onClick={onSave}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {editing ? t.common.saveChanges : copy.createAccess}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ children, label, required }: { children: ReactNode; label: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}{required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}
