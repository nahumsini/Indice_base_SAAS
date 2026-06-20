import { useState, useEffect, useRef } from 'react';
import { X, Percent, DollarSign } from 'lucide-react';
import type { DiscountRule } from '../../shared/commercial/discounts';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  itemPrice: number;
  itemQuantity: number;
  currentDiscount: number;
  currentDiscountType: 'percentage' | 'fixed';
  currency?: string;
  eligibleRules?: DiscountRule[];
  onConfirm: (discount: number, type: 'percentage' | 'fixed') => void;
}

export function DiscountModal({
  isOpen,
  onClose,
  itemName,
  itemPrice,
  itemQuantity,
  currentDiscount,
  currentDiscountType,
  currency = 'MXN',
  eligibleRules = [],
  onConfirm
}: DiscountModalProps) {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(currentDiscountType);
  const [discount, setDiscount] = useState(currentDiscount.toString());
  const [error, setError] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  useEffect(() => {
    if (isOpen) {
      setDiscountType(currentDiscountType);
      setDiscount(currentDiscount.toString());
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, currentDiscount, currentDiscountType]);

  const baseTotal = itemPrice * itemQuantity;
  const discountValue = parseFloat(discount) || 0;
  const discountAmount = discountType === 'percentage'
    ? baseTotal * (discountValue / 100)
    : discountValue * itemQuantity;
  const finalPrice = baseTotal - discountAmount;

  const handleConfirm = () => {
    const discountValue = parseFloat(discount) || 0;

    if (discountValue < 0) {
      setError('El descuento no puede ser negativo.');
      return;
    }

    if (discountType === 'percentage' && discountValue > 100) {
      setError('El descuento no puede ser mayor a 100%.');
      return;
    }

    if (discountType === 'fixed' && discountAmount > baseTotal) {
      setError('El descuento no puede ser mayor al precio total.');
      return;
    }

    onConfirm(discountValue, discountType);
    onClose();
  };

  const handleRemoveDiscount = () => {
    onConfirm(0, 'percentage');
    onClose();
  };

  const handleApplyRule = (rule: DiscountRule) => {
    if (rule.discountType === 'percentage') {
      setDiscountType('percentage');
      setDiscount(String(rule.value));
      setError(rule.requiresAuthorization ? 'Esta regla requiere autorizacion de supervisor antes de cobrar.' : '');
      return;
    }

    setDiscountType('fixed');
    setDiscount(String(Number((rule.value / Math.max(itemQuantity, 1)).toFixed(2))));
    setError(rule.requiresAuthorization ? 'Esta regla requiere autorizacion de supervisor antes de cobrar.' : '');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Percent className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Aplicar Descuento</h2>
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
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Item Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
            <p className="font-semibold text-gray-900 dark:text-white">{itemName}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {itemQuantity} x {formatCurrency(itemPrice)} = {formatCurrency(baseTotal)}
            </p>
          </div>

          {/* Discount Type */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de descuento</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDiscountType('percentage')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  discountType === 'percentage'
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-500 text-purple-700 dark:text-purple-400'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                }`}
              >
                <Percent className="w-5 h-5 mx-auto mb-1" />
                <p className="font-semibold text-sm">Porcentaje</p>
              </button>
              <button
                onClick={() => setDiscountType('fixed')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  discountType === 'fixed'
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-500 text-purple-700 dark:text-purple-400'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                }`}
              >
                <DollarSign className="w-5 h-5 mx-auto mb-1" />
                <p className="font-semibold text-sm">Monto Fijo</p>
              </button>
            </div>
          </div>

          {eligibleRules.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Reglas disponibles</p>
              <div className="space-y-2">
                {eligibleRules.slice(0, 4).map((rule) => (
                  <button
                    key={rule.id}
                    onClick={() => handleApplyRule(rule)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-left text-sm transition hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-900/20 dark:hover:bg-orange-900/30"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-gray-950 dark:text-white">{rule.name}</span>
                      <span className="block text-xs text-gray-600 dark:text-gray-300">
                        {rule.requiresAuthorization ? 'Requiere autorizacion' : 'Aplicacion directa'}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-black text-orange-700 dark:bg-gray-950/40 dark:text-orange-300">
                      {rule.discountType === 'percentage' ? `${rule.value}%` : formatCurrency(rule.value)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Discount Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {discountType === 'percentage' ? 'Porcentaje de descuento' : 'Monto de descuento (por unidad)'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl">
                {discountType === 'percentage' ? '%' : '$'}
              </span>
              <input
                ref={inputRef}
                type="number"
                step={discountType === 'percentage' ? '1' : '0.01'}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
                className="w-full pl-10 pr-4 py-3 text-xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Quick Discounts */}
          {discountType === 'percentage' && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descuentos rápidos</p>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map((value) => (
                  <button
                    key={value}
                    onClick={() => setDiscount(value.toString())}
                    className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  >
                    {value}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-500 rounded-xl p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Precio original:</span>
                <span>{formatCurrency(baseTotal)}</span>
              </div>
              <div className="flex justify-between text-purple-700 dark:text-purple-400 font-semibold">
                <span>Descuento:</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-purple-900 dark:text-purple-300 pt-2 border-t border-purple-300 dark:border-purple-700">
                <span>Precio final:</span>
                <span>{formatCurrency(finalPrice)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-2">
          {currentDiscount > 0 && (
            <button
              onClick={handleRemoveDiscount}
              className="px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              Quitar
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-6 py-3 text-base font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-sm"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
