import { Banknote, Building2, CreditCard } from 'lucide-react';
import type { FinanceLocale } from '../translations';
import type { PaymentAccount, PaymentSortField, SortDirection } from './types';

export const getTypeLabel = (type: string) => ({
  bank: 'Bank account',
  cash: 'Cash',
  credit_card: 'Credit card',
  debit_card: 'Debit card',
  digital_wallet: 'Digital wallet',
}[type] || type);

export const getTypeBadgeColor = (type: string) => ({
  bank: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  cash: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  credit_card: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  debit_card: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  digital_wallet: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
}[type] || 'bg-gray-100 text-gray-800');

export const getTypeIcon = (type: string) => {
  if (type === 'cash') return <Banknote className="w-4 h-4" />;
  if (type === 'credit_card' || type === 'debit_card' || type === 'digital_wallet') return <CreditCard className="w-4 h-4" />;
  return <Building2 className="w-4 h-4" />;
};

export const formatPaymentCurrency = (amount: number, currency: string, locale: FinanceLocale = 'en-CA') =>
  new Intl.NumberFormat(locale, { currency, style: 'currency' }).format(amount);

export const formatPaymentDate = (date: string, locale: FinanceLocale = 'en-CA') =>
  new Date(date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

export const filterPaymentAccounts = (
  accounts: PaymentAccount[],
  searchTerm: string,
  typeFilter: string,
  statusFilter: string,
) => {
  const search = searchTerm.toLowerCase();
  return accounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(search)
      || account.accountNumber?.toLowerCase().includes(search)
      || account.bank?.toLowerCase().includes(search)
      || account.custodian?.toLowerCase().includes(search);
    const matchesType = typeFilter === 'all' || account.type === typeFilter;
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'active' && account.isActive)
      || (statusFilter === 'inactive' && !account.isActive);
    return matchesSearch && matchesType && matchesStatus;
  });
};

export const sortPaymentAccounts = (
  accounts: PaymentAccount[],
  sortField: PaymentSortField | null,
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
      ? String(leftValue ?? '').localeCompare(String(rightValue ?? ''))
      : String(rightValue ?? '').localeCompare(String(leftValue ?? ''));
  });
};
