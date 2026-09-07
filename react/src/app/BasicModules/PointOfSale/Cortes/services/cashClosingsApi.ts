import { apiClient } from '../../../../lib/apiClient';
import type {
  PosCashClosingDetailResponse,
  PosCashClosingFilters,
  PosCashClosingListResponse,
  PosCashClosingSettlement,
} from '../types/cashClosingHistory.types';

const posBasePath = '/api/v1/pos';

const appendParam = (params: URLSearchParams, key: string, value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return;
  }

  params.set(key, String(value));
};

export const cashClosingsApi = {
  list(filters: PosCashClosingFilters = {}) {
    const params = new URLSearchParams();
    appendParam(params, 'dateFrom', filters.dateFrom);
    appendParam(params, 'dateTo', filters.dateTo);
    appendParam(params, 'cashRegisterId', filters.cashRegisterId);
    appendParam(params, 'warehouseId', filters.warehouseId);
    appendParam(params, 'shiftId', filters.shiftId);
    appendParam(params, 'userId', filters.userId);
    appendParam(params, 'search', filters.search);
    appendParam(params, 'limit', filters.limit ?? 50);
    appendParam(params, 'offset', filters.offset ?? 0);

    return apiClient<PosCashClosingListResponse>(`${posBasePath}/cash-closings?${params.toString()}`);
  },

  detail(closingId: number | string) {
    return apiClient<PosCashClosingDetailResponse>(
      `${posBasePath}/cash-closings/${encodeURIComponent(String(closingId))}`,
    );
  },

  settlements(closingId: number | string) {
    return apiClient<PosCashClosingSettlement[]>(
      `${posBasePath}/cash-closings/${encodeURIComponent(String(closingId))}/settlements`,
    );
  },

  confirmSettlement(
    closingId: number | string,
    settlementId: number | string,
    payload: { receivedAmount: number; note?: string },
  ) {
    return apiClient<PosCashClosingSettlement>(
      `${posBasePath}/cash-closings/${encodeURIComponent(String(closingId))}/settlements/${encodeURIComponent(String(settlementId))}/confirm`,
      { method: 'POST', body: JSON.stringify(payload) },
    );
  },
};
