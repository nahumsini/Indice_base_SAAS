export type PosCashClosingPaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'WALLET' | 'CREDIT';

export interface PosCashClosingFilters {
  dateFrom?: string;
  dateTo?: string;
  cashRegisterId?: number | string;
  warehouseId?: number | string;
  shiftId?: number | string;
  userId?: number | string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PosCashClosingSummaryRow {
  id: number;
  shiftId: number;
  cashRegisterId: number;
  cashRegisterCode?: string | null;
  cashRegisterName?: string | null;
  warehouseId: number;
  warehouseName?: string | null;
  unitId?: number | null;
  unitName?: string | null;
  businessId?: number | null;
  businessName?: string | null;
  companyName?: string | null;
  openingCashAmount: number | string;
  cashSalesAmount: number | string;
  expectedCashAmount: number | string;
  countedCashAmount: number | string;
  overShortAmount: number | string;
  totalSalesAmount: number | string;
  totalRefundsAmount: number | string;
  ticketsCount: number;
  paymentsSummary?: PosPaymentMethodSummary[];
  closedByUserId: number;
  closedByUserName?: string | null;
  currencyCode?: string | null;
  closedAt: string;
}

export interface PosPaymentMethodSummary {
  paymentMethod: PosCashClosingPaymentMethod;
  amount: number | string;
  count: number;
}

export interface PosCashClosingDetailResponse extends PosCashClosingSummaryRow {
  companyId: number;
  unitId?: number | null;
  businessId?: number | null;
  cashInAmount: number | string;
  cashOutAmount: number | string;
  safeDropAmount: number | string;
  correctionAmount: number | string;
  totalRefundsAmount: number | string;
  paymentsSummary: PosPaymentMethodSummary[];
  notes?: string | null;
  shift?: {
    id: number;
    status?: string | null;
    currencyCode?: string | null;
    openedByUserId?: number | null;
    openedAt?: string | null;
    closedAt?: string | null;
  } | null;
  cashRegister?: {
    id: number;
    code?: string | null;
    name?: string | null;
    warehouseId: number;
  } | null;
  metadata?: unknown;
}

export interface PosCashClosingListResponse {
  items: PosCashClosingSummaryRow[];
  count: number;
  limit: number;
  offset: number;
}

export type PosCashClosingSettlementStatus = 'PENDING' | 'SETTLED' | 'RECONCILIATION_REQUIRED' | 'REVERSED';

export interface PosCashClosingSettlement {
  id: number;
  companyId: number;
  cashClosingId: number;
  shiftId: number;
  cashRegisterId: number;
  unitId?: number | null;
  businessId?: number | null;
  paymentMethod: PosCashClosingPaymentMethod;
  currencyCode: string;
  grossAmount: number | string;
  retainedCashAmount: number | string;
  transferableAmount: number | string;
  destinationPaymentAccountId: number;
  destinationPaymentAccountName?: string | null;
  settlementTiming: 'IMMEDIATE' | 'DEFERRED';
  pendingAmount: number | string;
  settledAmount: number | string;
  varianceAmount: number | string;
  status: PosCashClosingSettlementStatus;
  settledAt?: string | null;
  settledByUserId?: number | null;
  version: number;
}
