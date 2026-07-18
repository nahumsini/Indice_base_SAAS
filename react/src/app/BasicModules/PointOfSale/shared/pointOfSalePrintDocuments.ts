import type { CashAuditRecord } from '../Arqueos/types/cashAudit.types';
import type { PurchaseOrder, PurchaseOrderReceivePayload } from '../OrdenesCompra/types/purchaseOrder.types';
import { numberFrom, purchaseOrderOriginLabels, purchaseOrderStatusLabels } from '../OrdenesCompra/utils/purchaseOrderFormat';
import { printStandardDocumentPdf } from '../../shared/print/standardDocumentPdf';

const money = (amount: number | string, currency: string, locale: string) => new Intl.NumberFormat(locale, {
  currency: currency || 'MXN',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'currency',
}).format(numberFrom(amount));

const date = (value: string | Date | null | undefined, locale: string) => {
  if (!value) return '—';
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: value instanceof Date || String(value).includes('T') ? 'short' : undefined }).format(parsed);
};

export function printPurchaseOrder(order: PurchaseOrder, locale = 'es-MX') {
  return printStandardDocumentPdf({
    accentColor: [255, 107, 94],
    contract: {
      category: 'transaction-document',
      modifiers: ['approval-required', 'customer-facing', 'multi-currency'],
      orientation: 'portrait',
      pageSize: 'letter',
      version: '1.0',
    },
    fileName: { documentType: 'orden-de-compra', identifier: order.folio },
    folio: order.folio,
    issuer: order.warehouseName,
    locale,
    metadata: [
      { label: 'Proveedor', value: order.providerName },
      { label: 'Correo del proveedor', value: order.providerEmail },
      { label: 'Almacén de entrega', value: order.warehouseName },
      { label: 'Fecha esperada', value: date(order.expectedDate, locale) },
      { label: 'Fecha de orden', value: date(order.orderedAt || order.createdAt, locale) },
      { label: 'Origen', value: purchaseOrderOriginLabels[order.origin ?? 'POS_REPLENISHMENT'] },
    ],
    metrics: [
      { label: 'Subtotal', value: money(order.subtotalAmount, order.currencyCode, locale) },
      { label: 'Impuestos', value: money(order.taxAmount, order.currencyCode, locale) },
      { label: 'Total', tone: 'default', value: money(order.totalAmount, order.currencyCode, locale) },
      { label: 'Partidas', value: order.items.length },
    ],
    notice: 'Documento comercial de compra. No constituye factura fiscal ni confirma por sí mismo la recepción o el pago de mercancía.',
    recipient: order.providerName,
    sections: order.notes ? [{ paragraphs: [order.notes], title: 'Notas y condiciones' }] : undefined,
    signatures: [
      { label: 'Elaboró' },
      { label: 'Autorizó' },
      { caption: order.providerName, label: 'Proveedor' },
    ],
    status: purchaseOrderStatusLabels[order.status],
    subtitle: `${order.providerName} · ${order.warehouseName}`,
    tables: [{
      columns: ['SKU', 'Producto', 'Cantidad', 'Costo unitario', 'Impuesto', 'Subtotal', 'Total'],
      rows: order.items.map((item) => [
        item.sku || '—',
        item.productName,
        numberFrom(item.quantity),
        money(item.unitCost, order.currencyCode, locale),
        `${numberFrom(item.taxRate).toFixed(2)}%`,
        money(item.lineSubtotal, order.currencyCode, locale),
        money(item.lineTotal, order.currencyCode, locale),
      ]),
      title: 'Partidas de la orden',
    }],
    title: 'Orden de compra',
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
  const receivedByItemId = new Map(payload.items.map((item) => [item.orderItemId, item.receivedQuantity]));
  const receivedItems = order.items.filter((item) => (receivedByItemId.get(item.id) ?? 0) > 0);
  return printStandardDocumentPdf({
    accentColor: [255, 107, 94],
    confidentiality: 'Internal',
    contract: {
      category: 'transaction-document',
      modifiers: ['approval-required', 'internal', 'signature-required'],
      orientation: 'portrait',
      pageSize: 'letter',
      version: '1.0',
    },
    fileName: { documentType: 'recepcion-de-mercancia', identifier: order.folio },
    folio: order.folio,
    issuer: order.warehouseName,
    locale,
    metadata: [
      { label: 'Orden de compra', value: order.folio },
      { label: 'Proveedor', value: order.providerName },
      { label: 'Almacén', value: order.warehouseName },
      { label: 'Fecha de recepción', value: date(new Date(), locale) },
      { label: 'Estado posterior', value: purchaseOrderStatusLabels[resultingOrder?.status ?? order.status] },
    ],
    metrics: [
      { label: 'Partidas recibidas', tone: 'positive', value: receivedItems.length },
      { label: 'Unidades recibidas', tone: 'positive', value: payload.items.reduce((sum, item) => sum + item.receivedQuantity, 0) },
      { label: 'Partidas pendientes previas', value: order.items.filter((item) => numberFrom(item.pendingQuantity) > 0).length },
    ],
    notice: 'Constancia operativa de recepción. La orden no expone un folio de recepción independiente; el folio mostrado corresponde a la orden de compra.',
    recipient: order.providerName,
    sections: (notes || payload.notes) ? [{ paragraphs: [notes || payload.notes || ''], title: 'Notas de recepción' }] : undefined,
    signatures: [
      { label: 'Entregó proveedor' },
      { label: 'Recibió almacén' },
      { label: 'Supervisó' },
    ],
    status: 'Recepción registrada',
    subtitle: `${order.folio} · ${order.warehouseName}`,
    tables: [{
      columns: ['SKU', 'Producto', 'Ordenado', 'Pendiente previo', 'Recibido ahora', 'Pendiente estimado'],
      rows: receivedItems.map((item) => {
        const received = receivedByItemId.get(item.id) ?? 0;
        return [
          item.sku || '—',
          item.productName,
          numberFrom(item.quantity),
          numberFrom(item.pendingQuantity),
          received,
          Math.max(0, numberFrom(item.pendingQuantity) - received),
        ];
      }),
      title: 'Mercancía recibida',
    }],
    title: 'Acta de recepción de mercancía',
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
