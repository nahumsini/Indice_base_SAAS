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
  cashRegisterId: string;
  cashRegisterCode: string;
  cashRegisterName: string;
  startTime: Date;
  endTime?: Date;
  initialCash: number;
  expectedCash: number;
  actualCash?: number;
  difference?: number;
  status: 'open' | 'closed';
  sales: number;
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
  type: 'entry' | 'withdrawal';
  amount: number;
  reason: string;
  timestamp: Date;
  cashierName: string;
}
