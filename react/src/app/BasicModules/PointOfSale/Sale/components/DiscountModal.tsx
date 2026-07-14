import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle, DollarSign, Percent } from 'lucide-react';
import type { DiscountRule } from '../../shared/commercial/discounts';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from './PosModalFrame';

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
  onConfirm,
}: DiscountModalProps) {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(currentDiscountType);
  const [discount, setDiscount] = useState(currentDiscount.toString());
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(amount);

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
    const nextDiscountValue = parseFloat(discount) || 0;

    if (nextDiscountValue < 0) {
      setError('El descuento no puede ser negativo.');
      return;
    }

    if (discountType === 'percentage' && nextDiscountValue > 100) {
      setError('El descuento no puede ser mayor a 100%.');
      return;
    }

    if (discountType === 'fixed' && discountAmount > baseTotal) {
      setError('El descuento no puede ser mayor al precio total.');
      return;
    }

    onConfirm(nextDiscountValue, discountType);
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

  if (!isOpen) {
    return null;
  }

  return (
    <PosModalFrame
      closeLabel="Cerrar descuento"
      eyebrow="Venta POS"
      icon={<Percent className="h-6 w-6" />}
      onClose={onClose}
      size="sm"
      subtitle="Aplica descuentos manuales o reglas disponibles para la linea."
      title="Aplicar descuento"
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footer={(
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          {currentDiscount > 0 ? (
            <button type="button" onClick={handleRemoveDiscount} className={posModalSecondaryActionClassName}>
              Quitar
            </button>
          ) : null}
          <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
            Cancelar
          </button>
          <button type="button" onClick={handleConfirm} className={posModalPrimaryActionClassName}>
            <CheckCircle className="h-5 w-5" />
            Aplicar
          </button>
        </div>
      )}
    >
      <div className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <p className="font-black text-gray-900 dark:text-white">{itemName}</p>
          <p className="mt-1 text-sm font-semibold text-gray-600 dark:text-gray-400">
            {itemQuantity} x {formatCurrency(itemPrice)} = {formatCurrency(baseTotal)}
          </p>
        </section>

        <section>
          <p className="mb-2 text-sm font-black text-gray-700 dark:text-gray-300">Tipo de descuento</p>
          <div className="grid grid-cols-2 gap-2">
            <DiscountTypeButton
              active={discountType === 'percentage'}
              icon={<Percent className="mx-auto mb-1 h-5 w-5" />}
              label="Porcentaje"
              onClick={() => setDiscountType('percentage')}
            />
            <DiscountTypeButton
              active={discountType === 'fixed'}
              icon={<DollarSign className="mx-auto mb-1 h-5 w-5" />}
              label="Monto fijo"
              onClick={() => setDiscountType('fixed')}
            />
          </div>
        </section>

        {eligibleRules.length > 0 ? (
          <section>
            <p className="mb-2 text-sm font-black text-gray-700 dark:text-gray-300">Reglas disponibles</p>
            <div className="space-y-2">
              {eligibleRules.slice(0, 4).map((rule) => (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => handleApplyRule(rule)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-left text-sm transition hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-900/20 dark:hover:bg-orange-900/30"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-black text-gray-950 dark:text-white">{rule.name}</span>
                    <span className="block text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {rule.requiresAuthorization ? 'Requiere autorizacion' : 'Aplicacion directa'}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-black text-orange-700 dark:bg-gray-950/40 dark:text-orange-300">
                    {rule.discountType === 'percentage' ? `${rule.value}%` : formatCurrency(rule.value)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <label className="mb-2 block text-sm font-black text-gray-700 dark:text-gray-300">
            {discountType === 'percentage' ? 'Porcentaje de descuento' : 'Monto de descuento por unidad'}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-gray-500">
              {discountType === 'percentage' ? '%' : '$'}
            </span>
            <input
              ref={inputRef}
              type="number"
              step={discountType === 'percentage' ? '1' : '0.01'}
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
              placeholder="0"
              className="min-h-14 w-full rounded-lg border-2 border-gray-300 bg-white py-3 pl-10 pr-4 text-xl font-black text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </section>

        {discountType === 'percentage' ? (
          <section>
            <p className="mb-2 text-sm font-black text-gray-700 dark:text-gray-300">Descuentos rapidos</p>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 20].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDiscount(value.toString())}
                  className="min-h-11 rounded-lg bg-gray-100 px-3 py-2 text-sm font-black text-gray-900 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                >
                  {value}%
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-lg border-2 border-[#FF6B5E] bg-[#FF6B5E]/10 p-4">
          <div className="space-y-2 text-sm">
            <PreviewRow label="Precio original" value={formatCurrency(baseTotal)} />
            <PreviewRow label="Descuento" value={`-${formatCurrency(discountAmount)}`} accent />
            <div className="flex justify-between border-t border-[#FF6B5E]/40 pt-2 text-lg font-black text-[#222831] dark:text-white">
              <span>Precio final:</span>
              <span>{formatCurrency(finalPrice)}</span>
            </div>
          </div>
        </section>
      </div>
    </PosModalFrame>
  );
}

function DiscountTypeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border-2 p-3 transition-all ${
        active
          ? 'border-[#FF6B5E] bg-[#FF6B5E]/10 text-[#A7352C] dark:text-[#FFB5AE]'
          : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400'
      }`}
    >
      {icon}
      <p className="text-sm font-black">{label}</p>
    </button>
  );
}

function PreviewRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex justify-between font-bold ${accent ? 'text-[#A7352C] dark:text-[#FFB5AE]' : 'text-gray-700 dark:text-gray-300'}`}>
      <span>{label}:</span>
      <span>{value}</span>
    </div>
  );
}
