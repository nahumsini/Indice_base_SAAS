import { useState, useEffect } from 'react';
import { DollarSign, X, Calculator } from 'lucide-react';

interface CashUsdPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onConfirmPayment: (amountPaid: number, change: number) => void;
}

export function CashUsdPaymentModal({ isOpen, onClose, totalAmount, onConfirmPayment }: CashUsdPaymentModalProps) {
  const [amountPaidUsd, setAmountPaidUsd] = useState('');
  const [exchangeRate, setExchangeRate] = useState(20.0); // Default exchange rate MXN per USD
  const [change, setChange] = useState(0);
  const [error, setError] = useState('');

  const formatCurrency = (amount: number, currency: 'MXN' | 'USD' = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Calculate total in USD
  const totalInUsd = totalAmount / exchangeRate;

  // Calculate change when amount paid changes
  useEffect(() => {
    const paidUsd = parseFloat(amountPaidUsd) || 0;
    const paidMxn = paidUsd * exchangeRate;
    const calculatedChange = paidMxn - totalAmount;
    setChange(calculatedChange > 0 ? calculatedChange : 0);
  }, [amountPaidUsd, totalAmount, exchangeRate]);

  // Quick amount buttons in USD
  const quickAmountsUsd = [10, 20, 50, 100];

  const handleQuickAmount = (amount: number) => {
    setAmountPaidUsd(amount.toString());
  };

  const handleExactAmount = () => {
    setAmountPaidUsd(totalInUsd.toFixed(2));
  };

  const handleConfirm = () => {
    const paidUsd = parseFloat(amountPaidUsd) || 0;
    const paidMxn = paidUsd * exchangeRate;

    if (paidMxn < totalAmount) {
      setError('El monto pagado no puede ser menor al total.');
      return;
    }
    onConfirmPayment(paidMxn, change);
    setAmountPaidUsd('');
    setChange(0);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-green-600 rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Cobro en Dólares (USD)</h2>
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

          {/* Exchange Rate */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-blue-900 dark:text-blue-300">
                Tipo de cambio (MXN por USD)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-700 dark:text-blue-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 20.0)}
                  className="w-20 px-2 py-1 text-sm font-semibold border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-gray-900 text-blue-900 dark:text-blue-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Total to Pay - Both currencies */}
          <div className="space-y-2">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total a cobrar (MXN)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalAmount, 'MXN')}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600 rounded-xl p-4">
              <p className="text-sm text-green-700 dark:text-green-400 mb-1">Equivalente en USD</p>
              <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                {formatCurrency(totalInUsd, 'USD')}
              </p>
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Montos rápidos (USD)</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExactAmount}
                className="py-3 px-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500 text-orange-700 dark:text-orange-400 font-semibold rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all"
              >
                Exacto
              </button>
              {quickAmountsUsd.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleQuickAmount(amount)}
                  className="py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  ${amount} USD
                </button>
              ))}
            </div>
          </div>

          {/* Amount Paid Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Con cuántos dólares paga el cliente
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl">$</span>
              <input
                type="number"
                step="0.01"
                value={amountPaidUsd}
                onChange={(e) => setAmountPaidUsd(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-16 py-4 text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-semibold">
                USD
              </span>
            </div>
          </div>

          {/* Change Display */}
          {parseFloat(amountPaidUsd) > 0 && (
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
                  {change > 0 ? 'Cambio a devolver (MXN)' : 'Monto insuficiente'}
                </p>
              </div>
              <p className={`text-3xl font-bold ${
                change > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
              }`}>
                {formatCurrency(Math.abs(change), 'MXN')}
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
            disabled={(parseFloat(amountPaidUsd) || 0) * exchangeRate < totalAmount}
            className="flex-1 px-6 py-3 text-base font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar Cobro
          </button>
        </div>
      </div>
    </div>
  );
}
