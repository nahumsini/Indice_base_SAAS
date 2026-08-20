import { useCallback, useEffect, useMemo, useState } from 'react';
import { cashClosingsApi } from '../../shared/cashClosingsApi';
import type {
  PosCashClosingFilters,
  PosCashClosingSummaryRow,
} from '../../shared/cashClosingHistory.types';
import {
  getPreviousDateRange,
  type PosKpiFiltersState,
} from '../utils/posKpiAnalytics';

const PAGE_LIMIT = 200;
const MAX_ANALYTIC_ROWS = 10_000;

interface PosKpiCashClosingState {
  rows: PosCashClosingSummaryRow[];
  previousRows: PosCashClosingSummaryRow[];
  loading: boolean;
  error: string;
  totalCount: number;
  previousTotalCount: number;
  partial: boolean;
}

const initialState: PosKpiCashClosingState = {
  rows: [],
  previousRows: [],
  loading: true,
  error: '',
  totalCount: 0,
  previousTotalCount: 0,
  partial: false,
};

async function loadAllClosings(filters: PosCashClosingFilters) {
  const first = await cashClosingsApi.list({ ...filters, limit: PAGE_LIMIT, offset: 0 });
  const rows = [...(first.items ?? [])];
  const target = Math.min(first.count, MAX_ANALYTIC_ROWS);

  while (rows.length < target) {
    const response = await cashClosingsApi.list({
      ...filters,
      limit: PAGE_LIMIT,
      offset: rows.length,
    });
    const items = response.items ?? [];
    if (items.length === 0) break;
    rows.push(...items);
  }

  return {
    rows: rows.slice(0, MAX_ANALYTIC_ROWS),
    totalCount: first.count,
    partial: first.count > MAX_ANALYTIC_ROWS,
  };
}

export function usePosKpiCashClosings(filters: PosKpiFiltersState) {
  const [state, setState] = useState<PosKpiCashClosingState>(initialState);
  const [reloadKey, setReloadKey] = useState(0);

  const currentFilters = useMemo<PosCashClosingFilters>(() => ({
    cashRegisterId: filters.cashRegisterId || undefined,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    search: filters.search || undefined,
    userId: filters.userId || undefined,
    warehouseId: filters.warehouseId || undefined,
  }), [
    filters.cashRegisterId,
    filters.dateFrom,
    filters.dateTo,
    filters.search,
    filters.userId,
    filters.warehouseId,
  ]);

  const previousFilters = useMemo<PosCashClosingFilters>(() => ({
    ...currentFilters,
    ...getPreviousDateRange(filters.dateFrom, filters.dateTo),
  }), [currentFilters, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    let isActive = true;

    const loadClosings = async () => {
      setState((current) => ({ ...current, loading: true, error: '' }));

      try {
        const [current, previous] = await Promise.all([
          loadAllClosings(currentFilters),
          loadAllClosings(previousFilters),
        ]);

        if (!isActive) return;

        setState({
          rows: current.rows,
          previousRows: previous.rows,
          loading: false,
          error: '',
          totalCount: current.totalCount,
          previousTotalCount: previous.totalCount,
          partial: current.partial || previous.partial,
        });
      } catch (error) {
        if (!isActive) return;
        setState({
          ...initialState,
          loading: false,
          error: error instanceof Error ? error.message : 'No fue posible cargar los KPIs de POS.',
        });
      }
    };

    void loadClosings();
    return () => {
      isActive = false;
    };
  }, [currentFilters, previousFilters, reloadKey]);

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  return {
    ...state,
    refresh,
  };
}
