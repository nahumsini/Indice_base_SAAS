import { useState, useEffect } from 'react';
import { X, Printer, Mail, Download } from 'lucide-react';
import { SaleItem, Payment } from '../types/sale.types';
import { Shift } from '../types/shift.types';

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
  const [isHovering, setIsHovering] = useState(false);
  const [countdown, setCountdown] = useState(2);
  const [notice, setNotice] = useState('');
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  // Auto-close timer
  useEffect(() => {
    if (!isOpen) {
      setCountdown(2);
      return;
    }

    if (isHovering) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onClose();
          return 2;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isHovering, onClose]);

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    setNotice('El envio por email quedo preparado para conectarse al directorio de clientes.');
  };

  const handleDownload = () => {
    setNotice('La descarga PDF quedo preparada para usar el motor documental de POS.');
  };

  if (!isOpen) return null;

  const now = new Date();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-800"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4 print:hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Printer className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Ticket de Venta</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {!isHovering && countdown > 0 && (
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <div className="w-full bg-white/20 rounded-full h-1.5">
                <div
                  className="bg-white h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${(countdown / 2) * 100}%` }}
                />
              </div>
              <span className="text-xs whitespace-nowrap">Cierra en {countdown}s</span>
            </div>
          )}
        </div>

        {/* Ticket Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="font-mono text-sm space-y-4">
            {/* Store Header */}
            <div className="text-center border-b border-gray-300 dark:border-gray-600 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">MI TIENDA</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">RFC: ABC123456789</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Calle Principal #123</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Tel: (555) 123-4567</p>
            </div>

            {/* Sale Info */}
            <div className="text-xs text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600 pb-3">
              <div className="flex justify-between">
                <span>Folio:</span>
                <span className="font-bold">{saleNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Fecha:</span>
                <span>{now.toLocaleDateString('es-MX')}</span>
              </div>
              <div className="flex justify-between">
                <span>Hora:</span>
                <span>{now.toLocaleTimeString('es-MX')}</span>
              </div>
              {shift && (
                <div className="flex justify-between">
                  <span>Cajero:</span>
                  <span>{shift.cashierName}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="border-b border-gray-300 dark:border-gray-600 pb-3">
              <div className="text-xs font-bold text-gray-900 dark:text-white mb-2">
                PRODUCTOS
              </div>
              {items.map((item, index) => (
                <div key={index} className="mb-2">
                  <div className="flex justify-between text-gray-900 dark:text-white">
                    <span className="font-semibold">{item.name}</span>
                    <span className="font-bold">{formatCurrency(item.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>{item.quantity} x {formatCurrency(item.price)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="text-xs space-y-1 border-b border-gray-300 dark:border-gray-600 pb-3">
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Subtotal:</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>IVA (16%):</span>
                <span>{formatCurrency(totals.tax)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white pt-2">
                <span>TOTAL:</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>

            {/* Payments */}
            <div className="text-xs border-b border-gray-300 dark:border-gray-600 pb-3">
              <div className="font-bold text-gray-900 dark:text-white mb-2">FORMA DE PAGO</div>
              {payments.map((payment, index) => (
                <div key={index} className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span className="capitalize">
                    {payment.method === 'cash' && 'Efectivo'}
                    {payment.method === 'card' && 'Tarjeta'}
                    {payment.method === 'transfer' && 'Transferencia'}
                    {payment.method === 'credit' && 'Credito'}
                    {payment.reference && ` (${payment.reference})`}
                  </span>
                  <span>{formatCurrency(payment.amount)}</span>
                </div>
              ))}
              {payments.some((payment) => payment.creditDetails) && (
                <div className="mt-2 space-y-1 border-t border-gray-200 pt-2 text-gray-700 dark:border-gray-700 dark:text-gray-300">
                  {payments.filter((payment) => payment.creditDetails).map((payment) => (
                    <div key={payment.id}>
                      <div className="flex justify-between">
                        <span>Cliente credito:</span>
                        <span>{payment.creditDetails?.customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Vencimiento:</span>
                        <span>{payment.creditDetails?.dueDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {totals.change > 0 && (
                <div className="flex justify-between font-bold text-gray-900 dark:text-white mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span>CAMBIO:</span>
                  <span>{formatCurrency(totals.change)}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-600 dark:text-gray-400 pt-2">
              <p>¡GRACIAS POR SU COMPRA!</p>
              <p className="mt-1">Conserve este ticket</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 print:hidden">
          {notice && (
            <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
              {notice}
            </div>
          )}
          <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span className="font-medium">Imprimir</span>
          </button>
          <button
            onClick={handleEmail}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Mail className="w-4 h-4" />
            <span className="font-medium">Email</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="font-medium">PDF</span>
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
