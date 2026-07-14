import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { FailureToast } from '../../../components/FailureToast';
import { SuccessToast } from '../../../components/SuccessToast';
import { AttachmentsModal } from '../Expenses/components/AttachmentsModal';
import { useProvidersTranslations } from './hooks/useProvidersTranslations';
import { useFinanceReferenceData } from '../hooks/useFinanceReferenceData';
import { usePersistentTableColumns } from '../hooks/usePersistentTableColumns';
import { accountingAccountsService, providersService, toFinanceApiErrorMessage } from '../services';
import type { FinanceReferenceOption } from '../types/finance-reference.types';
import { defaultProviderColumns, type ProviderColumnKey } from './providerTableConfig';
import { ProviderColumnsModal } from './components/ProviderColumnsModal';
import { ProviderCreateModal } from './components/ProviderCreateModal';
import { ProvidersFilterBar } from './components/ProvidersFilterBar';
import { ProvidersHeaderBanner, type ProvidersHeaderVariant } from './components/ProvidersHeaderBanner';
import { ProvidersTable } from './components/ProvidersTable';
import { ProviderKioskAccessModal } from './components/ProviderKioskAccessModal';
import {
  type ProviderRecord,
  type ProviderFormValues,
  useProveedoresLogic,
} from './useProveedoresLogic';

interface ProveedoresPageProps {
  headerIcon?: ReactNode;
  headerSubtitle?: string;
  headerTitle?: string;
  onProvidersChange?: Dispatch<SetStateAction<ProviderRecord[]>>;
  providers?: ProviderRecord[];
  variant?: ProvidersHeaderVariant;
}

const toProviderFormValues = (provider: ProviderRecord): ProviderFormValues => ({
  accountingAccount: provider.accountingAccount,
  address: provider.address,
  authorizer: provider.authorizer,
  business: provider.business,
  businessUnit: provider.businessUnit,
  company: provider.company,
  contactName: provider.contactName,
  email: provider.email,
  name: provider.name,
  performer: provider.performer,
  phone: provider.phone,
  status: provider.status,
  taxId: provider.taxId,
  type: provider.type,
});

export default function ProveedoresPage({
  headerIcon,
  headerSubtitle,
  headerTitle,
  onProvidersChange,
  providers: controlledProviders,
  variant = 'finance',
}: ProveedoresPageProps) {
  const t = useProvidersTranslations();
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const {
    businessOptions,
    unitOptions,
    userOptions,
  } = useFinanceReferenceData(setFailureToastMessage);
  const {
    addProvider,
    activateProvider,
    businessFilter,
    businessUnitFilter,
    deleteProvider,
    duplicateProvider,
    filteredProviders,
    providers,
    searchTerm,
    setBusinessFilter,
    setBusinessUnitFilter,
    setSearchTerm,
    setStatusFilter,
    setTypeFilter,
    statusFilter,
    typeFilter,
    updateProvider,
  } = useProveedoresLogic({
    onError: setFailureToastMessage,
    onProvidersChange,
    onSuccess: setSuccessToastMessage,
    providers: controlledProviders,
  });
  const [attachmentsProvider, setAttachmentsProvider] = useState<ProviderRecord | null>(null);
  const [accountingAccountOptions, setAccountingAccountOptions] = useState<FinanceReferenceOption[]>([]);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [editingProvider, setEditingProvider] = useState<ProviderRecord | null>(null);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [accessProvider, setAccessProvider] = useState<ProviderRecord | null>(null);
  const translatedProviderColumns = useMemo(() => defaultProviderColumns.map(column => {
    const copy = t.providers.columns[column.key];
    return {
      ...column,
      description: copy?.description ?? column.description,
      label: copy?.label ?? column.label,
    };
  }), [t]);
  const [visibleColumns, setVisibleColumns] = usePersistentTableColumns(
    'indice.expenses.providers.columns.v1',
    translatedProviderColumns,
  );

  useEffect(() => {
    let isMounted = true;
    accountingAccountsService.getAccountingAccounts()
      .then(accounts => {
        if (!isMounted) return;
        setAccountingAccountOptions(accounts
          .filter(account => account.isActive)
          .sort((first, second) => first.code.localeCompare(second.code))
          .map(account => ({
            value: account.id,
            label: `${account.code} - ${account.name}`,
          })));
      })
      .catch(error => {
        if (isMounted) {
          setFailureToastMessage(toFinanceApiErrorMessage(error, t.expenses.messages.accountLoadFailed));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [t.expenses.messages.accountLoadFailed]);

  useEffect(() => {
    if (!onProvidersChange) return;
    let isMounted = true;
    providersService.getProviderRecords()
      .then(nextProviders => {
        if (isMounted) onProvidersChange([...nextProviders].sort((left, right) => {
          const leftPending = left.status === 'inactive' && left.registrationSource === 'payable-kiosk-registration' ? 0 : 1;
          const rightPending = right.status === 'inactive' && right.registrationSource === 'payable-kiosk-registration' ? 0 : 1;
          return leftPending - rightPending || right.createdAt.getTime() - left.createdAt.getTime();
        }));
      })
      .catch(error => {
        if (isMounted) setFailureToastMessage(toFinanceApiErrorMessage(error, 'No se pudieron actualizar los proveedores.'));
      });
    return () => { isMounted = false; };
  }, [onProvidersChange]);

  const effectiveUnitOptions = useMemo<FinanceReferenceOption[]>(() => (
    unitOptions.length > 0
      ? unitOptions
      : Array.from(new Set(providers.map(provider => provider.businessUnit).filter(Boolean))).map(value => ({ value, label: value }))
  ), [providers, unitOptions]);
  const effectiveBusinessOptions = useMemo<FinanceReferenceOption[]>(() => (
    businessOptions.length > 0
      ? businessOptions
      : Array.from(new Set(providers.map(provider => provider.business).filter(Boolean))).map(value => ({ value, label: value }))
  ), [businessOptions, providers]);
  const businessFilterOptions = useMemo(() => {
    const scopedOptions = businessUnitFilter === 'all'
      ? effectiveBusinessOptions
      : effectiveBusinessOptions.filter(option => !option.unitId || option.unitId === businessUnitFilter);
    return [{ value: 'all', label: t.common.all }, ...scopedOptions];
  }, [businessUnitFilter, effectiveBusinessOptions, t.common.all]);

  useEffect(() => {
    if (businessFilter === 'all') return;
    if (businessFilterOptions.some(option => option.value === businessFilter)) return;
    setBusinessFilter('all');
  }, [businessFilter, businessFilterOptions, setBusinessFilter]);

  const handleAddProvider = async (values: ProviderFormValues) => {
    const providerId = await addProvider(values);
    setEditingProviderId(providerId);
    setIsCreateModalOpen(false);
  };

  const handleEditProvider = async (values: ProviderFormValues) => {
    if (!editingProvider) return;
    updateProvider(editingProvider.id, values);
    setEditingProviderId(editingProvider.id);
    setEditingProvider(null);
  };

  const handleToggleColumn = (key: ProviderColumnKey, visible: boolean) => {
    setVisibleColumns(currentColumns => currentColumns.map(column => (
      column.key === key ? { ...column, visible: column.fixed ? true : visible } : column
    )));
  };

  const saveProviderAttachments = (attachments: string[]) => {
    if (!attachmentsProvider) return;
    updateProvider(attachmentsProvider.id, { attachments });
  };

  return (
    <div className="space-y-6">
      <ProvidersHeaderBanner
        icon={headerIcon}
        onAddProvider={() => setIsCreateModalOpen(true)}
        onConfigureColumns={() => setIsColumnsModalOpen(true)}
        subtitle={headerSubtitle}
        title={headerTitle}
        variant={variant}
      />
      <ProvidersFilterBar
        businessFilter={businessFilter}
        businessOptions={businessFilterOptions}
        businessUnitFilter={businessUnitFilter}
        businessUnitOptions={[{ value: 'all', label: t.common.all }, ...effectiveUnitOptions]}
        filteredCount={filteredProviders.length}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        onBusinessChange={setBusinessFilter}
        onBusinessUnitChange={setBusinessUnitFilter}
        onSearchChange={setSearchTerm}
        onStatusChange={setStatusFilter}
        onTypeChange={setTypeFilter}
      />
      <ProvidersTable
        accountingAccountOptions={accountingAccountOptions}
        editingProviderId={editingProviderId}
        businessOptions={effectiveBusinessOptions}
        columns={visibleColumns}
        providers={filteredProviders}
        unitOptions={effectiveUnitOptions}
        userOptions={userOptions}
        onActivateProvider={activateProvider}
        onDeleteProvider={deleteProvider}
        onDuplicateProvider={duplicateProvider}
        onEditProvider={setEditingProviderId}
        onOpenEditProvider={setEditingProvider}
        onOpenAttachments={setAttachmentsProvider}
        onUpdateProvider={updateProvider}
        onManageAccess={setAccessProvider}
      />
      <ProviderKioskAccessModal
        provider={accessProvider}
        onClose={() => setAccessProvider(null)}
        onError={setFailureToastMessage}
        onSuccess={setSuccessToastMessage}
      />
      {attachmentsProvider && (
        <AttachmentsModal
          isOpen
          onClose={() => setAttachmentsProvider(null)}
          expenseFolio={attachmentsProvider.folio}
          expenseConcept={attachmentsProvider.name}
          attachments={attachmentsProvider.attachments}
          moduleVariant={variant === 'sales' ? 'sales' : 'finance'}
          onSave={saveProviderAttachments}
        />
      )}
      {isCreateModalOpen && (
        <ProviderCreateModal
          accountingAccountOptions={accountingAccountOptions}
          businessOptions={effectiveBusinessOptions}
          unitOptions={effectiveUnitOptions}
          userOptions={userOptions}
          variant={variant}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleAddProvider}
        />
      )}
      {editingProvider && (
        <ProviderCreateModal
          accountingAccountOptions={accountingAccountOptions}
          businessOptions={effectiveBusinessOptions}
          initialValues={toProviderFormValues(editingProvider)}
          submitLabel={t.common.saveChanges}
          subtitle={editingProvider.folio}
          title={t.providers.edit}
          unitOptions={effectiveUnitOptions}
          userOptions={userOptions}
          variant={variant}
          onClose={() => setEditingProvider(null)}
          onSubmit={handleEditProvider}
        />
      )}
      {isColumnsModalOpen && (
        <ProviderColumnsModal
          columns={visibleColumns}
          variant={variant}
          onApply={() => setIsColumnsModalOpen(false)}
          onClose={() => setIsColumnsModalOpen(false)}
          onHideOptional={() => setVisibleColumns(currentColumns => currentColumns.map(column => ({ ...column, visible: Boolean(column.fixed) })))}
          onRestoreDefault={() => setVisibleColumns(translatedProviderColumns.map(column => ({ ...column })))}
          onShowAll={() => setVisibleColumns(currentColumns => currentColumns.map(column => ({ ...column, visible: true })))}
          onToggleColumn={handleToggleColumn}
        />
      )}
      <SuccessToast
        isVisible={Boolean(successToastMessage)}
        message={successToastMessage}
        onClose={() => setSuccessToastMessage('')}
      />
      <FailureToast
        isVisible={Boolean(failureToastMessage)}
        message={failureToastMessage}
        onClose={() => setFailureToastMessage('')}
      />
    </div>
  );
}
