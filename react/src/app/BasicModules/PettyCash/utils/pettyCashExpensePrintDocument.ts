import type { CashFund, PettyCashExpense } from '../types/pettyCash.types';
import { pettyCashAuditStatusLabels, pettyCashStatusLabels } from './pettyCash.utils';
import { printStandardDocumentPdf } from '../../shared/print/standardDocumentPdf';

const money = (amount: number, currency: string, locale: string) => new Intl.NumberFormat(locale, {
  currency,
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'currency',
}).format(amount);

const date = (value: Date | undefined, locale: string) => value
  ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(value)
  : '—';

export function printPettyCashExpenseVoucher(
  expense: PettyCashExpense,
  fund?: CashFund,
  locale = 'es-MX',
) {
  const currency = fund?.currency || 'MXN';
  return printStandardDocumentPdf({
    accentColor: [20, 117, 20],
    confidentiality: 'Confidential',
    contract: {
      category: 'transaction-document',
      modifiers: ['approval-required', 'confidential', 'internal', 'signature-required'],
      orientation: 'portrait',
      pageSize: 'letter',
      version: '1.0',
    },
    fileName: { documentType: 'comprobante-caja-chica', identifier: expense.folio },
    folio: expense.folio,
    issuer: expense.business || expense.businessUnit || expense.cashFundName,
    locale,
    metadata: [
      { label: 'Fondo', value: expense.cashFundName },
      { label: 'Unidad', value: expense.businessUnit },
      { label: 'Negocio', value: expense.business },
      { label: 'Departamento', value: expense.department },
      { label: 'Colaborador', value: expense.collaborator },
      { label: 'Fecha del gasto', value: date(expense.date, locale) },
      { label: 'Fecha límite', value: date(expense.dueDate, locale) },
      { label: 'Fecha de comprobación', value: date(expense.settledDate, locale) },
    ],
    metrics: [
      { label: 'Entregado', value: money(expense.amountIssued, currency, locale) },
      { label: 'Comprobado', tone: expense.amountSettled > 0 ? 'positive' : 'default', value: money(expense.amountSettled, currency, locale) },
      { label: 'Saldo', tone: expense.balance > 0 ? 'warning' : 'positive', value: money(expense.balance, currency, locale) },
      { label: 'Comprobantes', value: expense.receiptCount },
    ],
    notice: fund
      ? 'Comprobante operativo interno de caja chica. No sustituye comprobantes fiscales ni bancarios.'
      : 'Comprobante operativo interno. El registro legado no expone moneda; el documento usa MXN como presentación actual del módulo.',
    recipient: expense.collaborator,
    sections: [
      {
        fields: [
          { label: 'Categoría', value: expense.category },
          { label: 'Concepto', value: expense.concept },
          { label: 'Descripción', value: expense.description },
          { label: 'Método', value: expense.paymentMethod },
          { label: 'Autorizador', value: expense.approver },
          { label: 'Estado de auditoría', value: pettyCashAuditStatusLabels[expense.auditStatus] },
        ],
        paragraphs: [expense.notes || '', expense.auditNotes || ''].filter(Boolean),
        title: 'Detalle y comprobación',
      },
    ],
    signatures: [
      { caption: expense.collaborator, label: 'Colaborador' },
      { caption: expense.approver, label: 'Autorizó' },
      { label: 'Revisó / caja chica' },
    ],
    status: pettyCashStatusLabels[expense.status],
    subtitle: `${expense.cashFundName} · ${expense.concept}`,
    title: 'Comprobante de gasto de caja chica',
  });
}
