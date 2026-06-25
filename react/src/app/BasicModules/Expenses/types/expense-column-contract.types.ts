export type ExpenseOperationalColumnKey =
  | 'folio'
  | 'provider'
  | 'concept'
  | 'description'
  | 'expenseType'
  | 'budgetLine'
  | 'purchaseOrder'
  | 'accountingAccount'
  | 'paymentAccount'
  | 'subtotal'
  | 'tax'
  | 'total'
  | 'paidAmount'
  | 'balance'
  | 'currency'
  | 'expenseDate'
  | 'dueDate'
  | 'paymentDate'
  | 'closeDate'
  | 'requestedBy'
  | 'approvedBy'
  | 'performedBy'
  | 'status'
  | 'paymentStatus'
  | 'attachments'
  | 'auditStatus'
  | 'actions';

export interface ExpenseColumnContract {
  key: ExpenseOperationalColumnKey;
  defaultVisible: boolean;
  backendField: string | null;
  filterable: boolean;
  sortable: boolean;
  affectsBudget: boolean;
  affectsCashFlow: boolean;
}

export const EXPENSE_COLUMN_CONTRACT: ExpenseColumnContract[] = [
  { key: 'folio', defaultVisible: true, backendField: 'folio', filterable: true, sortable: true, affectsBudget: false, affectsCashFlow: false },
  { key: 'provider', defaultVisible: true, backendField: 'providerId', filterable: true, sortable: true, affectsBudget: false, affectsCashFlow: false },
  { key: 'concept', defaultVisible: true, backendField: 'concept', filterable: true, sortable: true, affectsBudget: false, affectsCashFlow: false },
  { key: 'description', defaultVisible: true, backendField: 'description', filterable: true, sortable: true, affectsBudget: false, affectsCashFlow: false },
  { key: 'expenseType', defaultVisible: false, backendField: 'expenseType', filterable: true, sortable: true, affectsBudget: true, affectsCashFlow: false },
  { key: 'budgetLine', defaultVisible: false, backendField: 'budgetLineId', filterable: true, sortable: true, affectsBudget: true, affectsCashFlow: false },
  { key: 'purchaseOrder', defaultVisible: false, backendField: 'purchaseOrderId', filterable: true, sortable: true, affectsBudget: true, affectsCashFlow: false },
  { key: 'accountingAccount', defaultVisible: true, backendField: 'accountingAccountId', filterable: true, sortable: true, affectsBudget: false, affectsCashFlow: false },
  { key: 'paymentAccount', defaultVisible: true, backendField: 'paymentAccountId', filterable: true, sortable: true, affectsBudget: false, affectsCashFlow: true },
  { key: 'subtotal', defaultVisible: true, backendField: 'subtotal', filterable: true, sortable: true, affectsBudget: true, affectsCashFlow: false },
  { key: 'tax', defaultVisible: true, backendField: 'tax', filterable: true, sortable: true, affectsBudget: true, affectsCashFlow: false },
  { key: 'total', defaultVisible: true, backendField: 'total', filterable: true, sortable: true, affectsBudget: true, affectsCashFlow: true },
  { key: 'paidAmount', defaultVisible: true, backendField: 'paidAmount', filterable: true, sortable: true, affectsBudget: false, affectsCashFlow: true },
  { key: 'balance', defaultVisible: true, backendField: 'balance', filterable: true, sortable: true, affectsBudget: false, affectsCashFlow: true },
  { key: 'currency', defaultVisible: true, backendField: 'currency', filterable: true, sortable: true, affectsBudget: false, affectsCashFlow: true },
  { key: 'expenseDate', defaultVisible: true, backendField: 'expenseDate', filterable: true, sortable: true, affectsBudget: true, affectsCashFlow: false },
  { key: 'dueDate', defaultVisible: true, backendField: 'dueDate', filterable: true, sortable: true, affectsBudget: false, affectsCashFlow: true },
  { key: 'paymentDate', defaultVisible: true, backendField: 'paymentDate', filterable: true, sortable: true, affectsBudget: false, affectsCashFlow: true },
  { key: 'closeDate', defaultVisible: false, backendField: 'closeDate', filterable: true, sortable: true, affectsBudget: false, affectsCashFlow: false },
  { key: 'requestedBy', defaultVisible: false, backendField: 'requestedBy', filterable: true, sortable: true, affectsBudget: false, affectsCashFlow: false },
  { key: 'approvedBy', defaultVisible: true, backendField: 'approvedBy', filterable: true, sortable: true, affectsBudget: false, affectsCashFlow: false },
  { key: 'performedBy', defaultVisible: true, backendField: 'performedBy', filterable: true, sortable: true, affectsBudget: false, affectsCashFlow: false },
  { key: 'status', defaultVisible: true, backendField: 'status', filterable: true, sortable: true, affectsBudget: true, affectsCashFlow: false },
  { key: 'paymentStatus', defaultVisible: true, backendField: 'paymentStatus', filterable: true, sortable: true, affectsBudget: false, affectsCashFlow: true },
  { key: 'attachments', defaultVisible: true, backendField: 'attachments', filterable: false, sortable: false, affectsBudget: false, affectsCashFlow: false },
  { key: 'auditStatus', defaultVisible: true, backendField: 'auditStatus', filterable: true, sortable: true, affectsBudget: false, affectsCashFlow: false },
  { key: 'actions', defaultVisible: true, backendField: null, filterable: false, sortable: false, affectsBudget: false, affectsCashFlow: false },
];
