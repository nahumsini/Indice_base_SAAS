import type { ReceivablesTranslations } from '../translations';
import type {
  CreditPolicy,
  CreditSale,
  ReceivableAccount,
  ReceivableInstallment,
  ReceivablePayment,
} from '../types';
import { createReceivableFromCreditSale } from '../utils';
import { downloadStandardDocumentPdf, printStandardDocumentPdf, type StandardDocumentDefinition } from '../../shared/print/standardDocumentPdf';

type PrintLabels = {
  aging: string;
  agingNotice: string;
  amount: string;
  annualInterest: string;
  available: string;
  balance: string;
  business: string;
  creditLine: string;
  current: string;
  customer: string;
  customerStatement: string;
  date: string;
  dueDate: string;
  installments: string;
  method: string;
  monthlyLimit: string;
  notes: string;
  overdue: string;
  paid: string;
  paymentReceipt: string;
  paymentReceiptNotice: string;
  receiptAttachment: string;
  reference: string;
  registeredBy: string;
  schedule: string;
  sale: string;
  statementNotice: string;
  status: string;
  term: string;
  totalRecords: string;
  totalPayable: string;
  unit: string;
};

const labelsFor = (locale: string): PrintLabels => {
  const language = locale.toLowerCase().split('-')[0];
  const labels: Record<string, PrintLabels> = {
    en: {
      aging: 'Accounts receivable aging', agingNotice: 'Operational collection report. Amounts remain in their native currency and are not combined across currencies.', amount: 'Amount', annualInterest: 'Annual interest', available: 'Available credit', balance: 'Balance', business: 'Business', creditLine: 'Credit line', current: 'Current', customer: 'Customer', customerStatement: 'Customer credit statement', date: 'Date', dueDate: 'Due date', installments: 'Installments', method: 'Payment method', monthlyLimit: 'Monthly limit', notes: 'Notes', overdue: 'Overdue', paid: 'Paid', paymentReceipt: 'Payment receipt', paymentReceiptNotice: 'Operational payment receipt. It is not a fiscal receipt or bank-issued proof.', receiptAttachment: 'Supporting file', reference: 'Reference', registeredBy: 'Registered by', schedule: 'Financial schedule', sale: 'Sale', statementNotice: 'Confidential operational statement. Confirm transactions and balances with the source system before collection actions.', status: 'Status', term: 'Term', totalPayable: 'Total payable', totalRecords: 'Records', unit: 'Business unit',
    },
    es: {
      aging: 'Antigüedad de saldos', agingNotice: 'Reporte operativo de cobranza. Los importes permanecen en su moneda nativa y no se suman entre divisas.', amount: 'Importe', annualInterest: 'Interés anual', available: 'Crédito disponible', balance: 'Saldo', business: 'Negocio', creditLine: 'Línea de crédito', current: 'Al corriente', customer: 'Cliente', customerStatement: 'Estado de cuenta de crédito', date: 'Fecha', dueDate: 'Vencimiento', installments: 'Parcialidades', method: 'Método de pago', monthlyLimit: 'Límite mensual', notes: 'Notas', overdue: 'Vencido', paid: 'Pagado', paymentReceipt: 'Recibo de pago', paymentReceiptNotice: 'Comprobante operativo de pago. No constituye comprobante fiscal ni comprobante emitido por una institución bancaria.', receiptAttachment: 'Archivo de respaldo', reference: 'Referencia', registeredBy: 'Registrado por', schedule: 'Corrida financiera', sale: 'Venta', statementNotice: 'Estado de cuenta operativo y confidencial. Confirma movimientos y saldos con el sistema antes de realizar gestiones de cobranza.', status: 'Estado', term: 'Plazo', totalPayable: 'Total a pagar', totalRecords: 'Registros', unit: 'Unidad de negocio',
    },
    fr: {
      aging: 'Ancienneté des soldes', agingNotice: 'Rapport opérationnel de recouvrement. Les montants restent dans leur devise d’origine.', amount: 'Montant', annualInterest: 'Intérêt annuel', available: 'Crédit disponible', balance: 'Solde', business: 'Entreprise', creditLine: 'Ligne de crédit', current: 'À jour', customer: 'Client', customerStatement: 'Relevé de compte de crédit', date: 'Date', dueDate: 'Échéance', installments: 'Échéances', method: 'Mode de paiement', monthlyLimit: 'Limite mensuelle', notes: 'Notes', overdue: 'En retard', paid: 'Payé', paymentReceipt: 'Reçu de paiement', paymentReceiptNotice: 'Reçu opérationnel; il ne s’agit ni d’un document fiscal ni d’une preuve bancaire.', receiptAttachment: 'Pièce justificative', reference: 'Référence', registeredBy: 'Enregistré par', schedule: 'Échéancier financier', sale: 'Vente', statementNotice: 'Relevé opérationnel confidentiel. Confirmez les mouvements et les soldes dans le système source.', status: 'Statut', term: 'Durée', totalPayable: 'Total à payer', totalRecords: 'Enregistrements', unit: 'Unité d’affaires',
    },
    pt: {
      aging: 'Antiguidade de saldos', agingNotice: 'Relatório operacional de cobrança. Os valores permanecem em sua moeda nativa.', amount: 'Valor', annualInterest: 'Juros anuais', available: 'Crédito disponível', balance: 'Saldo', business: 'Negócio', creditLine: 'Linha de crédito', current: 'Em dia', customer: 'Cliente', customerStatement: 'Extrato de crédito do cliente', date: 'Data', dueDate: 'Vencimento', installments: 'Parcelas', method: 'Forma de pagamento', monthlyLimit: 'Limite mensal', notes: 'Observações', overdue: 'Vencido', paid: 'Pago', paymentReceipt: 'Recibo de pagamento', paymentReceiptNotice: 'Recibo operacional; não é documento fiscal nem comprovante bancário.', receiptAttachment: 'Arquivo de suporte', reference: 'Referência', registeredBy: 'Registrado por', schedule: 'Cronograma financeiro', sale: 'Venda', statementNotice: 'Extrato operacional confidencial. Confirme movimentos e saldos no sistema de origem.', status: 'Status', term: 'Prazo', totalPayable: 'Total a pagar', totalRecords: 'Registros', unit: 'Unidade de negócio',
    },
  };
  return labels[language] ?? labels.en;
};

const money = (amount: number, currency: string, locale: string) => new Intl.NumberFormat(locale, {
  currency: currency || 'MXN',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'currency',
}).format(amount);

const date = (value: string, locale: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(parsed);
};

const totalsByCurrency = <Row,>(
  rows: Row[],
  locale: string,
  amount: (row: Row) => number,
  currency: (row: Row) => string,
) => Array.from(rows.reduce((totals, row) => {
  const code = currency(row) || 'MXN';
  totals.set(code, (totals.get(code) ?? 0) + amount(row));
  return totals;
}, new Map<string, number>())).map(([code, total]) => money(total, code, locale)).join(' · ') || '-';

export function printReceivablePaymentReceipt({
  account,
  copy,
  locale,
  payment,
}: {
  account?: ReceivableAccount;
  copy: ReceivablesTranslations;
  locale: string;
  payment: ReceivablePayment;
}) {
  const labels = labelsFor(locale);
  const currency = payment.currency || account?.currency || 'MXN';
  return printStandardDocumentPdf({
    accentColor: [20, 117, 20],
    confidentiality: 'Confidential',
    contract: {
      category: 'transaction-document',
      modifiers: ['confidential', 'customer-facing'],
      orientation: 'portrait',
      pageSize: 'letter',
      version: '1.0',
    },
    fileName: { documentType: labels.paymentReceipt, identifier: payment.id },
    folio: payment.id,
    issuer: account?.business || account?.unit,
    locale,
    metadata: [
      { label: labels.date, value: date(payment.paymentDate, locale) },
      { label: labels.sale, value: payment.saleNumber },
      { label: labels.unit, value: account?.unit },
      { label: labels.business, value: account?.business },
    ],
    metrics: [
      { label: labels.amount, tone: 'positive', value: money(payment.amount, currency, locale) },
      { label: labels.method, value: copy.paymentMethods[payment.method] },
    ],
    notice: labels.paymentReceiptNotice,
    recipient: payment.customerName,
    sections: [{
      fields: [
        { label: labels.reference, value: payment.reference || copy.common.noReference },
        { label: labels.registeredBy, value: payment.registeredBy },
        { label: labels.receiptAttachment, value: payment.receiptFileName || '-' },
      ],
      title: labels.paymentReceipt,
    }],
    signatures: [
      { caption: payment.registeredBy, label: labels.registeredBy },
      { caption: payment.customerName, label: payment.customerName },
    ],
    status: copy.status.paid,
    subtitle: `${labels.sale} ${payment.saleNumber}`,
    title: labels.paymentReceipt,
  });
}

export function printCreditCustomerStatement({
  accounts,
  copy,
  installments,
  locale,
  payments,
  policy,
}: {
  accounts: ReceivableAccount[];
  copy: ReceivablesTranslations;
  installments: ReceivableInstallment[];
  locale: string;
  payments: ReceivablePayment[];
  policy: CreditPolicy;
}) {
  const labels = labelsFor(locale);
  const customerAccounts = accounts.filter((account) => account.customerId === policy.customerId);
  const accountIds = new Set(customerAccounts.map((account) => account.id));
  const customerInstallments = installments.filter((installment) => accountIds.has(installment.receivableId));
  const customerPayments = payments.filter((payment) => accountIds.has(payment.receivableId));
  return printStandardDocumentPdf({
    accentColor: [20, 117, 20],
    confidentiality: 'Confidential',
    contract: {
      category: 'transaction-document',
      modifiers: ['confidential', 'customer-facing', 'multi-currency'],
      orientation: 'portrait',
      pageSize: 'letter',
      version: '1.0',
    },
    fileName: { documentType: labels.customerStatement, identifier: policy.id },
    folio: policy.id,
    issuer: policy.business || policy.unit,
    locale,
    metadata: [
      { label: labels.unit, value: policy.unit },
      { label: labels.business, value: policy.business },
      { label: labels.term, value: `${policy.defaultTermMonths}` },
      { label: labels.annualInterest, value: `${policy.annualInterestRate.toFixed(2)}%` },
    ],
    metrics: [
      { label: labels.creditLine, value: money(policy.creditLine, customerAccounts[0]?.currency || 'MXN', locale) },
      { label: labels.available, tone: 'positive', value: money(policy.availableCredit, customerAccounts[0]?.currency || 'MXN', locale) },
      { label: labels.balance, tone: customerAccounts.some((account) => account.status === 'overdue') ? 'negative' : 'default', value: totalsByCurrency(customerAccounts, locale, (account) => account.balance, (account) => account.currency) },
      { label: labels.paid, value: totalsByCurrency(customerPayments, locale, (payment) => payment.amount, (payment) => payment.currency || customerAccounts.find((account) => account.id === payment.receivableId)?.currency || 'MXN') },
    ],
    notice: labels.statementNotice,
    recipient: policy.customerName,
    sections: policy.notes ? [{ paragraphs: [policy.notes], title: labels.notes }] : undefined,
    status: copy.creditCustomerStatus[policy.status],
    subtitle: `${labels.creditLine}: ${money(policy.creditLine, customerAccounts[0]?.currency || 'MXN', locale)}`,
    tables: [
      {
        columns: [labels.sale, labels.dueDate, labels.amount, labels.paid, labels.balance, labels.status],
        rows: customerInstallments.map((installment) => [
          `${installment.saleNumber} · #${installment.installmentNumber}`,
          date(installment.dueDate, locale),
          money(installment.amount, installment.currency, locale),
          money(installment.paidAmount, installment.currency, locale),
          money(installment.balance, installment.currency, locale),
          copy.status[installment.status],
        ]),
        title: labels.installments,
      },
      {
        columns: [labels.date, labels.sale, labels.method, labels.reference, labels.amount],
        rows: customerPayments.map((payment) => [
          date(payment.paymentDate, locale),
          payment.saleNumber,
          copy.paymentMethods[payment.method],
          payment.reference || copy.common.noReference,
          money(payment.amount, payment.currency || customerAccounts.find((account) => account.id === payment.receivableId)?.currency || 'MXN', locale),
        ]),
        title: labels.paid,
      },
    ],
    title: labels.customerStatement,
  });
}

export function printReceivablesAgingReport({
  copy,
  filterSummary,
  installments,
  locale,
}: {
  copy: ReceivablesTranslations;
  filterSummary: string;
  installments: ReceivableInstallment[];
  locale: string;
}) {
  const labels = labelsFor(locale);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = installments.filter((installment) => (
    installment.balance > 0 && new Date(`${installment.dueDate}T00:00:00`) < today
  ));
  const current = installments.filter((installment) => installment.balance > 0 && !overdue.includes(installment));
  const bucket = (installment: ReceivableInstallment) => {
    if (installment.balance <= 0) return labels.paid;
    const days = Math.max(0, Math.floor((today.getTime() - new Date(`${installment.dueDate}T00:00:00`).getTime()) / 86_400_000));
    if (days === 0) return labels.current;
    if (days <= 30) return '1-30';
    if (days <= 60) return '31-60';
    if (days <= 90) return '61-90';
    return '90+';
  };
  return printStandardDocumentPdf({
    accentColor: [20, 117, 20],
    confidentiality: 'Confidential',
    contract: {
      category: 'operational-report',
      modifiers: ['confidential', 'internal', 'multi-currency'],
      orientation: 'landscape',
      pageSize: 'a4',
      version: '1.0',
    },
    fileName: { documentType: labels.aging, period: new Date().toISOString().slice(0, 10) },
    locale,
    metadata: [{ label: copy.filters.title, value: filterSummary }],
    metrics: [
      { label: labels.totalRecords, value: installments.length },
      { label: labels.current, tone: 'positive', value: current.length },
      { label: labels.overdue, tone: overdue.length ? 'negative' : 'positive', value: overdue.length },
      { label: labels.balance, value: totalsByCurrency(installments, locale, (installment) => installment.balance, (installment) => installment.currency) },
    ],
    notice: labels.agingNotice,
    subtitle: filterSummary,
    tables: [{
      columns: [labels.sale, labels.customer, labels.unit, labels.business, labels.dueDate, labels.status, labels.amount, labels.paid, labels.balance, labels.aging],
      rows: installments.map((installment) => [
        `${installment.saleNumber} · #${installment.installmentNumber}`,
        installment.customerName,
        installment.unit,
        installment.business,
        date(installment.dueDate, locale),
        copy.status[installment.status],
        money(installment.amount, installment.currency, locale),
        money(installment.paidAmount, installment.currency, locale),
        money(installment.balance, installment.currency, locale),
        bucket(installment),
      ]),
    }],
    title: labels.aging,
  });
}

type CreditSaleScheduleDocumentInput = {
  copy: ReceivablesTranslations;
  installments: ReceivableInstallment[];
  locale: string;
  sale: CreditSale;
};

const buildCreditSaleScheduleDocument = ({ copy, installments, locale, sale }: CreditSaleScheduleDocumentInput): StandardDocumentDefinition => {
  const labels = labelsFor(locale);
  const account = createReceivableFromCreditSale(sale);
  return {
    accentColor: [20, 117, 20],
    confidentiality: 'Confidential',
    contract: {
      category: 'transaction-document',
      modifiers: ['confidential', 'customer-facing', 'multi-currency'],
      orientation: 'portrait',
      pageSize: 'letter',
      version: '1.0',
    },
    fileName: { documentType: labels.schedule, identifier: sale.saleNumber },
    folio: sale.saleNumber,
    issuer: sale.business || sale.unit,
    locale,
    metadata: [
      { label: labels.customer, value: sale.customerName },
      { label: labels.sale, value: sale.saleNumber },
      { label: labels.unit, value: sale.unit },
      { label: labels.business, value: sale.business },
    ],
    metrics: [
      { label: labels.amount, value: money(sale.financedAmount, sale.currency, locale) },
      { label: labels.totalPayable, tone: 'positive', value: money(account.totalPayable, sale.currency, locale) },
      { label: labels.term, value: `${sale.selectedSimulation.termMonths} · ${sale.selectedSimulation.annualInterestRate.toFixed(2)}%` },
    ],
    notice: labels.agingNotice,
    recipient: sale.customerName,
    status: copy.status[account.status],
    subtitle: `${labels.sale} ${sale.saleNumber}`,
    tables: [{
      columns: [labels.installments, labels.dueDate, labels.amount, labels.paid, labels.balance, labels.status],
      rows: installments.map((installment) => [
        `#${installment.installmentNumber}`,
        date(installment.dueDate, locale),
        money(installment.amount, installment.currency, locale),
        money(installment.paidAmount, installment.currency, locale),
        money(installment.balance, installment.currency, locale),
        copy.status[installment.status],
      ]),
      title: labels.schedule,
    }],
    title: labels.schedule,
  };
};

export function printCreditSaleSchedule(input: CreditSaleScheduleDocumentInput) {
  return printStandardDocumentPdf(buildCreditSaleScheduleDocument(input));
}

export function downloadCreditSaleSchedulePdf(input: CreditSaleScheduleDocumentInput) {
  return downloadStandardDocumentPdf(buildCreditSaleScheduleDocument(input));
}
