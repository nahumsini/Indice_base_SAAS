import { useMemo, useState } from 'react';
import type { CommissionFiltersState, CommissionRecord } from '../types/commissions';
import { normalizeTextKey } from '../../utils/salesTextUtils';

export const initialCommissionFilters: CommissionFiltersState = {
  search: '',
  unit: 'all',
  business: 'all',
  period: 'all',
  salesRep: 'all',
  product: 'all',
  status: 'all',
};

function matchesFilter(value: string, filter: string) {
  return filter === 'all' || value === filter;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isWithinPeriod(value: string, period: CommissionFiltersState['period']) {
  if (period === 'all' || period === 'custom') return true;
  if (!value) return false;

  const createdDate = startOfDay(new Date(`${value}T00:00:00`));
  const today = startOfDay(new Date());

  if (period === 'today') {
    return createdDate.getTime() === today.getTime();
  }

  if (period === 'this_month') {
    return createdDate.getMonth() === today.getMonth() && createdDate.getFullYear() === today.getFullYear();
  }

  if (period === 'last_month') {
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return createdDate.getMonth() === lastMonth.getMonth() && createdDate.getFullYear() === lastMonth.getFullYear();
  }

  const dayOfWeek = today.getDay() || 7;
  const weekStart = startOfDay(new Date(today));
  weekStart.setDate(today.getDate() - dayOfWeek + 1);
  const weekEnd = startOfDay(new Date(weekStart));
  weekEnd.setDate(weekStart.getDate() + 6);

  return createdDate >= weekStart && createdDate <= weekEnd;
}

export function filterCommissionRecords(records: CommissionRecord[], filters: CommissionFiltersState) {
  const query = normalizeTextKey(filters.search);

  return records.filter((record) => {
    const searchable = normalizeTextKey([
      record.id,
      record.saleCode,
      record.customerName,
      record.salesRepName,
      record.productName,
      record.commissionRuleName,
      record.unitName,
      record.businessName,
    ].join(' '));

    return (!query || searchable.includes(query))
      && matchesFilter(record.unitId ?? '', filters.unit)
      && matchesFilter(record.businessId ?? '', filters.business)
      && isWithinPeriod(record.createdDate, filters.period)
      && matchesFilter(record.salesRepName, filters.salesRep)
      && matchesFilter(record.productId, filters.product)
      && matchesFilter(record.status, filters.status);
  });
}

export function useCommissionFilters(records: CommissionRecord[]) {
  const [filters, setFilters] = useState<CommissionFiltersState>(initialCommissionFilters);
  const filteredRecords = useMemo(() => filterCommissionRecords(records, filters), [filters, records]);

  return {
    filters,
    filteredRecords,
    setFilters,
  };
}
