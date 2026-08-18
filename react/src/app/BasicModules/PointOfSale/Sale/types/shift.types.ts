export interface Shift {
  id: string;
  cashierId: string;
  cashierName: string;
  companyId: string;
  companyName: string;
  businessUnitId: string;
  businessUnitName: string;
  businessId: string;
  businessName: string;
  warehouseId: string;
  warehouseName?: string;
  cashRegisterId: string;
  cashRegisterCode: string;
  cashRegisterName: string;
  currencyCode: string;
  startTime: Date;
  endTime?: Date;
  initialCash: number;
  expectedCash: number;
  actualCash?: number;
  difference?: number;
  status: 'open' | 'closed';
  sales: number;
  subtotalSales: number;
  taxSales: number;
  totalSales: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  refundsTotal: number;
  cashMovementsTotal: number;
  openingNote?: string;
}

export interface CashMovement {
  id: string;
  shiftId: string;
  type: 'CASH_IN' | 'CASH_OUT' | 'SAFE_DROP' | 'CORRECTION';
  amount: number;
  currencyCode: string;
  reason: string;
  reference?: string;
  timestamp: Date;
  cashierName: string;
}
