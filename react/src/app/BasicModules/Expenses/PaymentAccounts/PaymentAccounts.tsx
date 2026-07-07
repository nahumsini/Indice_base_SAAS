import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { FailureToast } from '../../../components/FailureToast';
import { LoadingBarOverlay } from '../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../components/SuccessToast';
import { usePettyCash } from '../../PettyCash/context/PettyCashContext';
import { isBackendId } from '../adapters/adapter.utils';
import { useFinanceReferenceData } from '../hooks/useFinanceReferenceData';
import { useFinanceTranslations } from '../hooks/useFinanceTranslations';
import { paymentAccountsService, toFinanceApiErrorMessage } from '../services';
import type { PaymentAccount, PaymentSortField, SortDirection } from './types';
import { filterPaymentAccounts, sortPaymentAccounts } from './paymentAccounts.utils';
import { defaultPaymentColumns, type PaymentColumnKey } from './paymentAccountsTableConfig';
import { PaymentAccountColumnsModal } from './components/PaymentAccountColumnsModal';
import { PaymentAccountModal } from './components/PaymentAccountModal';
import { PaymentAccountsFilters } from './components/PaymentAccountsFilters';
import { PaymentAccountsHeaderBanner } from './components/PaymentAccountsHeaderBanner';
import { PaymentAccountsSummary } from './components/PaymentAccountsSummary';
import { PaymentAccountsTable } from './components/PaymentAccountsTable';

interface PaymentAccountsProps {
  onNavigate?: (page?: string) => void;
  refreshKey?: number;
}

export default function PaymentAccounts({ onNavigate, refreshKey = 0 }: PaymentAccountsProps = {}) {
  const t = useFinanceTranslations();
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
  const [visibleColumns, setVisibleColumns] = useState(() => defaultPaymentColumns.map(column => ({ ...column })));
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

  useEffect(() => {
    setVisibleColumns(currentColumns => translatedPaymentColumns.map(column => {
      const currentColumn = currentColumns.find(item => item.key === column.key);
      return {
        ...column,
        visible: currentColumn ? (column.fixed ? true : currentColumn.visible) : column.visible,
      };
    }));
  }, [translatedPaymentColumns]);

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
        .filter(account => account.id !== '3')
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

  const handleToggleColumn = (key: PaymentColumnKey, visible: boolean) => {
    setVisibleColumns(currentColumns => currentColumns.map(column => (
      column.key === key ? { ...column, visible: column.fixed ? true : visible } : column
    )));
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
    try {
      const savedAccount = isBackendId(account.id)
        ? await paymentAccountsService.updatePaymentAccount(account)
        : await paymentAccountsService.createPaymentAccount(account);
      setAccounts(currentAccounts => {
        const exists = currentAccounts.some(item => item.id === account.id);
        return exists
          ? currentAccounts.map(item => (item.id === account.id ? savedAccount : item))
          : [savedAccount, ...currentAccounts];
      });
      setSuccessToastMessage(isBackendId(account.id) ? t.paymentAccounts.messages.updated : t.paymentAccounts.messages.created);
    } catch (error) {
      setFailureToastMessage(toFinanceApiErrorMessage(error, t.paymentAccounts.messages.saveFailed));
    } finally {
      closeModal();
    }
  };

  const handleDeleteAccount = (accountId: string) => {
    const account = accounts.find(item => item.id === accountId);
    setAccounts(currentAccounts => currentAccounts.filter(item => item.id !== accountId));
    if (!account || !isBackendId(accountId)) return;

    paymentAccountsService.deletePaymentAccount(accountId)
      .then(() => setSuccessToastMessage(t.paymentAccounts.messages.deleted))
      .catch(error => {
        setAccounts(currentAccounts => [account, ...currentAccounts]);
        setFailureToastMessage(toFinanceApiErrorMessage(error, t.paymentAccounts.messages.deleteFailed));
      });
  };

  return (
    <div className="space-y-6">
      <LoadingBarOverlay
        isVisible={isLoading}
        title={t.module.loadingFinanceTitle}
        description={t.module.loadingFinanceDescription}
      />
      <PaymentAccountsHeaderBanner
        onAddAccount={() => setIsAddModalOpen(true)}
        onConfigureColumns={() => setIsColumnsModalOpen(true)}
      />

      <PaymentAccountsFilters
        filteredCount={filteredAccounts.length}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        onSearchChange={setSearchTerm}
        onStatusChange={setStatusFilter}
        onTypeChange={setTypeFilter}
      />

      <div className="rounded-2xl border border-[#147514]/20 bg-[#147514]/5 px-4 py-3 dark:border-[#147514]/30 dark:bg-[#147514]/10">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#147514]" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {t.paymentAccounts.pettyCashNotice}
          </p>
        </div>
      </div>

      <PaymentAccountsSummary accounts={filteredAccounts} />
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
        onNavigate={onNavigate}
        onSort={handleSort}
        onToggleActive={handleToggleActive}
      />

      {isColumnsModalOpen && (
        <PaymentAccountColumnsModal
          columns={visibleColumns}
          onApply={() => setIsColumnsModalOpen(false)}
          onClose={() => setIsColumnsModalOpen(false)}
          onHideOptional={() => setVisibleColumns(currentColumns => currentColumns.map(column => ({ ...column, visible: Boolean(column.fixed) })))}
          onRestoreDefault={() => setVisibleColumns(translatedPaymentColumns.map(column => ({ ...column })))}
          onShowAll={() => setVisibleColumns(currentColumns => currentColumns.map(column => ({ ...column, visible: true })))}
          onToggleColumn={handleToggleColumn}
        />
      )}
      {isAddModalOpen && (
        <PaymentAccountModal
          account={editingAccount}
          businessOptions={businessOptions}
          unitOptions={unitOptions}
          onClose={closeModal}
          onSubmit={handleSaveAccount}
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
