export type CashClosingStatus = 'balanced' | 'over' | 'short';

export interface CashRegisterContext {
  companyId: string;
  companyName: string;
  businessUnitId: string;
  businessUnitName: string;
  businessId: string;
  businessName: string;
  cashRegisterId: string;
  cashRegisterCode: string;
  cashRegisterName: string;
  responsibleUserId: string;
  responsibleUserName: string;
}

export interface CashClosingInput {
  countedCash: number;
  countedCard: number;
  countedTransfer: number;
  notes?: string;
}

export interface CashClosingRecord extends CashRegisterContext {
  id: string;
  shiftId: string;
  openedAt: Date;
  closedAt: Date;
  openingFund: number;
  cashExpected: number;
  cashCounted: number;
  cardExpected: number;
  cardCounted: number;
  transferExpected: number;
  transferCounted: number;
  totalSales: number;
  totalRefunds: number;
  totalMovements: number;
  expectedTotal: number;
  countedTotal: number;
  difference: number;
  status: CashClosingStatus;
  notes?: string;
}

export interface PreTicketItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface PreTicket {
  id: string;
  code: string;
  customerName: string;
  advisorName: string;
  createdAt: Date;
  businessName: string;
  items: PreTicketItem[];
  total: number;
  status: 'pending' | 'pulled';
}
