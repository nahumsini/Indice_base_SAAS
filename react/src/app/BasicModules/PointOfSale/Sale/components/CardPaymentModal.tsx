import { useState } from 'react';
import { CreditCard, X, CheckCircle } from 'lucide-react';

interface CardPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onConfirmPayment: () => void;
}

export function CardPaymentModal({ isOpen, onClose, totalAmount, onConfirmPayment }: CardPaymentModalProps) {
  const [processing, setProcessing] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const handleConfirm = () => {
    setProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      onConfirmPayment();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-blue-500 rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Pago con Tarjeta</h2>
          </div>
          <button
            onClick={onClose}
            disabled={processing}
            className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Total Display */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total a cobrar</p>
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(totalAmount)}
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  Procesando pago...
                </span>
              ) : (
                'Solicita al cliente pasar su tarjeta por la terminal'
              )}
            </p>
          </div>

          {/* Terminal Simulation */}
          <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-lg flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-400 text-sm mb-2">Terminal de pago</p>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
              {processing && (
                <div className="h-full bg-blue-500 animate-pulse"></div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {processing ? 'Esperando confirmación...' : 'Lista para recibir pago'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            disabled={processing}
            className="flex-1 px-6 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={processing}
            className="flex-1 px-6 py-3 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                Procesando
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Confirmar Pago
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
