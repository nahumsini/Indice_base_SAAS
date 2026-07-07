import { useEffect, useMemo, useState } from 'react';
import { FailureToast } from '../../../components/FailureToast';
import { LoadingBarOverlay } from '../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../components/SuccessToast';
import { isBackendId } from '../adapters/adapter.utils';
import { useAccountingAccountsTranslations } from './hooks/useAccountingAccountsTranslations';
import { useFinanceReferenceData } from '../hooks/useFinanceReferenceData';
import { accountingAccountsService, toFinanceApiErrorMessage } from '../services';
import { mockAccounts } from './accountingAccounts.mock';
import type { AccountingAccount, AccountingSortField, SortDirection } from './types';
import { filterAccountingAccounts, sortAccountingAccounts } from './accountingAccounts.utils';
import {
  accountMatchesCatalogTemplate,
  catalogTemplateToAccount,
  type AccountingCatalogTemplate,
} from './accountingCatalogSeed';
import { defaultAccountingColumns, type AccountingColumnKey } from './accountingAccountsTableConfig';
import { AccountingAccountColumnsModal } from './components/AccountingAccountColumnsModal';
import { AccountingAccountModal } from './components/AccountingAccountModal';
import { AccountingCatalogImportModal } from './components/AccountingCatalogImportModal';
import { AccountingAccountsFilters } from './components/AccountingAccountsFilters';
import { AccountingAccountsHeaderBanner } from './components/AccountingAccountsHeaderBanner';
import { AccountingAccountsSummary } from './components/AccountingAccountsSummary';
import { AccountingAccountsTable } from './components/AccountingAccountsTable';

export default function AccountingAccounts() {
  const t = useAccountingAccountsTranslations();
  const [accounts, setAccounts] = useState<AccountingAccount[]>(mockAccounts);
  const [editingAccount, setEditingAccount] = useState<AccountingAccount | null>(null);
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<AccountingSortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [isCatalogImportOpen, setIsCatalogImportOpen] = useState(false);
  const [isImportingCatalog, setIsImportingCatalog] = useState(false);
  const translatedAccountingColumns = useMemo(() => defaultAccountingColumns.map(column => {
    const copy = t.accountingAccounts.columns[column.key];
    return {
      ...column,
      description: copy?.description ?? column.description,
      label: copy?.label ?? column.label,
    };
  }), [t]);
  const [visibleColumns, setVisibleColumns] = useState(() => translatedAccountingColumns.map(column => ({ ...column })));
  const {
    businessOptions,
    unitOptions,
  } = useFinanceReferenceData(setFailureToastMessage);

  useEffect(() => {
    setVisibleColumns(currentColumns => translatedAccountingColumns.map(column => {
      const current = currentColumns.find(item => item.key === column.key);
      return {
        ...column,
        visible: current?.visible ?? column.visible,
      };
    }));
  }, [translatedAccountingColumns]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    accountingAccountsService.getAccountingAccounts()
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
  }, []);

  const filteredAccounts = useMemo(() => {
    const filtered = filterAccountingAccounts(accounts, searchTerm, typeFilter, statusFilter);
    return sortAccountingAccounts(filtered, sortField, sortDirection);
  }, [accounts, searchTerm, sortDirection, sortField, statusFilter, typeFilter]);

  const handleSort = (field: AccountingSortField) => {
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

  const handleToggleColumn = (key: AccountingColumnKey, visible: boolean) => {
    setVisibleColumns(currentColumns => currentColumns.map(column => (
      column.key === key ? { ...column, visible: column.fixed ? true : visible } : column
    )));
  };

  const handleToggleActive = async (account: AccountingAccount) => {
    const nextAccount = { ...account, isActive: !account.isActive };
    setAccounts(currentAccounts => currentAccounts.map(item => (item.id === account.id ? nextAccount : item)));
    if (!isBackendId(account.id)) return;

    try {
      const savedAccount = await accountingAccountsService.updateAccountingAccount(nextAccount);
      setAccounts(currentAccounts => currentAccounts.map(item => (item.id === account.id ? savedAccount : item)));
      setSuccessToastMessage(savedAccount.isActive ? t.accountingAccounts.messages.activated : t.accountingAccounts.messages.deactivated);
    } catch (error) {
      setAccounts(currentAccounts => currentAccounts.map(item => (item.id === account.id ? account : item)));
      setFailureToastMessage(toFinanceApiErrorMessage(error, t.accountingAccounts.messages.statusUpdateFailed));
    }
  };

  const handleImportCatalogTemplates = async (templates: AccountingCatalogTemplate[]) => {
    const templatesToImport = templates.filter(template => !accounts.some(account => accountMatchesCatalogTemplate(account, template)));
    if (templatesToImport.length === 0) {
      setFailureToastMessage(t.accountingAccounts.messages.noNewAccounts);
      return;
    }

    setIsImportingCatalog(true);
    const results = await Promise.allSettled(templatesToImport.map(template => (
      accountingAccountsService.createAccountingAccount(catalogTemplateToAccount(template))
    )));
    const savedAccounts = results
      .filter((result): result is PromiseFulfilledResult<AccountingAccount> => result.status === 'fulfilled')
      .map(result => result.value);
    const failedResult = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');

    if (savedAccounts.length > 0) {
      setAccounts(currentAccounts => [
        ...savedAccounts,
        ...currentAccounts.filter(account => !savedAccounts.some(savedAccount => savedAccount.id === account.id)),
      ]);
      setSuccessToastMessage(t.accountingAccounts.messages.imported(savedAccounts.length));
      setIsCatalogImportOpen(false);
    }
    if (failedResult) {
      setFailureToastMessage(toFinanceApiErrorMessage(failedResult.reason, t.accountingAccounts.messages.importFailed));
    }
    setIsImportingCatalog(false);
  };

  const closeModal = () => {
    setEditingAccount(null);
    setIsAddModalOpen(false);
  };

  const handleSaveAccount = async (account: AccountingAccount) => {
    try {
      const savedAccount = isBackendId(account.id)
        ? await accountingAccountsService.updateAccountingAccount(account)
        : await accountingAccountsService.createAccountingAccount(account);
      setAccounts(currentAccounts => {
        const exists = currentAccounts.some(item => item.id === account.id);
        return exists
          ? currentAccounts.map(item => (item.id === account.id ? savedAccount : item))
          : [savedAccount, ...currentAccounts];
      });
      setSuccessToastMessage(isBackendId(account.id) ? t.accountingAccounts.messages.updated : t.accountingAccounts.messages.created);
    } catch (error) {
      setAccounts(currentAccounts => {
        const exists = currentAccounts.some(item => item.id === account.id);
        return exists
          ? currentAccounts.map(item => (item.id === account.id ? account : item))
          : [account, ...currentAccounts];
      });
      setFailureToastMessage(toFinanceApiErrorMessage(error, t.accountingAccounts.messages.saveFailed));
    } finally {
      closeModal();
    }
  };

  const handleDeleteAccount = (accountId: string) => {
    const account = accounts.find(item => item.id === accountId);
    setAccounts(currentAccounts => currentAccounts.filter(item => item.id !== accountId));
    if (!account || !isBackendId(accountId)) return;

    accountingAccountsService.deleteAccountingAccount(accountId)
      .then(() => setSuccessToastMessage(t.accountingAccounts.messages.deleted))
      .catch(error => {
        setAccounts(currentAccounts => [account, ...currentAccounts]);
        setFailureToastMessage(toFinanceApiErrorMessage(error, t.accountingAccounts.messages.deleteFailed));
      });
  };

  return (
    <div className="space-y-6">
      <LoadingBarOverlay
        isVisible={isLoading}
        title={t.accountingAccounts.headerTitle}
        description={t.module.loadingFinanceDescription}
      />
      <AccountingAccountsHeaderBanner
        onAddAccount={() => setIsAddModalOpen(true)}
        onConfigureColumns={() => setIsColumnsModalOpen(true)}
        onImportCatalog={() => setIsCatalogImportOpen(true)}
      />

      <AccountingAccountsFilters
        filteredCount={filteredAccounts.length}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        onSearchChange={setSearchTerm}
        onStatusChange={setStatusFilter}
        onTypeChange={setTypeFilter}
      />
      <AccountingAccountsSummary accounts={filteredAccounts} />
      <AccountingAccountsTable
        accounts={filteredAccounts}
        businessOptions={businessOptions}
        columns={visibleColumns}
        onDelete={handleDeleteAccount}
        onEdit={(account) => {
          setEditingAccount(account);
          setIsAddModalOpen(true);
        }}
        sortDirection={sortDirection}
        sortField={sortField}
        unitOptions={unitOptions}
        onSort={handleSort}
        onToggleActive={handleToggleActive}
      />

      {isColumnsModalOpen && (
        <AccountingAccountColumnsModal
          columns={visibleColumns}
          onApply={() => setIsColumnsModalOpen(false)}
          onClose={() => setIsColumnsModalOpen(false)}
          onHideOptional={() => setVisibleColumns(currentColumns => currentColumns.map(column => ({ ...column, visible: Boolean(column.fixed) })))}
          onRestoreDefault={() => setVisibleColumns(translatedAccountingColumns.map(column => ({ ...column })))}
          onShowAll={() => setVisibleColumns(currentColumns => currentColumns.map(column => ({ ...column, visible: true })))}
          onToggleColumn={handleToggleColumn}
        />
      )}
      {isAddModalOpen && (
        <AccountingAccountModal
          account={editingAccount}
          businessOptions={businessOptions}
          unitOptions={unitOptions}
          onClose={closeModal}
          onSubmit={handleSaveAccount}
        />
      )}
      {isCatalogImportOpen && (
        <AccountingCatalogImportModal
          accounts={accounts}
          isImporting={isImportingCatalog}
          onClose={() => setIsCatalogImportOpen(false)}
          onImport={handleImportCatalogTemplates}
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
