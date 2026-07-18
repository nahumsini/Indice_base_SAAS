import type { SaleRecord } from '../../Sales/types/salesTypes';
import type { PostSalesTranslations } from '../translations';
import { printStandardDocumentPdf } from '../../../shared/print/standardDocumentPdf';

const money = (amount: number, currency: string, locale: string) => new Intl.NumberFormat(locale, {
  currency: currency || 'MXN',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'currency',
}).format(amount);

const date = (value: string, locale: string) => {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(parsed);
};

const deliveryLabel = (status: SaleRecord['deliveryStatus'], locale: string) => {
  const language = locale.toLowerCase().split('-')[0];
  const labels = {
    en: { pending: 'Pending', in_progress: 'In progress', delivered: 'Delivered' },
    es: { pending: 'Pendiente', in_progress: 'En proceso', delivered: 'Entregado' },
    fr: { pending: 'En attente', in_progress: 'En cours', delivered: 'Livré' },
    pt: { pending: 'Pendente', in_progress: 'Em andamento', delivered: 'Entregue' },
  } as const;
  const selected = labels[language as keyof typeof labels] ?? labels.en;
  return selected[status];
};

export function printPostSaleDeliveryAct(
  sale: SaleRecord,
  copy: PostSalesTranslations,
  locale: string,
) {
  const deliveryStatus = deliveryLabel(sale.deliveryStatus, locale);
  return printStandardDocumentPdf({
    accentColor: [255, 107, 94],
    contract: {
      category: 'transaction-document',
      modifiers: ['customer-facing', 'signature-required'],
      orientation: 'portrait',
      pageSize: 'letter',
      version: '1.0',
    },
    fileName: { documentType: 'acta-entrega-conformidad', identifier: sale.saleNumber },
    folio: sale.saleNumber,
    issuer: sale.businessName || sale.businessUnitName || sale.sellerName,
    locale,
    metadata: [
      { label: copy.saleDetail.saleReference, value: sale.saleNumber },
      { label: 'Cotización', value: sale.quoteReference },
      { label: 'Fecha de venta', value: date(sale.saleDate, locale) },
      { label: 'Unidad', value: sale.businessUnitName },
      { label: 'Negocio', value: sale.businessName },
      { label: 'Vendedor', value: sale.sellerName },
      { label: 'Estado de entrega', value: deliveryStatus },
      { label: 'Referencia de inventario', value: sale.inventoryMovementReference },
    ],
    metrics: [
      { label: copy.saleDetail.total, value: money(sale.totalAmount, sale.currency, locale) },
      { label: copy.saleDetail.lines, value: sale.saleLines.length },
      { label: 'Unidades', value: sale.saleLines.reduce((sum, line) => sum + line.quantity, 0) },
      { label: 'Entrega', tone: sale.deliveryStatus === 'delivered' ? 'positive' : 'warning', value: deliveryStatus },
    ],
    notice: sale.deliveryStatus === 'delivered'
      ? 'La conformidad se acredita con las firmas de entrega y recepción. Este documento es operativo y no sustituye una factura fiscal.'
      : 'Documento preliminar: la venta todavía no figura como entregada. No debe interpretarse como aceptación del cliente sin las firmas correspondientes.',
    recipient: sale.customerName,
    sections: sale.notes ? [{ paragraphs: [sale.notes], title: 'Observaciones de entrega y postventa' }] : undefined,
    signatures: [
      { caption: sale.sellerName, label: 'Entregó' },
      { caption: sale.customerName, label: 'Recibió de conformidad' },
      { label: 'Fecha y lugar' },
    ],
    status: deliveryStatus,
    subtitle: `${sale.customerName} · ${sale.saleNumber}`,
    tables: [{
      columns: [copy.saleDetail.product, 'SKU', copy.saleDetail.quantity, copy.saleDetail.unitPrice, copy.saleDetail.warehouse],
      rows: sale.saleLines.map((line) => [
        line.productName,
        line.sku,
        line.quantity,
        money(line.unitPrice, sale.currency, locale),
        line.warehouseId,
      ]),
      title: copy.saleDetail.lines,
    }],
    title: 'Acta de entrega y conformidad',
  });
}
