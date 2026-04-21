import { apiClient } from '../../lib/apiClient';

const hrAssetsEndpoint = '/api/v1/hr/assets';

export type HrAssetStatus = 'available' | 'assigned' | 'maintenance' | 'custody' | 'inactive';

export interface HrAsset {
  id: number;
  asset_code: string;
  asset_type: string;
  name: string;
  model: string | null;
  serial_number: string | null;
  responsible_employee_id: number | null;
  responsible_name: string;
  responsible_email: string | null;
  unit_id: number | null;
  unit_name: string | null;
  status: HrAssetStatus;
  assigned_at: string | null;
  value_amount: number | null;
  notes: string | null;
  created_by_user_id: number | null;
  created_by_name: string | null;
  updated_by_user_id: number | null;
  updated_by_name: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface HrAssetsSummary {
  total_count: number;
  available_count: number;
  assigned_count: number;
  maintenance_count: number;
  custody_count: number;
  inactive_count: number;
  total_value_amount: number | null;
}

export interface HrAssetsListResponse {
  items: HrAsset[];
  count: number;
  page: number;
  size: number;
  total_count: number;
  total_pages: number;
  summary: HrAssetsSummary;
}

export interface HrAssetsListParams {
  search?: string;
  asset_type?: string;
  status?: HrAssetStatus;
  unit_id?: number;
  responsible_employee_id?: number;
  page?: number;
  size?: number;
}

export interface CreateHrAssetPayload {
  asset_code: string;
  asset_type: string;
  name: string;
  model?: string;
  serial_number?: string;
  responsible_employee_id?: number;
  unit_id?: number;
  status?: HrAssetStatus;
  assigned_date?: string;
  value?: string | number;
  notes?: string;
}

export interface UpdateHrAssetPayload {
  asset_code?: string;
  asset_type?: string;
  name?: string;
  model?: string | null;
  serial_number?: string | null;
  unit_id?: number | null;
  value?: string | number | null;
  notes?: string | null;
}

export interface ReassignHrAssetPayload {
  responsible_employee_id: number;
  unit_id?: number;
  status?: Extract<HrAssetStatus, 'assigned' | 'custody'>;
  assigned_date?: string;
  notes?: string;
}

export interface ChangeHrAssetStatusPayload {
  status: HrAssetStatus;
  unit_id?: number | null;
  notes?: string;
  change_reason?: string;
}

export interface HrAssetHistoryResponse {
  asset: HrAsset;
  assignment_history: Array<Record<string, unknown>>;
  status_history: Array<Record<string, unknown>>;
  timeline: Array<Record<string, unknown>>;
}

const buildQueryString = (params: HrAssetsListParams = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    query.set(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `${hrAssetsEndpoint}?${queryString}` : hrAssetsEndpoint;
};

export const hrAssetsApi = {
  listAssets(params: HrAssetsListParams = {}) {
    return apiClient<HrAssetsListResponse>(buildQueryString(params));
  },

  getAssetDetails(assetId: number) {
    return apiClient<HrAsset>(`${hrAssetsEndpoint}/${assetId}`);
  },

  createAsset(payload: CreateHrAssetPayload) {
    return apiClient<HrAsset>(hrAssetsEndpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateAsset(assetId: number, payload: UpdateHrAssetPayload) {
    return apiClient<HrAsset>(`${hrAssetsEndpoint}/${assetId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  reassignAsset(assetId: number, payload: ReassignHrAssetPayload) {
    return apiClient<HrAsset>(`${hrAssetsEndpoint}/${assetId}/reassign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  changeAssetStatus(assetId: number, payload: ChangeHrAssetStatusPayload) {
    return apiClient<HrAsset>(`${hrAssetsEndpoint}/${assetId}/status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getAssetHistory(assetId: number) {
    return apiClient<HrAssetHistoryResponse>(`${hrAssetsEndpoint}/${assetId}/history`);
  },
};
