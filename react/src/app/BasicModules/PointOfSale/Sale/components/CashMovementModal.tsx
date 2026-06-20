import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, DollarSign, Landmark, Loader2, RotateCw, X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between bg-gray-950 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <ActiveIcon className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white">Movimiento de efectivo</h2>
              <p className="truncate text-xs text-white/70">Registra ajustes operativos del turno actual.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cerrar movimiento de efectivo"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-bold text-gray-700 dark:text-gray-300">Tipo de movimiento</p>
            <div className="grid gap-2 sm:grid-cols-4">
              {movementOptions.map((option) => {
                const Icon = option.icon;
                const isActive = type === option.type;

                return (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => setType(option.type)}
                    className={`rounded-lg border-2 p-3 text-left transition-all ${
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
              <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">
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
                  className="w-full rounded-lg border-2 border-gray-300 bg-white py-3 pl-12 pr-4 text-xl font-black text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-bold text-gray-700 dark:text-gray-300">Vista previa</p>
              <div className={`rounded-lg border-2 p-4 ${activeOption.tone}`}>
                <p className="text-xs font-black uppercase">{activeOption.label}</p>
                <p className="mt-1 text-2xl font-black">
                  {formatCurrency(Number(amount) || 0, currency)}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-gray-700 dark:text-gray-300">Montos rapidos</p>
            <div className="grid grid-cols-4 gap-2">
              {[100, 200, 500, 1000].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleQuickAmount(value)}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-bold text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                >
                  {formatCurrency(value, currency)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">
                Motivo
              </label>
              <input
                type="text"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Describe el motivo"
                className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">
                Referencia
              </label>
              <input
                type="text"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Opcional"
                className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-gray-700 dark:text-gray-300">Motivos comunes</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {commonReasons[type].map((reasonOption) => (
                <button
                  key={reasonOption}
                  type="button"
                  onClick={() => setReason(reasonOption)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-all ${
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

        <div className="flex gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-lg px-6 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || !amount || Number(amount) <= 0 || !reason.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Registrando...' : 'Registrar movimiento'}
          </button>
        </div>
      </div>
    </div>
  );
}
