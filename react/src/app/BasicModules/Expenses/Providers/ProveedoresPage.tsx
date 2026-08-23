import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { PlusCircle } from 'lucide-react';
import { FailureToast } from '../../../components/FailureToast';
import { SuccessToast } from '../../../components/SuccessToast';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { AttachmentsModal } from '../Expenses/components/AttachmentsModal';
import { useProvidersTranslations } from './hooks/useProvidersTranslations';
import { useFinanceReferenceData } from '../hooks/useFinanceReferenceData';
import { usePersistentTableColumns } from '../hooks/usePersistentTableColumns';
import { accountingAccountsService, providersService, toFinanceApiErrorMessage } from '../services';
import type { FinanceReferenceOption } from '../types/finance-reference.types';
import { defaultProviderColumns, type ProviderColumnConfig } from './providerTableConfig';
import { ProviderColumnsModal } from './components/ProviderColumnsModal';
import { ProviderCreateModal } from './components/ProviderCreateModal';
import { QuickProviderCreateModal } from './components/QuickProviderCreateModal';
import { SupplierPortalAccessModal } from '../../PointOfSale/OrdenesCompra/components/SupplierPortalAccessModal';
import { purchaseOrdersApi } from '../../PointOfSale/OrdenesCompra/services/purchaseOrdersApi';
import type { ProviderOption, SupplierPortalAccess, SupplierPortalAccessPayload, SupplierPortalAccessStatus } from '../../PointOfSale/OrdenesCompra/types/purchaseOrder.types';
import type { PosWarehouseSummary } from '../../PointOfSale/Sale/services/posBackendApi';
import { ProvidersFilterBar } from './components/ProvidersFilterBar';
import { ProvidersHeaderBanner, type ProvidersHeaderVariant } from './components/ProvidersHeaderBanner';
import { ProvidersTable } from './components/ProvidersTable';
import { ProviderKioskAccessModal } from './components/ProviderKioskAccessModal';
import { PayablesKioskManagementModal } from '../components/modals/PayablesKioskManagementModal';
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
    saveProvider,
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
  const [isQuickCreateModalOpen, setIsQuickCreateModalOpen] = useState(false);
  const [isSupplierPortalOpen, setIsSupplierPortalOpen] = useState(false);
  const [isPayablesKioskManagementOpen, setIsPayablesKioskManagementOpen] = useState(false);
  const [supplierPortalSaving, setSupplierPortalSaving] = useState(false);
  const [supplierPortalAccess, setSupplierPortalAccess] = useState<SupplierPortalAccess[]>([]);
  const [supplierPortalProviders, setSupplierPortalProviders] = useState<ProviderOption[]>([]);
  const [supplierPortalWarehouses, setSupplierPortalWarehouses] = useState<PosWarehouseSummary[]>([]);
  const [accessProvider, setAccessProvider] = useState<ProviderRecord | null>(null);
  const [providerPendingDelete, setProviderPendingDelete] = useState<ProviderRecord | null>(null);
  const [isDeletingProvider, setIsDeletingProvider] = useState(false);
  const translatedProviderColumns = useMemo(() => defaultProviderColumns.map(column => {
    const copy = t.providers.columns[column.key];
    return {
      ...column,
      description: copy?.description ?? column.description,
      label: copy?.label ?? column.label,
    };
  }), [t]);
  const [visibleColumns, setVisibleColumns] = usePersistentTableColumns<ProviderColumnConfig>(
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

  const handleQuickAddProvider = async (values: ProviderFormValues) => {
    const providerId = await addProvider(values);
    setEditingProviderId(providerId);
    setIsQuickCreateModalOpen(false);
  };

  const openSupplierPortal = async () => {
    setIsSupplierPortalOpen(true);
    try {
      const [accessResponse, providerResponse, context] = await Promise.all([
        purchaseOrdersApi.listSupplierPortalAccess(),
        purchaseOrdersApi.providers(),
        purchaseOrdersApi.context(),
      ]);
      setSupplierPortalAccess(accessResponse.items ?? []);
      setSupplierPortalProviders((providerResponse.providers ?? []).filter(provider => provider.status !== 'INACTIVE'));
      setSupplierPortalWarehouses(context.warehouses ?? []);
    } catch (error) {
      setFailureToastMessage(toFinanceApiErrorMessage(error, 'No se pudo cargar el portal de proveedores.'));
    }
  };

  const runSupplierPortalAction = async <T,>(operation: () => Promise<T>) => {
    setSupplierPortalSaving(true);
    try {
      return await operation();
    } catch (error) {
      setFailureToastMessage(toFinanceApiErrorMessage(error, 'No se pudo actualizar el portal de proveedores.'));
      throw error;
    } finally {
      setSupplierPortalSaving(false);
    }
  };

  const handleEditProvider = async (values: ProviderFormValues) => {
    if (!editingProvider) return;
    await saveProvider(editingProvider.id, values);
    setEditingProviderId(editingProvider.id);
    setEditingProvider(null);
  };

  const confirmDeleteProvider = async () => {
    if (!providerPendingDelete) return;
    setIsDeletingProvider(true);
    const deleted = await deleteProvider(providerPendingDelete.id);
    setIsDeletingProvider(false);
    if (deleted) setProviderPendingDelete(null);
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
        onManagePayablesKiosks={() => setIsPayablesKioskManagementOpen(true)}
        onManageSupplierPortal={() => void openSupplierPortal()}
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
      <div className="relative">
        {variant === 'sales' ? (
          <button
            type="button"
            onClick={() => setIsQuickCreateModalOpen(true)}
            className="absolute right-4 top-4 z-10 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#FF6B5E] bg-white text-[#D94B40] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#FF6B5E]/10 dark:bg-slate-800 dark:hover:bg-slate-700 xl:-right-6 xl:top-1/2 xl:-translate-y-1/2"
            title={t.providers.add}
            aria-label={t.providers.add}
          >
            <PlusCircle className="h-5 w-5" />
          </button>
        ) : null}
        <ProvidersTable
          accountingAccountOptions={accountingAccountOptions}
          editingProviderId={editingProviderId}
          businessOptions={effectiveBusinessOptions}
          columns={visibleColumns}
          providers={filteredProviders}
          unitOptions={effectiveUnitOptions}
          userOptions={userOptions}
          onActivateProvider={activateProvider}
          onDeleteProvider={(providerId) => setProviderPendingDelete(providers.find(provider => provider.id === providerId) ?? null)}
          onDuplicateProvider={duplicateProvider}
          onEditProvider={setEditingProviderId}
          onOpenEditProvider={setEditingProvider}
          onOpenAttachments={setAttachmentsProvider}
          onUpdateProvider={updateProvider}
          onManageAccess={setAccessProvider}
        />
      </div>
      <ProviderKioskAccessModal
        provider={accessProvider}
        onClose={() => setAccessProvider(null)}
        onError={setFailureToastMessage}
        onSuccess={setSuccessToastMessage}
      />
      <PayablesKioskManagementModal
        businessOptions={businessOptions}
        isOpen={isPayablesKioskManagementOpen}
        onClose={() => setIsPayablesKioskManagementOpen(false)}
        onError={setFailureToastMessage}
        onSuccess={setSuccessToastMessage}
        unitOptions={unitOptions}
      />
      {isSupplierPortalOpen ? (
        <SupplierPortalAccessModal
          accessList={supplierPortalAccess}
          providers={supplierPortalProviders}
          warehouses={supplierPortalWarehouses}
          saving={supplierPortalSaving}
          onClose={() => setIsSupplierPortalOpen(false)}
          onSubmit={(payload: SupplierPortalAccessPayload) => runSupplierPortalAction(async () => {
            const created = await purchaseOrdersApi.createSupplierPortalAccess(payload);
            setSupplierPortalAccess(current => [created, ...current]);
            return created;
          })}
          onStatusChange={(accessId: number, status: SupplierPortalAccessStatus) => runSupplierPortalAction(async () => {
            const updated = await purchaseOrdersApi.updateSupplierPortalAccessStatus(accessId, { status });
            setSupplierPortalAccess(current => current.map(access => access.id === updated.id ? updated : access));
            return updated;
          })}
          onChangePin={(accessId, pin) => runSupplierPortalAction(async () => {
            const updated = await purchaseOrdersApi.changeSupplierPortalAccessPin(accessId, { pin });
            setSupplierPortalAccess(current => current.map(access => access.id === updated.id ? updated : access));
            return updated;
          })}
          onResetLink={(accessId) => runSupplierPortalAction(async () => {
            const updated = await purchaseOrdersApi.resetSupplierPortalAccessLink(accessId);
            setSupplierPortalAccess(current => current.map(access => access.id === updated.id ? updated : access));
            return updated;
          })}
          onUpdateConfiguration={(kioskId, payload) => runSupplierPortalAction(() => purchaseOrdersApi.updateSupplierPortalKiosk(kioskId, payload))}
          onDelete={(kioskId, reason) => runSupplierPortalAction(() => purchaseOrdersApi.deleteSupplierPortalKiosk(kioskId, reason))}
        />
      ) : null}
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
      {isQuickCreateModalOpen && (
        <QuickProviderCreateModal
          onClose={() => setIsQuickCreateModalOpen(false)}
          onSubmit={handleQuickAddProvider}
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
          defaultColumns={translatedProviderColumns}
          variant={variant}
          onClose={() => setIsColumnsModalOpen(false)}
          onSave={(nextColumns) => {
            setVisibleColumns(nextColumns);
            setIsColumnsModalOpen(false);
          }}
        />
      )}
      <ConfirmDeleteDialog
        cancelLabel={t.common.cancel}
        confirmDisabled={isDeletingProvider}
        confirmLabel={isDeletingProvider ? 'Eliminando…' : t.common.delete}
        description="El proveedor dejará de estar disponible para nuevos gastos y cuentas por pagar. Esta acción no se puede deshacer."
        isVisible={Boolean(providerPendingDelete)}
        itemName={providerPendingDelete ? `${providerPendingDelete.folio} · ${providerPendingDelete.name}` : undefined}
        onCancel={() => !isDeletingProvider && setProviderPendingDelete(null)}
        onConfirm={() => void confirmDeleteProvider()}
        title="Eliminar proveedor"
      />
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
