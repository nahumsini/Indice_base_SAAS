import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { FailureToast } from '../../../components/FailureToast';
import { LoadingBarOverlay } from '../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../components/SuccessToast';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { usePettyCash } from '../../PettyCash/context/PettyCashContext';
import { isBackendId } from '../adapters/adapter.utils';
import { useFinanceReferenceData } from '../hooks/useFinanceReferenceData';
import { usePersistentTableColumns } from '../hooks/usePersistentTableColumns';
import { usePaymentAccountsTranslations } from './hooks/usePaymentAccountsTranslations';
import { paymentAccountsService, toFinanceApiErrorMessage } from '../services';
import type { PaymentAccount, PaymentSortField, SortDirection } from './types';
import { filterPaymentAccounts, sortPaymentAccounts } from './paymentAccounts.utils';
import { defaultPaymentColumns, type PaymentColumnConfig } from './paymentAccountsTableConfig';
import { PaymentAccountColumnsModal } from './components/PaymentAccountColumnsModal';
import { PaymentAccountModal } from './components/PaymentAccountModal';
import { PaymentAccountsFilters } from './components/PaymentAccountsFilters';
import { PaymentAccountsHeaderBanner } from './components/PaymentAccountsHeaderBanner';
import { PaymentAccountsSummary } from './components/PaymentAccountsSummary';
import { PaymentAccountsTable } from './components/PaymentAccountsTable';
import { useWorkspaceNavigationMemory } from '../../../hooks/useWorkspaceNavigationMemory';

interface PaymentAccountsProps {
  headerSubtitle?: string;
  headerTitle?: string;
  headerTone?: 'green' | 'coral';
  onNavigate?: (page?: string) => void;
  refreshKey?: number;
}

type PaymentAccountsWorkspaceState = {
  searchTerm: string;
  sortDirection: SortDirection;
  sortField: PaymentSortField | null;
  statusFilter: string;
  typeFilter: string;
};

const paymentAccountsWorkspaceDefaults: PaymentAccountsWorkspaceState = {
  searchTerm: '',
  sortDirection: null,
  sortField: null,
  statusFilter: 'all',
  typeFilter: 'all',
};

const paymentAccountsWorkspaceUrlFields: Partial<Record<keyof PaymentAccountsWorkspaceState, string>> = {
  searchTerm: 'pa_q',
  sortDirection: 'pa_dir',
  sortField: 'pa_sort',
  statusFilter: 'pa_status',
  typeFilter: 'pa_type',
};

export default function PaymentAccounts({ headerSubtitle, headerTitle, headerTone = 'green', onNavigate, refreshKey = 0 }: PaymentAccountsProps = {}) {
  const t = usePaymentAccountsTranslations();
  const { pettyCashFunds } = usePettyCash();
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<PaymentSortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [accountPendingDelete, setAccountPendingDelete] = useState<PaymentAccount | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const workspaceState = useMemo<PaymentAccountsWorkspaceState>(() => ({
    searchTerm,
    sortDirection,
    sortField,
    statusFilter,
    typeFilter,
  }), [searchTerm, sortDirection, sortField, statusFilter, typeFilter]);
  const restoreWorkspaceState = useCallback((restoredState: PaymentAccountsWorkspaceState) => {
    setSearchTerm(restoredState.searchTerm);
    setSortDirection(restoredState.sortDirection);
    setSortField(restoredState.sortField);
    setStatusFilter(restoredState.statusFilter);
    setTypeFilter(restoredState.typeFilter);
  }, []);

  useWorkspaceNavigationMemory({
    moduleKey: 'expenses',
    tabKey: 'payment_accounts',
    state: workspaceState,
    defaults: paymentAccountsWorkspaceDefaults,
    urlFields: paymentAccountsWorkspaceUrlFields,
    onRestore: restoreWorkspaceState,
  });
  const {
    businessOptions,
    unitOptions,
  } = useFinanceReferenceData(setFailureToastMessage);

  const translatedPaymentColumns = useMemo(() => defaultPaymentColumns.map(column => {
    const copy = t.paymentAccounts.columns[column.key];
    return {
      ...column,
      description: copy?.description ?? column.description,
      label: copy?.label ?? column.label,
    };
  }), [t]);
  const [visibleColumns, setVisibleColumns] = usePersistentTableColumns<PaymentColumnConfig>(
    'indice.expenses.payment-accounts.columns.v1',
    translatedPaymentColumns,
  );

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    paymentAccountsService.getPaymentAccounts()
      .then(nextAccounts => {
        if (isMounted) setAccounts(nextAccounts);
      })
      .catch(error => {
        if (isMounted) setFailureToastMessage(toFinanceApiErrorMessage(error));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const paymentAccounts = useMemo<PaymentAccount[]>(() => {
    const pettyCashPaymentAccountIds = new Set(
      pettyCashFunds.map(fund => fund.paymentAccountId).filter(Boolean),
    );
    const pettyCashAccounts: PaymentAccount[] = pettyCashFunds.map(fund => ({
      id: `petty-cash-${fund.id}`,
      name: fund.name,
      type: 'cash',
      accountNumber: fund.paymentAccountId ?? 'Managed internally',
      bank: 'Petty Cash',
      currency: fund.currencyCode,
      balance: fund.currentBalanceAmount,
      isActive: fund.status !== 'CLOSED',
      source: 'petty_cash',
      linkedFundId: fund.id,
      custodian: fund.responsibleName,
    }));

    return [
      ...accounts
        .filter(account => !pettyCashPaymentAccountIds.has(account.id))
        .map(account => ({ ...account, source: 'expenses' as const })),
      ...pettyCashAccounts,
    ];
  }, [accounts, pettyCashFunds]);

  const filteredAccounts = useMemo(() => {
    const filtered = filterPaymentAccounts(paymentAccounts, searchTerm, typeFilter, statusFilter);
    return sortPaymentAccounts(filtered, sortField, sortDirection);
  }, [paymentAccounts, searchTerm, sortDirection, sortField, statusFilter, typeFilter]);

  const handleSort = (field: PaymentSortField) => {
    if (sortField === field && sortDirection === 'asc') {
      setSortDirection('desc');
      return;
    }
    if (sortField === field && sortDirection === 'desc') {
      setSortDirection(null);
      setSortField(null);
      return;
    }
    setSortField(field);
    setSortDirection('asc');
  };

  const handleToggleActive = async (account: PaymentAccount) => {
    if (account.source === 'petty_cash') return;
    const nextAccount = { ...account, isActive: !account.isActive };
    setAccounts(currentAccounts => currentAccounts.map(item => (item.id === account.id ? nextAccount : item)));
    if (!isBackendId(account.id)) return;

    try {
      const savedAccount = await paymentAccountsService.updatePaymentAccount(nextAccount);
      setAccounts(currentAccounts => currentAccounts.map(item => (item.id === account.id ? savedAccount : item)));
      setSuccessToastMessage(savedAccount.isActive ? t.paymentAccounts.messages.activated : t.paymentAccounts.messages.deactivated);
    } catch (error) {
      setAccounts(currentAccounts => currentAccounts.map(item => (item.id === account.id ? account : item)));
      setFailureToastMessage(toFinanceApiErrorMessage(error, t.paymentAccounts.messages.statusUpdateFailed));
    }
  };

  const closeModal = () => {
    setEditingAccount(null);
    setIsAddModalOpen(false);
  };

  const handleSaveAccount = async (account: PaymentAccount) => {
    const isEditing = isBackendId(account.id);
    try {
      const savedAccount = isEditing
        ? await paymentAccountsService.updatePaymentAccount(account)
        : await paymentAccountsService.createPaymentAccount(account);
      setAccounts(currentAccounts => {
        const exists = currentAccounts.some(item => item.id === account.id);
        return exists
          ? currentAccounts.map(item => (item.id === account.id ? savedAccount : item))
          : [savedAccount, ...currentAccounts];
      });
      if (!isEditing) {
        setSearchTerm('');
        setTypeFilter('all');
        setStatusFilter('all');
      }
      setSuccessToastMessage(isEditing ? t.paymentAccounts.messages.updated : t.paymentAccounts.messages.created);
      closeModal();
    } catch (error) {
      setFailureToastMessage(toFinanceApiErrorMessage(error, t.paymentAccounts.messages.saveFailed));
      throw error;
    }
  };

  const handleDeleteAccount = (accountId: string) => {
    setAccountPendingDelete(accounts.find(item => item.id === accountId) ?? null);
  };

  const confirmDeleteAccount = async () => {
    if (!accountPendingDelete) return;
    setIsDeletingAccount(true);
    try {
      if (isBackendId(accountPendingDelete.id)) {
        await paymentAccountsService.deletePaymentAccount(accountPendingDelete.id);
      }
      setAccounts(currentAccounts => currentAccounts.filter(item => item.id !== accountPendingDelete.id));
      setSuccessToastMessage(t.paymentAccounts.messages.deleted);
      setAccountPendingDelete(null);
    } catch (error) {
      setFailureToastMessage(toFinanceApiErrorMessage(error, t.paymentAccounts.messages.deleteFailed));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6">
      <LoadingBarOverlay
        isVisible={isLoading}
        title={t.module.loadingFinanceTitle}
        description={t.module.loadingFinanceDescription}
      />
      <PaymentAccountsHeaderBanner
        subtitle={headerSubtitle}
        title={headerTitle}
        tone={headerTone}
        onAddAccount={() => setIsAddModalOpen(true)}
        onConfigureColumns={() => setIsColumnsModalOpen(true)}
      />

      <PaymentAccountsFilters
        filteredCount={filteredAccounts.length}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        tone={headerTone}
        onSearchChange={setSearchTerm}
        onStatusChange={setStatusFilter}
        onTypeChange={setTypeFilter}
      />

      <div className={`rounded-2xl border px-4 py-3 ${headerTone === 'coral' ? 'border-[#FF6B5E]/25 bg-[#FF6B5E]/5 dark:border-[#FF6B5E]/30 dark:bg-[#FF6B5E]/10' : 'border-[#147514]/20 bg-[#147514]/5 dark:border-[#147514]/30 dark:bg-[#147514]/10'}`}>
        <div className="flex gap-3">
          <ShieldCheck className={`mt-0.5 h-4 w-4 shrink-0 ${headerTone === 'coral' ? 'text-[#E8564B]' : 'text-[#147514]'}`} />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {t.paymentAccounts.pettyCashNotice}
          </p>
        </div>
      </div>

      <PaymentAccountsSummary accounts={filteredAccounts} tone={headerTone} />
      <PaymentAccountsTable
        accounts={filteredAccounts}
        businessOptions={businessOptions}
        onDelete={handleDeleteAccount}
        onEdit={(account) => {
          setEditingAccount(account);
          setIsAddModalOpen(true);
        }}
        sortDirection={sortDirection}
        sortField={sortField}
        unitOptions={unitOptions}
        columns={visibleColumns}
        tone={headerTone}
        onNavigate={onNavigate}
        onSort={handleSort}
        onToggleActive={handleToggleActive}
      />

      {isColumnsModalOpen && (
        <PaymentAccountColumnsModal
          columns={visibleColumns}
          defaultColumns={translatedPaymentColumns}
          onClose={() => setIsColumnsModalOpen(false)}
          onSave={(nextColumns) => {
            setVisibleColumns(nextColumns);
            setIsColumnsModalOpen(false);
          }}
        />
      )}
      {isAddModalOpen && (
        <PaymentAccountModal
          account={editingAccount}
          businessOptions={businessOptions}
          unitOptions={unitOptions}
          onClose={closeModal}
          onSubmit={handleSaveAccount}
          subtitle={headerSubtitle}
          title={headerTitle}
          tone={headerTone}
        />
      )}
      <ConfirmDeleteDialog
        cancelLabel={t.common.cancel}
        confirmDisabled={isDeletingAccount}
        confirmLabel={isDeletingAccount ? 'Eliminando…' : t.common.delete}
        description="La cuenta dejará de estar disponible para nuevos pagos y esta acción no se puede deshacer."
        isVisible={Boolean(accountPendingDelete)}
        itemName={accountPendingDelete?.name}
        onCancel={() => !isDeletingAccount && setAccountPendingDelete(null)}
        onConfirm={() => void confirmDeleteAccount()}
        title="Eliminar cuenta de pago"
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
