import { useEffect, useMemo, useState } from 'react';
import { readStoredCashClosings } from '../../shared/cashClosingStorage';
import type { CashAuditFilters, CashAuditKpis, CashAuditOptions, CashAuditRecord } from '../types/cashAudit.types';

const byClosedAtDesc = (first: CashAuditRecord, second: CashAuditRecord) => (
  second.closedAt.getTime() - first.closedAt.getTime()
);

const uniq = (values: string[]) => Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));

const matchesText = (record: CashAuditRecord, search: string) => {
  const query = search.trim().toLowerCase();
  if (!query) {
    return true;
  }

  return [
    record.id,
    record.shiftId,
    record.companyName,
    record.businessUnitName,
    record.businessName,
    record.cashRegisterCode,
    record.cashRegisterName,
    record.responsibleUserName,
    record.notes ?? '',
  ].some((value) => value.toLowerCase().includes(query));
};

export function useCashAudits(filters: CashAuditFilters) {
  const [records, setRecords] = useState<CashAuditRecord[]>([]);

  useEffect(() => {
    setRecords(readStoredCashClosings().sort(byClosedAtDesc));
  }, []);

  const filteredRecords = useMemo(() => records.filter((record) => {
    const month = record.closedAt.toISOString().slice(0, 7);

    return matchesText(record, filters.search)
      && (filters.company === 'all' || record.companyName === filters.company)
      && (filters.businessUnit === 'all' || record.businessUnitName === filters.businessUnit)
      && (filters.business === 'all' || record.businessName === filters.business)
      && (filters.cashRegister === 'all' || record.cashRegisterCode === filters.cashRegister)
      && (filters.user === 'all' || record.responsibleUserName === filters.user)
      && (filters.month === 'all' || month === filters.month)
      && (filters.status === 'all' || record.status === filters.status);
  }), [filters, records]);

  const options = useMemo<CashAuditOptions>(() => ({
    companies: uniq(records.map((record) => record.companyName)),
    businessUnits: uniq(records.map((record) => record.businessUnitName)),
    businesses: uniq(records.map((record) => record.businessName)),
    cashRegisters: uniq(records.map((record) => record.cashRegisterCode)),
    users: uniq(records.map((record) => record.responsibleUserName)),
  }), [records]);

  const kpis = useMemo<CashAuditKpis>(() => filteredRecords.reduce((acc, record) => ({
    totalSales: acc.totalSales + record.totalSales,
    expectedTotal: acc.expectedTotal + record.expectedTotal,
    countedTotal: acc.countedTotal + record.countedTotal,
    netDifference: acc.netDifference + record.difference,
    closings: acc.closings + 1,
    balanced: acc.balanced + (record.status === 'balanced' ? 1 : 0),
    over: acc.over + (record.status === 'over' ? 1 : 0),
    short: acc.short + (record.status === 'short' ? 1 : 0),
  }), {
    totalSales: 0,
    expectedTotal: 0,
    countedTotal: 0,
    netDifference: 0,
    closings: 0,
    balanced: 0,
    over: 0,
    short: 0,
  }), [filteredRecords]);

  const refresh = () => {
    setRecords(readStoredCashClosings().sort(byClosedAtDesc));
  };

  return {
    records: filteredRecords,
    kpis,
    options,
    refresh,
  };
}
