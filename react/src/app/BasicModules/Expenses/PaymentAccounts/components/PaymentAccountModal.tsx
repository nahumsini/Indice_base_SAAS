import { Banknote, Check } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import {
  FinanceFieldLabel,
  FinanceModalSection,
  financeModalInputClass,
  financeModalPrimaryButtonClass,
  financeModalSecondaryButtonClass,
} from '../../components/modals/FinanceModalPrimitives';
import { DEFAULT_FINANCE_CURRENCY, financeCurrencySelectOptions } from '../../constants/financeCurrencyOptions';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import { usePaymentAccountsTranslations } from '../hooks/usePaymentAccountsTranslations';
import type { PaymentAccount, PaymentAccountType } from '../types';

type PaymentAccountModalProps = {
  account?: PaymentAccount | null;
  businessOptions: FinanceReferenceOption[];
  unitOptions: FinanceReferenceOption[];
  onClose: () => void;
  onSubmit: (account: PaymentAccount) => void | Promise<void>;
  subtitle?: string;
  title?: string;
  tone?: 'green' | 'coral';
};

type PaymentFormValues = {
  accountNumber: string;
  balance: string;
  bank: string;
  businessId: string;
  currency: string;
  isActive: string;
  name: string;
  type: PaymentAccountType;
  unitId: string;
};

const paymentAccountTypeValues: PaymentAccountType[] = ['bank', 'cash', 'credit_card', 'debit_card', 'digital_wallet'];

export function PaymentAccountModal({ account, businessOptions, unitOptions, onClose, onSubmit, subtitle, title, tone = 'green' }: PaymentAccountModalProps) {
  const t = usePaymentAccountsTranslations();
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [values, setValues] = useState<PaymentFormValues>({
    accountNumber: account?.accountNumber ?? '',
    balance: String(account?.balance ?? 0),
    bank: account?.bank ?? '',
    businessId: account?.businessId ?? '',
    currency: account?.currency ?? DEFAULT_FINANCE_CURRENCY,
    isActive: account?.isActive === false ? 'false' : 'true',
    name: account?.name ?? '',
    type: account?.type ?? 'bank',
    unitId: account?.unitId ?? '',
  });
  const availableBusinessOptions = useMemo(() => (
    businessOptions.filter(option => !option.unitId || !values.unitId || option.unitId === values.unitId)
  ), [businessOptions, values.unitId]);
  const typeOptions = useMemo(() => paymentAccountTypeValues.map(value => ({
    value,
    label: t.paymentAccounts.types[value] ?? value,
  })), [t]);
  const numericBalance = Number(values.balance);
  const canSave = values.name.trim().length > 0 && Number.isFinite(numericBalance) && !isSaving;
  const inputClassName = tone === 'coral'
    ? `${financeModalInputClass} focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20`
    : financeModalInputClass;
  const primaryButtonClassName = tone === 'coral'
    ? 'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-medium text-[#D94E43] shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-white/50 disabled:text-[#D94E43]/60'
    : financeModalPrimaryButtonClass;

  useEffect(() => {
    if (!values.businessId) return;
    if (availableBusinessOptions.some(option => option.value === values.businessId)) return;
    setValues(current => ({ ...current, businessId: '' }));
  }, [availableBusinessOptions, values.businessId]);

  const update = <K extends keyof PaymentFormValues>(field: K, value: PaymentFormValues[K]) => {
    setErrorMessage('');
    setValues(current => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSubmit({
        id: account?.id ?? `payment-account-${Date.now()}`,
        unitId: values.unitId || undefined,
        businessId: values.businessId || undefined,
        name: values.name.trim(),
        type: values.type,
        accountNumber: values.accountNumber.trim(),
        bank: values.bank.trim(),
        currency: values.currency,
        balance: numericBalance,
        isActive: values.isActive === 'true',
        lastTransaction: account?.lastTransaction,
        source: 'expenses',
      });
    } catch {
      setErrorMessage(t.paymentAccounts.messages.saveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const formId = `payment-account-form-${account?.id ?? 'new'}`;
  return (
    <IndiceModalFrame
      busy={isSaving}
      closeLabel={t.columnModal.close}
      description={account ? account.name : subtitle ?? t.paymentAccounts.headerSubtitle}
      footer={(
        <>
          <button type="button" className={financeModalSecondaryButtonClass} disabled={isSaving} onClick={onClose}>{t.common.cancel}</button>
          <button type="submit" form={formId} className={primaryButtonClassName} disabled={!canSave}>
            <Check className="h-4 w-4" />
            {isSaving ? 'Guardando…' : account ? t.common.saveChanges : t.paymentAccounts.add}
          </button>
        </>
      )}
      footerSummary={`${values.name.trim() || 'Cuenta sin nombre'} · ${values.currency}`}
      icon={<Banknote className="h-5 w-5" />}
      onOpenChange={(open) => !open && onClose()}
      open
      title={account ? `${t.common.edit} ${title ?? t.paymentAccounts.headerTitle}` : t.paymentAccounts.add}
      tone={tone}
    >
      <form id={formId} className="space-y-4" onSubmit={handleSubmit}>
        <IndiceModalValidation messages={errorMessage ? [errorMessage] : []} title="No se pudo guardar" />
        <FinanceModalSection title={t.paymentAccounts.columns.name.label} description={subtitle ?? t.paymentAccounts.headerSubtitle}>
          <TextField inputClassName={inputClassName} label={t.paymentAccounts.columns.name.label} required value={values.name} onChange={(value) => update('name', value)} placeholder={t.paymentAccounts.columns.name.label} />
          <SelectField inputClassName={inputClassName} label={t.paymentAccounts.filters.type} value={values.type} options={typeOptions} onChange={(value) => update('type', value as PaymentAccountType)} />
          <SelectField inputClassName={inputClassName} label={t.paymentAccounts.columns.currency.label} value={values.currency} options={financeCurrencySelectOptions} onChange={(value) => update('currency', value)} />
          <SelectField inputClassName={inputClassName} label={t.paymentAccounts.columns.isActive.label} value={values.isActive} options={[{ value: 'true', label: t.common.active }, { value: 'false', label: t.common.inactive }]} onChange={(value) => update('isActive', value)} />
        </FinanceModalSection>
        <FinanceModalSection title={`${t.filters.unit} / ${t.filters.business}`}>
          <SelectField inputClassName={inputClassName} label={t.filters.unit} value={values.unitId} options={unitOptions} onChange={(value) => update('unitId', value)} includeEmpty />
          <SelectField inputClassName={inputClassName} label={t.filters.business} value={values.businessId} options={availableBusinessOptions} onChange={(value) => update('businessId', value)} includeEmpty />
        </FinanceModalSection>
        <FinanceModalSection title={t.paymentAccounts.columns.balance.label}>
          <TextField inputClassName={inputClassName} label={t.paymentAccounts.columns.bank.label} value={values.bank} onChange={(value) => update('bank', value)} placeholder={t.paymentAccounts.columns.bank.label} />
          <TextField inputClassName={inputClassName} label={t.paymentAccounts.columns.accountNumber.label} value={values.accountNumber} onChange={(value) => update('accountNumber', value)} placeholder="****1234" />
          <label>
            <FinanceFieldLabel label={t.paymentAccounts.columns.balance.label} />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input type="number" value={values.balance} onChange={(event) => update('balance', event.target.value)} placeholder="0.00" step="0.01" className={`${inputClassName} pl-8`} />
            </div>
          </label>
        </FinanceModalSection>
      </form>
    </IndiceModalFrame>
  );
}

function TextField({ inputClassName, label, onChange, placeholder, required, value }: { inputClassName: string; label: string; onChange: (value: string) => void; placeholder: string; required?: boolean; value: string }) {
  return (
    <label>
      <FinanceFieldLabel label={label} required={required} />
      <input type="text" required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={inputClassName} />
    </label>
  );
}

function SelectField({ includeEmpty = false, inputClassName, label, onChange, options, value }: { includeEmpty?: boolean; inputClassName: string; label: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; value: string }) {
  const t = usePaymentAccountsTranslations();
  return (
    <label>
      <FinanceFieldLabel label={label} />
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName}>
        {includeEmpty ? <option value="">{t.common.unassigned}</option> : null}
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
