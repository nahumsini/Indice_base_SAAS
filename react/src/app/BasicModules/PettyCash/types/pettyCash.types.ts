export type PettyCashExpenseStatus =
  | 'pending_receipt'
  | 'submitted'
  | 'approved'
  | 'settled'
  | 'overdue'
  | 'rejected';

export type CashFundStatus = 'active' | 'low_balance' | 'needs_reconciliation' | 'closed';
export type PettyCashAuditStatus = 'not_reviewed' | 'in_review' | 'audited' | 'flagged';

export type PettyCashPaymentMethod = 'cash' | 'debit_card' | 'transfer';

export interface CashFund {
  id: string;
  name: string;
  businessUnit: string;
  business: string;
  department: string;
  custodian: string;
  currency: 'CAD' | 'MXN' | 'COP' | 'USD';
  limit: number;
  currentBalance: number;
  monthlySpend: number;
  pendingReceipts: number;
  openRequests: number;
  lastReconciliation: Date;
  status: CashFundStatus;
}

export interface PettyCashExpense {
  id: string;
  folio: string;
  date: Date;
  cashFundId: string;
  cashFundName: string;
  businessUnit: string;
  business: string;
  department: string;
  collaborator: string;
  category: string;
  concept: string;
  description: string;
  amountIssued: number;
  amountSettled: number;
  balance: number;
  receiptCount: number;
  paymentMethod: PettyCashPaymentMethod;
  approver: string;
  dueDate: Date;
  settledDate?: Date;
  status: PettyCashExpenseStatus;
  auditStatus: PettyCashAuditStatus;
  auditNotes?: string;
  notes?: string;
}
