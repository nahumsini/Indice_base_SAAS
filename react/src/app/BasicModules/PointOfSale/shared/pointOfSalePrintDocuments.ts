import type { CashAuditRecord } from '../Arqueos/types/cashAudit.types';
import type { PurchaseOrder, PurchaseOrderReceivePayload } from '../OrdenesCompra/types/purchaseOrder.types';
import { getPurchaseOrderTranslations, resolvePurchaseOrderLocale } from '../OrdenesCompra/translations';
import { numberFrom } from '../OrdenesCompra/utils/purchaseOrderFormat';
import { printStandardDocumentPdf } from '../../shared/print/standardDocumentPdf';

const money = (amount: number | string, currency: string, locale: string) => new Intl.NumberFormat(locale, {
  currency: currency || 'MXN',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'currency',
}).format(numberFrom(amount));

const date = (value: string | Date | null | undefined, locale: string) => {
  if (!value) return '-';
  const stringValue = String(value);
  const dateOnlyMatch = value instanceof Date ? null : /^(\d{4})-(\d{2})-(\d{2})$/.exec(stringValue);
  const parsed = value instanceof Date
    ? value
    : dateOnlyMatch
      ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
      : new Date(value);
  return Number.isNaN(parsed.getTime())
    ? stringValue
    : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: value instanceof Date || stringValue.includes('T') ? 'short' : undefined }).format(parsed);
};

export function printPurchaseOrder(order: PurchaseOrder, locale = 'es-MX') {
  const purchaseLocale = resolvePurchaseOrderLocale(locale);
  const copy = getPurchaseOrderTranslations(purchaseLocale);
  return printStandardDocumentPdf({
    accentColor: [255, 107, 94],
    contract: {
      category: 'transaction-document',
      modifiers: ['approval-required', 'customer-facing', 'multi-currency'],
      orientation: 'portrait',
      pageSize: 'letter',
      version: '1.0',
    },
    fileName: { documentType: copy.print.purchaseFile, identifier: order.folio },
    folio: order.folio,
    issuer: order.warehouseName,
    locale,
    metadata: [
      { label: copy.common.provider, value: order.providerName },
      { label: copy.print.supplierEmail, value: order.providerEmail },
      { label: copy.print.deliveryWarehouse, value: order.warehouseName },
      { label: copy.common.expected, value: date(order.expectedDate, purchaseLocale) },
      { label: copy.print.orderDate, value: date(order.orderedAt || order.createdAt, purchaseLocale) },
      { label: copy.detail.origin, value: copy.origin[order.origin ?? 'POS_REPLENISHMENT'] },
    ],
    metrics: [
      { label: copy.common.subtotal, value: money(order.subtotalAmount, order.currencyCode, purchaseLocale) },
      { label: copy.print.taxes, value: money(order.taxAmount, order.currencyCode, purchaseLocale) },
      { label: copy.common.total, tone: 'default', value: money(order.totalAmount, order.currencyCode, purchaseLocale) },
      { label: copy.print.items, value: order.items.length },
    ],
    notice: copy.print.orderNotice,
    recipient: order.providerName,
    sections: order.notes ? [{ paragraphs: [order.notes], title: copy.print.notesAndTerms }] : undefined,
    signatures: [
      { label: copy.print.preparedBy },
      { label: copy.print.authorizedBy },
      { caption: order.providerName, label: copy.print.supplier },
    ],
    status: copy.orderStatus[order.status],
    subtitle: `${order.providerName} · ${order.warehouseName}`,
    tables: [{
      columns: [...copy.print.itemColumns],
      rows: order.items.map((item) => [
        item.sku || '-',
        item.productName,
        numberFrom(item.quantity),
        money(item.unitCost, order.currencyCode, purchaseLocale),
        `${numberFrom(item.taxRate).toFixed(2)}%`,
        money(item.lineSubtotal, order.currencyCode, purchaseLocale),
        money(item.lineTotal, order.currencyCode, purchaseLocale),
      ]),
      title: copy.print.orderItems,
    }],
    title: copy.print.orderTitle,
  });
}

export function printPurchaseOrderReceipt({
  locale = 'es-MX',
  notes,
  order,
  payload,
  resultingOrder,
}: {
  locale?: string;
  notes?: string;
  order: PurchaseOrder;
  payload: PurchaseOrderReceivePayload;
  resultingOrder?: PurchaseOrder;
}) {
  const purchaseLocale = resolvePurchaseOrderLocale(locale);
  const copy = getPurchaseOrderTranslations(purchaseLocale);
  const receivedByItemId = new Map(payload.items.map((item) => [item.orderItemId, item.receivedQuantity]));
  const receivedItems = order.items.filter((item) => (receivedByItemId.get(item.id) ?? 0) > 0);
  return printStandardDocumentPdf({
    accentColor: [255, 107, 94],
    confidentiality: copy.print.confidentiality,
    contract: {
      category: 'transaction-document',
      modifiers: ['approval-required', 'internal', 'signature-required'],
      orientation: 'portrait',
      pageSize: 'letter',
      version: '1.0',
    },
    fileName: { documentType: copy.print.receiptFile, identifier: order.folio },
    folio: order.folio,
    issuer: order.warehouseName,
    locale,
    metadata: [
      { label: copy.print.purchaseOrder, value: order.folio },
      { label: copy.common.provider, value: order.providerName },
      { label: copy.common.warehouse, value: order.warehouseName },
      { label: copy.print.receiptDate, value: date(new Date(), purchaseLocale) },
      { label: copy.print.followingStatus, value: copy.orderStatus[resultingOrder?.status ?? order.status] },
    ],
    metrics: [
      { label: copy.print.receivedItems, tone: 'positive', value: receivedItems.length },
      { label: copy.print.receivedUnits, tone: 'positive', value: payload.items.reduce((sum, item) => sum + item.receivedQuantity, 0) },
      { label: copy.print.previousPendingItems, value: order.items.filter((item) => numberFrom(item.pendingQuantity) > 0).length },
    ],
    notice: copy.print.receiptNotice,
    recipient: order.providerName,
    sections: (notes || payload.notes) ? [{ paragraphs: [notes || payload.notes || ''], title: copy.print.receiptNotes }] : undefined,
    signatures: [
      { label: copy.print.deliveredBy },
      { label: copy.print.receivedBy },
      { label: copy.print.supervisedBy },
    ],
    status: copy.print.receiptRecorded,
    subtitle: `${order.folio} · ${order.warehouseName}`,
    tables: [{
      columns: [...copy.print.receiptColumns],
      rows: receivedItems.map((item) => {
        const received = receivedByItemId.get(item.id) ?? 0;
        return [
          item.sku || '-',
          item.productName,
          numberFrom(item.quantity),
          numberFrom(item.pendingQuantity),
          received,
          Math.max(0, numberFrom(item.pendingQuantity) - received),
        ];
      }),
      title: copy.print.receivedGoods,
    }],
    title: copy.print.receiptTitle,
  });
}

export function printCashAuditAct(record: CashAuditRecord, auditNote = record.auditNote || '', locale = 'es-MX') {
  const currency = 'MXN';
  const statusLabels = { balanced: 'Balanceado', over: 'Sobrante', short: 'Faltante' } as const;
  const reviewLabels = { pending: 'Pendiente', in_review: 'En revisión', resolved: 'Resuelto' } as const;
  return printStandardDocumentPdf({
    accentColor: [255, 107, 94],
    confidentiality: 'Confidential',
    contract: {
      category: 'transaction-document',
      modifiers: ['approval-required', 'confidential', 'internal', 'signature-required'],
      orientation: 'portrait',
      pageSize: 'letter',
      version: '1.0',
    },
    fileName: { documentType: 'acta-de-arqueo', identifier: record.id },
    folio: record.id,
    issuer: record.companyName,
    locale,
    metadata: [
      { label: 'Unidad', value: record.businessUnitName },
      { label: 'Sucursal', value: record.businessName },
      { label: 'Caja', value: `${record.cashRegisterCode} · ${record.cashRegisterName}` },
      { label: 'Responsable', value: record.responsibleUserName },
      { label: 'Apertura', value: date(record.openedAt, locale) },
      { label: 'Cierre', value: date(record.closedAt, locale) },
      { label: 'Estado de revisión', value: reviewLabels[record.auditStatus] },
    ],
    metrics: [
      { label: 'Tickets', value: record.salesCount ?? 0 },
      { label: 'Ventas', value: money(record.totalSales, currency, locale) },
      { label: 'Esperado', value: money(record.expectedTotal, currency, locale) },
      { label: 'Contado', value: money(record.countedTotal, currency, locale) },
      { label: 'Diferencia', tone: record.difference < 0 ? 'negative' : record.difference > 0 ? 'warning' : 'positive', value: money(record.difference, currency, locale) },
    ],
    notice: 'Acta de control operativo. Los datos fuente no incluyen una moneda explícita; el módulo actualmente presenta los importes en MXN.',
    sections: [
      ...(record.notes ? [{ paragraphs: [record.notes], title: 'Notas del cierre' }] : []),
      ...(auditNote ? [{ paragraphs: [auditNote], title: 'Nota de supervisión' }] : []),
    ],
    signatures: [
      { caption: record.responsibleUserName, label: 'Responsable de caja' },
      { label: 'Supervisor' },
      { label: 'Tesorería / administración' },
    ],
    status: statusLabels[record.status],
    subtitle: `${record.cashRegisterCode} · ${record.businessName}`,
    tables: [{
      columns: ['Concepto', 'Esperado', 'Contado', 'Diferencia'],
      rows: [
        ['Fondo inicial', money(record.openingFund, currency, locale), money(record.openingFund, currency, locale), money(0, currency, locale)],
        ['Efectivo', money(record.cashExpected, currency, locale), money(record.cashCounted, currency, locale), money(record.cashCounted - record.cashExpected, currency, locale)],
        ['Tarjeta', money(record.cardExpected, currency, locale), money(record.cardCounted, currency, locale), money(record.cardCounted - record.cardExpected, currency, locale)],
        ['Transferencia', money(record.transferExpected, currency, locale), money(record.transferCounted, currency, locale), money(record.transferCounted - record.transferExpected, currency, locale)],
      ],
      title: 'Conciliación por medio',
    }],
    title: 'Acta de arqueo de caja',
  });
}
