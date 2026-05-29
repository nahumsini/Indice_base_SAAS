import { useMemo, useState } from 'react';
import { salesMockData } from '../data/salesMockData';
import type { SaleRecord, SaleRecordDraft, SalesColumnId, SalesFiltersState } from '../types/salesTypes';
import { normalizeTextKey } from '../../utils/salesTextUtils';
import { calculateCommissionAmount } from '../utils/salesFormatters';
import { calculateSalesMetrics } from '../utils/salesMetrics';
import { defaultVisibleSalesColumns } from '../utils/salesStatuses';

const initialFilters: SalesFiltersState = {
  search: '',
  businessUnit: 'all',
  business: 'all',
  period: 'all',
  seller: 'all',
  customer: 'all',
  commercialStatus: 'all',
  financeStatus: 'all',
  inventoryStatus: 'all',
  inventoryMovementStatus: 'all',
  commissionStatus: 'all',
};

function matchesFilter(value: string, filter: string) {
  return filter === 'all' || value === filter;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isWithinSelectedPeriod(value: string, period: SalesFiltersState['period']) {
  if (period === 'all' || period === 'custom') return true;
  if (!value) return false;

  const saleDate = startOfDay(new Date(`${value}T00:00:00`));
  const today = startOfDay(new Date());

  if (period === 'today') {
    return saleDate.getTime() === today.getTime();
  }

  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  if (period === 'this_month') {
    return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
  }

  if (period === 'last_month') {
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return saleDate.getMonth() === lastMonth.getMonth() && saleDate.getFullYear() === lastMonth.getFullYear();
  }

  const dayOfWeek = today.getDay() || 7;
  const weekStart = startOfDay(new Date(today));
  weekStart.setDate(today.getDate() - dayOfWeek + 1);
  const weekEnd = startOfDay(new Date(weekStart));
  weekEnd.setDate(weekStart.getDate() + 6);

  return saleDate >= weekStart && saleDate <= weekEnd;
}

function filterSalesRecords(records: SaleRecord[], filters: SalesFiltersState) {
  const query = normalizeTextKey(filters.search);

  return records.filter((record) => {
    const searchable = normalizeTextKey([
      record.saleNumber,
      record.quoteReference,
      record.customerName,
      record.sellerName,
      record.paymentReference,
      record.businessUnitName,
      record.businessName,
      record.inventoryMovementReference,
      record.notes,
    ].join(' '));

    return (!query || searchable.includes(query))
      && matchesFilter(record.businessUnitId ?? '', filters.businessUnit)
      && matchesFilter(record.businessId ?? '', filters.business)
      && isWithinSelectedPeriod(record.saleDate, filters.period)
      && matchesFilter(record.sellerName, filters.seller)
      && matchesFilter(record.customerName, filters.customer)
      && matchesFilter(record.commercialStatus, filters.commercialStatus)
      && matchesFilter(record.financeStatus, filters.financeStatus)
      && matchesFilter(record.inventoryStatus, filters.inventoryStatus)
      && matchesFilter(record.inventoryMovementStatus, filters.inventoryMovementStatus)
      && matchesFilter(record.commissionStatus, filters.commissionStatus);
  });
}

function uniqueOptions(values: string[]) {
  return values
    .filter(Boolean)
    .filter((value, index, items) => items.findIndex((item) => normalizeTextKey(item) === normalizeTextKey(value)) === index)
    .sort((left, right) => left.localeCompare(right));
}

function uniqueBusinessUnits(records: SaleRecord[]) {
  return records
    .filter((record) => record.businessUnitId && record.businessUnitName)
    .map((record) => ({ id: record.businessUnitId ?? '', name: record.businessUnitName ?? '' }))
    .filter((unit, index, items) => items.findIndex((item) => item.id === unit.id) === index)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function uniqueBusinesses(records: SaleRecord[]) {
  return records
    .filter((record) => record.businessId && record.businessName)
    .map((record) => ({
      id: record.businessId ?? '',
      name: record.businessName ?? '',
      businessUnitId: record.businessUnitId ?? '',
    }))
    .filter((business, index, items) => items.findIndex((item) => item.id === business.id) === index)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function useSalesRecords() {
  const [records, setRecords] = useState<SaleRecord[]>(salesMockData);
  const [filters, setFilters] = useState<SalesFiltersState>(initialFilters);
  const [visibleColumns, setVisibleColumns] = useState<SalesColumnId[]>(defaultVisibleSalesColumns);

  const filteredRecords = useMemo(
    () => filterSalesRecords(records, filters),
    [filters, records],
  );

  const metrics = useMemo(() => calculateSalesMetrics(filteredRecords), [filteredRecords]);
  const sellers = useMemo(() => uniqueOptions(records.map((record) => record.sellerName)), [records]);
  const customers = useMemo(() => uniqueOptions(records.map((record) => record.customerName)), [records]);
  const businessUnits = useMemo(() => uniqueBusinessUnits(records), [records]);
  const businesses = useMemo(() => uniqueBusinesses(records), [records]);

  const createSaleRecord = (draft: SaleRecordDraft) => {
    setRecords((current) => {
      const nextIndex = current.length + 1;
      const totalAmount = Number(draft.totalAmount) || 0;
      const commissionRate = Number(draft.commissionRate) || 0;
      const createdRecord: SaleRecord = {
        ...draft,
        id: `SAL-${String(nextIndex).padStart(3, '0')}`,
        saleNumber: draft.saleNumber || `SALE-2026-${String(nextIndex).padStart(3, '0')}`,
        saleDocumentReference: draft.saleDocumentReference || `SALE-SUM-2026-${String(nextIndex).padStart(3, '0')}`,
        totalAmount,
        commissionRate,
        commissionAmount: draft.commissionAmount ?? calculateCommissionAmount(totalAmount, commissionRate),
      };

      return [createdRecord, ...current];
    });
  };

  const updateSaleRecord = (saleId: string, patch: Partial<SaleRecord>) => {
    setRecords((current) => current.map((record) => (
      record.id === saleId ? { ...record, ...patch } : record
    )));
  };

  return {
    records,
    filteredRecords,
    metrics,
    filters,
    setFilters,
    visibleColumns,
    setVisibleColumns,
    sellers,
    customers,
    businessUnits,
    businesses,
    createSaleRecord,
    updateSaleRecord,
  };
}
