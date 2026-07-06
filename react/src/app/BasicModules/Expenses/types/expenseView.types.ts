import type { ExpenseStatus } from './expenses.types';

export type PeriodFilter =
  | 'this_month'
  | 'last_month'
  | 'two_months_ago'
  | 'this_year'
  | 'last_year'
  | 'custom';

export type ExpenseListFilters = {
  searchTerm: string;
  periodFilter: PeriodFilter;
  businessUnitFilter: string;
  businessFilter: string;
  providerFilter: string;
  statusFilter: ExpenseStatus | 'all' | 'pending_and_overdue';
};

export type ExpenseTotals = {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  overdueCount: number;
};

export type ColumnConfig = {
  key: string;
  label: string;
  visible: boolean;
  fixed?: boolean;
};
