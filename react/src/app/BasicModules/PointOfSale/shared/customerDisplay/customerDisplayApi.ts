import { apiClient } from '../../../../lib/apiClient';

const basePath = '/api/v1/pos/customer-displays';

export type CustomerDisplayStatus = 'IDLE' | 'ACTIVE' | 'READY_TO_PAY' | 'PAID' | 'CLOSED';

export type CustomerDisplayItem = {
  productName: string;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotalAmount: number;
};

export type CustomerDisplayPayment = {
  paymentMethod: string;
  amount: number;
};

type CustomerDisplayPairingCodeWireResponse = {
  deviceId: number;
  cashRegisterId: number;
  cashRegisterCode: string;
  cashRegisterName: string;
  pairingCode: string;
  pairingCodeExpiresAt?: string | null;
  deviceToken: string;
  displayUrl: string;
  pairingUrl: string;
};

export type CustomerDisplayPairingCodeResponse = Omit<CustomerDisplayPairingCodeWireResponse, 'deviceToken'>;

type CustomerDisplayPairWireResponse = {
  deviceToken: string;
  displayUrl: string;
  cashRegisterId: number;
  cashRegisterCode: string;
  cashRegisterName: string;
};

export type CustomerDisplayPairResponse = Omit<CustomerDisplayPairWireResponse, 'deviceToken'>;

export type CustomerDisplayPairingBootstrap = {
  csrfToken: string;
  status: 'READY';
  onlineOnly: boolean;
  pairingCodeLength: number;
};

export type CustomerDisplayAdminItem = {
  id: number;
  deviceId: number;
  kioskType: 'customer_display';
  name: string;
  code: string;
  status: 'ACTIVE' | 'DISABLED' | 'EXPIRED' | 'REVOKED';
  accessLevel: 'PUBLIC';
  unitId?: number | null;
  businessId?: number | null;
  cashRegisterId: number;
  cashRegisterCode: string;
  cashRegisterName: string;
  publicTokenHint: string;
  pairedAt?: string | null;
  lastSeenAt?: string | null;
  connected: boolean;
  configurationVersion: number;
};

type KioskV2Response<T> = {
  data: T;
  meta: { requestId: string };
};

export type CustomerDisplaySnapshotPayload = {
  cashRegisterId: number;
  shiftId: number;
  status: CustomerDisplayStatus;
  currencyCode: string;
  items: CustomerDisplayItem[];
  payments: CustomerDisplayPayment[];
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  balanceAmount: number;
  ticketNumber?: string | null;
  customerMessage?: string | null;
};

export type CustomerDisplayStateResponse = {
  kioskName: string;
  companyName: string;
  unitName: string;
  businessName: string;
  warehouseName: string;
  cashRegisterId: number;
  cashRegisterCode: string;
  cashRegisterName: string;
  status: CustomerDisplayStatus;
  currencyCode: string;
  itemCount: number;
  subtotalAmount: number | string;
  discountAmount: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  paidAmount: number | string;
  changeAmount: number | string;
  balanceAmount: number | string;
  ticketNumber?: string | null;
  customerMessage?: string | null;
  items?: CustomerDisplayItem[] | null;
  payments?: CustomerDisplayPayment[] | null;
  updatedAt?: string | null;
  connected: boolean;
};

export const customerDisplayApi = {
  async createPairingCode(
    payload: { cashRegisterId: number; deviceName?: string },
  ): Promise<CustomerDisplayPairingCodeResponse> {
    const response = await apiClient<CustomerDisplayPairingCodeWireResponse>(`${basePath}/pairing-code`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return {
      deviceId: response.deviceId,
      cashRegisterId: response.cashRegisterId,
      cashRegisterCode: response.cashRegisterCode,
      cashRegisterName: response.cashRegisterName,
      pairingCode: response.pairingCode,
      pairingCodeExpiresAt: response.pairingCodeExpiresAt,
      displayUrl: response.displayUrl,
      pairingUrl: response.pairingUrl,
    };
  },
  publishState(payload: CustomerDisplaySnapshotPayload) {
    return apiClient<CustomerDisplayStateResponse>(`${basePath}/state`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  pairingBootstrap() {
    return apiClient<CustomerDisplayPairingBootstrap>(`${basePath}/public/pairing-bootstrap`);
  },
  async pair(
    payload: { pairingCode: string; deviceName?: string },
    idempotencyKey: string,
  ): Promise<CustomerDisplayPairResponse> {
    const response = await apiClient<CustomerDisplayPairWireResponse>(`${basePath}/public/pair`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payload),
    });
    return {
      displayUrl: response.displayUrl,
      cashRegisterId: response.cashRegisterId,
      cashRegisterCode: response.cashRegisterCode,
      cashRegisterName: response.cashRegisterName,
    };
  },
  getState(deviceToken: string, signal?: AbortSignal) {
    return apiClient<CustomerDisplayStateResponse>(
      `${basePath}/public/${encodeURIComponent(deviceToken)}/state`,
      { signal },
    );
  },
  async listAdmin() {
    const response = await apiClient<KioskV2Response<{ items: CustomerDisplayAdminItem[] }>>(
      '/api/v2/point-of-sale/kiosks?type=customer_display',
    );
    return response.data.items;
  },
  async updateAdmin(kioskId: number, payload: { name: string }) {
    const response = await apiClient<KioskV2Response<CustomerDisplayAdminItem>>(
      `/api/v2/point-of-sale/kiosks/${kioskId}`,
      { method: 'PUT', body: JSON.stringify(payload) },
    );
    return response.data;
  },
  async transitionAdmin(kioskId: number, action: 'disable' | 'enable' | 'revoke', reason?: string) {
    const response = await apiClient<KioskV2Response<CustomerDisplayAdminItem>>(
      `/api/v2/point-of-sale/kiosks/${kioskId}/${action}`,
      { method: 'POST', body: JSON.stringify({ reason: reason ?? '' }) },
    );
    return response.data;
  },
  async deleteAdmin(kioskId: number, reason?: string) {
    await apiClient<KioskV2Response<{ deleted: boolean }>>(
      `/api/v2/point-of-sale/kiosks/${kioskId}`,
      { method: 'DELETE', body: JSON.stringify({ reason: reason ?? '' }) },
    );
  },
};
