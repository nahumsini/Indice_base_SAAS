import { useState, useEffect } from 'react';
import { Calculator, Check, DollarSign } from 'lucide-react';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from './PosModalFrame';

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
  const paidAmount = parseFloat(amountPaid) || 0;
  const hasPaidAmount = paidAmount > 0;
  const isEnough = paidAmount >= totalAmount;
  const missingAmount = Math.max(totalAmount - paidAmount, 0);

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
    <PosModalFrame
      closeLabel="Cerrar cobro"
      eyebrow="Cobro POS"
      footerClassName={posModalModuleFooterClassName}
      icon={<DollarSign className="h-6 w-6" />}
      onClose={onClose}
      size="sm"
      subtitle="Captura efectivo recibido y cambio antes de confirmar."
      title="Cobro en Efectivo"
      tone="coral"
      footer={(
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className={posModalSecondaryActionClassName}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isEnough}
            className={posModalPrimaryActionClassName}
          >
            <Check className="h-4 w-4" />
            Confirmar cobro
          </button>
        </div>
      )}
    >
        <div className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Total to Pay */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
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
          {hasPaidAmount && (
            <div className={`rounded-lg p-4 ${
              isEnough
                ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600'
                : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Calculator className={`w-5 h-5 ${
                  isEnough ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`} />
                <p className={`text-sm font-medium ${
                  isEnough ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                }`}>
                  {isEnough ? (change > 0 ? 'Cambio a devolver' : 'Pago exacto') : 'Monto insuficiente'}
                </p>
              </div>
              <p className={`text-3xl font-bold ${
                isEnough ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
              }`}>
                {formatCurrency(isEnough ? change : missingAmount)}
              </p>
            </div>
          )}
        </div>
    </PosModalFrame>
  );
}
