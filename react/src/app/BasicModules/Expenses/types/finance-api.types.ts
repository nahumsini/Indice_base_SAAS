export type FinanceJsonObject = Record<string, unknown>;
export type FinanceJson = FinanceJsonObject | null | undefined;

export type BackendLifecycleStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type BackendProviderStatus = BackendLifecycleStatus | 'BLOCKED';
export type BackendAccountingAccountGroup =
  | 'PAYROLL'
  | 'RENT'
  | 'UTILITIES'
  | 'MAINTENANCE'
  | 'MARKETING'
  | 'SOFTWARE'
  | 'INSURANCE'
  | 'TAXES'
  | 'TRAVEL'
  | 'SUPPLIES'
  | 'PROFESSIONAL_SERVICES'
  | 'OTHER';
export type BackendPaymentAccountType = 'CASH' | 'BANK' | 'CREDIT_CARD' | 'PETTY_CASH';
export type BackendExpenseStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ORDERED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CLOSED'
  | 'CANCELLED'
  | 'REJECTED';
export type BackendPaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
export type BackendExpenseType = 'FIXED' | 'VARIABLE';
export type BackendBudgetStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
export type BackendBudgetHealthStatus = 'ON_TRACK' | 'WARNING' | 'EXCEEDED';

export interface ProviderApiDto {
  id: number;
  companyId: number;
  unitId?: number | null;
  businessId?: number | null;
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  contactName?: string | null;
  paymentTermsDays?: number | null;
  status?: BackendProviderStatus | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  customFields?: FinanceJson;
  metadata?: FinanceJson;
}

export interface ProviderListApiResponse {
  providers: ProviderApiDto[];
  count: number;
}

export type ProviderApiRequest = Omit<ProviderApiDto,
  'id' | 'companyId' | 'createdAt' | 'updatedAt'
>;

export interface AccountingAccountApiDto {
  id: number;
  companyId: number;
  unitId?: number | null;
  businessId?: number | null;
  code: string;
  name: string;
  groupKey: BackendAccountingAccountGroup;
  description?: string | null;
  status?: BackendLifecycleStatus | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  customFields?: FinanceJson;
  metadata?: FinanceJson;
}

export interface AccountingAccountListApiResponse {
  accounts: AccountingAccountApiDto[];
  count: number;
}

export type AccountingAccountApiRequest = Omit<AccountingAccountApiDto,
  'id' | 'companyId' | 'createdAt' | 'updatedAt'
>;

export interface PaymentAccountApiDto {
  id: number;
  companyId: number;
  unitId?: number | null;
  businessId?: number | null;
  name: string;
  type: BackendPaymentAccountType;
  currencyCode: string;
  openingBalance?: number | string | null;
  currentBalance?: number | string | null;
  availableBalance?: number | string | null;
  pendingBalance?: number | string | null;
  totalBalance?: number | string | null;
  status?: BackendLifecycleStatus | null;
  description?: string | null;
  systemKey?: string | null;
  systemManaged?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  customFields?: FinanceJson;
  metadata?: FinanceJson;
}

export interface PaymentAccountListApiResponse {
  accounts: PaymentAccountApiDto[];
  count: number;
}

export interface PaymentAccountApiRequest {
  unitId?: number | null;
  businessId?: number | null;
  name: string;
  type: BackendPaymentAccountType;
  currencyCode: string;
  openingBalance?: number | null;
  currentBalance?: null;
  status?: BackendLifecycleStatus;
  description?: string | null;
  customFields?: FinanceJson;
  metadata?: FinanceJson;
}

export interface ExpenseApiDto {
  id: number;
  companyId: number;
  unitId?: number | null;
  businessId?: number | null;
  providerId?: number | null;
  budgetLineId?: number | null;
  accountingAccountId?: number | null;
  paymentAccountId?: number | null;
  purchaseOrderId?: number | null;
  folio: string;
  concept: string;
  description?: string | null;
  expenseType: BackendExpenseType;
  subtotalAmount: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  paidAmount?: number | string | null;
  balanceAmount?: number | string | null;
  currencyCode: string;
  expenseDate: string;
  dueDate?: string | null;
  paymentDate?: string | null;
  closeDate?: string | null;
  requestedByUserId?: number | null;
  approvedByUserId?: number | null;
  performedByUserId?: number | null;
  status: BackendExpenseStatus;
  paymentStatus: BackendPaymentStatus;
  auditStatus?: string | null;
  attachmentCount?: number | null;
  createdByUserId?: number | null;
  updatedByUserId?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  customFields?: FinanceJson;
  metadata?: FinanceJson;
}

export interface ExpenseListApiResponse {
  expenses: ExpenseApiDto[];
  count: number;
}

export type ExpensePaymentSource = 'RECORDED' | 'SETTLED_ON_CREATE' | 'LEGACY_AGGREGATE';

export interface ExpensePaymentApiDto {
  id: number;
  expenseId: number;
  paymentAccountId?: number | null;
  paymentAccountName?: string | null;
  paymentAccountType?: BackendPaymentAccountType | null;
  amount: number | string;
  currencyCode: string;
  paymentDate: string;
  source: ExpensePaymentSource;
  registeredByUserId?: number | null;
  registeredByName?: string | null;
  createdAt: string;
}

export interface ExpensePaymentListApiResponse {
  payments: ExpensePaymentApiDto[];
  count: number;
}

export interface ExpenseApiRequest {
  unitId?: number | null;
  businessId?: number | null;
  providerId?: number | null;
  purchaseOrderId?: number | null;
  budgetLineId?: number | null;
  accountingAccountId?: number | null;
  paymentAccountId?: number | null;
  folio: string;
  concept: string;
  description?: string | null;
  expenseType: BackendExpenseType;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  currencyCode: string;
  expenseDate: string;
  dueDate?: string | null;
  requestedByUserId?: number | null;
  approvedByUserId?: number | null;
  performedByUserId?: number | null;
  settleOnCreate?: boolean;
  customFields?: FinanceJson;
  metadata?: FinanceJson;
}

export interface BudgetApiDto {
  id: number;
  companyId: number;
  unitId?: number | null;
  businessId?: number | null;
  name: string;
  description?: string | null;
  periodStart: string;
  periodEnd: string;
  currencyCode: string;
  status?: BackendBudgetStatus | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  customFields?: FinanceJson;
  metadata?: FinanceJson;
}

export interface BudgetListApiResponse {
  budgets: BudgetApiDto[];
  count: number;
}

export interface BudgetApiRequest {
  unitId?: number | null;
  businessId?: number | null;
  name: string;
  description?: string | null;
  periodStart: string;
  periodEnd: string;
  currencyCode: string;
  status?: BackendBudgetStatus;
  customFields?: FinanceJson;
  metadata?: FinanceJson;
}

export interface BudgetLineApiDto {
  id: number;
  companyId: number;
  unitId?: number | null;
  businessId?: number | null;
  budgetId: number;
  name: string;
  categoryKey?: string | null;
  plannedAmount: number | string;
  committedAmount?: number | string | null;
  actualExpenseAmount?: number | string | null;
  pettyCashIssuedAmount?: number | string | null;
  pettyCashSettledAmount?: number | string | null;
  availableAmount?: number | string | null;
  healthStatus?: BackendBudgetHealthStatus | null;
  currencyCode: string;
  status?: BackendBudgetStatus | null;
  description?: string | null;
  attachmentCount?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  customFields?: FinanceJson;
  metadata?: FinanceJson;
}

export interface BudgetLineListApiResponse {
  budgetLines: BudgetLineApiDto[];
  count: number;
}

export interface BudgetLineApiRequest {
  unitId?: number | null;
  businessId?: number | null;
  budgetId: number;
  name: string;
  categoryKey?: string | null;
  plannedAmount: number;
  currencyCode: string;
  status?: BackendBudgetStatus;
  description?: string | null;
  customFields?: FinanceJson;
  metadata?: FinanceJson;
}
