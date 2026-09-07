import { escapeDocumentPrintHtml as escape, printDocumentHtml } from '../../shared/print/documentHtmlPrintEngine';
import { documentPrintAttribution } from '../../shared/print/documentPrintContract';
import type { PosPaidInventoryReceiptResponse } from '../Sale/services/posBackendApi';
import type { PosCashClosingDetailResponse } from './cashClosingHistory.types';

export type PosOperationTicket = { title: string; bodyHtml: string };
export const posTicketStyles = `
  * { box-sizing:border-box; } html, body { margin:0; }
  body { width:80mm; max-width:100%; padding:4mm; font:12px/1.4 monospace; color:#111; background:white; }
  h1 { font-size:16px; margin:0 0 6px; } h2 { font-size:14px; margin:10px 0 4px; }
  p { margin:4px 0; } header, footer { text-align:center; }
  section { border-top:1px dashed #777; margin-top:10px; padding-top:8px; }
  .ticket-row { display:flex; justify-content:space-between; gap:8px; margin:3px 0; }
  .ticket-row span, p, h1, h2 { overflow-wrap:anywhere; min-width:0; }
  .ticket-row span:last-child { text-align:right; } .total { font-weight:bold; font-size:14px; }
  .item { break-inside:avoid; margin-bottom:10px; } .small { font-size:10px; }
  footer { border-top:1px dashed #777; margin-top:12px; padding-top:8px; font-size:10px; }
`;
const row = (label: string, value: string | number | null | undefined, strong = false) =>
  `<div class="ticket-row${strong ? ' total' : ''}"><span>${escape(label)}</span><span>${escape(value ?? '—')}</span></div>`;
const date = (value: unknown, locale: string) => {
  const parsed = typeof value === 'string' ? new Date(value) : null;
  return parsed && Number.isFinite(parsed.getTime()) ? parsed.toLocaleString(locale) : '—';
};
const money = (value: number | string, currency: string, locale: string, maximumFractionDigits = 2) => {
  if (!currency || !Number.isFinite(Number(value))) throw new Error('El comprobante no tiene importes o moneda válidos.');
  return new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'code', minimumFractionDigits: 2, maximumFractionDigits }).format(Number(value));
};
const method = (value: string) => ({ CASH: 'Efectivo', TRANSFER: 'Transferencia', CARD: 'Tarjeta', WALLET: 'Monedero', CREDIT: 'Crédito' }[value] || value);
const unit = (value: string) => ({ Piece: 'pza', Kilogram: 'kg', Gram: 'g', Liter: 'l', Meter: 'm' }[value] || value);
const footer = `<footer>Comprobante operativo<br>${escape(documentPrintAttribution)}</footer>`;

export function receiptTicket(receipt: PosPaidInventoryReceiptResponse, locale = 'es-MX'): PosOperationTicket {
  const metadata = receipt.metadata ?? {};
  const text = (key: string) => typeof metadata[key] === 'string' ? String(metadata[key]) : '';
  const amount = (value: number | string) => money(value, receipt.currencyCode, locale);
  return {
    title: `recepcion_${receipt.receiptNumber}`,
    bodyHtml: `<header><h1>${escape(text('companyName') || 'Recepción de mercancía')}</h1><h2>Recepción de mercancía pagada</h2><p>${escape(receipt.receiptNumber)}</p><p>${receipt.status === 'REVERSED' ? 'REVERTIDA' : 'CONFIRMADA'}</p></header>
      <section>${row('Fecha', date(metadata.createdAt, locale))}${row('Caja', text('cashRegisterCode') || receipt.cashRegisterId)}
      ${row('Nombre de caja', text('cashRegisterName'))}${row('Turno', receipt.shiftId)}
      ${row('Almacén', text('warehouseName') || receipt.warehouseName)}${row('Recibió', text('createdByName'))}${row('Proveedor', receipt.providerName)}</section>
      <section><h2>Mercancía recibida</h2>${receipt.items.map(item => `<div class="item"><strong>${escape(item.productName)}</strong>
        ${item.sku ? `<p class="small">SKU ${escape(item.sku)}</p>` : ''}
        ${row(`${item.quantity} ${unit(item.inventoryUnit)} × ${money(item.enteredUnitCost, receipt.currencyCode, locale, 4)}`, amount(item.lineTotal))}
        ${row(item.taxName || 'Impuestos', amount(item.taxAmount))}
        ${item.taxIncluded ? '<p class="small">Impuesto incluido en el costo capturado</p>' : ''}</div>`).join('')}</section>
      <section>${row('Subtotal', amount(receipt.subtotalAmount))}${row('Impuestos', amount(receipt.taxAmount))}${row('TOTAL PAGADO', amount(receipt.totalAmount), true)}
      ${row('Pago', method(receipt.paymentMethod))}${receipt.paymentReference ? row('Referencia', receipt.paymentReference) : ''}</section>
      ${text('notes') ? `<section>${escape(text('notes'))}</section>` : ''}
      ${receipt.reversalReason ? `<section>Motivo de reversión: ${escape(receipt.reversalReason)}</section>` : ''}${footer}`,
  };
}

export function closingTicket(closing: PosCashClosingDetailResponse, locale = 'es-MX'): PosOperationTicket {
  const currency = closing.currencyCode || closing.shift?.currencyCode || '';
  const amount = (value: number | string) => money(value, currency, locale);
  return {
    title: `corte_COR-${closing.id}`,
    bodyHtml: `<header><h1>${escape(closing.companyName || 'Corte de caja')}</h1><h2>Corte y cierre de caja</h2><p>COR-${escape(closing.id)} · CERRADO</p></header>
      <section>${row('Caja', closing.cashRegisterCode || closing.cashRegister?.code || closing.cashRegisterId)}${row('Nombre de caja', closing.cashRegisterName || closing.cashRegister?.name)}
      ${row('Almacén', closing.warehouseName || closing.warehouseId)}${row('Turno', closing.shiftId)}
      ${row('Apertura', date(closing.shift?.openedAt, locale))}${row('Cierre', date(closing.closedAt, locale))}
      ${row('Cerró', closing.closedByUserName || closing.closedByUserId)}</section>
      <section>${row('Tickets', closing.ticketsCount)}${row('Ventas totales', amount(closing.totalSalesAmount))}
      ${row('Devoluciones', amount(closing.totalRefundsAmount))}${row('Fondo inicial', amount(closing.openingCashAmount))}
      ${row('Ventas en efectivo', amount(closing.cashSalesAmount))}${row('Entradas de efectivo', amount(closing.cashInAmount))}
      ${row('Salidas de efectivo', amount(closing.cashOutAmount))}${row('Retiros a caja fuerte', amount(closing.safeDropAmount))}
      ${row('Correcciones', amount(closing.correctionAmount))}</section>
      <section><h2>Pagos por método</h2>${closing.paymentsSummary.map(payment => row(`${method(payment.paymentMethod)} (${payment.count})`, amount(payment.amount))).join('')}</section>
      <section>${row('EFECTIVO ESPERADO', amount(closing.expectedCashAmount), true)}${row('EFECTIVO CONTADO', amount(closing.countedCashAmount), true)}
      ${row('DIFERENCIA', amount(closing.overShortAmount), true)}</section>
      ${closing.notes ? `<section>${escape(closing.notes)}</section>` : ''}${footer}`,
  };
}

// Reserve during the user's click, before the asynchronous operation, to avoid popup blockers.
export function reservePosTicketWindow(): Window | null {
  try { return window.open('about:blank', '_blank'); } catch { return null; }
}
export function printPosOperationTicket(ticket: PosOperationTicket, targetWindow?: Window | null) {
  return printDocumentHtml({ bodyHtml: ticket.bodyHtml, contentStyles: posTicketStyles, documentTitle: ticket.title,
    locale: 'es-MX', pageSize: '80mm', notifyOnBlocked: false, targetWindow });
}
