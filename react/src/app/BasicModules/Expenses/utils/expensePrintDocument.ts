import type { FinanceTranslations } from '../translations';
import type { Expense } from '../types/expenses.types';
import { getExpenseBalance, getExpensePaidAmount } from './expenseFilters';
import { printStandardDocumentPdf } from '../../shared/print/standardDocumentPdf';

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

const date = (value: Date | undefined, locale: string) => value
  ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(value)
  : '-';

export function printExpenseVoucher({
  expense,
  locale,
  t,
}: {
  expense: Expense;
  locale: string;
  t: FinanceTranslations;
}) {
  const labels = labelsFor(locale);
  const paid = getExpensePaidAmount(expense);
  const balance = getExpenseBalance(expense);
  return printStandardDocumentPdf({
    accentColor: [20, 117, 20],
    confidentiality: 'Internal',
    contract: {
      category: 'transaction-document',
      modifiers: ['approval-required', 'confidential', 'internal', 'multi-currency'],
      orientation: 'portrait',
      pageSize: 'letter',
      version: '1.0',
    },
    fileName: { documentType: labels.expenseVoucher, identifier: expense.folio },
    folio: expense.folio,
    issuer: expense.business || expense.businessUnit,
    locale,
    metadata: [
      { label: t.expenses.columns.businessUnit?.label || labels.issuer, value: expense.businessUnit },
      { label: t.expenses.columns.business?.label || 'Business', value: expense.business },
      { label: labels.provider, value: expense.providerName },
      { label: labels.category, value: `${expense.category.emoji} ${expense.category.name}` },
      { label: labels.dueDate, value: date(expense.dueDate, locale) },
      { label: labels.paymentDate, value: date(expense.paymentDate, locale) },
    ],
    metrics: [
      { label: labels.amount, value: money(expense.amount, expense.currency, locale) },
      { label: labels.tax, value: money(expense.taxes, expense.currency, locale) },
      { label: labels.total, value: money(expense.total, expense.currency, locale) },
      { label: labels.paid, tone: paid > 0 ? 'positive' : 'default', value: money(paid, expense.currency, locale) },
      { label: labels.balance, tone: balance > 0 ? 'warning' : 'positive', value: money(balance, expense.currency, locale) },
    ],
    notice: labels.notice,
    recipient: expense.providerName,
    sections: [
      {
        fields: [
          { label: labels.concept, value: expense.concept },
          { label: labels.description, value: expense.description },
          { label: labels.method, value: t.expenses.table.paymentMethods[expense.paymentMethod] ?? expense.paymentMethod },
          { label: labels.account, value: expense.accountingAccount },
          { label: labels.attachments, value: expense.attachmentCount ?? expense.attachments?.length ?? 0 },
        ],
        title: labels.expenseVoucher,
      },
      {
        fields: [
          { label: labels.requestedBy, value: expense.requestedByUserId },
          { label: labels.approver, value: expense.approver || expense.approvedByUserId },
          { label: labels.responsible, value: expense.performedByUserId },
        ],
        paragraphs: expense.notes ? [expense.notes] : undefined,
        title: labels.approval,
      },
    ],
    signatures: [
      { caption: expense.requestedByUserId, label: labels.requestedBy },
      { caption: expense.approver || expense.approvedByUserId, label: labels.approver },
      { caption: expense.performedByUserId, label: labels.responsible },
    ],
    status: t.expenses.table.statuses[expense.status] ?? expense.status,
    subtitle: expense.concept,
    title: labels.expenseVoucher,
  });
}
