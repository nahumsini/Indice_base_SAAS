import type { Expense } from '../types/expenses.types';

export const DEFAULT_EXPENSE_COLUMN_WIDTHS: Record<string, number> = {
  folio: 110,
  businessUnit: 120,
  business: 120,
  providerName: 180,
  concept: 180,
  description: 200,
  total: 120,
  taxes: 130,
  amount: 120,
  amountPaid: 120,
  balance: 120,
  dueDate: 130,
  paymentDate: 130,
  paymentMethod: 150,
  accountingAccount: 150,
  status: 140,
  attachments: 130,
  authorizer: 180,
  performer: 180,
  audit: 180,
  actions: 150,
};

export const EXPENSE_USER_OPTIONS = [
  'Usuario Demo',
  'Jane Doe',
  'John Admin',
  'Marketing Manager',
  'CEO',
  'CFO',
  'Operations Manager',
  'Restaurant Manager',
  'Facilities Manager',
  'Security Director',
  'Logistics Manager',
  'IT Director',
  'IT Manager',
  'HR Director',
  'HR Manager',
  'Sales Director',
  'Office Manager',
];

export type ExpenseSortField = keyof Expense | 'balance';

export type ExpenseHeaderConfig = {
  key: string;
  label: string;
  sortable?: ExpenseSortField;
  visibleWhen?: string;
};

export const EXPENSE_TABLE_HEADERS: ExpenseHeaderConfig[] = [
  { key: 'folio', label: 'Folio', sortable: 'folio' },
  { key: 'businessUnit', label: 'Unidad', sortable: 'businessUnit' },
  { key: 'business', label: 'Negocio', sortable: 'business' },
  { key: 'providerName', label: 'Proveedor', sortable: 'providerName' },
  { key: 'concept', label: 'Concepto', sortable: 'concept' },
  { key: 'description', label: 'Descripción', sortable: 'description' },
  { key: 'total', label: 'Total', sortable: 'total', visibleWhen: 'total' },
  { key: 'taxes', label: 'Impuestos', sortable: 'taxes', visibleWhen: 'taxes' },
  { key: 'amount', label: 'Monto', sortable: 'amount', visibleWhen: 'amount' },
  {
    key: 'amountPaid',
    label: 'Abonado',
    sortable: 'amountPaid',
    visibleWhen: 'amountPaid',
  },
  { key: 'balance', label: 'Saldo', sortable: 'balance', visibleWhen: 'balance' },
  { key: 'dueDate', label: 'F. Vencimiento', sortable: 'dueDate' },
  { key: 'paymentDate', label: 'F. Pago', sortable: 'paymentDate' },
  { key: 'paymentMethod', label: 'Método de Pago', sortable: 'paymentMethod' },
  {
    key: 'accountingAccount',
    label: 'Cuenta Contable',
    sortable: 'accountingAccount',
  },
  { key: 'status', label: 'Estado', sortable: 'status' },
  { key: 'attachments', label: 'Archivos Adjuntos', sortable: 'attachments' },
  { key: 'authorizer', label: 'Autoriza' },
  { key: 'performer', label: 'Responsable' },
  { key: 'audit', label: 'Auditoría' },
];
