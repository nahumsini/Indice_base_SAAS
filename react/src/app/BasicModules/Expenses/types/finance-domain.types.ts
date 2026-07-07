import type {
  BudgetHealthStatus,
  BudgetStatus,
  ExpenseStatus,
  PaymentStatus,
  PettyCashStatus,
  PurchaseOrderStatus,
} from './finance-status.types';
import type { BusinessCurrencyCode } from '../../shared/businessCurrency';

export type FinanceCurrency = BusinessCurrencyCode | string;
export type FinanceLifecycleStatus = 'ACTIVE' | 'INACTIVE';
export type FinanceExpenseType = 'FIXED' | 'VARIABLE' | 'CAPEX' | 'PETTY_CASH_SETTLEMENT';
export type PaymentAccountType = 'CASH' | 'BANK' | 'CREDIT_CARD' | 'PETTY_CASH';
export type FundMovementType = 'TRANSFER' | 'PETTY_CASH_ISSUANCE' | 'PETTY_CASH_RETURN';
export type PettyCashSettlementLineStatus = 'DRAFT' | 'RECEIPT_ATTACHED' | 'EXPENSE_CREATED' | 'REJECTED';

export type FinanceRecordStatus =
  | ExpenseStatus
  | PurchaseOrderStatus
  | BudgetStatus
  | BudgetHealthStatus
  | PettyCashStatus
  | PaymentStatus
  | FinanceLifecycleStatus;

export interface FinanceBaseEntity {
  id: string;
  companyId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FinanceBudget extends FinanceBaseEntity {
  unitId?: string;
  businessId?: string;
  name: string;
  description?: string;
  period: string;
  periodStart?: string;
  periodEnd?: string;
  plannedAmount: number;
  actualAmount: number;
  currencyCode?: FinanceCurrency;
  status: BudgetStatus;
}

export interface FinanceBudgetLine extends FinanceBaseEntity {
  unitId?: string;
  businessId?: string;
  budgetId: string;
  name: string;
  categoryKey?: string;
  description?: string;
  period: string;
  plannedAmount: number;
  committedAmount: number;
  actualExpenseAmount: number;
  pettyCashIssuedAmount: number;
  pettyCashSettledAmount: number;
  availableAmount: number;
  currencyCode?: FinanceCurrency;
  healthStatus: BudgetHealthStatus;
  status: BudgetStatus;
}

export interface FinancePurchaseOrder extends FinanceBaseEntity {
  budgetLineId?: string;
  providerId?: string;
  folio: string;
  description: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: FinanceCurrency;
  status: PurchaseOrderStatus;
  requestedBy?: string;
  approvedBy?: string;
  issuedDate?: string;
}

export interface FinanceExpense extends FinanceBaseEntity {
  unitId?: string;
  businessId?: string;
  providerId?: string;
  categoryId?: string;
  budgetLineId?: string;
  purchaseOrderId?: string;
  accountingAccountId?: string;
  paymentAccountId?: string;
  folio?: string;
  concept?: string;
  description: string;
  reference?: string;
  expenseType: FinanceExpenseType;
  subtotal: number;
  tax: number;
  total: number;
  paidAmount: number;
  balance: number;
  currency: FinanceCurrency;
  expenseDate: string;
  dueDate?: string;
  paidDate?: string;
  closeDate?: string;
  requestedByUserId?: string;
  approvedByUserId?: string;
  performedByUserId?: string;
  status: ExpenseStatus;
  paymentStatus: PaymentStatus;
  createdBy?: string;
  requestedBy?: string;
  approvedBy?: string;
  performedBy?: string;
  attachments: string[];
  attachmentCount?: number;
  auditStatus?: string;
}

export interface FinanceProvider extends FinanceBaseEntity {
  unitId?: string;
  businessId?: string;
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  paymentTerms?: string;
  status: FinanceLifecycleStatus;
}

export interface FinancePettyCash extends FinanceBaseEntity {
  unitId?: string;
  businessId?: string;
  pettyCashAccountId: string;
  sourcePaymentAccountId?: string;
  budgetLineId?: string;
  custodianUserId: string;
  requestedByUserId?: string;
  approvedByUserId?: string;
  issuedByUserId?: string;
  settledByUserId?: string;
  issuedAmount: number;
  settledAmount: number;
  returnedAmount: number;
  settlementBalance: number;
  currencyCode: FinanceCurrency;
  issuedDate: string;
  settlementDueDate?: string;
  settledDate?: string;
  status: PettyCashStatus;
  attachmentCount?: number;
}

export interface FinancePettyCashSettlementLine extends FinanceBaseEntity {
  pettyCashId: string;
  expenseId?: string;
  providerId?: string;
  accountingAccountId?: string;
  description: string;
  receiptReference?: string;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  currencyCode: FinanceCurrency;
  expenseDate: string;
  attachmentIds: string[];
  status: PettyCashSettlementLineStatus;
}

export interface FinancePaymentAccount extends FinanceBaseEntity {
  unitId?: string;
  businessId?: string;
  name: string;
  type: PaymentAccountType;
  balance: number;
  currency: FinanceCurrency;
  status: FinanceLifecycleStatus;
}

export interface FinanceAccountingAccount extends FinanceBaseEntity {
  unitId?: string;
  businessId?: string;
  code: string;
  name: string;
  group: string;
  status: FinanceLifecycleStatus;
}

export interface FinancePayment extends FinanceBaseEntity {
  expenseId: string;
  paymentAccountId: string;
  amount: number;
  currency: FinanceCurrency;
  paymentDate: string;
  status: PaymentStatus;
}

export interface FinanceFundMovement extends FinanceBaseEntity {
  unitId?: string;
  businessId?: string;
  fromPaymentAccountId?: string;
  toPaymentAccountId?: string;
  pettyCashId?: string;
  type: FundMovementType;
  amount: number;
  currencyCode: FinanceCurrency;
  movementDate: string;
  reference?: string;
}

export interface FinanceAttachment extends FinanceBaseEntity {
  ownerEntity: 'EXPENSE' | 'PURCHASE_ORDER' | 'PETTY_CASH' | 'PETTY_CASH_SETTLEMENT_LINE' | 'PAYMENT' | 'BUDGET';
  ownerId: string;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}
