// Expense Types and Interfaces

export type ExpenseStatus = 'paid' | 'pending' | 'partial' | 'overdue' | 'audited';
export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'transfer' | 'check';
export type ExpenseEntryType = 'real' | 'budget' | 'payable';
export type ExpenseFrequency = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual';
export type ExpenseTaxMode = 'none' | 'auto' | 'manual';
export type ExpensePaymentSource = 'RECORDED' | 'SETTLED_ON_CREATE' | 'LEGACY_AGGREGATE';

export interface ExpensePayment {
  id: string;
  expenseId: string;
  paymentAccountId?: string;
  paymentAccountName?: string;
  paymentAccountType?: string;
  amount: number;
  currency: string;
  paymentDate: string;
  source: ExpensePaymentSource;
  registeredByUserId?: string;
  registeredByName?: string;
  createdAt: Date;
}

export interface Expense {
  id: string;
  folio: string;
  businessUnit: string;
  business: string;
  concept: string;
  description?: string;
  category: ExpenseCategory;
  providerId?: string;
  providerName?: string;
  reference?: string;
  purchaseOrderId?: string;
  budgetId?: string;
  budgetLineId?: string;
  committedAmount?: number;
  actualExpenseAmount?: number;
  pettyCashIssuedAmount?: number;
  pettyCashSettledAmount?: number;
  availableAmount?: number;
  budgetHealthStatus?: string;
  budgetStatus?: string;
  total: number;
  taxes: number;
  taxCountry?: string;
  taxIncluded?: boolean;
  taxMode?: ExpenseTaxMode;
  taxName?: string;
  taxProfileId?: string;
  taxRate?: number;
  taxRegion?: string;
  taxSpecialAmount?: number;
  amount: number;
  amountPaid?: number;
  currency: string;
  dueDate: Date;
  paymentDate?: Date;
  date: Date;
  paymentMethod: PaymentMethod;
  accountingAccount?: string;
  paymentAccountId?: string;
  status: ExpenseStatus;
  backendPaymentStatus?: string;
  backendStatus?: string;
  approver?: string;
  requestedByUserId?: string;
  approvedByUserId?: string;
  performedByUserId?: string;
  notes?: string;
  attachments?: string[];
  attachmentCount?: number;
  costCenter?: string;
  type?: ExpenseEntryType;
  frequency?: ExpenseFrequency;
  duration?: number;
  startDate?: Date;
  projected?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export interface Provider {
  id: string;
  name: string;
  taxId: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    clabe?: string;
  };
  rating: number;
  status: 'active' | 'inactive';
  notes?: string;
  documents?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Budget {
  id: string;
  period: BudgetPeriod;
  year: number;
  month?: number;
  quarter?: number;
  categories: BudgetCategory[];
  totalBudgeted: number;
  totalSpent: number;
  status: 'active' | 'completed' | 'exceeded';
  createdAt: Date;
  updatedAt: Date;
}

export type BudgetPeriod = 'monthly' | 'quarterly' | 'annual';

export interface BudgetCategory {
  categoryId: string;
  budgeted: number;
  spent: number;
  percentage: number;
}

export interface ExpenseFilters {
  search?: string;
  categoryId?: string;
  providerId?: string;
  status?: ExpenseStatus;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
}
