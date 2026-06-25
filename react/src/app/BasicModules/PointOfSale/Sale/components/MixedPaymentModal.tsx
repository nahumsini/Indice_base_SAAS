import { useState, useEffect } from 'react';
import { Wallet, X, CheckCircle, AlertCircle } from 'lucide-react';

interface MixedPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onConfirmPayment: () => void;
}

export function MixedPaymentModal({ isOpen, onClose, totalAmount, onConfirmPayment }: MixedPaymentModalProps) {
  const [cashAmount, setCashAmount] = useState('');
  const [cashUsdAmount, setCashUsdAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState(20.0);
  const [error, setError] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  // Calculate totals
  const cash = parseFloat(cashAmount) || 0;
  const cashUsd = (parseFloat(cashUsdAmount) || 0) * exchangeRate;
  const card = parseFloat(cardAmount) || 0;
  const transfer = parseFloat(transferAmount) || 0;

  const totalPaid = cash + cashUsd + card + transfer;
  const remaining = totalAmount - totalPaid;
  const isComplete = totalPaid >= totalAmount;

  const handleQuickFill = (method: 'cash' | 'cash_usd' | 'card' | 'transfer') => {
    const remainingAmount = totalAmount - totalPaid;
    if (remainingAmount <= 0) return;

    switch (method) {
      case 'cash':
        setCashAmount((cash + remainingAmount).toFixed(2));
        break;
      case 'cash_usd':
        const usdAmount = remainingAmount / exchangeRate;
        setCashUsdAmount((parseFloat(cashUsdAmount || '0') + usdAmount).toFixed(2));
        break;
      case 'card':
        setCardAmount((card + remainingAmount).toFixed(2));
        break;
      case 'transfer':
        setTransferAmount((transfer + remainingAmount).toFixed(2));
        break;
    }
  };

  const handleConfirm = () => {
    if (!isComplete) {
      setError('El monto total pagado debe cubrir el total de la venta.');
      return;
    }
    onConfirmPayment();
    // Reset
    setCashAmount('');
    setCashUsdAmount('');
    setCardAmount('');
    setTransferAmount('');
    setError('');
  };

  const handleClear = () => {
    setCashAmount('');
    setCashUsdAmount('');
    setCardAmount('');
    setTransferAmount('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-t-2xl px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Pago Mixto</h2>
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

          {/* Total Display */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total a cobrar</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalAmount)}
            </p>
          </div>

          {/* Exchange Rate for USD */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-blue-900 dark:text-blue-300">
                Tipo de cambio USD → MXN
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

          {/* Payment Methods */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Distribuye el pago entre métodos
            </h3>

            {/* Cash MXN */}
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💵</span>
                  <span className="font-semibold text-gray-900 dark:text-white">Efectivo (MXN)</span>
                </div>
                <button
                  onClick={() => handleQuickFill('cash')}
                  className="text-xs font-medium text-green-600 dark:text-green-400 hover:underline"
                >
                  Completar resto
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 text-lg font-semibold border border-green-300 dark:border-green-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Cash USD */}
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💵</span>
                  <span className="font-semibold text-gray-900 dark:text-white">Efectivo (USD)</span>
                </div>
                <button
                  onClick={() => handleQuickFill('cash_usd')}
                  className="text-xs font-medium text-green-600 dark:text-green-400 hover:underline"
                >
                  Completar resto
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={cashUsdAmount}
                  onChange={(e) => setCashUsdAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-16 py-2.5 text-lg font-semibold border border-green-300 dark:border-green-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                  USD = {formatCurrency(cashUsd)}
                </span>
              </div>
            </div>

            {/* Card */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💳</span>
                  <span className="font-semibold text-gray-900 dark:text-white">Tarjeta</span>
                </div>
                <button
                  onClick={() => handleQuickFill('card')}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Completar resto
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={cardAmount}
                  onChange={(e) => setCardAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 text-lg font-semibold border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Transfer */}
            <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📱</span>
                  <span className="font-semibold text-gray-900 dark:text-white">Transferencia</span>
                </div>
                <button
                  onClick={() => handleQuickFill('transfer')}
                  className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Completar resto
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 text-lg font-semibold border border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className={`rounded-xl p-4 ${
            isComplete
              ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600'
              : remaining > 0
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-500 dark:border-yellow-600'
              : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600'
          }`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">Total pagado:</span>
                <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">Total requerido:</span>
                <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="pt-2 border-t border-gray-300 dark:border-gray-600">
                <div className="flex items-center gap-2">
                  {isComplete ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <span className="font-bold text-green-700 dark:text-green-300">
                        Pago completo
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className={`w-5 h-5 ${
                        remaining > 0
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`} />
                      <span className={`font-bold ${
                        remaining > 0
                          ? 'text-yellow-700 dark:text-yellow-300'
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                        {remaining > 0 ? `Falta: ${formatCurrency(remaining)}` : `Excede por: ${formatCurrency(Math.abs(remaining))}`}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={handleClear}
            disabled={totalPaid === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Limpiar
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isComplete}
            className="flex-1 px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Confirmar Pago Mixto
          </button>
        </div>
      </div>
    </div>
  );
}
