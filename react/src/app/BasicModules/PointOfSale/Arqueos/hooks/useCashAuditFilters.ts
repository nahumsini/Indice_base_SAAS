import { useState } from 'react';
import type { CashAuditFilters } from '../types/cashAudit.types';

const currentMonth = new Date().toISOString().slice(0, 7);

export const defaultCashAuditFilters: CashAuditFilters = {
  search: '',
  company: 'all',
  businessUnit: 'all',
  business: 'all',
  cashRegister: 'all',
  user: 'all',
  month: currentMonth,
  status: 'all',
};

export function useCashAuditFilters() {
  const [filters, setFilters] = useState<CashAuditFilters>(defaultCashAuditFilters);

  const setFilter = <Key extends keyof CashAuditFilters>(key: Key, value: CashAuditFilters[Key]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const resetFilters = () => setFilters(defaultCashAuditFilters);

  return {
    filters,
    setFilter,
    resetFilters,
  };
}
