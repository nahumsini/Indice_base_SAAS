export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  ORDERED = 'ORDERED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  ISSUED = 'ISSUED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED',
}

export enum BudgetStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export enum BudgetHealthStatus {
  ON_TRACK = 'ON_TRACK',
  WARNING = 'WARNING',
  EXCEEDED = 'EXCEEDED',
}

export enum PettyCashStatus {
  ISSUED = 'ISSUED',
  PARTIALLY_SETTLED = 'PARTIALLY_SETTLED',
  SETTLED = 'SETTLED',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export interface FinanceStatusContract<TStatus extends string> {
  technicalKey: TStatus;
  userMeaning: string;
  appliesWhen: string;
  affectsBudget: boolean;
  affectsPaymentAccountBalance: boolean;
  appearsInFinancialOverview: boolean;
}

const status = <TStatus extends string>(
  technicalKey: TStatus,
  userMeaning: string,
  appliesWhen: string,
  affectsBudget: boolean,
  affectsPaymentAccountBalance: boolean,
  appearsInFinancialOverview: boolean,
): FinanceStatusContract<TStatus> => ({
  technicalKey,
  userMeaning,
  appliesWhen,
  affectsBudget,
  affectsPaymentAccountBalance,
  appearsInFinancialOverview,
});

export const expenseStatusContract = {
  [ExpenseStatus.DRAFT]: status(ExpenseStatus.DRAFT, 'Expense is being prepared.', 'Required fields are incomplete or not submitted.', false, false, false),
  [ExpenseStatus.PENDING_APPROVAL]: status(ExpenseStatus.PENDING_APPROVAL, 'Expense is waiting for approval.', 'Submitted but not approved or rejected.', false, false, true),
  [ExpenseStatus.APPROVED]: status(ExpenseStatus.APPROVED, 'Expense is approved and payable.', 'Approved before payment is recorded.', false, false, true),
  [ExpenseStatus.ORDERED]: status(ExpenseStatus.ORDERED, 'Expense is tied to an order.', 'Purchase order exists but final expense is not paid.', false, false, true),
  [ExpenseStatus.PARTIALLY_PAID]: status(ExpenseStatus.PARTIALLY_PAID, 'Expense has partial payment.', 'Paid amount is greater than zero and less than total.', false, true, true),
  [ExpenseStatus.PAID]: status(ExpenseStatus.PAID, 'Expense is fully paid.', 'Paid amount equals total and closure is still pending.', true, true, true),
  [ExpenseStatus.CLOSED]: status(ExpenseStatus.CLOSED, 'Expense is paid, reconciled, and closed.', 'Finance has finished payment, receipt, and audit review.', true, true, true),
  [ExpenseStatus.CANCELLED]: status(ExpenseStatus.CANCELLED, 'Expense was cancelled.', 'The business transaction will not continue.', false, false, false),
  [ExpenseStatus.REJECTED]: status(ExpenseStatus.REJECTED, 'Expense was rejected.', 'Approval rejected the submitted expense.', false, false, false),
} satisfies Record<ExpenseStatus, FinanceStatusContract<ExpenseStatus>>;

export const purchaseOrderStatusContract = {
  [PurchaseOrderStatus.DRAFT]: status(PurchaseOrderStatus.DRAFT, 'Purchase order is being prepared.', 'Purchase order has not been submitted.', false, false, false),
  [PurchaseOrderStatus.PENDING_APPROVAL]: status(PurchaseOrderStatus.PENDING_APPROVAL, 'Purchase order is waiting for approval.', 'Submitted for approval.', false, false, true),
  [PurchaseOrderStatus.APPROVED]: status(PurchaseOrderStatus.APPROVED, 'Purchase order reserves budget.', 'Approved but not yet sent to provider.', true, false, true),
  [PurchaseOrderStatus.ISSUED]: status(PurchaseOrderStatus.ISSUED, 'Purchase order was sent to provider.', 'Approved order has been issued.', true, false, true),
  [PurchaseOrderStatus.PARTIALLY_RECEIVED]: status(PurchaseOrderStatus.PARTIALLY_RECEIVED, 'Purchase order is partially received.', 'Some goods or services were received.', true, false, true),
  [PurchaseOrderStatus.RECEIVED]: status(PurchaseOrderStatus.RECEIVED, 'Purchase order was received.', 'Goods or services were fully received.', true, false, true),
  [PurchaseOrderStatus.CANCELLED]: status(PurchaseOrderStatus.CANCELLED, 'Purchase order was cancelled.', 'Order will not continue.', false, false, false),
  [PurchaseOrderStatus.REJECTED]: status(PurchaseOrderStatus.REJECTED, 'Purchase order was rejected.', 'Approval rejected the order.', false, false, false),
  [PurchaseOrderStatus.CLOSED]: status(PurchaseOrderStatus.CLOSED, 'Purchase order is closed.', 'Order is complete and reconciled.', true, false, true),
} satisfies Record<PurchaseOrderStatus, FinanceStatusContract<PurchaseOrderStatus>>;

export const budgetStatusContract = {
  [BudgetStatus.DRAFT]: status(BudgetStatus.DRAFT, 'Budget is being prepared.', 'Budget is not active for spending.', false, false, false),
  [BudgetStatus.ACTIVE]: status(BudgetStatus.ACTIVE, 'Budget is active.', 'Budget can receive commitments and actuals.', true, false, true),
  [BudgetStatus.CLOSED]: status(BudgetStatus.CLOSED, 'Budget is closed.', 'Budget period ended and no new activity should post.', true, false, true),
  [BudgetStatus.ARCHIVED]: status(BudgetStatus.ARCHIVED, 'Budget is archived.', 'Budget is retained for history only.', false, false, false),
} satisfies Record<BudgetStatus, FinanceStatusContract<BudgetStatus>>;

export const budgetHealthStatusContract = {
  [BudgetHealthStatus.ON_TRACK]: status(BudgetHealthStatus.ON_TRACK, 'Budget has enough available amount.', 'Available amount is greater than 20% of planned amount.', true, false, true),
  [BudgetHealthStatus.WARNING]: status(BudgetHealthStatus.WARNING, 'Budget is close to limit.', 'Available amount is between 0% and 20% of planned amount.', true, false, true),
  [BudgetHealthStatus.EXCEEDED]: status(BudgetHealthStatus.EXCEEDED, 'Budget is exceeded.', 'Available amount is below zero.', true, false, true),
} satisfies Record<BudgetHealthStatus, FinanceStatusContract<BudgetHealthStatus>>;

export const pettyCashStatusContract = {
  [PettyCashStatus.ISSUED]: status(PettyCashStatus.ISSUED, 'Petty cash was issued.', 'Funds moved into petty cash custody.', true, true, true),
  [PettyCashStatus.PARTIALLY_SETTLED]: status(PettyCashStatus.PARTIALLY_SETTLED, 'Petty cash is partially settled.', 'Some receipts or returns were reconciled.', true, true, true),
  [PettyCashStatus.SETTLED]: status(PettyCashStatus.SETTLED, 'Petty cash is fully settled.', 'All issued funds were supported by receipts or returned.', true, true, true),
  [PettyCashStatus.OVERDUE]: status(PettyCashStatus.OVERDUE, 'Petty cash settlement is overdue.', 'Custodian has not settled by due date.', true, false, true),
  [PettyCashStatus.CANCELLED]: status(PettyCashStatus.CANCELLED, 'Petty cash issuance was cancelled.', 'Issued movement was voided or never completed.', false, false, false),
} satisfies Record<PettyCashStatus, FinanceStatusContract<PettyCashStatus>>;

export const paymentStatusContract = {
  [PaymentStatus.UNPAID]: status(PaymentStatus.UNPAID, 'No payment has been recorded.', 'Paid amount is zero.', false, false, true),
  [PaymentStatus.PARTIALLY_PAID]: status(PaymentStatus.PARTIALLY_PAID, 'Partial payment has been recorded.', 'Paid amount is greater than zero and less than total.', false, true, true),
  [PaymentStatus.PAID]: status(PaymentStatus.PAID, 'Payment is complete.', 'Paid amount equals total.', false, true, true),
  [PaymentStatus.OVERDUE]: status(PaymentStatus.OVERDUE, 'Payment is overdue.', 'Balance remains after due date.', false, false, true),
} satisfies Record<PaymentStatus, FinanceStatusContract<PaymentStatus>>;
