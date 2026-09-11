import type { FinanceTranslations } from '../translations';
import type { Expense } from '../types/expenses.types';
import { getEffectiveExpenseStatus, getExpenseBalance, getExpensePaidAmount } from './expenseFilters';
import { printStandardDocumentPdf, type StandardDocumentDefinition } from '../../shared/print/standardDocumentPdf';

const labelsFor = (locale: string) => {
  const language = locale.toLowerCase().split('-')[0];
  const labels = {
    en: { account: 'Accounting account', amount: 'Subtotal', approval: 'Approval and control', approver: 'Approved by', attachments: 'Supporting files', category: 'Category', concept: 'Concept', description: 'Description', dueDate: 'Due date', expenseVoucher: 'Expense voucher', issuer: 'Requesting area', method: 'Payment method', notes: 'Notes', paid: 'Paid', paymentDate: 'Payment date', provider: 'Provider', requestedBy: 'Requested by', responsible: 'Performed by', tax: 'Taxes', total: 'Total', balance: 'Balance', notice: 'Internal operational voucher. It does not replace a fiscal invoice, tax receipt, or bank-issued proof of payment.' },
    es: { account: 'Cuenta contable', amount: 'Subtotal', approval: 'Autorización y control', approver: 'Autorizado por', attachments: 'Archivos de respaldo', category: 'Categoría', concept: 'Concepto', description: 'Descripción', dueDate: 'Fecha de vencimiento', expenseVoucher: 'Comprobante de gasto', issuer: 'Área solicitante', method: 'Método de pago', notes: 'Notas', paid: 'Pagado', paymentDate: 'Fecha de pago', provider: 'Proveedor', requestedBy: 'Solicitado por', responsible: 'Ejecutado por', tax: 'Impuestos', total: 'Total', balance: 'Saldo', notice: 'Comprobante operativo interno. No sustituye una factura fiscal, un comprobante tributario ni un comprobante bancario de pago.' },
    fr: { account: 'Compte comptable', amount: 'Sous-total', approval: 'Approbation et contrôle', approver: 'Approuvé par', attachments: 'Pièces justificatives', category: 'Catégorie', concept: 'Concept', description: 'Description', dueDate: 'Échéance', expenseVoucher: 'Justificatif de dépense', issuer: 'Zone demandeuse', method: 'Mode de paiement', notes: 'Notes', paid: 'Payé', paymentDate: 'Date de paiement', provider: 'Fournisseur', requestedBy: 'Demandé par', responsible: 'Exécuté par', tax: 'Taxes', total: 'Total', balance: 'Solde', notice: 'Justificatif opérationnel interne. Il ne remplace pas une facture fiscale ni une preuve bancaire.' },
    pt: { account: 'Conta contábil', amount: 'Subtotal', approval: 'Aprovação e controle', approver: 'Aprovado por', attachments: 'Arquivos de suporte', category: 'Categoria', concept: 'Conceito', description: 'Descrição', dueDate: 'Vencimento', expenseVoucher: 'Comprovante de despesa', issuer: 'Área solicitante', method: 'Forma de pagamento', notes: 'Observações', paid: 'Pago', paymentDate: 'Data de pagamento', provider: 'Fornecedor', requestedBy: 'Solicitado por', responsible: 'Executado por', tax: 'Impostos', total: 'Total', balance: 'Saldo', notice: 'Comprovante operacional interno. Não substitui nota fiscal ou comprovante bancário.' },
  };
  return labels[language as keyof typeof labels] ?? labels.en;
};

const money = (amount: number, currency: string, locale: string) => new Intl.NumberFormat(locale, {
  currency: currency || 'MXN',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'currency',
}).format(amount);

const date = (value: Date | undefined, locale: string) => value && !Number.isNaN(value.getTime())
  ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(value)
  : '-';

export interface ExpensePrintContext {
  business?: string;
  businessUnit?: string;
  accountingAccount?: string;
  paymentAccount?: string;
  requestedBy?: string;
  approvedBy?: string;
  performedBy?: string;
}

type ExpenseVoucherOptions = { expense: Expense; locale: string; t: FinanceTranslations; context?: ExpensePrintContext };

// Labels from tenant-scoped reference catalogs; internal identifiers are not printed as names.
const readableLabel = (label?: string) => label && !/^\d+$/.test(label) ? label : undefined;

export function buildExpenseVoucherDefinition({ expense, locale, t, context = {} }: ExpenseVoucherOptions): StandardDocumentDefinition {
  const labels = labelsFor(locale);
  const paid = getExpensePaidAmount(expense);
  const balance = getExpenseBalance(expense);
  const business = context.business ?? readableLabel(expense.business);
  const businessUnit = context.businessUnit ?? readableLabel(expense.businessUnit);
  return {
    accentColor: [20, 117, 20],
    confidentiality: 'Internal',
    contract: {
      category: 'transaction-document',
      modifiers: ['approval-required', 'confidential', 'internal', 'multi-currency'],
      orientation: 'portrait', pageSize: 'letter', version: '1.0',
    },
    fileName: { documentType: labels.expenseVoucher, identifier: expense.folio },
    folio: expense.folio,
    issuer: business || businessUnit,
    locale,
    metadata: [
      { label: t.expenses.modal.date, value: date(expense.date, locale) },
      { label: labels.provider, value: expense.providerName },
      { label: t.filters.unit, value: businessUnit },
      { label: t.filters.business, value: business },
      { label: labels.dueDate, value: date(expense.dueDate, locale) },
      { label: labels.paymentDate, value: date(expense.paymentDate, locale) },
      { label: labels.method, value: t.expenses.table.paymentMethods[expense.paymentMethod] ?? expense.paymentMethod },
      { label: t.expenses.payableAccount.reference, value: expense.reference },
      { label: labels.account, value: context.accountingAccount ?? readableLabel(expense.accountingAccount) },
      { label: t.paymentAccounts.headerTitle, value: context.paymentAccount },
    ],
    metrics: [
      { label: `${labels.total} (${expense.currency})`, value: money(expense.total, expense.currency, locale) },
      { label: labels.paid, tone: paid > 0 ? 'positive' : 'default', value: money(paid, expense.currency, locale) },
      { label: labels.balance, tone: balance > 0 ? 'warning' : 'positive', value: money(balance, expense.currency, locale) },
    ],
    notice: labels.notice,
    recipient: expense.providerName,
    sections: expense.description || expense.notes ? [{
      title: labels.notes,
      paragraphs: [expense.description, expense.notes].filter((value): value is string => Boolean(value)),
    }] : undefined,
    tables: [{
      title: labels.expenseVoucher,
      columns: [labels.concept, labels.amount, labels.tax, labels.total],
      rows: [[expense.concept, money(expense.amount, expense.currency, locale),
        money(expense.taxes, expense.currency, locale), money(expense.total, expense.currency, locale)]],
    }],
    signatures: [
      { caption: context.requestedBy, label: labels.requestedBy },
      { caption: context.approvedBy ?? readableLabel(expense.approver), label: labels.approver },
      { caption: context.performedBy, label: labels.responsible },
    ],
    status: t.expenses.table.statuses[getEffectiveExpenseStatus(expense)] ?? expense.status,
    subtitle: expense.concept,
    title: labels.expenseVoucher,
  };
}

export function printExpenseVoucher(options: ExpenseVoucherOptions) {
  return printStandardDocumentPdf(buildExpenseVoucherDefinition(options));
}
