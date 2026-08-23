import type { ColumnConfig } from '../types/expenseView.types';

export const DEFAULT_EXPENSE_COLUMNS: ColumnConfig[] = [
  { key: 'folio', label: 'Folio', visible: true },
  { key: 'date', label: 'Expense date', visible: true },
  { key: 'businessUnit', label: 'Unit', visible: false },
  { key: 'business', label: 'Business', visible: false },
  { key: 'providerName', label: 'Provider', visible: true },
  { key: 'concept', label: 'Concept', visible: true },
  { key: 'description', label: 'Description', visible: false },
  { key: 'total', label: 'Total', visible: true },
  { key: 'taxes', label: 'Tax', visible: false },
  { key: 'amount', label: 'Subtotal', visible: false },
  { key: 'amountPaid', label: 'Paid', visible: false },
  { key: 'balance', label: 'Balance', visible: true },
  { key: 'dueDate', label: 'Due date', visible: true },
  { key: 'paymentDate', label: 'Payment date', visible: false },
  { key: 'paymentMethod', label: 'Payment method', visible: false },
  { key: 'accountingAccount', label: 'Accounting account', visible: false },
  { key: 'status', label: 'Status', visible: true },
  { key: 'attachments', label: 'Attachments', visible: false },
  { key: 'authorizer', label: 'Authorizer', visible: false },
  { key: 'performer', label: 'Responsible', visible: false },
  { key: 'audit', label: 'Audit', visible: false },
  { key: 'actions', label: 'Actions', visible: true, fixed: true },
];

export const EXPENSE_BUSINESS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'retail', label: 'Retail' },
  { value: 'services', label: 'Servicios' },
];
