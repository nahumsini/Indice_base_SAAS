export type CreditSaleStatus =
  | 'draft'
  | 'simulated'
  | 'approved'
  | 'active'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type ReceivableStatus =
  | 'on_time'
  | 'due_soon'
  | 'overdue'
  | 'partial'
  | 'paid'
  | 'restructured'
  | 'cancelled';

export type CreditCustomerStatus = 'active' | 'review' | 'blocked';

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'check' | 'wallet';

export type PeriodFilter = 'all' | 'today' | 'this_week' | 'this_month' | 'last_month';

export type CreditPolicy = {
  id: string;
  customerId: string;
  contactId?: number | null;
  unitId?: number | null;
  businessId?: number | null;
  customerName: string;
  currency?: string;
  creditLine: number;
  monthlyPurchaseLimit: number;
  defaultTermMonths: number;
  annualInterestRate: number;
  availableCredit: number;
  status: CreditCustomerStatus;
  unit: string;
  business: string;
  notes: string;
};

export type CreditSimulation = {
  id: string;
  name: string;
  termMonths: number;
  annualInterestRate: number;
  monthlyPayment: number;
  totalPayable: number;
  totalInterest: number;
};

export type CreditSale = {
  id: string;
  saleId: string;
  salesRecordId?: number | null;
  posTicketId?: number | null;
  contactId?: number | null;
  unitId?: number | null;
  businessId?: number | null;
  saleNumber: string;
  customerId: string;
  customerName: string;
  unit: string;
  business: string;
  saleDate: string;
  originalAmount: number;
  financedAmount: number;
  currency: string;
  status: CreditSaleStatus;
  selectedSimulation: CreditSimulation;
  firstDueDate: string;
  source: 'sales' | 'pos' | 'manual';
};

export type ReceivableAccount = {
  id: string;
  creditSaleId: string;
  salesRecordId?: number | null;
  posTicketId?: number | null;
  contactId?: number | null;
  unitId?: number | null;
  businessId?: number | null;
  saleNumber: string;
  customerId: string;
  customerName: string;
  unit: string;
  business: string;
  currency: string;
  originalAmount: number;
  totalPayable: number;
  paidAmount: number;
  balance: number;
  dueDate: string;
  nextPaymentDate: string;
  installmentAmount: number;
  termMonths: number;
  annualInterestRate: number;
  status: ReceivableStatus;
};

export type ReceivableInstallment = {
  id: string;
  receivableId: string;
  creditSaleId: string;
  installmentNumber: number;
  saleNumber: string;
  customerName: string;
  unit: string;
  business: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  balance: number;
  currency: string;
  status: ReceivableStatus;
};

export type ReceivablePayment = {
  id: string;
  receivableId: string;
  saleNumber: string;
  customerName: string;
  currency?: string;
  paymentDate: string;
  method: PaymentMethod;
  amount: number;
  reference: string;
  registeredBy: string;
  receiptDataUrl?: string;
  receiptFileName?: string;
  receiptImageDataUrl?: string;
  receiptMimeType?: string;
};

export type CandidateSale = {
  id: string;
  salesRecordId?: number | null;
  posTicketId?: number | null;
  contactId?: number | null;
  unitId?: number | null;
  businessId?: number | null;
  saleNumber: string;
  customerId: string;
  customerName: string;
  unit: string;
  business: string;
  saleDate: string;
  amount: number;
  currency: string;
  source: 'sales' | 'pos' | 'manual';
};

export type ReceivablesState = {
  creditSales: CreditSale[];
  receivables: ReceivableAccount[];
  installments: ReceivableInstallment[];
  payments: ReceivablePayment[];
  creditPolicies: CreditPolicy[];
};

export type CandidateCreditCustomer = {
  id: string;
  contactId?: number | null;
  unitId?: number | null;
  businessId?: number | null;
  name: string;
  unit: string;
  business: string;
};
