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

export type CustomerDisplayPairingCodeResponse = {
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

export type CustomerDisplayPairResponse = {
  deviceToken: string;
  displayUrl: string;
  cashRegisterId: number;
  cashRegisterCode: string;
  cashRegisterName: string;
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
  deviceToken: string;
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
  createPairingCode(payload: { cashRegisterId: number; deviceName?: string }) {
    return apiClient<CustomerDisplayPairingCodeResponse>(`${basePath}/pairing-code`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  publishState(payload: CustomerDisplaySnapshotPayload) {
    return apiClient<CustomerDisplayStateResponse>(`${basePath}/state`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  pair(payload: { pairingCode: string; deviceName?: string }) {
    return apiClient<CustomerDisplayPairResponse>(`${basePath}/public/pair`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getState(deviceToken: string) {
    return apiClient<CustomerDisplayStateResponse>(`${basePath}/public/${encodeURIComponent(deviceToken)}/state`);
  },
};
