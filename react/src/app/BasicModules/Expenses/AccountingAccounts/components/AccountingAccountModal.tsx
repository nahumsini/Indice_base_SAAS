import { BookOpen, Check, Layers3 } from 'lucide-react';
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
import { useAccountingAccountsTranslations } from '../hooks/useAccountingAccountsTranslations';
import { typeOptions } from '../accountingAccounts.utils';
import type { AccountingAccount, AccountingAccountType } from '../types';

type AccountingAccountModalProps = {
  account?: AccountingAccount | null;
  businessOptions: FinanceReferenceOption[];
  unitOptions: FinanceReferenceOption[];
  onClose: () => void;
  onSubmit: (account: AccountingAccount) => void | Promise<void>;
};

type AccountingFormValues = {
  businessId: string;
  code: string;
  description: string;
  isActive: string;
  name: string;
  type: AccountingAccountType;
  unitId: string;
};

export function AccountingAccountModal({ account, businessOptions, unitOptions, onClose, onSubmit }: AccountingAccountModalProps) {
  const t = useAccountingAccountsTranslations();
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [values, setValues] = useState<AccountingFormValues>({
    businessId: account?.businessId ?? '',
    code: account?.code ?? '',
    description: account?.description ?? '',
    isActive: account?.isActive === false ? 'false' : 'true',
    name: account?.name ?? '',
    type: account?.type ?? 'expense',
    unitId: account?.unitId ?? '',
  });
  const availableBusinessOptions = useMemo(() => (
    businessOptions.filter(option => !option.unitId || !values.unitId || option.unitId === values.unitId)
  ), [businessOptions, values.unitId]);
  const localizedTypeOptions = useMemo(() => typeOptions.map(option => ({
    ...option,
    label: t.accountingAccounts.types[option.value] ?? option.label,
  })), [t]);
  const canSave = values.code.trim().length > 0 && values.name.trim().length > 0 && !isSaving;

  useEffect(() => {
    if (!values.businessId) return;
    if (availableBusinessOptions.some(option => option.value === values.businessId)) return;
    setValues(current => ({ ...current, businessId: '' }));
  }, [availableBusinessOptions, values.businessId]);

  const update = <K extends keyof AccountingFormValues>(field: K, value: AccountingFormValues[K]) => {
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
        id: account?.id ?? `account-${Date.now()}`,
        unitId: values.unitId || undefined,
        businessId: values.businessId || undefined,
        code: values.code.trim(),
        name: values.name.trim(),
        type: values.type,
        description: values.description.trim(),
        canonicalKey: account?.canonicalKey,
        countryCode: account?.countryCode,
        importedFromCatalog: account?.importedFromCatalog,
        isActive: values.isActive === 'true',
        balance: account?.balance ?? 0,
        localReferenceCode: account?.localReferenceCode,
        localStandard: account?.localStandard,
        statementSection: account?.statementSection,
      });
    } catch {
      setErrorMessage(t.accountingAccounts.messages.saveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const formId = `accounting-account-form-${account?.id ?? 'new'}`;
  return (
    <IndiceModalFrame
      busy={isSaving}
      closeLabel={t.accountingAccounts.modal.close}
      description={account ? account.code : t.accountingAccounts.modal.defaultSubtitle}
      footer={(
        <>
          <button type="button" className={financeModalSecondaryButtonClass} disabled={isSaving} onClick={onClose}>{t.common.cancel}</button>
          <button type="submit" form={formId} className={financeModalPrimaryButtonClass} disabled={!canSave}>
            <Check className="h-4 w-4" />
            {isSaving ? 'Guardando…' : account ? t.common.saveChanges : t.accountingAccounts.add}
          </button>
        </>
      )}
      footerSummary={`${values.code.trim() || 'Sin código'} · ${localizedTypeOptions.find(option => option.value === values.type)?.label ?? values.type}`}
      icon={<Layers3 className="h-5 w-5" />}
      onOpenChange={(open) => !open && onClose()}
      open
      title={account ? `${t.common.edit} ${t.accountingAccounts.headerTitle}` : t.accountingAccounts.add}
      tone="green"
    >
      <form id={formId} className="space-y-4" onSubmit={handleSubmit}>
        <IndiceModalValidation messages={errorMessage ? [errorMessage] : []} title="No se pudo guardar" />
        <FinanceModalSection title={t.accountingAccounts.modal.identity} description={t.accountingAccounts.modal.defaultSubtitle}>
          <TextField label={t.accountingAccounts.modal.code} required value={values.code} onChange={(value) => update('code', value)} placeholder="5110" />
          <TextField label={t.accountingAccounts.columns.name.label} required value={values.name} onChange={(value) => update('name', value)} placeholder={t.accountingAccounts.columns.name.label} />
          <SelectField label={t.accountingAccounts.modal.type} value={values.type} options={localizedTypeOptions} onChange={(value) => update('type', value as AccountingAccountType)} />
          <SelectField label={t.accountingAccounts.modal.status} value={values.isActive} options={[{ value: 'true', label: t.common.active }, { value: 'false', label: t.common.inactive }]} onChange={(value) => update('isActive', value)} />
        </FinanceModalSection>
        <FinanceModalSection title={t.accountingAccounts.modal.assignment} description={t.accountingAccounts.modal.scopeDescription}>
          <SelectField label={t.filters.unit} value={values.unitId} options={unitOptions} onChange={(value) => update('unitId', value)} includeEmpty />
          <SelectField label={t.filters.business} value={values.businessId} options={availableBusinessOptions} onChange={(value) => update('businessId', value)} includeEmpty />
          <label className="md:col-span-2">
            <FinanceFieldLabel label={t.accountingAccounts.modal.description} />
            <textarea rows={3} value={values.description} onChange={(event) => update('description', event.target.value)} placeholder={t.accountingAccounts.modal.descriptionPlaceholder} className={`${financeModalInputClass} h-auto resize-none`} />
          </label>
        </FinanceModalSection>
      </form>
    </IndiceModalFrame>
  );
}

function TextField({ label, onChange, placeholder, required, value }: { label: string; onChange: (value: string) => void; placeholder: string; required?: boolean; value: string }) {
  return (
    <label>
      <FinanceFieldLabel label={label} required={required} />
      <input type="text" required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={financeModalInputClass} />
    </label>
  );
}

function SelectField({ includeEmpty = false, label, onChange, options, value }: { includeEmpty?: boolean; label: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; value: string }) {
  const t = useAccountingAccountsTranslations();
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
