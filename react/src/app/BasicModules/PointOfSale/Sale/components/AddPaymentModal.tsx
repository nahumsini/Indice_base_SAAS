import { useState, useEffect, useRef } from 'react';
import { X, DollarSign, CreditCard, Smartphone, Calculator } from 'lucide-react';
import { PaymentMethod } from '../types/sale.types';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentMethod: PaymentMethod | null;
  remainingAmount: number;
  onConfirm: (amount: number, reference?: string, cashReceived?: number) => void;
}

export function AddPaymentModal({
  isOpen,
  onClose,
  paymentMethod,
  remainingAmount,
  onConfirm
}: AddPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [change, setChange] = useState(0);
  const [showReferenceField, setShowReferenceField] = useState(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  };

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount(remainingAmount.toFixed(2));
      setReference('');
      setCashReceived('');
      setChange(0);
      setTimeout(() => amountInputRef.current?.focus(), 100);
    }
  }, [isOpen, remainingAmount]);

  // Calculate change for cash payments
  useEffect(() => {
    if (paymentMethod === 'cash') {
      const received = parseFloat(cashReceived) || 0;
      const amountValue = parseFloat(amount) || 0;
      const calculatedChange = received - amountValue;
      setChange(calculatedChange > 0 ? calculatedChange : 0);
    }
  }, [cashReceived, amount, paymentMethod]);

  const handleQuickAmount = (value: number) => {
    setAmount(value.toFixed(2));
  };

  const handleQuickCash = (value: number) => {
    setCashReceived(value.toFixed(2));
  };

  const handleConfirm = () => {
    const amountValue = parseFloat(amount);

    if (!amountValue || amountValue <= 0) {
      alert('Ingresa un monto válido');
      return;
    }

    if (amountValue > remainingAmount) {
      if (!confirm(`El monto (${formatCurrency(amountValue)}) es mayor al restante (${formatCurrency(remainingAmount)}). ¿Continuar?`)) {
        return;
      }
    }

    if (paymentMethod === 'cash') {
      const received = parseFloat(cashReceived);
      if (!received || received < amountValue) {
        alert('El efectivo recibido debe ser mayor o igual al monto del pago');
        return;
      }
      onConfirm(amountValue, reference || undefined, received);
    } else {
      // Reference is optional - no confirmation needed
      onConfirm(amountValue, reference || undefined);
    }

    onClose();
  };

  if (!isOpen || !paymentMethod) return null;

  const getPaymentConfig = () => {
    switch (paymentMethod) {
      case 'cash':
        return {
          title: 'Agregar Pago en Efectivo',
          icon: <DollarSign className="h-6 w-6" />,
          headerClass: 'bg-emerald-600',
          confirmClass: 'bg-emerald-600 hover:bg-emerald-700',
        };
      case 'card':
        return {
          title: 'Agregar Pago con Tarjeta',
          icon: <CreditCard className="h-6 w-6" />,
          headerClass: 'bg-blue-600',
          confirmClass: 'bg-blue-600 hover:bg-blue-700',
        };
      case 'transfer':
        return {
          title: 'Agregar Pago por Transferencia',
          icon: <Smartphone className="h-6 w-6" />,
          headerClass: 'bg-purple-600',
          confirmClass: 'bg-purple-600 hover:bg-purple-700',
        };
    }
  };

  const config = getPaymentConfig();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-800">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 ${config.headerClass}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-white">
              {config.icon}
            </div>
            <h2 className="text-xl font-bold text-white">{config.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Cerrar pago"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Remaining Amount Display */}
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Falta por pagar</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(remainingAmount)}
            </p>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Monto a pagar con {paymentMethod === 'cash' ? 'efectivo' : paymentMethod === 'card' ? 'tarjeta' : 'transferencia'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl">$</span>
              <input
                ref={amountInputRef}
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 text-xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Montos rápidos</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickAmount(remainingAmount)}
                className="py-2 px-3 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500 text-orange-700 dark:text-orange-400 font-semibold rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 text-sm"
              >
                Restante
              </button>
              <button
                onClick={() => handleQuickAmount(100)}
                className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
              >
                $100
              </button>
              <button
                onClick={() => handleQuickAmount(200)}
                className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
              >
                $200
              </button>
              <button
                onClick={() => handleQuickAmount(500)}
                className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
              >
                $500
              </button>
              <button
                onClick={() => handleQuickAmount(1000)}
                className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
              >
                $1,000
              </button>
            </div>
          </div>

          {/* Cash Received (Only for cash) */}
          {paymentMethod === 'cash' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Con cuánto paga el cliente
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-3 text-xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Efectivo recibido</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleQuickCash(parseFloat(amount) || 0)}
                    className="py-2 px-3 bg-green-50 dark:bg-green-900/20 border-2 border-green-500 text-green-700 dark:text-green-400 font-semibold rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-sm"
                  >
                    Exacto
                  </button>
                  <button
                    onClick={() => handleQuickCash(100)}
                    className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  >
                    $100
                  </button>
                  <button
                    onClick={() => handleQuickCash(200)}
                    className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  >
                    $200
                  </button>
                  <button
                    onClick={() => handleQuickCash(500)}
                    className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  >
                    $500
                  </button>
                  <button
                    onClick={() => handleQuickCash(1000)}
                    className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  >
                    $1,000
                  </button>
                </div>
              </div>

              {/* Change Display */}
              {parseFloat(cashReceived) > 0 && (
                <div className={`rounded-lg p-4 ${
                  change > 0
                    ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500'
                    : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500'
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
                    {formatCurrency(change > 0 ? change : (parseFloat(amount) || 0) - (parseFloat(cashReceived) || 0))}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Reference (for card and transfer) - Optional */}
          {(paymentMethod === 'card' || paymentMethod === 'transfer') && (
            <div>
              {!showReferenceField ? (
                <button
                  onClick={() => setShowReferenceField(true)}
                  className="w-full py-2 px-4 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 rounded-lg transition-colors"
                >
                  + Agregar referencia (opcional)
                </button>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {paymentMethod === 'card' ? 'Últimos 4 dígitos / Autorización' : 'Número de referencia'}
                    </label>
                    <button
                      onClick={() => {
                        setShowReferenceField(false);
                        setReference('');
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Quitar
                    </button>
                  </div>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={paymentMethod === 'card' ? '1234 / AUTH123' : 'REF123456'}
                    className="w-full px-4 py-3 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              )}
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
            disabled={!amount || parseFloat(amount) <= 0}
            className={`flex-1 rounded-lg px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${config.confirmClass}`}
          >
            Agregar Pago
          </button>
        </div>
      </div>
    </div>
  );
}
