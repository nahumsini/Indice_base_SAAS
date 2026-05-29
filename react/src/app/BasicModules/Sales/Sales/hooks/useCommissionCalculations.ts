import { useMemo } from 'react';
import type { SaleRecord } from '../types/salesTypes';
import type { CommissionOption, CommissionRule } from '../types/commissions';
import { calculateCommissionKpis, calculateCommissionRecords } from '../utils/commissionRules';
import { useCommissionFilters } from './useCommissionFilters';

function uniqueOptions(values: CommissionOption[]) {
  return values
    .filter((option) => option.id && option.name)
    .filter((option, index, items) => items.findIndex((item) => item.id === option.id) === index)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function useCommissionCalculations({
  sales,
  rules,
}: {
  sales: SaleRecord[];
  rules: CommissionRule[];
}) {
  const records = useMemo(() => calculateCommissionRecords(sales, rules), [rules, sales]);
  const { filters, filteredRecords, setFilters } = useCommissionFilters(records);
  const kpis = useMemo(() => calculateCommissionKpis(filteredRecords), [filteredRecords]);

  const units = useMemo(
    () => uniqueOptions(records.map((record) => ({ id: record.unitId ?? '', name: record.unitName ?? '' }))),
    [records],
  );
  const businesses = useMemo(
    () => uniqueOptions(records.map((record) => ({ id: record.businessId ?? '', name: record.businessName ?? '' }))),
    [records],
  );
  const salesReps = useMemo(
    () => Array.from(new Set(records.map((record) => record.salesRepName).filter(Boolean))).sort(),
    [records],
  );
  const products = useMemo(
    () => uniqueOptions(records.map((record) => ({ id: record.productId, name: record.productName }))),
    [records],
  );

  return {
    records,
    filteredRecords,
    filters,
    setFilters,
    kpis,
    units,
    businesses,
    salesReps,
    products,
  };
}
