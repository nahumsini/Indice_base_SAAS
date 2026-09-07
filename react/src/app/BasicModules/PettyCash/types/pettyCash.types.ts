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
export type PettyCashCurrency = 'CAD' | 'MXN' | 'COP' | 'USD' | 'BRL';

export type PettyCashFundStatus = 'OPEN' | 'LOW_BALANCE' | 'NEEDS_RECONCILIATION' | 'CLOSED';
export type PettyCashFundType = 'INTERNAL_COMPANY' | 'EXTERNAL_MANAGED';
export type PettyCashStatementStatus =
  | 'OPEN'
  | 'CUT_PENDING'
  | 'PARTIALLY_SETTLED'
  | 'SETTLED'
  | 'SHORTAGE'
  | 'FORGIVEN_SHORTAGE'
  | 'CHARGED_TO_EMPLOYEE'
  | 'TRANSFERRED_TO_NEXT_CUT'
  | 'CLOSED';
export type PettyCashMovementType =
  | 'INITIAL_FUNDING'
  | 'ADDITIONAL_DEPOSIT'
  | 'RETURN_TO_SOURCE'
  | 'CARRY_FORWARD'
  | 'SHORTAGE_ADJUSTMENT'
  | 'FORGIVEN_SHORTAGE'
  | 'EMPLOYEE_CHARGE';
export type PettyCashSettlementLineStatus =
  | 'DRAFT'
  | 'RECEIPT_ATTACHED'
  | 'VALIDATED'
  | 'EXPENSE_CREATED'
  | 'REJECTED'
  | 'REVERSED';

export interface PettyCashFund {
  id: string;
  companyId: string;
  unitId: string;
  unitName: string;
  businessId: string;
  businessName: string;
  budgetId?: string;
  budgetLineId?: string;
  budgetLineName?: string;
  paymentAccountId: string;
  fundingSourcePaymentAccountId?: string;
  fundType: PettyCashFundType;
  responsibleUserId: string;
  responsibleName: string;
  createdByUserId: string;
  createdByName: string;
  name: string;
  currencyCode: PettyCashCurrency;
  limitAmount: number;
  currentBalanceAmount: number;
  cutOffDay: number;
  fundingSourceName: string;
  externalOwnerType?: string;
  externalOwnerName?: string;
  externalOwnerRelationship?: string;
  externalOwnerReference?: string;
  statementRecipientEmail?: string;
  managedAssetType?: string;
  managedAssetName?: string;
  managedAssetReference?: string;
  externalIdentityPending?: boolean;
  budgetLinkPending?: boolean;
  fundingMethods: string[];
  spendingMethods: string[];
  kioskEnabled: boolean;
  kioskUsesUniversalPin?: boolean;
  kioskPin?: string;
  kioskAccessUrl?: string;
  kioskPublicToken?: string;
  status: PettyCashFundStatus;
}

export interface PettyCashStatement {
  id: string;
  companyId: string;
  pettyCashFundId: string;
  fundTypeSnapshot: PettyCashFundType;
  folio: string;
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  cutOffDate: string;
  openingBalanceAmount: number;
  assignedAmount: number;
  additionalDepositAmount: number;
  declaredClosingBalanceAmount: number;
  estimatedUsageAmount: number;
  verifiedExpenseAmount: number;
  returnedAmount: number;
  shortageAmount: number;
  carryForwardAmount: number;
  currencyCode: PettyCashCurrency;
  status: PettyCashStatementStatus;
  responsibleUserId: string;
  responsibleName: string;
  externalOwnerTypeSnapshot?: string;
  externalOwnerNameSnapshot?: string;
  externalOwnerRelationshipSnapshot?: string;
  externalOwnerReferenceSnapshot?: string;
  statementRecipientEmailSnapshot?: string;
  managedAssetTypeSnapshot?: string;
  managedAssetNameSnapshot?: string;
  managedAssetReferenceSnapshot?: string;
  reviewedByName?: string;
  attachmentCount: number;
}

export interface PettyCashMovement {
  id: string;
  companyId: string;
  pettyCashFundId: string;
  pettyCashStatementId?: string;
  fromPaymentAccountId?: string;
  fromPaymentAccountName?: string;
  externalSourceName?: string;
  entryCategory?: string;
  counterpartyName?: string;
  statementDescription?: string;
  fundingMethod?: string;
  internalNote?: string;
  toPaymentAccountId?: string;
  toPaymentAccountName?: string;
  type: PettyCashMovementType;
  amount: number;
  currencyCode: PettyCashCurrency;
  movementDate: string;
  reference: string;
}

export interface PettyCashSettlementLine {
  id: string;
  companyId: string;
  pettyCashFundId: string;
  pettyCashStatementId: string;
  expenseId?: string;
  providerId?: string;
  providerName?: string;
  accountingAccountId?: string;
  accountingAccountName?: string;
  description: string;
  receiptReference?: string;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  currencyCode: PettyCashCurrency;
  expenseDate: string;
  attachmentCount: number;
  status: PettyCashSettlementLineStatus;
  cancellationReason?: string;
  cancelledByUserId?: string;
  cancelledAt?: string;
}

export interface PettyCashAttachment {
  id: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  objectKey: string;
  downloadUrl: string | null;
  uploadedByUserId: number | null;
  uploadedByName: string | null;
  createdAt: string | null;
}

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
