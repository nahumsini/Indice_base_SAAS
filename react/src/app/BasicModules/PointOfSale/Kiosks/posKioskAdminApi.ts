import { apiClient } from '../../../lib/apiClient';

export type PosKioskType = 'customer_display' | 'self_service' | 'self_checkout' | 'waiter_station' | 'table_order_center' | 'kitchen_display';
export type PosKioskStatus = 'ACTIVE' | 'DISABLED' | 'REVOKED' | 'EXPIRED';
export type PosKioskConnectionStatus = 'ONLINE' | 'OFFLINE' | 'NEVER_CONNECTED';
export type PosKioskOperationalStatus = 'READY' | 'SOURCE_REGISTER_CLOSED' | 'SOURCE_REGISTER_UNASSIGNED';

export type PosKioskAssignment = {
  kind: 'CASH_REGISTER' | 'WAREHOUSE' | 'AREA' | 'OTHER';
  primaryLabel: string;
  secondaryLabel: string;
  unitId?: number;
  unitName?: string;
  businessId?: number;
  businessName?: string;
  warehouseId?: number;
  warehouseName?: string;
  cashRegisterId?: number;
  cashRegisterCode?: string;
  cashRegisterName?: string;
  ecosystemId?: number;
  ecosystemName?: string;
};

export type PosKioskAdminActions = {
  edit: boolean;
  access: boolean;
  copy: boolean;
  rotate: boolean;
  toggle: boolean;
  delete: boolean;
};

export type PosKioskAdminItem = {
  id: number;
  legacyReferenceId: number;
  kioskType: PosKioskType;
  name: string;
  code: string;
  status: PosKioskStatus;
  configurationStatus: 'CONFIGURED' | 'INCOMPLETE';
  assignment: PosKioskAssignment;
  connectionStatus: PosKioskConnectionStatus;
  sourceRegisterOpen?: boolean;
  operationalStatus?: PosKioskOperationalStatus;
  lastActivityAt?: string | null;
  expiresAt?: string | null;
  publicTokenHint: string;
  accessRecoverable: boolean;
  version: number;
  actions: PosKioskAdminActions;
};

export type PosKioskAccess = {
  kioskId: number;
  name: string;
  displayUrl: string;
  publicTokenHint: string;
};

export type SelfCheckoutCreatePayload = {
  name: string;
  warehouseId: number;
  catalogMode: 'all' | 'selected';
  productIds: string[];
  discountsEnabled: boolean;
  expiresAt: string | null;
  sessionTimeoutMinutes: number;
  supervisorExitRequired: boolean;
};

export type RestaurantKioskCreatePayload = {
  ecosystemId: number | null;
  cashRegisterId: number | null;
  name: string;
  ecosystemName?: string;
  areaName?: string;
  tableCount?: number;
  areaId?: number | null;
  kitchenStationCode?: string;
  expiresAt?: string | null;
};

export type RestaurantEcosystem = {
  id: number;
  code: string;
  name: string;
  unitId: number;
  businessId: number;
  warehouseId: number;
  warehouseName: string;
  cashRegisterId: number;
  cashRegisterName: string;
  cashRegisterCode: string;
  currencyCode: string;
  tableCount: number;
  kioskCount: number;
};

type EngineEnvelope<T> = {
  data: T;
  meta?: { requestId?: string };
};

const basePath = '/api/v2/point-of-sale/kiosks';

export const posKioskAdminApi = {
  async list() {
    const response = await apiClient<EngineEnvelope<{ items: PosKioskAdminItem[] }>>(basePath);
    return response.data.items;
  },

  async detail(kioskId: number) {
    const response = await apiClient<EngineEnvelope<PosKioskAdminItem>>(`${basePath}/${kioskId}`);
    return response.data;
  },

  async createSelfCheckout(payload: SelfCheckoutCreatePayload) {
    const response = await apiClient<EngineEnvelope<PosKioskAdminItem>>(
      `${basePath}?type=self_checkout`,
      { method: 'POST', body: JSON.stringify(payload) },
    );
    return response.data;
  },

  async createRestaurant(type: Extract<PosKioskType, 'waiter_station' | 'table_order_center' | 'kitchen_display'>, payload: RestaurantKioskCreatePayload) {
    const response = await apiClient<EngineEnvelope<PosKioskAdminItem>>(
      `${basePath}?type=${encodeURIComponent(type)}`,
      { method: 'POST', body: JSON.stringify(payload) },
    );
    return response.data;
  },

  async listRestaurantEcosystems() {
    const response = await apiClient<{ items: RestaurantEcosystem[] }>('/api/v1/pos/restaurant/ecosystems');
    return response.items;
  },

  async restaurantTrace(ecosystemId: number) {
    return apiClient<{
      ecosystem: RestaurantEcosystem;
      kiosks: PosKioskAdminItem[];
      orders: Array<Record<string, unknown>>;
      events: Array<Record<string, unknown>>;
    }>(`/api/v1/pos/restaurant/ecosystems/${ecosystemId}/trace`);
  },

  async access(kioskId: number) {
    const response = await apiClient<EngineEnvelope<PosKioskAccess>>(
      `${basePath}/${kioskId}/public-access`,
    );
    return response.data;
  },

  async update(kioskId: number, payload: Record<string, unknown>) {
    const response = await apiClient<EngineEnvelope<unknown>>(`${basePath}/${kioskId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async rotateAccess(kioskId: number) {
    const response = await apiClient<EngineEnvelope<PosKioskAccess>>(
      `${basePath}/${kioskId}/rotate-public-access-token`,
      { method: 'POST', body: JSON.stringify({}) },
    );
    return response.data;
  },

  async setEnabled(kioskId: number, enabled: boolean, reason = '') {
    const response = await apiClient<EngineEnvelope<PosKioskAdminItem>>(
      `${basePath}/${kioskId}/${enabled ? 'enable' : 'disable'}`,
      { method: 'POST', body: JSON.stringify({ reason }) },
    );
    return response.data;
  },

  async delete(kioskId: number, reason = '') {
    await apiClient<EngineEnvelope<{ deleted: boolean }>>(`${basePath}/${kioskId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  },
};
