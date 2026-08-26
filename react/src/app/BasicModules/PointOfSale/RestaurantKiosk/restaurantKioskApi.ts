import { apiClient } from '../../../lib/apiClient';

type Envelope<T> = { data: T; meta?: { kioskSessionId?: string } };

export type RestaurantKioskType = 'waiter_station' | 'table_order_center' | 'kitchen_display';
export type RestaurantTableShape = 'ROUND' | 'SQUARE' | 'RECTANGLE';
export type RestaurantBootstrap = {
  kioskId: number;
  kioskType: RestaurantKioskType;
  name: string;
  ecosystemName: string;
  areaName?: string;
  status: string;
  sourceRegisterOpen: boolean;
  csrfToken: string;
};
export type RestaurantTable = {
  id: number; code: string; name: string; capacity: number; status: string;
  version: number; layoutShape: RestaurantTableShape; layoutX: number; layoutY: number;
  layoutWidth: number; layoutHeight: number; layoutRotation: 0 | 90;
  areaId: number; areaName: string; orderId?: number; orderNumber?: string;
  orderStatus?: string; guestCount?: number; totalAmount?: number | string;
  responsibleUserCompanyId?: number; responsibleWaiterName?: string; responsibleWaiterCode?: string;
};
export type RestaurantItem = {
  id: number; productId: number; name: string; quantity: number | string;
  guestNumber: number;
  unitPrice: number | string; lineTotal: number | string; notes?: string;
  modifierSummary?: string; kitchenStationCode: string; status: string;
  roundId?: number; roundNumber?: number; sentAt?: string; createdAt?: string; updatedAt?: string;
};
export type RestaurantOrder = {
  id: number; orderNumber: string; tableId: number; tableName: string; areaName: string;
  status: string; guestCount: number; currencyCode: string; totalAmount: number | string;
  responsibleUserCompanyId?: number; responsibleWaiterName?: string; responsibleWaiterCode?: string;
  createdAt?: string; updatedAt?: string; firstItemAt?: string; firstRoundSentAt?: string;
  kitchenStartedAt?: string; kitchenReadyAt?: string; servedAt?: string; checkRequestedAt?: string;
  items: RestaurantItem[];
};
export type RestaurantCatalogItem = {
  id: number; sku: string; name: string; description?: string; category?: string;
  price: number | string; currency: string; availableQuantity: number | string; stockTracked: boolean;
};
export type KitchenItem = {
  id: number; orderId: number; orderNumber: string; tableName: string; name: string;
  quantity: number | string; guestNumber: number; notes?: string; modifierSummary?: string;
  kitchenStationCode: string; status: string; roundId?: number; roundNumber?: number;
  sentAt?: string; createdAt?: string; updatedAt?: string;
};
export type RestaurantWorkspace = RestaurantBootstrap & {
  userCompanyId: number;
  canEditFloorPlan: boolean;
  tables: RestaurantTable[];
  orders: RestaurantOrder[];
  catalog?: RestaurantCatalogItem[];
  kitchenItems?: KitchenItem[];
};
export type RestaurantSession = { token: string; user: { id: number; name: string; code?: string }; expiresAt: string };

const base = (token: string) => `/api/v2/kiosks/public/${encodeURIComponent(token)}`;

export const restaurantKioskApi = {
  async bootstrap(token: string) {
    const response = await apiClient<Envelope<RestaurantBootstrap>>(`${base(token)}/bootstrap`);
    return response.data;
  },
  async authenticate(token: string, pin: string, csrfToken: string) {
    const challenge = await apiClient<Envelope<{ sessionId: string }>>(`${base(token)}/sessions`, {
      method: 'POST', headers: { 'X-CSRF-Token': csrfToken }, body: JSON.stringify({}),
    });
    const response = await apiClient<Envelope<{
      kiosk_session_token: string; expires_at: string;
      user: { id: number; name: string; code?: string };
    }>>(`${base(token)}/sessions/${encodeURIComponent(challenge.data.sessionId)}/verify-pin`, {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken, 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ pin, credential_payload: pin }),
    });
    return { token: response.data.kiosk_session_token, user: response.data.user, expiresAt: response.data.expires_at } as RestaurantSession;
  },
  async action<T>(publicToken: string, capability: string, session: RestaurantSession, csrfToken: string, payload: Record<string, unknown> = {}, mutation = false) {
    const response = await apiClient<Envelope<T>>(`${base(publicToken)}/actions/${encodeURIComponent(`${capability}@1`)}`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken,
        ...(mutation ? { 'Idempotency-Key': crypto.randomUUID() } : {}),
      },
      body: JSON.stringify({ ...payload, kiosk_session_token: session.token }),
    });
    return response.data;
  },
};
