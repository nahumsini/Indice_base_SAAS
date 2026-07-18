import { Building2, Check } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import {
  FinanceFieldLabel,
  FinanceModalSection,
  financeModalInputClass,
  financeModalPrimaryButtonClass,
  financeModalSecondaryButtonClass,
} from '../../components/modals/FinanceModalPrimitives';
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
  const [values, setValues] = useState<ProviderFormValues>(initialValues);
  const availableBusinessOptions = useMemo(() => (
    businessOptions.filter(option => !option.unitId || !values.businessUnit || option.unitId === values.businessUnit)
  ), [businessOptions, values.businessUnit]);
  const selectableAccountingAccountOptions = useMemo(() => (
    accountingAccountOptions.length > 0 ? accountingAccountOptions : [{ value: '', label: t.providers.modal.noActiveAccounts }]
  ), [accountingAccountOptions, t.providers.modal.noActiveAccounts]);
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
    if (!canSave) return;
    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSubmit({ ...values, name: values.name.trim(), company: values.company.trim() });
    } catch {
      setErrorMessage('No se pudo guardar el proveedor. Revisa la información e inténtalo nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const formId = `provider-form-${initialValues.name || 'new'}`.replace(/\s+/g, '-');
  return (
    <IndiceModalFrame
      busy={isSaving}
      closeLabel={t.columnModal.close}
      description={subtitle ?? t.providers.modal.defaultSubtitle}
      footer={(
        <>
          <button type="button" className={financeModalSecondaryButtonClass} disabled={isSaving} onClick={onClose}>{t.common.cancel}</button>
          <button type="submit" form={formId} className={financeModalPrimaryButtonClass} disabled={!canSave} style={variant === 'sales' ? { color: '#B63B32' } : undefined}>
            <Check className="h-4 w-4" />
            {isSaving ? 'Guardando…' : effectiveSubmitLabel}
          </button>
        </>
      )}
      footerSummary={`${values.name.trim() || 'Proveedor sin nombre'} · ${t.providers.types[values.type] ?? values.type}`}
      icon={<Building2 className="h-5 w-5" />}
      onOpenChange={(open) => !open && onClose()}
      open
      title={effectiveTitle}
      tone={variant === 'sales' ? 'coral' : 'green'}
    >
      <form id={formId} className="space-y-4" onSubmit={handleSubmit}>
        <IndiceModalValidation messages={errorMessage ? [errorMessage] : []} title="No se pudo guardar" />
        <FinanceModalSection title={t.providers.modal.identity} description={t.providers.modal.titleDescription}>
          <TextField label={t.providers.columns.name.label} required value={values.name} onChange={(value) => update('name', value)} />
          <TextField label={t.providers.columns.company.label} value={values.company} onChange={(value) => update('company', value)} />
          <SelectField label={t.providers.filters.type} value={values.type} options={localizedProviderTypeOptions} onChange={(value) => update('type', value as ProviderType)} />
          <SelectField label={t.filters.status} value={values.status} options={localizedProviderStatusOptions} onChange={(value) => update('status', value as ProviderStatus)} />
        </FinanceModalSection>
        <FinanceModalSection title={t.providers.modal.assignment} description={t.providers.modal.scopeDescription}>
          <SelectField label={t.filters.unit} value={values.businessUnit} options={unitOptions} onChange={(value) => update('businessUnit', value)} includeEmpty />
          <SelectField label={t.filters.business} value={values.business} options={availableBusinessOptions} onChange={(value) => update('business', value)} includeEmpty />
          <SelectField label={t.providers.columns.accountingAccount.label} value={values.accountingAccount} options={selectableAccountingAccountOptions} onChange={(value) => update('accountingAccount', value)} includeEmpty />
        </FinanceModalSection>
        <FinanceModalSection title={t.providers.modal.contact} description={t.providers.modal.contactDescription}>
          <TextField label={t.providers.columns.contactName.label} value={values.contactName} onChange={(value) => update('contactName', value)} />
          <TextField label={t.providers.columns.email.label} type="email" value={values.email} onChange={(value) => update('email', value)} />
          <TextField label={t.providers.columns.phone.label} value={values.phone} onChange={(value) => update('phone', value)} />
          <TextField label={t.providers.columns.taxId.label} value={values.taxId} onChange={(value) => update('taxId', value)} />
          <label className="md:col-span-2">
            <FinanceFieldLabel label={t.providers.columns.address.label} />
            <input value={values.address} onChange={(event) => update('address', event.target.value)} className={financeModalInputClass} />
          </label>
        </FinanceModalSection>
        <FinanceModalSection title={t.providers.modal.owners} description={t.providers.modal.ownersDescription}>
          <SelectField label={t.providers.columns.authorizer.label} value={values.authorizer} options={userOptions} onChange={(value) => update('authorizer', value)} includeEmpty />
          <SelectField label={t.providers.columns.performer.label} value={values.performer} options={userOptions} onChange={(value) => update('performer', value)} includeEmpty />
        </FinanceModalSection>
      </form>
    </IndiceModalFrame>
  );
}

function TextField({ label, onChange, required, type = 'text', value }: { label: string; onChange: (value: string) => void; required?: boolean; type?: string; value: string }) {
  return (
    <label>
      <FinanceFieldLabel label={label} required={required} />
      <input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className={financeModalInputClass} />
    </label>
  );
}

function SelectField({ includeEmpty = false, label, onChange, options, value }: { includeEmpty?: boolean; label: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; value: string }) {
  const t = useProvidersTranslations();
  return (
    <label>
      <FinanceFieldLabel label={label} />
      <select value={value} onChange={(event) => onChange(event.target.value)} className={financeModalInputClass}>
        {includeEmpty ? <option value="">{t.common.unassigned}</option> : null}
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
