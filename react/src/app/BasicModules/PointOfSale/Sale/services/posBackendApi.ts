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
  retainedCashAmount?: number | string | null;
  settlementRules?: PosSettlementRule[];
};

export type PosSettlementTiming = 'IMMEDIATE' | 'DEFERRED';

export type PosSettlementRule = {
  id: number;
  cashRegisterId: number;
  paymentMethod: PosCheckoutPaymentMethod;
  currencyCode: string;
  destinationPaymentAccountId?: number | null;
  destinationAccountName?: string | null;
  destinationAccountType?: string | null;
  destinationAvailableBalance?: number | string | null;
  destinationPendingBalance?: number | string | null;
  settlementTiming: PosSettlementTiming;
  enabled: boolean;
  reviewStatus: 'READY' | 'NEEDS_REVIEW' | string;
  version: number;
};

export type PosSettlementRulePayload = {
  paymentMethod: PosCheckoutPaymentMethod;
  destinationPaymentAccountId?: number | null;
  settlementTiming: PosSettlementTiming;
  enabled: boolean;
};

export type PosTreasuryAccount = {
  id: number;
  companyId: number;
  unitId?: number | null;
  businessId?: number | null;
  name: string;
  type: 'CASH' | 'BANK' | 'CREDIT_CARD' | 'PETTY_CASH' | string;
  currencyCode: string;
  availableBalance: number | string;
  pendingBalance: number | string;
  totalBalance: number | string;
  status: string;
  systemKey?: string | null;
  systemManaged: boolean;
};

export type PosCashRegisterCreatePayload = {
  warehouseId: number;
  code: string;
  name: string;
  status?: 'ACTIVE' | 'INACTIVE';
  active?: boolean;
  notes?: string | null;
  retainedCashAmount?: number;
  settlementCurrencyCode?: string;
  settlementRules?: PosSettlementRulePayload[];
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

export type PosPaidInventoryReceiptPayload = {
  idempotencyKey: string;
  cashRegisterId: number;
  shiftId: number;
  providerId: number;
  currencyCode: string;
  paymentMethod: 'CASH' | 'TRANSFER';
  paymentAccountId?: number | null;
  paymentReference?: string | null;
  notes?: string | null;
  items: Array<{
    product: {
      productId?: number | null;
      name?: string | null;
      sku?: string | null;
      category?: string | null;
      inventoryUnit?: string | null;
      salePrice?: number | null;
    };
    quantity: number;
    unitCost: number;
    taxRate: number;
    taxIncluded: boolean;
    taxProfileId?: string | null;
    taxName?: string | null;
  }>;
};

export type PosInventoryReceiptProduct = {
  id: number;
  name: string;
  sku?: string | null;
  category?: string | null;
  currencyCode?: string | null;
  inventoryUnit: 'Piece' | 'Kilogram' | 'Gram' | 'Liter' | 'Meter' | string;
  unitCost: number | string;
};

export type PosInventoryReceiptProvider = {
  id: number;
  name: string;
  email?: string | null;
  taxId?: string | null;
  paymentTermsDays?: number | null;
};

export type PosInventoryReceiptPaymentAccount = {
  id: number;
  name: string;
  type: string;
  currencyCode: string;
  availableBalance: number | string;
  pendingBalance: number | string;
};

export type PosReceiptAttachmentUpload = {
  objectKey: string;
  uploadUrl: string;
  uploadHeaders?: Record<string, string>;
  contentType: string;
};

const receiptEvidenceContentType = (file: File) => {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
};

export type PosPaidInventoryReceiptResponse = {
  id: number;
  receiptNumber: string;
  warehouseId: number;
  warehouseName: string;
  providerId: number;
  providerName: string;
  paymentMethod: 'CASH' | 'TRANSFER';
  subtotalAmount: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  currencyCode: string;
  status: 'POSTED' | 'REVERSED';
  reversalReason?: string | null;
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

export type PosDailySalesSummaryResponse = {
  preferredCurrency: string;
  preferredTotal: number;
  nativeTotals: Array<{ currency: string; amount: number }>;
  exchangeRate: { mode: string; effectiveDate?: string; source?: string };
  partial: boolean;
  excludedRecords: number;
  excludedCurrencies: string[];
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
  restaurantOrderId?: number | null;
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

export type PosSquareTerminalStatusResponse = {
  enabled: boolean;
  environment: string;
};

export type PosSquareLocationResponse = {
  id: string;
  name: string;
  currencyCode?: string | null;
  countryCode?: string | null;
};

export type PosSquareTerminalResponse = {
  terminalId: number;
  name: string;
  squareDeviceId?: string | null;
  squareLocationId: string;
  status: string;
  assignedRegisterId?: number | null;
};

export type PosSquarePairTerminalResponse = {
  terminalId: number;
  deviceCodeId: string;
  pairingCode: string;
  pairBy?: string | null;
};

export type PosSquareTerminalPaymentStatus = 'waiting' | 'approved' | 'declined' | 'cancelled' | 'uncertain';

export type PosSquareTerminalPaymentPayload = {
  idempotencyKey: string;
  cashRegisterId: number;
  customerId?: number | null;
  preticketId?: number | null;
  restaurantOrderId?: number | null;
  currencyCode: string;
  items: PosCheckoutItemPayload[];
  notes?: string | null;
};

export type PosSquareTerminalPaymentResponse = {
  intentId: number;
  status: PosSquareTerminalPaymentStatus | string;
  amount: number | string;
  currencyCode: string;
  squareCheckoutId?: string | null;
  squarePaymentId?: string | null;
  message?: string | null;
  posTicketId?: number | null;
  checkout?: PosCheckoutResponse | null;
};

export type PosSquareTerminalPaymentListResponse = {
  items: PosSquareTerminalPaymentResponse[];
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
  getCashRegisterSettlementPolicy(registerId: number | string, currencyCode: string) {
    return apiClient<PosSettlementRule[]>(
      `${posBasePath}/cash-registers/${encodeURIComponent(String(registerId))}/settlement-policy/prepare?currencyCode=${encodeURIComponent(currencyCode)}`,
      { method: 'POST' },
    );
  },
  getCashRegisterSettlementAccounts(registerId: number | string, currencyCode: string) {
    return apiClient<PosTreasuryAccount[]>(
      `${posBasePath}/cash-registers/${encodeURIComponent(String(registerId))}/settlement-accounts/prepare?currencyCode=${encodeURIComponent(currencyCode)}`,
      { method: 'POST' },
    );
  },
  getWarehouseSettlementAccounts(warehouseId: number | string, currencyCode: string) {
    return apiClient<PosTreasuryAccount[]>(
      `${posBasePath}/cash-registers/settlement-accounts/prepare?warehouseId=${encodeURIComponent(String(warehouseId))}&currencyCode=${encodeURIComponent(currencyCode)}`,
      { method: 'POST' },
    );
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
  getDailySalesSummary(preferredCurrency: string) {
    return apiClient<PosDailySalesSummaryResponse>(
      `${posBasePath}/tickets/daily-summary?preferredCurrency=${encodeURIComponent(preferredCurrency)}`,
    );
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
  createPaidInventoryReceipt(payload: PosPaidInventoryReceiptPayload) {
    return apiClient<PosPaidInventoryReceiptResponse>(`${posBasePath}/inventory-receipts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  paidInventoryReceiptProducts(cashRegisterId: number | string, query = '') {
    const params = new URLSearchParams({ cashRegisterId: String(cashRegisterId) });
    if (query.trim()) params.set('query', query.trim());
    return apiClient<PosInventoryReceiptProduct[]>(`${posBasePath}/inventory-receipts/products?${params.toString()}`);
  },
  paidInventoryReceiptProviders() {
    return apiClient<PosInventoryReceiptProvider[]>(`${posBasePath}/inventory-receipts/providers`);
  },
  createPaidInventoryReceiptProvider(name: string) {
    return apiClient<PosInventoryReceiptProvider>(`${posBasePath}/inventory-receipts/providers/quick`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },
  paidInventoryReceiptPaymentAccounts(
    cashRegisterId: number | string,
    shiftId: number | string,
    currencyCode: string,
  ) {
    const params = new URLSearchParams({
      cashRegisterId: String(cashRegisterId),
      shiftId: String(shiftId),
      currencyCode,
    });
    return apiClient<PosInventoryReceiptPaymentAccount[]>(`${posBasePath}/inventory-receipts/payment-accounts?${params.toString()}`);
  },
  paidInventoryReceipts(shiftId: number | string) {
    return apiClient<PosPaidInventoryReceiptResponse[]>(`${posBasePath}/inventory-receipts?shiftId=${encodeURIComponent(String(shiftId))}`);
  },
  reversePaidInventoryReceipt(receiptId: number | string, reason: string) {
    return apiClient<PosPaidInventoryReceiptResponse>(`${posBasePath}/inventory-receipts/${receiptId}/reverse`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
  preparePaidInventoryReceiptAttachment(receiptId: number | string, file: File) {
    return apiClient<PosReceiptAttachmentUpload>(`${posBasePath}/inventory-receipts/${receiptId}/attachments/presign-upload`, {
      method: 'POST',
      body: JSON.stringify({ fileName: file.name, contentType: receiptEvidenceContentType(file), sizeBytes: file.size }),
    });
  },
  async uploadPaidInventoryReceiptAttachment(upload: PosReceiptAttachmentUpload, file: File) {
    const headers = new Headers(upload.uploadHeaders ?? {});
    if (!headers.has('Content-Type')) headers.set('Content-Type', receiptEvidenceContentType(file));
    const response = await fetch(upload.uploadUrl, { method: 'PUT', body: file, headers });
    if (!response.ok) throw new Error('No se pudo cargar el comprobante.');
  },
  registerPaidInventoryReceiptAttachment(receiptId: number | string, upload: PosReceiptAttachmentUpload, file: File) {
    return apiClient(`${posBasePath}/inventory-receipts/${receiptId}/attachments`, {
      method: 'POST',
      body: JSON.stringify({ objectKey: upload.objectKey, fileName: file.name, contentType: upload.contentType, sizeBytes: file.size }),
    });
  },
  squareStatus() {
    return apiClient<PosSquareTerminalStatusResponse>(`${posBasePath}/square/status`);
  },
  startSquareOAuth() {
    return apiClient<{ authorizationUrl: string }>(`${posBasePath}/square/oauth/start`, { method: 'POST' });
  },
  squareLocations() {
    return apiClient<{ items: PosSquareLocationResponse[] }>(`${posBasePath}/square/locations`);
  },
  linkSquareLocation(squareLocationId: string) {
    return apiClient<unknown>(`${posBasePath}/square/locations/link`, {
      method: 'POST',
      body: JSON.stringify({ squareLocationId }),
    });
  },
  pairSquareTerminal(squareLocationId: string, name: string) {
    return apiClient<PosSquarePairTerminalResponse>(`${posBasePath}/square/terminals/pairing-code`, {
      method: 'POST',
      body: JSON.stringify({ squareLocationId, name }),
    });
  },
  squareTerminals() {
    return apiClient<{ items: PosSquareTerminalResponse[] }>(`${posBasePath}/square/terminals`);
  },
  assignSquareTerminal(registerId: number | string, terminalId: number | string) {
    return apiClient<PosSquareTerminalResponse>(`${posBasePath}/square/registers/${registerId}/terminal`, {
      method: 'POST',
      body: JSON.stringify({ terminalId: Number(terminalId) }),
    });
  },
  unassignSquareTerminal(registerId: number | string) {
    return apiClient<void>(`${posBasePath}/square/registers/${registerId}/terminal`, {
      method: 'DELETE',
    });
  },
  disableSquareTerminal(terminalId: number | string) {
    return apiClient<PosSquareTerminalResponse>(`${posBasePath}/square/terminals/${terminalId}/disable`, {
      method: 'POST',
    });
  },
  refreshSquareTerminalPairingCode(terminalId: number | string) {
    return apiClient<PosSquarePairTerminalResponse>(`${posBasePath}/square/terminals/${terminalId}/pairing-code`, {
      method: 'POST',
    });
  },
  createSquareTerminalPayment(payload: PosSquareTerminalPaymentPayload) {
    return apiClient<PosSquareTerminalPaymentResponse>(`${posBasePath}/square/terminal-payments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  listRecoverableSquareTerminalPayments(params: { cashRegisterId?: number | string; shiftId?: number | string; limit?: number } = {}) {
    const query = new URLSearchParams();
    if (params.cashRegisterId) query.set('cashRegisterId', String(params.cashRegisterId));
    if (params.shiftId) query.set('shiftId', String(params.shiftId));
    if (params.limit) query.set('limit', String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiClient<PosSquareTerminalPaymentListResponse>(`${posBasePath}/square/terminal-payments/recoverable${suffix}`);
  },
  getSquareTerminalPayment(intentId: number | string) {
    return apiClient<PosSquareTerminalPaymentResponse>(`${posBasePath}/square/terminal-payments/${intentId}`);
  },
  cancelSquareTerminalPayment(intentId: number | string) {
    return apiClient<PosSquareTerminalPaymentResponse>(`${posBasePath}/square/terminal-payments/${intentId}/cancel`, {
      method: 'POST',
    });
  },
  recoverSquareTerminalPayment(intentId: number | string) {
    return apiClient<PosSquareTerminalPaymentResponse>(`${posBasePath}/square/terminal-payments/${intentId}/recover`, {
      method: 'POST',
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
