import { Building2, Check, ChevronDown, ContactRound, FileText, MapPin, Users } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import {
  FinanceFieldLabel,
  financeModalInputClass,
  financeModalPrimaryButtonClass,
  financeModalSecondaryButtonClass,
} from '../../components/modals/FinanceModalPrimitives';
import { ExpenseAccountSelect } from '../../components/table/ExpenseAccountSelect';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import { useProvidersTranslations } from '../hooks/useProvidersTranslations';
import {
  providerStatusOptions,
  providerTypeOptions,
  type ProviderFormValues,
  type ProviderStatus,
  type ProviderType,
} from '../useProveedoresLogic';
import type { ProviderModalVariant } from './providerModalTheme';

type ProviderCreateModalProps = {
  accountingAccountOptions: FinanceReferenceOption[];
  businessOptions: FinanceReferenceOption[];
  initialValues?: ProviderFormValues;
  submitLabel?: string;
  subtitle?: string;
  title?: string;
  unitOptions: FinanceReferenceOption[];
  userOptions: FinanceReferenceOption[];
  variant?: ProviderModalVariant;
  onClose: () => void;
  onSubmit: (values: ProviderFormValues) => void | Promise<void>;
};

const emptyValues: ProviderFormValues = {
  accountingAccount: '',
  address: '',
  authorizer: '',
  business: '',
  businessUnit: '',
  company: '',
  contactName: '',
  email: '',
  name: '',
  performer: '',
  phone: '',
  status: 'active',
  taxId: '',
  type: 'Servicios',
};

export function ProviderCreateModal({
  accountingAccountOptions,
  businessOptions,
  initialValues = emptyValues,
  submitLabel,
  subtitle,
  title,
  unitOptions,
  userOptions,
  variant = 'finance',
  onClose,
  onSubmit,
}: ProviderCreateModalProps) {
  const t = useProvidersTranslations();
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<ProviderFormValues>(initialValues);
  const availableBusinessOptions = useMemo(() => (
    businessOptions.filter(option => !option.unitId || !values.businessUnit || option.unitId === values.businessUnit)
  ), [businessOptions, values.businessUnit]);
  const localizedProviderTypeOptions = useMemo(() => providerTypeOptions.map(option => ({
    ...option,
    label: t.providers.types[option.value] ?? option.label,
  })), [t.providers.types]);
  const localizedProviderStatusOptions = useMemo(() => providerStatusOptions.map(option => ({
    ...option,
    label: option.value === 'active' ? t.common.active : t.common.inactive,
  })), [t.common.active, t.common.inactive]);
  const canSave = values.name.trim().length > 0 && !isSaving;
  const effectiveSubmitLabel = submitLabel ?? t.providers.modal.finish;
  const effectiveTitle = title ?? t.providers.add;

  useEffect(() => {
    if (!values.business) return;
    if (availableBusinessOptions.some(option => option.value === values.business)) return;
    setValues(current => ({ ...current, business: '' }));
  }, [availableBusinessOptions, values.business]);

  useEffect(() => {
    if (accountingAccountOptions.length === 0 || !values.accountingAccount) return;
    if (accountingAccountOptions.some(option => option.value === values.accountingAccount)) return;
    setValues(current => ({ ...current, accountingAccount: '' }));
  }, [accountingAccountOptions, values.accountingAccount]);

  const update = <K extends keyof ProviderFormValues>(field: K, value: ProviderFormValues[K]) => {
    setErrorMessage('');
    setValues(current => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSubmit({ ...values, name: values.name.trim(), company: values.company.trim() });
    } catch {
      setErrorMessage(t.providers.modal.saveFailed);
      if (bodyRef.current) bodyRef.current.scrollTop = 0;
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const referenceLabel = (options: FinanceReferenceOption[], value: string) => options.find(option => option.value === value)?.label || value;
  const contactSummary = [values.contactName, values.email, values.phone].filter(Boolean).join(' · ');
  const fiscalSummary = [values.company, values.taxId, values.address].filter(Boolean).join(' · ');
  const assignmentSummary = [referenceLabel(unitOptions, values.businessUnit), referenceLabel(availableBusinessOptions, values.business), referenceLabel(accountingAccountOptions, values.accountingAccount)].filter(Boolean).join(' · ');
  const ownersSummary = [referenceLabel(userOptions, values.authorizer), referenceLabel(userOptions, values.performer)].filter(Boolean).join(' · ');
  const revealInvalidField = (event: FormEvent<HTMLFormElement>) => {
    const field = event.target;
    if (!(field instanceof HTMLInputElement)) return;
    const section = field.closest('details');
    if (section) section.open = true;
    field.focus();
  };
  const formId = `provider-form-${initialValues.name || 'new'}`.replace(/\s+/g, '-');
  return (
    <IndiceModalFrame
      busy={isSaving}
      bodyRef={bodyRef}
      modalType="standard-form"
      closeLabel={t.columnModal.close}
      description={subtitle ?? t.providers.modal.defaultSubtitle}
      footerLeading={<button type="button" className={financeModalSecondaryButtonClass} disabled={isSaving} onClick={onClose}>{t.common.cancel}</button>}
      footer={(
        <>
          <button type="submit" form={formId} className={`${financeModalPrimaryButtonClass} disabled:opacity-50`} aria-describedby={!values.name.trim() ? 'provider-name-help' : undefined} disabled={!canSave} style={variant === 'sales' ? { color: '#B63B32' } : undefined}>
            <Check className="h-4 w-4" />
            {isSaving ? t.providers.modal.saving : effectiveSubmitLabel}
          </button>
        </>
      )}
      footerSummary={`${values.name.trim() || t.providers.modal.unnamed} · ${t.providers.types[values.type] ?? values.type}`}
      icon={<Building2 className="h-5 w-5" />}
      onOpenChange={(open) => !open && onClose()}
      open
      title={effectiveTitle}
      tone={variant === 'sales' ? 'coral' : 'green'}
    >
      <form id={formId} className="space-y-4" onSubmit={handleSubmit} onInvalidCapture={revealInvalidField}>
        <IndiceModalValidation messages={errorMessage ? [errorMessage] : []} title={t.providers.modal.validationTitle} />
        <fieldset disabled={isSaving} className="min-w-0 space-y-3">
          <legend className="sr-only">{effectiveTitle}</legend>
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <TextField label={t.providers.columns.name.label} required autoFocus placeholder={t.providers.modal.namePlaceholder} value={values.name} onChange={(value) => update('name', value)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label={t.providers.filters.type} value={values.type} options={localizedProviderTypeOptions} onChange={(value) => update('type', value as ProviderType)} />
              <SelectField label={t.filters.status} value={values.status} options={localizedProviderStatusOptions} onChange={(value) => update('status', value as ProviderStatus)} />
            </div>
            {!values.name.trim() && <p id="provider-name-help" className="text-xs text-slate-500 dark:text-slate-400">{t.providers.modal.nameRequired}</p>}
          </section>
          <ProviderDisclosure title={t.providers.modal.contact} icon={<ContactRound className="h-5 w-5" />} summary={contactSummary} hint={t.providers.modal.contactHint} optionalLabel={t.providers.modal.optional}>
            <TextField label={t.providers.columns.contactName.label} value={values.contactName} onChange={(value) => update('contactName', value)} />
            <TextField label={t.providers.columns.email.label} type="email" value={values.email} onChange={(value) => update('email', value)} />
            <TextField label={t.providers.columns.phone.label} type="tel" value={values.phone} onChange={(value) => update('phone', value)} />
          </ProviderDisclosure>
          <ProviderDisclosure title={t.providers.modal.fiscal} icon={<FileText className="h-5 w-5" />} summary={fiscalSummary} hint={t.providers.modal.fiscalHint} optionalLabel={t.providers.modal.optional}>
            <TextField label={t.providers.columns.company.label} value={values.company} onChange={(value) => update('company', value)} />
            <TextField label={t.providers.columns.taxId.label} value={values.taxId} onChange={(value) => update('taxId', value)} />
            <div className="sm:col-span-2"><TextField label={t.providers.columns.address.label} value={values.address} onChange={(value) => update('address', value)} /></div>
          </ProviderDisclosure>
          <ProviderDisclosure title={t.providers.modal.assignment} icon={<MapPin className="h-5 w-5" />} summary={assignmentSummary} hint={t.providers.modal.assignmentHint} optionalLabel={t.providers.modal.optional}>
            <ReferenceField label={t.filters.unit} value={values.businessUnit} options={unitOptions} onChange={(value) => update('businessUnit', value)} disabled={isSaving} />
            <ReferenceField label={t.filters.business} value={values.business} options={availableBusinessOptions} onChange={(value) => update('business', value)} disabled={isSaving} />
            <div className="sm:col-span-2"><ReferenceField label={t.providers.columns.accountingAccount.label} value={values.accountingAccount} options={accountingAccountOptions} onChange={(value) => update('accountingAccount', value)} disabled={isSaving} />
              {accountingAccountOptions.length === 0 && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t.providers.modal.noActiveAccounts}</p>}
            </div>
          </ProviderDisclosure>
          <ProviderDisclosure title={t.providers.modal.owners} icon={<Users className="h-5 w-5" />} summary={ownersSummary} hint={t.providers.modal.ownersHint} optionalLabel={t.providers.modal.optional}>
            <ReferenceField label={t.providers.columns.authorizer.label} value={values.authorizer} options={userOptions} onChange={(value) => update('authorizer', value)} disabled={isSaving} />
            <ReferenceField label={t.providers.columns.performer.label} value={values.performer} options={userOptions} onChange={(value) => update('performer', value)} disabled={isSaving} />
          </ProviderDisclosure>
        </fieldset>
      </form>
    </IndiceModalFrame>
  );
}

function TextField({ label, onChange, required, autoFocus, placeholder, type = 'text', value }: { label: string; onChange: (value: string) => void; required?: boolean; autoFocus?: boolean; placeholder?: string; type?: string; value: string }) {
  return (
    <label className="block min-w-0">
      <FinanceFieldLabel label={label} required={required} />
      <input aria-label={label} autoFocus={autoFocus} placeholder={placeholder} type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className={`${financeModalInputClass} min-w-0 dark:[color-scheme:dark]`} />
    </label>
  );
}

function SelectField({ includeEmpty = false, label, onChange, options, value }: { includeEmpty?: boolean; label: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; value: string }) {
  const t = useProvidersTranslations();
  return (
    <label className="block min-w-0">
      <FinanceFieldLabel label={label} />
      <select value={value} onChange={(event) => onChange(event.target.value)} className={`${financeModalInputClass} min-w-0 dark:[color-scheme:dark]`}>
        {includeEmpty ? <option value="">{t.common.unassigned}</option> : null}
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function ReferenceField({ label, value, options, onChange, disabled }: {
  label: string; value: string; options: FinanceReferenceOption[]; onChange: (value: string) => void; disabled: boolean;
}) {
  return <div className="min-w-0">
    <FinanceFieldLabel label={label} />
    <ExpenseAccountSelect label={label} value={value} options={options} onChange={onChange} disabled={disabled} />
  </div>;
}

function ProviderDisclosure({ children, title, icon, summary, hint, optionalLabel }: {
  children: ReactNode; title: string; icon: ReactNode; summary: string; hint: string; optionalLabel: string;
}) {
  return <details className="group rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-2xl p-4 focus-visible:outline-2 focus-visible:outline-slate-500 [&::-webkit-details-marker]:hidden">
      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-slate-900 dark:text-slate-100">{title}{!summary && <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{optionalLabel}</span>}</span>
        <span className="mt-1 block break-words text-xs leading-5 text-slate-500 dark:text-slate-400">{summary || hint}</span>
      </span>
      <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
    </summary>
    <div className="grid gap-4 border-t border-slate-100 p-4 sm:grid-cols-2 dark:border-slate-800">{children}</div>
  </details>;
}
