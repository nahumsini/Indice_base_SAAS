import type { ProviderStatus } from './useProveedoresLogic';
import { providerStatusOptions } from './useProveedoresLogic';
import type { SortDirection } from './providerTableConfig';

export const compareProviderSortValues = (
  leftValue: unknown,
  rightValue: unknown,
  direction: Exclude<SortDirection, null>,
) => {
  const multiplier = direction === 'asc' ? 1 : -1;
  if (leftValue instanceof Date && rightValue instanceof Date) {
    return (leftValue.getTime() - rightValue.getTime()) * multiplier;
  }
  return String(leftValue ?? '').localeCompare(String(rightValue ?? '')) * multiplier;
};

export const getProviderStatusLabel = (status: ProviderStatus) => {
  return providerStatusOptions.find(option => option.value === status)?.label ?? status;
};

export const getProviderStatusClass = (status: ProviderStatus) => {
  if (status === 'active') {
    return 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/60 dark:text-green-300';
  }
  return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';
};
