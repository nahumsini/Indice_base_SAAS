import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, Mail, Printer, ShoppingCart } from 'lucide-react';
import { printDocumentHtml } from '../../../shared/print/documentHtmlPrintEngine';
import {
  formatDocumentPrintDateTime,
  getDocumentPrintLabels,
} from '../../../shared/print/documentPrintContract';
import type { Payment, SaleItem } from '../types/sale.types';
import type { Shift } from '../types/shift.types';
import { PosModalFrame } from './PosModalFrame';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: SaleItem[];
  payments: Payment[];
  totals: {
    subtotal: number;
    tax: number;
    total: number;
    change: number;
  };
  shift: Shift | null;
  saleNumber: string;
}

export function TicketModal({ isOpen, onClose, items, payments, totals, shift, saleNumber }: TicketModalProps) {
  const ticketRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const [notice, setNotice] = useState('');
  const locale = 'es-MX';
  const currency = shift?.currencyCode?.trim();
  const issuerName = shift?.companyName?.trim()
    || shift?.businessName?.trim()
    || shift?.cashRegisterName?.trim()
    || 'Identidad comercial no disponible';

  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;
    const timerId = window.setTimeout(() => onCloseRef.current(), 2000);
    return () => window.clearTimeout(timerId);
  }, [isOpen]);

  const formatCurrency = (amount: number) => currency
    ? new Intl.NumberFormat(locale, { currency, style: 'currency' }).format(amount)
    : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(amount)} · divisa no disponible`;

  const handlePrint = () => {
    if (!ticketRef.current) return;
    const opened = printDocumentHtml({
      bodyHtml: ticketRef.current.outerHTML,
      contentStyles: `
        body { width: 80mm; padding: 4mm; }
        section { border: 0 !important; box-shadow: none !important; padding: 0 !important; width: 72mm !important; }
        * { color: #000000 !important; text-shadow: none !important; }
        .bg-\[\#FF6B5E\]\/10, .bg-gray-100, .bg-white { background: #ffffff !important; }
        img, svg { filter: grayscale(1); }
        @media print { body { width: 80mm; } }
      `,
      documentTitle: `ticket_${saleNumber}`,
      includeApplicationStyles: true,
      locale,
      notifyOnBlocked: false,
      pageSize: '80mm',
    });
    if (!opened) {
      setNotice('El navegador bloqueó la ventana de impresión. Habilita ventanas emergentes e inténtalo de nuevo.');
    }
  };

  const handleEmail = () => {
    setNotice('El envio por email quedo preparado para conectarse al directorio de clientes.');
  };

  const handleDownload = () => {
    handlePrint();
  };

  if (!isOpen) {
    return null;
  }

  const now = new Date();
  const printLabels = getDocumentPrintLabels(locale);

  return (
    <PosModalFrame
      modalType="standard-form"
      closeLabel="Cerrar ticket"
      eyebrow="Comprobante POS"
      icon={<Printer className="h-6 w-6" />}
      onClose={onClose}
      size="sm"
      subtitle={`Folio ${saleNumber}`}
      title="Ticket de venta"
      tone="graphite"
      contentClassName="border-[#222831] shadow-2xl shadow-black/40"
      bodyClassName="bg-[#171C23] dark:bg-[#171C23]"
      footerClassName="border-t border-white/10 bg-[#222831] px-5 py-4 text-white dark:border-white/10 dark:bg-[#222831]"
      footer={(
        <div className="space-y-3">
          {notice ? (
            <div className="rounded-lg border border-white/30 bg-white/15 px-3 py-2 text-xs font-medium text-white">
              {notice}
            </div>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-4">
            <button type="button" onClick={handlePrint} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white px-4 text-sm font-medium text-[#222831] transition hover:bg-slate-100 active:scale-[0.98]">
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
            <button type="button" onClick={handleEmail} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/15 active:scale-[0.98]">
              <Mail className="h-4 w-4" />
              Email
            </button>
            <button type="button" onClick={handleDownload} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/15 active:scale-[0.98]">
              <Download className="h-4 w-4" />
              PDF
            </button>
            <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#FF6B5E] px-4 text-sm font-medium text-[#222831] shadow-sm transition hover:bg-[#F45D50] active:scale-[0.98]">
              <ShoppingCart className="h-4 w-4" />
              Nueva venta
            </button>
          </div>
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-[#222831] px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-400/15 text-emerald-300"><CheckCircle2 className="h-5 w-5" /></span>
            <div><strong className="block text-sm font-medium">Venta completada</strong><span className="text-xs text-slate-400">El ticket quedó registrado y la caja está lista para continuar.</span></div>
          </div>
          <strong className="whitespace-nowrap text-lg font-medium text-[#FF8D84]">{formatCurrency(totals.total)}</strong>
        </div>

        <section ref={ticketRef} className="rounded-lg border border-slate-300 bg-white p-5 shadow-xl shadow-black/20 dark:border-slate-300 dark:bg-white">
          <div className="space-y-4 font-mono text-sm">
            <div className="border-b border-gray-300 pb-3 text-center dark:border-gray-600">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{issuerName}</h3>
              {shift?.businessName && shift.businessName !== issuerName ? <p className="text-xs text-gray-600 dark:text-gray-400">{shift.businessName}</p> : null}
              {shift?.businessUnitName ? <p className="text-xs text-gray-600 dark:text-gray-400">{shift.businessUnitName}</p> : null}
              {shift?.cashRegisterName ? <p className="text-xs text-gray-600 dark:text-gray-400">Caja: {shift.cashRegisterName}</p> : null}
            </div>

            <div className="border-b border-gray-300 pb-3 text-xs text-gray-700 dark:border-gray-600 dark:text-gray-300">
              <TicketInfo label="Folio" value={saleNumber} strong />
              <TicketInfo label="Fecha" value={now.toLocaleDateString(locale)} />
              <TicketInfo label="Hora" value={now.toLocaleTimeString(locale)} />
              {shift ? <TicketInfo label="Cajero" value={shift.cashierName} /> : null}
            </div>

            <div className="border-b border-gray-300 pb-3 dark:border-gray-600">
              <div className="mb-2 text-xs font-medium text-gray-900 dark:text-white">PRODUCTOS</div>
              {items.map((item, index) => (
                <div key={`${item.id}-${index}`} className="mb-2">
                  <div className="flex justify-between gap-3 text-gray-900 dark:text-white">
                    <span className="font-medium">{item.name}</span>
                    <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <span>{item.quantity} x {formatCurrency(item.price)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1 border-b border-gray-300 pb-3 text-xs dark:border-gray-600">
              <TicketInfo label="Subtotal" value={formatCurrency(totals.subtotal)} />
              <TicketInfo label="Impuestos" value={formatCurrency(totals.tax)} />
              <div className="flex justify-between gap-3 pt-2 text-base font-medium text-gray-900 dark:text-white">
                <span>TOTAL:</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>

            <div className="border-b border-gray-300 pb-3 text-xs dark:border-gray-600">
              <div className="mb-2 font-medium text-gray-900 dark:text-white">FORMA DE PAGO</div>
              {payments.map((payment) => (
                <div key={payment.id} className="flex justify-between gap-3 text-gray-700 dark:text-gray-300">
                  <span>
                    {payment.method === 'cash' && 'Efectivo'}
                    {payment.method === 'card' && 'Tarjeta'}
                    {payment.method === 'transfer' && 'Transferencia'}
                    {payment.method === 'credit' && 'Credito'}
                    {payment.reference ? ` (${payment.reference})` : ''}
                  </span>
                  <span>{formatCurrency(payment.amount)}</span>
                </div>
              ))}
              {payments.some((payment) => payment.creditDetails) ? (
                <div className="mt-2 space-y-1 border-t border-gray-200 pt-2 text-gray-700 dark:border-gray-700 dark:text-gray-300">
                  {payments.filter((payment) => payment.creditDetails).map((payment) => (
                    <div key={payment.id}>
                      <TicketInfo label="Cliente credito" value={payment.creditDetails?.customerName ?? ''} />
                      <TicketInfo label="Vencimiento" value={payment.creditDetails?.dueDate ?? ''} />
                    </div>
                  ))}
                </div>
              ) : null}
              {totals.change > 0 ? (
                <div className="mt-2 flex justify-between gap-3 border-t border-gray-200 pt-2 font-medium text-gray-900 dark:border-gray-700 dark:text-white">
                  <span>CAMBIO:</span>
                  <span>{formatCurrency(totals.change)}</span>
                </div>
              ) : null}
            </div>

            <div className="pt-2 text-center text-xs text-gray-600 dark:text-gray-400">
              <p>GRACIAS POR SU COMPRA</p>
              <p className="mt-1">Conserve este ticket</p>
              <p className="mt-3 border-t border-dashed border-gray-300 pt-2 text-[10px]">
                {printLabels.updated}: {formatDocumentPrintDateTime(now, locale)}
              </p>
            </div>
          </div>
        </section>
      </div>
    </PosModalFrame>
  );
}

function TicketInfo({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}:</span>
      <span className={strong ? 'font-medium' : undefined}>{value}</span>
    </div>
  );
}
