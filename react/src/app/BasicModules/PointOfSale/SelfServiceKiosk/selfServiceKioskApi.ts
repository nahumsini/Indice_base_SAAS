import { apiClient } from '../../../lib/apiClient';
import type { DiscountRuleWire } from '../shared/commercial/discounts/services/discountRulesApi';

export type SelfServiceCatalogItem = {
  productId: number;
  sku?: string | null;
  name: string;
  description?: string | null;
  category?: string | null;
  unitPrice: number | string;
  currencyCode: string;
  availableQuantity?: number | string | null;
  stockTracked: boolean;
  available: boolean;
};

export type SelfServiceBootstrap = {
  code: string;
  name: string;
  companyName: string;
  unitName: string;
  businessName: string;
  warehouseName: string;
  cashRegisterName: string;
  currencyCode: string;
  showStock: boolean;
  customerNameRequired: boolean;
  maxItemsPerTicket: number;
  preticketTtlMinutes: number;
  fulfillmentPolicy: 'PRETICKET_REQUIRES_CASHIER_CONFIRMATION' | 'SELF_CHECKOUT_PAYMENT_REQUIRED';
  items: SelfServiceCatalogItem[];
  csrfToken: string;
  kioskType: 'self_service' | 'self_checkout';
  availabilityState: 'READY' | 'SOURCE_REGISTER_CLOSED';
  sourceRegisterOpen: boolean;
  discountRules: DiscountRuleWire[];
};

export type SelfServicePreticket = {
  id: number;
  kioskId: number;
  cashRegisterId: number;
  cashRegisterName: string;
  preticketNumber: string;
  claimCode: string;
  status: 'PENDING' | 'CLAIMED' | 'CANCELLED' | 'EXPIRED';
  currencyCode: string;
  customerName?: string | null;
  itemCount: number;
  subtotalAmount: number | string;
  discountAmount: number | string;
  discountRuleId?: number | null;
  totalAmount: number | string;
  expiresAt: string;
  createdAt: string;
  items: Array<{
    productId: number;
    sku?: string | null;
    productName: string;
    quantity: number | string;
    unitPrice: number | string;
    discountAmount: number | string;
    discountRuleId?: number | null;
    lineTotal: number | string;
  }>;
};

// The anonymous channel only receives the values needed to present its
// hand-off receipt. Internal row ids, customer data, register ids and line
// snapshots remain exclusive to the authenticated POS queue.
export type SelfServicePreticketReceipt = {
  preticketNumber: string;
  claimCode: string;
  status: 'PENDING';
  currencyCode: string;
  itemCount: number;
  discountAmount: number | string;
  totalAmount: number | string;
  expiresAt: string;
};

export type SelfServiceKioskAdmin = {
  id: number;
  companyId: number;
  companyName: string;
  unitId?: number | null;
  unitName?: string | null;
  businessId?: number | null;
  businessName?: string | null;
  warehouseId: number;
  warehouseName: string;
  cashRegisterId: number;
  cashRegisterCode: string;
  cashRegisterName: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'DISABLED' | 'REVOKED' | 'EXPIRED';
  expiresAt?: string | null;
  publicTokenHint: string;
  publicToken?: string | null;
  publicUrl?: string | null;
  showStock: boolean;
  customerNameRequired: boolean;
  maxItemsPerTicket: number;
  preticketTtlMinutes: number;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type PosCashRegisterOption = {
  id: number;
  code: string;
  name: string;
  status: string;
  active: boolean;
  unitId?: number | null;
  businessId?: number | null;
  warehouseId: number;
  warehouseName: string;
};

type EngineEnvelope<T> = {
  data: T;
  meta?: { requestId?: string };
};

type CollectionEnvelope<T> = {
  content?: T[];
  data?: T[];
  items?: T[];
  rows?: T[];
};

function collectionFromResponse<T>(response: T[] | CollectionEnvelope<T>): T[] {
  if (Array.isArray(response)) return response;
  return response.items ?? response.data ?? response.rows ?? response.content ?? [];
}

const adminPath = '/api/v1/pos/self-service-kiosks';

export const selfServiceKioskApi = {
  async bootstrap(token: string) {
    const response = await apiClient<EngineEnvelope<SelfServiceBootstrap>>(
      `/api/v2/kiosks/public/${encodeURIComponent(token)}/bootstrap`,
    );
    return response.data;
  },

  async createPreticket(
    token: string,
    csrfToken: string,
    payload: {
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      items: Array<{ productId: number; quantity: number }>;
    },
    idempotencyKey: string,
  ) {
    const response = await apiClient<EngineEnvelope<SelfServicePreticketReceipt>>(
      `/api/v2/kiosks/public/${encodeURIComponent(token)}/actions/pos.self-service.preticket.create@1`,
      {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      },
    );
    return response.data;
  },

  listAdmin() {
    return apiClient<SelfServiceKioskAdmin[]>(adminPath);
  },

  async listCashRegisters() {
    const response = await apiClient<PosCashRegisterOption[] | CollectionEnvelope<PosCashRegisterOption>>(
      '/api/v1/pos/cash-registers',
    );
    return collectionFromResponse(response);
  },

  createAdmin(payload: {
    cashRegisterId: number;
    name: string;
    code?: string;
    expiresAt?: string | null;
    showStock: boolean;
    customerNameRequired: boolean;
    maxItemsPerTicket: number;
    preticketTtlMinutes: number;
  }) {
    return apiClient<SelfServiceKioskAdmin>(adminPath, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateAdmin(kiosk: SelfServiceKioskAdmin, payload: {
    name: string;
    expiresAt?: string | null;
    showStock: boolean;
    customerNameRequired: boolean;
    maxItemsPerTicket: number;
    preticketTtlMinutes: number;
  }) {
    return apiClient<SelfServiceKioskAdmin>(`${adminPath}/${kiosk.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...payload, version: kiosk.version }),
    });
  },

  transition(kioskId: number, status: 'ACTIVE' | 'DISABLED' | 'REVOKED', reason = '') {
    return apiClient<SelfServiceKioskAdmin>(`${adminPath}/${kioskId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
    });
  },

  rotateLink(kioskId: number) {
    return apiClient<SelfServiceKioskAdmin>(`${adminPath}/${kioskId}/rotate-link`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  deleteAdmin(kioskId: number, reason = '') {
    return apiClient<{ deleted: boolean }>(`${adminPath}/${kioskId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  },

  pendingPretickets(cashRegisterId: number) {
    return apiClient<{ items: SelfServicePreticket[]; count: number }>(
      `${adminPath}/pretickets?cashRegisterId=${encodeURIComponent(cashRegisterId)}`,
    );
  },

  claimPreticket(preticketId: number, cashRegisterId: number) {
    return apiClient<SelfServicePreticket>(
      `${adminPath}/pretickets/${preticketId}/claim?cashRegisterId=${encodeURIComponent(cashRegisterId)}`,
      {
      method: 'POST',
      body: JSON.stringify({}),
      },
    );
  },

  releasePreticket(preticketId: number, cashRegisterId: number) {
    return apiClient<SelfServicePreticket>(
      `${adminPath}/pretickets/${preticketId}/release?cashRegisterId=${encodeURIComponent(cashRegisterId)}`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
    );
  },
};
