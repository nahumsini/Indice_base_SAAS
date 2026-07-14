import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, DollarSign, Landmark, Loader2, RotateCw } from 'lucide-react';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from './PosModalFrame';
import type { PosCashMovementType } from '../services/posBackendApi';

interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: PosCashMovementType, amount: number, reason: string, reference?: string) => void | Promise<void>;
  isSubmitting?: boolean;
  currency?: string;
}

const movementOptions: Array<{
  type: PosCashMovementType;
  label: string;
  description: string;
  icon: typeof ArrowUpFromLine;
  tone: string;
}> = [
  {
    type: 'CASH_IN',
    label: 'Entrada',
    description: 'Aumenta efectivo esperado',
    icon: ArrowUpFromLine,
    tone: 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200',
  },
  {
    type: 'CASH_OUT',
    label: 'Salida',
    description: 'Reduce efectivo esperado',
    icon: ArrowDownToLine,
    tone: 'border-red-500 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200',
  },
  {
    type: 'SAFE_DROP',
    label: 'Caja fuerte',
    description: 'Retiro controlado',
    icon: Landmark,
    tone: 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200',
  },
  {
    type: 'CORRECTION',
    label: 'Correccion',
    description: 'Ajuste operativo',
    icon: RotateCw,
    tone: 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200',
  },
];

const commonReasons: Record<PosCashMovementType, string[]> = {
  CASH_IN: ['Cambio de billetes', 'Fondo adicional', 'Ajuste de apertura', 'Reposicion de efectivo'],
  CASH_OUT: ['Compra menor', 'Pago operativo', 'Retiro temporal', 'Gasto autorizado'],
  SAFE_DROP: ['Retiro a boveda', 'Deposito parcial', 'Control de efectivo alto', 'Corte preventivo'],
  CORRECTION: ['Correccion de conteo', 'Ajuste autorizado', 'Diferencia documentada', 'Registro operativo'],
};

const formatCurrency = (amount: number, currency: string) => (
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(amount)
);

export function CashMovementModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  currency = 'MXN',
}: CashMovementModalProps) {
  const [type, setType] = useState<PosCashMovementType>('CASH_IN');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setType('CASH_IN');
      setAmount('');
      setReason('');
      setReference('');
      setError('');
      setTimeout(() => amountInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleQuickAmount = (value: number) => {
    setAmount(value.toFixed(2));
  };

  const handleConfirm = async () => {
    const amountValue = Number(amount);

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError('Ingresa un monto valido.');
      return;
    }

    if (!reason.trim()) {
      setError('Ingresa el motivo del movimiento.');
      return;
    }

    setError('');
    try {
      await onConfirm(type, amountValue, reason.trim(), reference.trim() || undefined);
    } catch (requestError) {
      setError(requestError instanceof Error && requestError.message
        ? requestError.message
        : 'No se pudo registrar el movimiento.');
    }
  };

  if (!isOpen) return null;

  const activeOption = movementOptions.find((option) => option.type === type) ?? movementOptions[0];
  const ActiveIcon = activeOption.icon;

  return (
    <PosModalFrame
      closeLabel="Cerrar movimiento de efectivo"
      eyebrow="Caja operativa"
      icon={<ActiveIcon className="h-6 w-6" />}
      isCloseDisabled={isSubmitting}
      onClose={onClose}
      size="md"
      subtitle="Registra ajustes operativos del turno actual."
      title="Movimiento de efectivo"
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footer={(
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className={posModalSecondaryActionClassName}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || !amount || Number(amount) <= 0 || !reason.trim()}
            className={posModalPrimaryActionClassName}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Registrando...' : 'Registrar movimiento'}
          </button>
        </div>
      )}
    >
        <div className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-black text-gray-700 dark:text-gray-300">Tipo de movimiento</p>
            <div className="grid gap-2 sm:grid-cols-4">
              {movementOptions.map((option) => {
                const Icon = option.icon;
                const isActive = type === option.type;

                return (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => setType(option.type)}
                    className={`min-h-24 rounded-lg border-2 p-4 text-left transition-all active:scale-[0.98] ${
                      isActive
                        ? option.tone
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300'
                    }`}
                  >
                    <Icon className="mb-2 h-5 w-5" />
                    <p className="text-sm font-black">{option.label}</p>
                    <p className="mt-1 text-[11px] font-semibold opacity-80">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_0.8fr]">
            <div>
              <label className="mb-2 block text-sm font-black text-gray-700 dark:text-gray-300">
                Monto
              </label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  ref={amountInputRef}
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  className="min-h-14 w-full rounded-lg border-2 border-gray-300 bg-white py-3 pl-12 pr-4 text-xl font-black text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-black text-gray-700 dark:text-gray-300">Vista previa</p>
              <div className={`rounded-lg border-2 p-4 ${activeOption.tone}`}>
                <p className="text-xs font-black uppercase">{activeOption.label}</p>
                <p className="mt-1 text-2xl font-black">
                  {formatCurrency(Number(amount) || 0, currency)}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-black text-gray-700 dark:text-gray-300">Montos rapidos</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[100, 200, 500, 1000].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleQuickAmount(value)}
                  className="min-h-12 rounded-lg bg-gray-100 px-3 py-2 text-sm font-black text-gray-900 transition hover:bg-gray-200 active:scale-[0.98] dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                >
                  {formatCurrency(value, currency)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-black text-gray-700 dark:text-gray-300">
                Motivo
              </label>
              <input
                type="text"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Describe el motivo"
                className="min-h-14 w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-base font-bold text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-black text-gray-700 dark:text-gray-300">
                Referencia
              </label>
              <input
                type="text"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Opcional"
                className="min-h-14 w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-base font-bold text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-black text-gray-700 dark:text-gray-300">Motivos comunes</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {commonReasons[type].map((reasonOption) => (
                <button
                  key={reasonOption}
                  type="button"
                  onClick={() => setReason(reasonOption)}
                  className={`min-h-12 rounded-lg border px-3 py-2 text-left text-sm font-black transition-all active:scale-[0.98] ${
                    reason === reasonOption
                      ? activeOption.tone
                      : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {reasonOption}
                </button>
              ))}
            </div>
          </div>
        </div>
    </PosModalFrame>
  );
}
