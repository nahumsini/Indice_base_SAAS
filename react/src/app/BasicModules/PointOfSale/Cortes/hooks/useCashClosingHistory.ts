import { useCallback, useEffect, useState } from 'react';
import { cashClosingsApi } from '../services/cashClosingsApi';
import type {
  PosCashClosingDetailResponse,
  PosCashClosingFilters,
  PosCashClosingSummaryRow,
} from '../types/cashClosingHistory.types';

interface UseCashClosingHistoryState {
  rows: PosCashClosingSummaryRow[];
  details: PosCashClosingDetailResponse[];
  selectedDetail: PosCashClosingDetailResponse | null;
  loading: boolean;
  error: string;
  detailLoading: boolean;
  detailError: string;
  totalCount: number;
  limit: number;
  offset: number;
}

const initialState: UseCashClosingHistoryState = {
  rows: [],
  details: [],
  selectedDetail: null,
  loading: true,
  error: '',
  detailLoading: false,
  detailError: '',
  totalCount: 0,
  limit: 50,
  offset: 0,
};

const sortByClosedAtDesc = <T extends { closedAt: string }>(items: T[]) => (
  [...items].sort((first, second) => (
    new Date(second.closedAt).getTime() - new Date(first.closedAt).getTime()
  ))
);

export function useCashClosingHistory(filters: PosCashClosingFilters) {
  const [state, setState] = useState<UseCashClosingHistoryState>(initialState);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    const loadClosings = async () => {
      setState((current) => ({ ...current, loading: true, error: '', detailError: '' }));

      try {
        const response = await cashClosingsApi.list(filters);
        const rows = sortByClosedAtDesc(response.items);
        if (!isActive) {
          return;
        }

        setState({
          rows,
          details: [],
          selectedDetail: null,
          loading: false,
          error: '',
          detailLoading: false,
          detailError: '',
          totalCount: response.count,
          limit: response.limit,
          offset: response.offset,
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setState((current) => ({
          ...current,
          rows: [],
          details: [],
          selectedDetail: null,
          loading: false,
          error: error instanceof Error ? error.message : 'No fue posible cargar los cortes de caja.',
        }));
      }
    };

    loadClosings();

    return () => {
      isActive = false;
    };
  }, [
    filters.cashRegisterId,
    filters.dateFrom,
    filters.dateTo,
    filters.limit,
    filters.offset,
    filters.shiftId,
    filters.userId,
    filters.warehouseId,
    reloadKey,
  ]);

  const selectDetail = useCallback(async (closingId: number | string) => {
    const cached = state.details.find((detail) => String(detail.id) === String(closingId));
    if (cached) {
      setState((current) => ({ ...current, selectedDetail: cached, detailError: '' }));
      return;
    }

    setState((current) => ({ ...current, detailLoading: true, detailError: '' }));

    try {
      const detail = await cashClosingsApi.detail(closingId);
      setState((current) => ({
        ...current,
        details: sortByClosedAtDesc([...current.details, detail]),
        selectedDetail: detail,
        detailLoading: false,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        detailLoading: false,
        detailError: error instanceof Error ? error.message : 'No fue posible abrir el detalle del corte.',
      }));
    }
  }, [state.details]);

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  const clearSelectedDetail = useCallback(() => {
    setState((current) => ({ ...current, selectedDetail: null, detailError: '' }));
  }, []);

  return {
    ...state,
    clearSelectedDetail,
    refresh,
    selectDetail,
  };
}
