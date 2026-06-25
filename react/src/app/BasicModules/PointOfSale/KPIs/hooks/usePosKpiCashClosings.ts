import { useCallback, useEffect, useMemo, useState } from 'react';
import { cashClosingsApi } from '../../shared/cashClosingsApi';
import type {
  PosCashClosingDetailResponse,
  PosCashClosingSummaryRow,
} from '../../shared/cashClosingHistory.types';
import { getDateRangeForPeriod, type PosKpiPeriod } from '../utils/posKpiAnalytics';

const KPI_LIST_LIMIT = 200;
const DETAIL_BREAKDOWN_LIMIT = 25;

interface PosKpiCashClosingState {
  rows: PosCashClosingSummaryRow[];
  details: PosCashClosingDetailResponse[];
  loading: boolean;
  error: string;
  detailError: string;
  detailFetchLimited: boolean;
  totalCount: number;
}

const initialState: PosKpiCashClosingState = {
  rows: [],
  details: [],
  loading: true,
  error: '',
  detailError: '',
  detailFetchLimited: false,
  totalCount: 0,
};

export function usePosKpiCashClosings(period: PosKpiPeriod) {
  const [state, setState] = useState<PosKpiCashClosingState>(initialState);
  const [reloadKey, setReloadKey] = useState(0);

  const filters = useMemo(() => ({
    ...getDateRangeForPeriod(period),
    limit: KPI_LIST_LIMIT,
    offset: 0,
  }), [period]);

  useEffect(() => {
    let isActive = true;

    const loadClosings = async () => {
      setState((current) => ({ ...current, loading: true, error: '', detailError: '' }));

      try {
        const response = await cashClosingsApi.list(filters);
        const rows = response.items ?? [];
        const shouldLoadDetails = rows.length > 0 && rows.length <= DETAIL_BREAKDOWN_LIMIT;
        let details: PosCashClosingDetailResponse[] = [];
        let detailError = '';

        if (shouldLoadDetails) {
          try {
            details = await Promise.all(rows.map((row) => cashClosingsApi.detail(row.id)));
          } catch (error) {
            detailError = error instanceof Error
              ? error.message
              : 'No fue posible cargar el desglose por metodo de pago.';
          }
        }

        if (!isActive) {
          return;
        }

        setState({
          rows,
          details,
          loading: false,
          error: '',
          detailError,
          detailFetchLimited: rows.length > DETAIL_BREAKDOWN_LIMIT,
          totalCount: response.count,
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setState({
          ...initialState,
          loading: false,
          error: error instanceof Error ? error.message : 'No fue posible cargar los KPIs de POS.',
        });
      }
    };

    loadClosings();

    return () => {
      isActive = false;
    };
  }, [filters.dateFrom, filters.dateTo, filters.limit, filters.offset, reloadKey]);

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  return {
    ...state,
    refresh,
  };
}
