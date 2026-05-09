export interface Cashier {
  id: string;
  name: string;
  code: string;
}

export interface Shift {
  id: string;
  cashierId: string;
  cashierName: string;
  startTime: Date;
  endTime?: Date;
  initialCash: number;
  expectedCash: number;
  actualCash?: number;
  difference?: number;
  status: 'open' | 'closed';
  sales: number;
  totalSales: number;
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
