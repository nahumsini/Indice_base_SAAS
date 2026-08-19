import { apiClient } from '../../../../lib/apiClient';

export type PosCashRegisterResponse = {
  id: number;
  companyId: number;
  unitId?: number | null;
  businessId?: number | null;
  warehouseId: number;
  warehouseName?: string | null;
  code: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  active: boolean;
  notes?: string | null;
};

export type PosCashRegisterCreatePayload = {
  warehouseId: number;
  code: string;
  name: string;
  status?: 'ACTIVE' | 'INACTIVE';
  active?: boolean;
  notes?: string | null;
};

export type PosCashRegisterUpdatePayload = PosCashRegisterCreatePayload;

export type PosWarehouseSummary = {
  id: number;
  warehouseCode?: string | null;
  name: string;
  unitId?: number | null;
  unitName?: string | null;
  businessId?: number | null;
  businessName?: string | null;
  status?: string | null;
};

export type PosShiftResponse = {
  id: number;
  companyId: number;
  unitId?: number | null;
  businessId?: number | null;
  warehouseId: number;
  cashRegisterId: number;
  cashRegisterName?: string | null;
  openedByUserId: number;
  closedByUserId?: number | null;
  status: 'OPEN' | 'CLOSING' | 'CLOSED' | 'CANCELLED';
  openingAmount?: number | string | null;
  expectedCashAmount?: number | string | null;
  countedCashAmount?: number | string | null;
  overShortAmount?: number | string | null;
  currencyCode: string;
  openedAt: string;
  closedAt?: string | null;
  openingNote?: string | null;
  closingNote?: string | null;
};

export type PosContextResponse = {
  warehouses: PosWarehouseSummary[];
  cashRegisters: PosCashRegisterResponse[];
  currentOpenShift?: PosShiftResponse | null;
  canManageCashRegisters?: boolean;
  scope?: {
    type?: string | null;
    unitId?: number | null;
    businessId?: number | null;
  } | null;
};

export type PosOpenShiftPayload = {
  cashRegisterId: number;
  openingAmount: number;
  currencyCode: string;
  openingNote?: string;
};

export type PosCloseShiftPayload = {
  countedCashAmount: number;
  closingNote?: string;
};

export type PosCancelShiftPayload = {
  reason: string;
};

export type PosListResponse<T> = {
  items: T[];
  count: number;
};

export type PosCashMovementType = 'CASH_IN' | 'CASH_OUT' | 'SAFE_DROP' | 'CORRECTION';

export type PosCashMovementPayload = {
  shiftId: number;
  cashRegisterId: number;
  movementType: PosCashMovementType;
  amount: number;
  currencyCode: string;
  reason: string;
  reference?: string | null;
};

export type PosCashMovementResponse = {
  id: number;
  companyId: number;
  unitId?: number | null;
  businessId?: number | null;
  warehouseId: number;
  cashRegisterId: number;
  shiftId: number;
  movementType: PosCashMovementType;
  amount: number | string;
  currencyCode: string;
  reason: string;
  reference?: string | null;
  createdByUserId: number;
  createdAt: string;
};

export type PosPaymentMethodSummary = {
  paymentMethod: PosCheckoutPaymentMethod;
  amount: number | string;
  count: number;
};

export type PosShiftClosingSummaryResponse = {
  shiftId: number;
  cashRegisterId: number;
  cashRegisterName?: string | null;
  currencyCode: string;
  openingCashAmount: number | string;
  cashSalesAmount: number | string;
  cashInAmount: number | string;
  cashOutAmount: number | string;
  safeDropAmount: number | string;
  correctionAmount: number | string;
  expectedCashAmount: number | string;
  countedCashAmount?: number | string | null;
  overShortAmount?: number | string | null;
  totalSalesAmount: number | string;
  totalRefundsAmount: number | string;
  ticketsCount: number;
  paymentsSummary: PosPaymentMethodSummary[];
  notes?: string | null;
  closed: boolean;
  closedAt?: string | null;
};

export type PosCheckoutPaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'WALLET' | 'CREDIT';

export type PosCheckoutItemPayload = {
  productId?: number | null;
  productName: string;
  sku?: string | null;
  productType?: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  discountRuleId?: number | null;
};

export type PosCheckoutPaymentPayload = {
  paymentMethod: PosCheckoutPaymentMethod;
  paymentAccountId?: number | null;
  amount: number;
  reference?: string | null;
};

export type PosCheckoutPayload = {
  cashRegisterId: number;
  customerId?: number | null;
  preticketId?: number | null;
  currencyCode: string;
  items: PosCheckoutItemPayload[];
  payments: PosCheckoutPaymentPayload[];
  notes?: string | null;
};

export type PosTicketResponse = {
  id: number;
  cashRegisterId: number;
  shiftId: number;
  customerId?: number | null;
  salesRecordId?: number | null;
  ticketNumber: string;
  status: 'COMPLETED' | 'CANCELLED';
  channel: string;
  currencyCode: string;
  subtotalAmount: number | string;
  discountAmount: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  paidAmount: number | string;
  balanceAmount: number | string;
  customerNameSnapshot?: string | null;
  completedAt?: string | null;
};

export type PosTicketItemResponse = {
  id: number;
  ticketId: number;
  productId?: number | null;
  skuSnapshot?: string | null;
  productNameSnapshot: string;
  productTypeSnapshot?: string | null;
  quantity: number | string;
  unitPrice: number | string;
  discountAmount: number | string;
  taxAmount: number | string;
  lineTotalAmount: number | string;
  currencyCode: string;
};

export type PosPaymentResponse = {
  id: number;
  ticketId: number;
  shiftId: number;
  cashRegisterId: number;
  paymentMethod: PosCheckoutPaymentMethod;
  paymentAccountId?: number | null;
  amount: number | string;
  currencyCode: string;
  reference?: string | null;
  status: 'CAPTURED' | 'VOIDED';
  paidAt?: string | null;
};

export type PosPrintableSummary = {
  ticketNumber: string;
  customerName?: string | null;
  currencyCode: string;
  subtotalAmount: number | string;
  discountAmount: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  paidAmount: number | string;
  completedAt?: string | null;
};

export type PosCheckoutResponse = {
  ticket: PosTicketResponse;
  items: PosTicketItemResponse[];
  payments: PosPaymentResponse[];
  printableSummary: PosPrintableSummary;
};

const posBasePath = '/api/v1/pos';

export const posBackendApi = {
  context() {
    return apiClient<PosContextResponse>(`${posBasePath}/context`);
  },
  cashRegisters() {
    return apiClient<PosCashRegisterResponse[]>(`${posBasePath}/cash-registers`);
  },
  createCashRegister(payload: PosCashRegisterCreatePayload) {
    return apiClient<PosCashRegisterResponse>(`${posBasePath}/cash-registers`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  nextCashRegisterCode(warehouseId: number | string) {
    return apiClient<{ code: string }>(`${posBasePath}/cash-registers/warehouses/${warehouseId}/next-code`);
  },
  ensureCashRegisterForWarehouse(warehouseId: number | string) {
    return apiClient<PosCashRegisterResponse>(`${posBasePath}/cash-registers/warehouses/${warehouseId}/ensure`, {
      method: 'POST',
    });
  },
  updateCashRegister(registerId: number | string, payload: PosCashRegisterUpdatePayload) {
    return apiClient<PosCashRegisterResponse>(`${posBasePath}/cash-registers/${registerId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  deleteCashRegister(registerId: number | string) {
    return apiClient<{ success: boolean }>(`${posBasePath}/cash-registers/${registerId}`, {
      method: 'DELETE',
    });
  },
  shifts() {
    return apiClient<PosShiftResponse[]>(`${posBasePath}/shifts`);
  },
  getShift(shiftId: number | string) {
    return apiClient<PosShiftResponse>(`${posBasePath}/shifts/${shiftId}`);
  },
  getShiftClosingSummary(shiftId: number | string) {
    return apiClient<PosShiftClosingSummaryResponse>(`${posBasePath}/shifts/${shiftId}/closing-summary`);
  },
  openShift(payload: PosOpenShiftPayload) {
    return apiClient<PosShiftResponse>(`${posBasePath}/shifts/open`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  closeShift(shiftId: number | string, payload: PosCloseShiftPayload) {
    return apiClient<PosShiftResponse>(`${posBasePath}/shifts/${shiftId}/close`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  cancelShift(shiftId: number | string, payload: PosCancelShiftPayload) {
    return apiClient<PosShiftResponse>(`${posBasePath}/shifts/${shiftId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  checkout(payload: PosCheckoutPayload) {
    return apiClient<PosCheckoutResponse>(`${posBasePath}/sales/checkout`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  listCashMovements(shiftId: number | string) {
    return apiClient<PosListResponse<PosCashMovementResponse>>(`${posBasePath}/cash-movements?shiftId=${encodeURIComponent(String(shiftId))}`);
  },
  createCashMovement(payload: PosCashMovementPayload) {
    return apiClient<PosCashMovementResponse>(`${posBasePath}/cash-movements`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
