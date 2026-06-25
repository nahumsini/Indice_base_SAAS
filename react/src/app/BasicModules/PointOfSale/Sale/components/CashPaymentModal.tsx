import { useState, useEffect } from 'react';
import { DollarSign, X, Calculator } from 'lucide-react';

interface CashPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onConfirmPayment: (amountPaid: number, change: number) => void;
}

export function CashPaymentModal({ isOpen, onClose, totalAmount, onConfirmPayment }: CashPaymentModalProps) {
  const [amountPaid, setAmountPaid] = useState('');
  const [change, setChange] = useState(0);
  const [error, setError] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  // Calculate change when amount paid changes
  useEffect(() => {
    const paid = parseFloat(amountPaid) || 0;
    const calculatedChange = paid - totalAmount;
    setChange(calculatedChange > 0 ? calculatedChange : 0);
  }, [amountPaid, totalAmount]);

  // Quick amount buttons
  const quickAmounts = [100, 200, 500, 1000];

  const handleQuickAmount = (amount: number) => {
    setAmountPaid(amount.toString());
  };

  const handleExactAmount = () => {
    setAmountPaid(totalAmount.toFixed(2));
  };

  const handleConfirm = () => {
    const paid = parseFloat(amountPaid) || 0;
    if (paid < totalAmount) {
      setError('El monto pagado no puede ser menor al total.');
      return;
    }
    onConfirmPayment(paid, change);
    setAmountPaid('');
    setChange(0);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-green-500 rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Cobro en Efectivo</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Total to Pay */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total a cobrar</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalAmount)}
            </p>
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Montos rápidos</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExactAmount}
                className="py-3 px-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500 text-orange-700 dark:text-orange-400 font-semibold rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all"
              >
                Exacto
              </button>
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleQuickAmount(amount)}
                  className="py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  {formatCurrency(amount)}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Paid Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Con cuánto paga el cliente
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl">$</span>
              <input
                type="number"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-4 text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                autoFocus
              />
            </div>
          </div>

          {/* Change Display */}
          {parseFloat(amountPaid) > 0 && (
            <div className={`rounded-xl p-4 ${
              change > 0
                ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600'
                : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Calculator className={`w-5 h-5 ${
                  change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`} />
                <p className={`text-sm font-medium ${
                  change > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                }`}>
                  {change > 0 ? 'Cambio a devolver' : 'Monto insuficiente'}
                </p>
              </div>
              <p className={`text-3xl font-bold ${
                change > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
              }`}>
                {formatCurrency(Math.abs(change))}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={parseFloat(amountPaid) < totalAmount}
            className="flex-1 px-6 py-3 text-base font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar Cobro
          </button>
        </div>
      </div>
    </div>
  );
}
