import { useEffect, useRef, useState } from 'react';
import { Download, Mail, Printer } from 'lucide-react';
import { printDocumentHtml } from '../../../shared/print/documentHtmlPrintEngine';
import type { Payment, SaleItem } from '../types/sale.types';
import type { Shift } from '../types/shift.types';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from './PosModalFrame';

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
  const [isHovering, setIsHovering] = useState(false);
  const [countdown, setCountdown] = useState(2);
  const [notice, setNotice] = useState('');

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(2);
      return;
    }

    if (isHovering) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          onClose();
          return 2;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isHovering, onClose]);

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
      locale: 'es-MX',
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
    setNotice('La descarga PDF quedo preparada para usar el motor documental de POS.');
  };

  if (!isOpen) {
    return null;
  }

  const now = new Date();

  return (
    <PosModalFrame
      modalType="standard-form"
      closeLabel="Cerrar ticket"
      eyebrow="Comprobante POS"
      icon={<Printer className="h-6 w-6" />}
      onClose={onClose}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      size="sm"
      subtitle={`Folio ${saleNumber}`}
      title="Ticket de venta"
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footer={(
        <div className="space-y-3">
          {notice ? (
            <div className="rounded-lg border border-white/30 bg-white/15 px-3 py-2 text-xs font-bold text-white">
              {notice}
            </div>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-3">
            <button type="button" onClick={handlePrint} className={posModalPrimaryActionClassName}>
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
            <button type="button" onClick={handleEmail} className={posModalSecondaryActionClassName}>
              <Mail className="h-4 w-4" />
              Email
            </button>
            <button type="button" onClick={handleDownload} className={posModalSecondaryActionClassName}>
              <Download className="h-4 w-4" />
              PDF
            </button>
          </div>
        </div>
      )}
    >
      <div className="space-y-4">
        {!isHovering && countdown > 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-[#FF6B5E] transition-all duration-1000"
                style={{ width: `${(countdown / 2) * 100}%` }}
              />
            </div>
            <span className="whitespace-nowrap text-xs">Cierra en {countdown}s</span>
          </div>
        ) : null}

        <section ref={ticketRef} className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="space-y-4 font-mono text-sm">
            <div className="border-b border-gray-300 pb-3 text-center dark:border-gray-600">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Mi tienda</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">RFC: ABC123456789</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Calle Principal #123</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Tel: (555) 123-4567</p>
            </div>

            <div className="border-b border-gray-300 pb-3 text-xs text-gray-700 dark:border-gray-600 dark:text-gray-300">
              <TicketInfo label="Folio" value={saleNumber} strong />
              <TicketInfo label="Fecha" value={now.toLocaleDateString('es-MX')} />
              <TicketInfo label="Hora" value={now.toLocaleTimeString('es-MX')} />
              {shift ? <TicketInfo label="Cajero" value={shift.cashierName} /> : null}
            </div>

            <div className="border-b border-gray-300 pb-3 dark:border-gray-600">
              <div className="mb-2 text-xs font-black text-gray-900 dark:text-white">PRODUCTOS</div>
              {items.map((item, index) => (
                <div key={`${item.id}-${index}`} className="mb-2">
                  <div className="flex justify-between gap-3 text-gray-900 dark:text-white">
                    <span className="font-bold">{item.name}</span>
                    <span className="font-black">{formatCurrency(item.subtotal)}</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <span>{item.quantity} x {formatCurrency(item.price)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1 border-b border-gray-300 pb-3 text-xs dark:border-gray-600">
              <TicketInfo label="Subtotal" value={formatCurrency(totals.subtotal)} />
              <TicketInfo label="IVA (16%)" value={formatCurrency(totals.tax)} />
              <div className="flex justify-between gap-3 pt-2 text-base font-black text-gray-900 dark:text-white">
                <span>TOTAL:</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>

            <div className="border-b border-gray-300 pb-3 text-xs dark:border-gray-600">
              <div className="mb-2 font-black text-gray-900 dark:text-white">FORMA DE PAGO</div>
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
                <div className="mt-2 flex justify-between gap-3 border-t border-gray-200 pt-2 font-black text-gray-900 dark:border-gray-700 dark:text-white">
                  <span>CAMBIO:</span>
                  <span>{formatCurrency(totals.change)}</span>
                </div>
              ) : null}
            </div>

            <div className="pt-2 text-center text-xs text-gray-600 dark:text-gray-400">
              <p>GRACIAS POR SU COMPRA</p>
              <p className="mt-1">Conserve este ticket</p>
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
      <span className={strong ? 'font-black' : undefined}>{value}</span>
    </div>
  );
}
