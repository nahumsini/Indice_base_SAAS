import type { Expense } from '../types/expenses.types';
import type { ColumnConfig } from '../types/expenseView.types';
import type { FinanceReferenceOption } from '../types/finance-reference.types';
import type { FinanceTranslations } from '../translations';
import type { StandardDocumentDefinition } from '../../shared/print/standardDocumentPdf';
import { getEffectiveExpenseStatus, getExpenseBalance, getExpensePaidAmount } from './expenseFilters';
import { getExpenseTablePrintCopy } from './expenseTablePrint.copy';

export type ExpensePrintSnapshot = { all: Expense[]; selected: Expense[] };
export type ExpensePrintReferences = {
  units: FinanceReferenceOption[]; businesses: FinanceReferenceOption[];
  accounts: FinanceReferenceOption[]; users: FinanceReferenceOption[];
};
type Options = {
  expenses: Expense[]; columns: ColumnConfig[]; companyName: string; locale: string;
  filters: string; scope: string; t: FinanceTranslations; references: ExpensePrintReferences; generatedAt?: Date;
};
export const expensePrintMoneyKeys = new Set(['amount', 'taxes', 'total', 'amountPaid', 'balance']);
const label = (options: FinanceReferenceOption[], id?: string) => options.find(option => option.value === id)?.label
  ?? (id && !/^\d+$/.test(id) ? id : '—');

export function buildExpenseTableDocument({ expenses, columns, companyName, locale, filters, scope, t, references, generatedAt = new Date() }: Options): StandardDocumentDefinition {
  const copy = getExpenseTablePrintCopy(locale);
  const seen = new Set<string>();
  const rows = expenses.filter(expense => {
    if (seen.has(expense.id) || expense.originFund?.type === 'EXTERNAL_MANAGED') return false;
    seen.add(expense.id); return true;
  });
  const visible = columns.filter(column => column.visible && column.key !== 'actions');
  const money = (value: number, currency: string) => `${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} ${currency}`;
  const date = (value?: Date) => value && !Number.isNaN(value.getTime()) ? new Intl.DateTimeFormat(locale).format(value) : '—';
  const cell = (expense: Expense, key: string): string => {
    if (key === 'amountPaid') return money(getExpensePaidAmount(expense), expense.currency);
    if (key === 'balance') return money(getExpenseBalance(expense), expense.currency);
    if (key === 'total' || key === 'amount' || key === 'taxes') return money(expense[key], expense.currency);
    if (key === 'date' || key === 'dueDate' || key === 'paymentDate') return date(expense[key]);
    if (key === 'businessUnit') return label(references.units, expense.businessUnit);
    if (key === 'business') return label(references.businesses, expense.business);
    if (key === 'accountingAccount') return label(references.accounts, expense.accountingAccount);
    if (key === 'authorizer') return label(references.users, expense.approvedByUserId ?? expense.approver);
    if (key === 'performer') return label(references.users, expense.performedByUserId);
    if (key === 'paymentMethod') return t.expenses.table.paymentMethods[expense.paymentMethod] ?? '—';
    if (key === 'status') return t.expenses.table.statuses[getEffectiveExpenseStatus(expense)];
    if (key === 'attachments') return String(expense.attachmentCount ?? expense.attachments?.length ?? 0);
    if (key === 'audit') return expense.auditStatus === 'AUDITED' ? t.expenses.table.statuses.audited : '—';
    if (key === 'folio' || key === 'concept' || key === 'description' || key === 'providerName') return expense[key] || '—';
    return '—';
  };
  // Wide column selections become successive table sections; no selected field is dropped or shrunk to fit.
  const chunks: ColumnConfig[][] = [];
  if (visible.length) chunks.push(visible.slice(0, 8));
  for (let index = 8; index < visible.length; index += 7) chunks.push(visible.slice(index, index + 7));
  const tables: NonNullable<StandardDocumentDefinition['tables']> = chunks.map((chunk, index) => {
    const tableColumns = index > 0 && visible.some(column => column.key === 'folio') && !chunk.some(column => column.key === 'folio')
      ? [visible.find(column => column.key === 'folio')!, ...chunk] : chunk;
    return { title: chunks.length > 1 ? `${copy.section} ${index + 1} / ${chunks.length}` : undefined,
      columns: tableColumns.map(column => column.label), avoidRowSplit: true, fontSize: 9,
      numericColumnIndices: tableColumns.flatMap((column, position) => expensePrintMoneyKeys.has(column.key) ? [position] : []),
      rows: rows.map(expense => tableColumns.map(column => cell(expense, column.key))), emptyMessage: copy.empty };
  });
  const nativeTotals = new Map<string, { total: number; paid: number; balance: number }>();
  for (const expense of rows) {
    const amounts = nativeTotals.get(expense.currency) ?? { total: 0, paid: 0, balance: 0 };
    amounts.total += Math.round(expense.total * 10000);
    amounts.paid += Math.round(getExpensePaidAmount(expense) * 10000);
    amounts.balance += Math.round(getExpenseBalance(expense) * 10000);
    nativeTotals.set(expense.currency, amounts);
  }
  tables.push({ title: copy.totals, avoidRowSplit: true, keepTogether: true, fontSize: 9,
    columns: [t.expenses.modal.currency, t.expenses.modal.summaryTotal, t.expenses.columns.amountPaid.label, t.expenses.columns.balance.label],
    numericColumnIndices: [1, 2, 3],
    rows: [...nativeTotals].map(([currency, amounts]) => [currency, money(amounts.total / 10000, currency), money(amounts.paid / 10000, currency), money(amounts.balance / 10000, currency)]), emptyMessage: copy.empty });
  return {
    title: copy.title, issuer: companyName, showIssuerMetadata: false,
    continuationHeader: [companyName, copy.title].filter(Boolean).join(' · '), locale, generatedAt, accentColor: [20, 117, 20],
    confidentiality: 'Internal', subtitle: `${scope} · ${rows.length} ${copy.rows}`,
    contract: { category: 'tab-print', modifiers: ['internal', 'confidential', 'multi-currency'], pageSize: 'a4', orientation: visible.length > 5 ? 'landscape' : 'portrait', version: '1.0' },
    fileName: { documentType: copy.title, companyName, period: generatedAt.toISOString().slice(0, 10) },
    sections: [{ title: copy.filters, paragraphs: [filters || copy.all, copy.notice] }], tables,
  };
}
