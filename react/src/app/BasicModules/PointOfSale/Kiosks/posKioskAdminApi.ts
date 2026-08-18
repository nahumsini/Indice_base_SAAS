import { apiClient } from '../../../lib/apiClient';

export type PosKioskType = 'customer_display' | 'self_service' | 'self_checkout';
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
