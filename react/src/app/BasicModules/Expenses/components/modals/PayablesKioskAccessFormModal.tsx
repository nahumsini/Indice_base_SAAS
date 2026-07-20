import { type ReactNode } from 'react';
import { Loader2, Store } from 'lucide-react';
import { KioskModalFrame } from '../../../../components/kiosk-engine/KioskModalFrame';
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

const inputClass = 'h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
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
    <KioskModalFrame
      busy={isSaving}
      description={copy.formDescription}
      eyebrow={editing ? t.common.edit : copy.newAccess}
      footer={(
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <button type="button" disabled={isSaving} onClick={onClose} className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">{t.common.cancel}</button>
          <button type="button" disabled={isSaving || !form.name.trim()} onClick={onSave} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#147514] px-5 text-sm font-semibold text-white transition hover:bg-[#105F10] disabled:opacity-50">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {editing ? t.common.saveChanges : copy.createAccess}
          </button>
        </div>
      )}
      footerSummary={form.name || copy.newAccess}
      icon={<Store className="h-5 w-5" />}
      onOpenChange={(open) => !open && onClose()}
      open={isOpen}
      size="form"
      surface="administration"
      title={editing ? copy.editTitle : copy.createTitle}
      tone="green"
    >
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
    </KioskModalFrame>
  );
}

function Field({ children, label, required }: { children: ReactNode; label: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}{required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}
