import type { AccountingAccount, AccountingAccountType, AccountingSortField, SortDirection } from './types';
import { defaultBusinessCurrency, formatBusinessCurrencyAmount } from '../../shared/businessCurrency';

export const typeOptions: Array<{ value: AccountingAccountType; label: string }> = [
  { value: 'asset', label: 'Activo' },
  { value: 'liability', label: 'Pasivo' },
  { value: 'equity', label: 'Capital' },
  { value: 'income', label: 'Ingreso' },
  { value: 'expense', label: 'Gasto' },
];

export const getTypeLabel = (type: string) => typeOptions.find(option => option.value === type)?.label ?? type;

export const getTypeBadgeColor = (type: string) => ({
  asset: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  liability: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  equity: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  income: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  expense: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
}[type] || 'bg-gray-100 text-gray-800');

export const formatAccountingCurrency = (amount: number) =>
  formatBusinessCurrencyAmount(amount, defaultBusinessCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const filterAccountingAccounts = (
  accounts: AccountingAccount[],
  searchTerm: string,
  typeFilter: string,
  statusFilter: string,
) => {
  const search = searchTerm.toLowerCase();
  return accounts.filter(account => {
    const matchesSearch = account.code.toLowerCase().includes(search)
      || account.name.toLowerCase().includes(search)
      || account.description?.toLowerCase().includes(search);
    const matchesType = typeFilter === 'all' || account.type === typeFilter;
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'active' && account.isActive)
      || (statusFilter === 'inactive' && !account.isActive);
    return matchesSearch && matchesType && matchesStatus;
  });
};

export const sortAccountingAccounts = (
  accounts: AccountingAccount[],
  sortField: AccountingSortField | null,
  sortDirection: SortDirection,
) => {
  if (!sortField || !sortDirection) return accounts;
  return [...accounts].sort((left, right) => {
    const leftValue = left[sortField];
    const rightValue = right[sortField];
    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return sortDirection === 'asc' ? leftValue - rightValue : rightValue - leftValue;
    }
    return sortDirection === 'asc'
      ? String(leftValue).localeCompare(String(rightValue))
      : String(rightValue).localeCompare(String(leftValue));
  });
};
