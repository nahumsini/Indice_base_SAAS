import { Banknote, Check, ChevronLeft, ChevronRight, CreditCard, Landmark, MapPinned, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useFinanceTranslations } from '../../hooks/useFinanceTranslations';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import type { PaymentAccount, PaymentAccountType } from '../types';

type PaymentAccountModalProps = {
  account?: PaymentAccount | null;
  businessOptions: FinanceReferenceOption[];
  unitOptions: FinanceReferenceOption[];
  onClose: () => void;
  onSubmit: (account: PaymentAccount) => void | Promise<void>;
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
const currencyOptions = ['MXN', 'USD', 'CAD', 'COP', 'BRL', 'EUR'].map(currency => ({ value: currency, label: currency }));
const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-none placeholder:text-slate-400 transition-colors focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100';

export function PaymentAccountModal({ account, businessOptions, unitOptions, onClose, onSubmit }: PaymentAccountModalProps) {
  const t = useFinanceTranslations();
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<PaymentFormValues>({
    accountNumber: account?.accountNumber ?? '',
    balance: String(account?.balance ?? 0),
    bank: account?.bank ?? '',
    businessId: account?.businessId ?? '',
    currency: account?.currency ?? 'MXN',
    isActive: account?.isActive === false ? 'false' : 'true',
    name: account?.name ?? '',
    type: account?.type ?? 'bank',
    unitId: account?.unitId ?? '',
  });
  const availableBusinessOptions = useMemo(() => (
    businessOptions.filter(option => !option.unitId || !values.unitId || option.unitId === values.unitId)
  ), [businessOptions, values.unitId]);
  const steps = useMemo<Array<{ id: number; label: string; icon: LucideIcon; title: string; description: string }>>(() => [
    {
      id: 0,
      label: t.paymentAccounts.columns.name.label,
      icon: CreditCard,
      title: t.paymentAccounts.headerTitle,
      description: t.paymentAccounts.headerSubtitle,
    },
    {
      id: 1,
      label: t.filters.unit,
      icon: MapPinned,
      title: `${t.filters.unit} / ${t.filters.business}`,
      description: t.paymentAccounts.columns.unitId.description ?? t.filters.unit,
    },
    {
      id: 2,
      label: t.paymentAccounts.columns.balance.label,
      icon: Landmark,
      title: `${t.paymentAccounts.columns.bank.label} / ${t.paymentAccounts.columns.balance.label}`,
      description: t.paymentAccounts.columns.balance.description ?? t.paymentAccounts.columns.balance.label,
    },
  ], [t]);
  const canContinue = values.name.trim().length > 0;
  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const progressPercentage = `${((stepIndex + 1) / steps.length) * 100}%`;

  useEffect(() => {
    if (!values.businessId) return;
    if (availableBusinessOptions.some(option => option.value === values.businessId)) return;
    setValues(current => ({ ...current, businessId: '' }));
  }, [availableBusinessOptions, values.businessId]);

  const update = <K extends keyof PaymentFormValues>(field: K, value: PaymentFormValues[K]) => {
    setValues(current => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canContinue) return;
    if (!isLastStep) {
      setStepIndex(current => current + 1);
      return;
    }
    const balance = Number(values.balance);
    void onSubmit({
      id: account?.id ?? `payment-account-${Date.now()}`,
      unitId: values.unitId || undefined,
      businessId: values.businessId || undefined,
      name: values.name.trim(),
      type: values.type,
      accountNumber: values.accountNumber.trim(),
      bank: values.bank.trim(),
      currency: values.currency,
      balance: Number.isFinite(balance) ? balance : 0,
      isActive: values.isActive === 'true',
      lastTransaction: account?.lastTransaction,
      source: 'expenses',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="flex max-h-[calc(100vh-3rem)] w-full max-w-[900px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 bg-[#147514] px-6 py-4 text-white">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm">
              <Banknote className="h-5 w-5" />
            </span>
            <div>
              <div className="mb-1 inline-flex items-center rounded-full border border-white/25 bg-white px-3 py-1 text-xs font-semibold text-[#147514] shadow-sm">{t.budgets.modal.stepOf(stepIndex + 1, steps.length)}</div>
              <h2 className="text-xl font-bold text-white">{account ? `${t.common.edit} ${t.paymentAccounts.headerTitle}` : t.paymentAccounts.add}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-white/80">{account ? account.name : t.paymentAccounts.headerSubtitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20" aria-label={t.columnModal.close}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="mb-3 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t.budgets.modal.stepOf(stepIndex + 1, steps.length)}</p>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-[#147514] transition-all duration-300 ease-out" style={{ width: progressPercentage }} />
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="grid min-w-[680px] grid-cols-3 gap-3">
              {steps.map((step) => {
                const StepIcon = step.icon;
                const isActive = stepIndex === step.id;
                const isCompleted = stepIndex > step.id;
                return (
                  <button key={step.id} type="button" onClick={() => canContinue && setStepIndex(step.id)} className={`flex min-h-16 items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all ${isActive ? 'border-[#147514]/40 bg-[#147514]/10 text-[#147514] shadow-sm' : isCompleted ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-[#147514]/25 hover:bg-white hover:text-[#147514] dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400'}`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isActive ? 'bg-[#147514] text-white' : isCompleted ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-900'}`}>{isCompleted ? <Check className="h-4 w-4" /> : isActive ? '●' : '○'}</span>
                    <span className="flex min-w-0 items-center gap-2"><StepIcon className="h-4 w-4 shrink-0" /><span className="truncate">{step.label}</span></span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/70 px-6 py-6 dark:bg-slate-950/40">
          <StepCard description={currentStep.description} icon={currentStep.icon} title={currentStep.title}>
            {stepIndex === 0 ? <AccountStep values={values} update={update} /> : null}
            {stepIndex === 1 ? <ScopeStep businessOptions={availableBusinessOptions} unitOptions={unitOptions} values={values} update={update} /> : null}
            {stepIndex === 2 ? <DetailStep values={values} update={update} /> : null}
          </StepCard>
        </div>

        <div className="flex flex-col gap-3 bg-[#147514] px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white shadow-none transition hover:bg-white/20 hover:text-white">{t.common.cancel}</button>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <button type="button" onClick={() => setStepIndex(current => Math.max(0, current - 1))} disabled={stepIndex === 0} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white shadow-none transition hover:bg-white/20 hover:text-white disabled:border-white/20 disabled:bg-white/5 disabled:text-white/50"><ChevronLeft className="h-4 w-4" />{t.common.previous}</button>
            <button type="submit" disabled={!canContinue} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#147514] shadow-sm transition hover:bg-slate-100 hover:text-[#147514] disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-[#147514]/50">
              {isLastStep ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {isLastStep ? (account ? t.common.saveChanges : t.paymentAccounts.add) : t.common.next}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function AccountStep({ values, update }: StepProps) {
  const t = useFinanceTranslations();
  const typeOptions = useMemo(() => paymentAccountTypeValues.map(value => ({
    value,
    label: t.paymentAccounts.types[value] ?? value,
  })), [t]);

  return (
    <div className="space-y-4">
      <FieldGroup title={t.paymentAccounts.columns.name.label}>
        <TextField label={t.paymentAccounts.columns.name.label} required value={values.name} onChange={(value) => update('name', value)} placeholder={t.paymentAccounts.columns.name.label} />
        <SelectField label={t.paymentAccounts.filters.type} value={values.type} options={typeOptions} onChange={(value) => update('type', value as PaymentAccountType)} />
      </FieldGroup>
      <FieldGroup title={t.paymentAccounts.columns.currency.label}>
        <SelectField label={t.paymentAccounts.columns.currency.label} value={values.currency} options={currencyOptions} onChange={(value) => update('currency', value)} />
        <SelectField label={t.paymentAccounts.columns.isActive.label} value={values.isActive} options={[{ value: 'true', label: t.common.active }, { value: 'false', label: t.common.inactive }]} onChange={(value) => update('isActive', value)} />
      </FieldGroup>
    </div>
  );
}

function ScopeStep({ businessOptions, unitOptions, values, update }: StepProps & { businessOptions: FinanceReferenceOption[]; unitOptions: FinanceReferenceOption[] }) {
  const t = useFinanceTranslations();

  return (
    <FieldGroup title={`${t.filters.unit} / ${t.filters.business}`}>
      <SelectField label={t.filters.unit} value={values.unitId} options={unitOptions} onChange={(value) => update('unitId', value)} includeEmpty />
      <SelectField label={t.filters.business} value={values.businessId} options={businessOptions} onChange={(value) => update('businessId', value)} includeEmpty />
    </FieldGroup>
  );
}

function DetailStep({ values, update }: StepProps) {
  const t = useFinanceTranslations();

  return (
    <FieldGroup title={t.paymentAccounts.columns.balance.label}>
      <TextField label={t.paymentAccounts.columns.bank.label} value={values.bank} onChange={(value) => update('bank', value)} placeholder={t.paymentAccounts.columns.bank.label} />
      <TextField label={t.paymentAccounts.columns.accountNumber.label} value={values.accountNumber} onChange={(value) => update('accountNumber', value)} placeholder="****1234" />
      <MoneyField label={t.paymentAccounts.columns.balance.label} value={values.balance} onChange={(value) => update('balance', value)} />
    </FieldGroup>
  );
}

type StepProps = {
  values: PaymentFormValues;
  update: <K extends keyof PaymentFormValues>(field: K, value: PaymentFormValues[K]) => void;
};

function StepCard({ children, description, icon: Icon, title }: { children: React.ReactNode; description: string; icon: LucideIcon; title: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#147514]/10 text-[#147514]"><Icon className="h-5 w-5" /></span>
        <div><h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p></div>
      </div>
      {children}
    </div>
  );
}

function FieldGroup({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/45">
      <h4 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">{title}</h4>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}{required ? ' *' : ''}</span>;
}

function TextField({ label, onChange, placeholder, required, value }: { label: string; onChange: (value: string) => void; placeholder: string; required?: boolean; value: string }) {
  return <label><FieldLabel label={label} required={required} /><input type="text" required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={inputClass} /></label>;
}

function SelectField({ includeEmpty = false, label, onChange, options, value }: { includeEmpty?: boolean; label: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; value: string }) {
  const t = useFinanceTranslations();

  return (
    <label>
      <FieldLabel label={label} />
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        {includeEmpty ? <option value="">{t.common.unassigned}</option> : null}
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function MoneyField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label>
      <FieldLabel label={label} />
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
        <input type="number" value={value} onChange={(event) => onChange(event.target.value)} placeholder="0.00" step="0.01" className={`${inputClass} pl-8`} />
      </div>
    </label>
  );
}
