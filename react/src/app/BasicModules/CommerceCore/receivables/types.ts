export type ReceivableSource = 'pos' | 'sales';
export type ReceivableStatus = 'current' | 'due_today' | 'overdue' | 'partial' | 'paid' | 'blocked' | 'written_off';
export type ReceivablePaymentMethod = 'cash' | 'card' | 'transfer' | 'credit_note' | 'other';

export interface ReceivablePayment {
  id: string;
  amount: number;
  paidAt: string;
  method: ReceivablePaymentMethod;
  reference?: string;
  notes?: string;
}

export interface ReceivableAccount {
  id: string;
  source: ReceivableSource;
  saleNumber: string;
  saleRecordId?: string;
  customerId: string;
  customerName: string;
  businessUnitId?: string;
  businessUnitName?: string;
  businessId?: string;
  businessName?: string;
  originalAmount: number;
  paidAmount: number;
  balance: number;
  currency: string;
  issuedAt: string;
  dueDate: string;
  termDays: number;
  creditRuleId?: string;
  creditRuleName?: string;
  creditDecision?: string;
  status: ReceivableStatus;
  payments: ReceivablePayment[];
  notes?: string;
  updatedAt: string;
}

export interface ReceivableMetrics {
  totalAccounts: number;
  openAccounts: number;
  overdueAccounts: number;
  dueTodayAccounts: number;
  paidAccounts: number;
  totalOriginal: number;
  totalBalance: number;
  overdueBalance: number;
  collectedAmount: number;
}
