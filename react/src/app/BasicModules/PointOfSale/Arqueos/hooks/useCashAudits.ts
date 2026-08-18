import { useCallback, useEffect, useMemo, useState } from 'react';
import { cashClosingsApi } from '../../shared/cashClosingsApi';
import type { CashClosingStatus } from '../../shared/cashClosing.types';
import type { PosCashClosingSummaryRow } from '../../shared/cashClosingHistory.types';
import type {
  CashAuditFilters,
  CashAuditKpis,
  CashAuditOptions,
  CashAuditRecord,
  CashAuditReviewStatus,
} from '../types/cashAudit.types';

const REVIEW_STORAGE_KEY = 'indice.pos.cashAuditReviews';
const POS_CLOSINGS_LIMIT = 200;

type StoredAuditReview = {
  auditNote?: string;
  auditStatus: CashAuditReviewStatus;
  reviewedAt?: string;
};

type StoredAuditReviews = Record<string, StoredAuditReview>;

const toNumber = (value: number | string | null | undefined) => Number(value ?? 0) || 0;

const byClosedAtDesc = (first: CashAuditRecord, second: CashAuditRecord) => (
  second.closedAt.getTime() - first.closedAt.getTime()
);

const uniq = (values: string[]) => Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));

const monthToDateRange = (month: string) => {
  if (month === 'all') {
    return {};
  }

  const [yearValue, monthValue] = month.split('-').map(Number);
  const lastDay = new Date(yearValue, monthValue, 0).getDate();

  return {
    dateFrom: `${month}-01`,
    dateTo: `${month}-${String(lastDay).padStart(2, '0')}`,
  };
};

const readStoredReviews = (): StoredAuditReviews => {
  try {
    const serialized = window.localStorage.getItem(REVIEW_STORAGE_KEY);
    return serialized ? JSON.parse(serialized) as StoredAuditReviews : {};
  } catch (error) {
    console.warn('Unable to read POS cash audit reviews', error);
    return {};
  }
};

const writeStoredReviews = (reviews: StoredAuditReviews) => {
  try {
    window.localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviews));
  } catch (error) {
    console.warn('Unable to save POS cash audit reviews', error);
  }
};

const resolveStatus = (difference: number): CashClosingStatus => {
  if (difference < 0) {
    return 'short';
  }
  if (difference > 0) {
    return 'over';
  }
  return 'balanced';
};

const mapClosingToAuditRecord = (
  row: PosCashClosingSummaryRow,
  reviews: StoredAuditReviews,
): CashAuditRecord => {
  const id = `COR-${row.id}`;
  const difference = toNumber(row.overShortAmount);
  const status = resolveStatus(difference);
  const storedReview = reviews[id];
  const auditStatus = storedReview?.auditStatus ?? (status === 'balanced' ? 'resolved' : 'pending');

  return {
    auditNote: storedReview?.auditNote,
    auditStatus,
    businessId: row.businessId == null ? '' : String(row.businessId),
    businessName: row.businessName ?? 'Sin negocio asignado',
    businessUnitId: row.unitId == null ? '' : String(row.unitId),
    businessUnitName: row.unitName ?? 'Sin unidad asignada',
    cardCounted: 0,
    cardExpected: 0,
    cashCounted: toNumber(row.countedCashAmount),
    cashExpected: toNumber(row.expectedCashAmount),
    cashRegisterCode: row.cashRegisterCode ?? `Caja ${row.cashRegisterId}`,
    cashRegisterId: String(row.cashRegisterId),
    cashRegisterName: row.cashRegisterName ?? `Caja ${row.cashRegisterId}`,
    companyId: 'current',
    companyName: row.companyName ?? 'Empresa actual',
    countedTotal: toNumber(row.countedCashAmount),
    difference,
    expectedTotal: toNumber(row.expectedCashAmount),
    id,
    openedAt: new Date(row.closedAt),
    openingFund: toNumber(row.openingCashAmount),
    requiresReview: status !== 'balanced' && auditStatus !== 'resolved',
    responsibleUserId: String(row.closedByUserId),
    responsibleUserName: row.closedByUserName ?? `Usuario ${row.closedByUserId}`,
    reviewedAt: storedReview?.reviewedAt ? new Date(storedReview.reviewedAt) : undefined,
    salesCount: row.ticketsCount,
    shiftId: String(row.shiftId),
    status,
    subtotalSales: toNumber(row.totalSalesAmount),
    taxSales: 0,
    totalMovements: 0,
    totalRefunds: 0,
    totalSales: toNumber(row.totalSalesAmount),
    transferCounted: 0,
    transferExpected: 0,
    warehouseId: String(row.warehouseId),
    warehouseName: row.warehouseName ?? `Almacén ${row.warehouseId}`,
    closedAt: new Date(row.closedAt),
  };
};

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
    record.auditNote ?? '',
    record.notes ?? '',
  ].some((value) => value.toLowerCase().includes(query));
};

export function useCashAudits(filters: CashAuditFilters) {
  const [records, setRecords] = useState<CashAuditRecord[]>([]);
  const [reviews, setReviews] = useState<StoredAuditReviews>(() => readStoredReviews());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    const loadCashClosings = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await cashClosingsApi.list({
          ...monthToDateRange(filters.month),
          limit: POS_CLOSINGS_LIMIT,
          offset: 0,
        });

        if (!isActive) {
          return;
        }

        setRecords(response.items.map((row) => mapClosingToAuditRecord(row, reviews)).sort(byClosedAtDesc));
      } catch (error) {
        if (!isActive) {
          return;
        }

        setRecords([]);
        setError(error instanceof Error ? error.message : 'No fue posible cargar los arqueos de POS.');
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadCashClosings();

    return () => {
      isActive = false;
    };
  }, [filters.month, reloadKey, reviews]);

  const filteredRecords = useMemo(() => records.filter((record) => {
    const focusMatch = filters.focus === 'all'
      || (filters.focus === 'attention' && record.auditStatus !== 'resolved')
      || (filters.focus === 'difference' && record.status !== 'balanced')
      || (filters.focus === 'reviewed' && record.auditStatus === 'resolved');

    return focusMatch
      && matchesText(record, filters.search)
      && (filters.company === 'all' || record.companyName === filters.company)
      && (filters.businessUnit === 'all' || record.businessUnitName === filters.businessUnit)
      && (filters.business === 'all' || record.businessName === filters.business)
      && (filters.cashRegister === 'all' || record.cashRegisterCode === filters.cashRegister)
      && (filters.user === 'all' || record.responsibleUserName === filters.user)
      && (filters.status === 'all' || record.status === filters.status)
      && (filters.reviewStatus === 'all' || record.auditStatus === filters.reviewStatus);
  }), [filters, records]);

  const options = useMemo<CashAuditOptions>(() => ({
    businesses: uniq(records.map((record) => record.businessName)),
    businessUnits: uniq(records.map((record) => record.businessUnitName)),
    cashRegisters: uniq(records.map((record) => record.cashRegisterCode)),
    companies: uniq(records.map((record) => record.companyName)),
    users: uniq(records.map((record) => record.responsibleUserName)),
  }), [records]);

  const kpis = useMemo<CashAuditKpis>(() => filteredRecords.reduce((acc, record) => ({
    balanced: acc.balanced + (record.status === 'balanced' ? 1 : 0),
    closings: acc.closings + 1,
    countedTotal: acc.countedTotal + record.countedTotal,
    expectedTotal: acc.expectedTotal + record.expectedTotal,
    inReview: acc.inReview + (record.auditStatus === 'in_review' ? 1 : 0),
    netDifference: acc.netDifference + record.difference,
    over: acc.over + (record.status === 'over' ? 1 : 0),
    pending: acc.pending + (record.auditStatus === 'pending' ? 1 : 0),
    requiresReview: acc.requiresReview + (record.requiresReview ? 1 : 0),
    resolved: acc.resolved + (record.auditStatus === 'resolved' ? 1 : 0),
    short: acc.short + (record.status === 'short' ? 1 : 0),
    totalSales: acc.totalSales + record.totalSales,
  }), {
    balanced: 0,
    closings: 0,
    countedTotal: 0,
    expectedTotal: 0,
    inReview: 0,
    netDifference: 0,
    over: 0,
    pending: 0,
    requiresReview: 0,
    resolved: 0,
    short: 0,
    totalSales: 0,
  }), [filteredRecords]);

  const refresh = useCallback(() => setReloadKey((current) => current + 1), []);

  const updateReview = useCallback((
    recordId: string,
    auditStatus: CashAuditReviewStatus,
    auditNote = '',
  ) => {
    setReviews((current) => {
      const reviewedAt = auditStatus === 'resolved' ? new Date().toISOString() : undefined;
      const next = {
        ...current,
        [recordId]: {
          auditNote,
          auditStatus,
          reviewedAt,
        },
      };
      writeStoredReviews(next);
      return next;
    });

    setRecords((current) => current.map((record) => (
      record.id === recordId
        ? {
          ...record,
          auditNote,
          auditStatus,
          requiresReview: record.status !== 'balanced' && auditStatus !== 'resolved',
          reviewedAt: auditStatus === 'resolved' ? new Date() : undefined,
        }
        : record
    )));
  }, []);

  return {
    error,
    kpis,
    loading,
    options,
    records: filteredRecords,
    refresh,
    updateReview,
  };
}
