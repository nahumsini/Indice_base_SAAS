import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { FailureToast } from '../../../components/FailureToast';
import { SuccessToast } from '../../../components/SuccessToast';
import { AttachmentsModal } from '../Expenses/components/AttachmentsModal';
import { useFinanceReferenceData } from '../hooks/useFinanceReferenceData';
import { accountingAccountsService, toFinanceApiErrorMessage } from '../services';
import type { FinanceReferenceOption } from '../types/finance-reference.types';
import { defaultProviderColumns, type ProviderColumnKey } from './providerTableConfig';
import { ProviderColumnsModal } from './components/ProviderColumnsModal';
import { ProviderCreateModal } from './components/ProviderCreateModal';
import { ProvidersFilterBar } from './components/ProvidersFilterBar';
import { ProvidersHeaderBanner } from './components/ProvidersHeaderBanner';
import { ProvidersTable } from './components/ProvidersTable';
import {
  type ProviderRecord,
  type ProviderFormValues,
  useProveedoresLogic,
} from './useProveedoresLogic';

interface ProveedoresPageProps {
  onProvidersChange?: Dispatch<SetStateAction<ProviderRecord[]>>;
  providers?: ProviderRecord[];
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

export default function ProveedoresPage({ onProvidersChange, providers: controlledProviders }: ProveedoresPageProps) {
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
  const [visibleColumns, setVisibleColumns] = useState(() => defaultProviderColumns.map(column => ({ ...column })));

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
          setFailureToastMessage(toFinanceApiErrorMessage(error, 'No se pudieron cargar las cuentas contables activas.'));
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
    return [{ value: 'all', label: 'Todos' }, ...scopedOptions];
  }, [businessUnitFilter, effectiveBusinessOptions]);

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
        onAddProvider={() => setIsCreateModalOpen(true)}
        onConfigureColumns={() => setIsColumnsModalOpen(true)}
      />
      <ProvidersFilterBar
        businessFilter={businessFilter}
        businessOptions={businessFilterOptions}
        businessUnitFilter={businessUnitFilter}
        businessUnitOptions={[{ value: 'all', label: 'Todas' }, ...effectiveUnitOptions]}
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
        providers={filteredProviders}
        unitOptions={effectiveUnitOptions}
        userOptions={userOptions}
        visibleColumns={visibleColumns.filter(column => column.visible).map(column => column.key)}
        onActivateProvider={activateProvider}
        onDeleteProvider={deleteProvider}
        onDuplicateProvider={duplicateProvider}
        onEditProvider={setEditingProviderId}
        onOpenEditProvider={setEditingProvider}
        onOpenAttachments={setAttachmentsProvider}
        onUpdateProvider={updateProvider}
      />
      {attachmentsProvider && (
        <AttachmentsModal
          isOpen
          onClose={() => setAttachmentsProvider(null)}
          expenseFolio={attachmentsProvider.folio}
          expenseConcept={attachmentsProvider.name}
          attachments={attachmentsProvider.attachments}
          onSave={saveProviderAttachments}
        />
      )}
      {isCreateModalOpen && (
        <ProviderCreateModal
          accountingAccountOptions={accountingAccountOptions}
          businessOptions={effectiveBusinessOptions}
          unitOptions={effectiveUnitOptions}
          userOptions={userOptions}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleAddProvider}
        />
      )}
      {editingProvider && (
        <ProviderCreateModal
          accountingAccountOptions={accountingAccountOptions}
          businessOptions={effectiveBusinessOptions}
          initialValues={toProviderFormValues(editingProvider)}
          submitLabel="Guardar cambios"
          subtitle={editingProvider.folio}
          title="Editar proveedor"
          unitOptions={effectiveUnitOptions}
          userOptions={userOptions}
          onClose={() => setEditingProvider(null)}
          onSubmit={handleEditProvider}
        />
      )}
      {isColumnsModalOpen && (
        <ProviderColumnsModal
          columns={visibleColumns}
          onApply={() => setIsColumnsModalOpen(false)}
          onClose={() => setIsColumnsModalOpen(false)}
          onHideOptional={() => setVisibleColumns(currentColumns => currentColumns.map(column => ({ ...column, visible: Boolean(column.fixed) })))}
          onRestoreDefault={() => setVisibleColumns(defaultProviderColumns.map(column => ({ ...column })))}
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
