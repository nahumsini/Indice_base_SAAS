import { useState, useEffect, useRef } from 'react';
import { X, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'entry' | 'withdrawal', amount: number, reason: string) => void;
}

export function CashMovementModal({ isOpen, onClose, onConfirm }: CashMovementModalProps) {
  const [type, setType] = useState<'entry' | 'withdrawal'>('entry');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const amountInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  };

  useEffect(() => {
    if (isOpen) {
      setType('entry');
      setAmount('');
      setReason('');
      setTimeout(() => amountInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleQuickAmount = (value: number) => {
    setAmount(value.toFixed(2));
  };

  const commonReasons = {
    entry: [
      'Cambio de billetes',
      'Fondo adicional',
      'Préstamo temporal',
      'Corrección',
    ],
    withdrawal: [
      'Retiro a bóveda',
      'Compra de insumos',
      'Pago a proveedor',
      'Gastos menores',
    ],
  };

  const handleConfirm = () => {
    const amountValue = parseFloat(amount);

    if (!amountValue || amountValue <= 0) {
      alert('Ingresa un monto válido');
      return;
    }

    if (!reason.trim()) {
      alert('Ingresa el motivo del movimiento');
      return;
    }

    onConfirm(type, amountValue, reason);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className={`bg-gradient-to-r ${
          type === 'entry'
            ? 'from-green-500 to-green-600'
            : 'from-red-500 to-red-600'
        } rounded-t-2xl px-6 py-4 flex items-center justify-between transition-colors`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              {type === 'entry' ? (
                <TrendingUp className="w-6 h-6 text-white" />
              ) : (
                <TrendingDown className="w-6 h-6 text-white" />
              )}
            </div>
            <h2 className="text-xl font-bold text-white">
              {type === 'entry' ? 'Entrada de Efectivo' : 'Salida de Efectivo'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Type Selection */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de movimiento</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setType('entry')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  type === 'entry'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                }`}
              >
                <TrendingUp className="w-6 h-6 mx-auto mb-2" />
                <p className="font-semibold text-sm">Entrada</p>
              </button>
              <button
                onClick={() => setType('withdrawal')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  type === 'withdrawal'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                }`}
              >
                <TrendingDown className="w-6 h-6 mx-auto mb-2" />
                <p className="font-semibold text-sm">Salida</p>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Monto
            </label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                ref={amountInputRef}
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-12 pr-4 py-3 text-xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Montos rápidos</p>
            <div className="grid grid-cols-4 gap-2">
              {[100, 200, 500, 1000].map((value) => (
                <button
                  key={value}
                  onClick={() => handleQuickAmount(value)}
                  className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                >
                  ${value}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Motivo
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe el motivo..."
              className="w-full px-4 py-3 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Common Reasons */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Motivos comunes</p>
            <div className="grid grid-cols-2 gap-2">
              {commonReasons[type].map((reasonOption) => (
                <button
                  key={reasonOption}
                  onClick={() => setReason(reasonOption)}
                  className={`py-2 px-3 text-sm rounded-lg border transition-all text-left ${
                    reason === reasonOption
                      ? type === 'entry'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                  }`}
                >
                  {reasonOption}
                </button>
              ))}
            </div>
          </div>
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
            disabled={!amount || parseFloat(amount) <= 0 || !reason.trim()}
            className={`flex-1 px-6 py-3 text-base font-semibold text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              type === 'entry' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
