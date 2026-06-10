import { useEffect, useRef, useState } from 'react';
import { Building2, DollarSign, LogIn, Monitor, StickyNote, Store, User, X } from 'lucide-react';
import type { CashRegisterContext } from '../../shared/cashClosing.types';

interface OpenShiftModalProps {
  isOpen: boolean;
  registerContext: CashRegisterContext;
  onClose: () => void;
  onConfirm: (initialCash: number, openingNote?: string) => void;
}

const quickAmounts = [0, 500, 1000, 2000, 5000];

const formatCurrency = (amount: number) => (
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
);

export function OpenShiftModal({ isOpen, registerContext, onClose, onConfirm }: OpenShiftModalProps) {
  const [initialCash, setInitialCash] = useState('0.00');
  const [openingNote, setOpeningNote] = useState('');
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setInitialCash('0.00');
    setOpeningNote('');
    setTimeout(() => amountInputRef.current?.focus(), 100);
  }, [isOpen]);

  const handleConfirm = () => {
    const amount = Number(initialCash);
    if (Number.isNaN(amount) || amount < 0) {
      alert('El fondo inicial no puede ser negativo');
      return;
    }

    onConfirm(amount, openingNote.trim() || undefined);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between bg-gray-950 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <LogIn className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white">Abrir caja</h2>
              <p className="truncate text-xs text-white/70">
                {registerContext.cashRegisterCode} · {registerContext.cashRegisterName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Cerrar apertura de caja"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <ContextPill icon={Building2} label="Empresa" value={registerContext.companyName} />
            <ContextPill icon={Store} label="Unidad" value={registerContext.businessUnitName} />
            <ContextPill icon={Monitor} label="Caja" value={registerContext.cashRegisterName} />
            <ContextPill icon={User} label="Responsable" value={registerContext.responsibleUserName} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Fondo inicial en caja
            </label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                ref={amountInputRef}
                type="number"
                step="0.01"
                value={initialCash}
                onChange={(event) => setInitialCash(event.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border-2 border-gray-300 bg-white py-4 pl-12 pr-4 text-2xl font-black text-gray-950 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Montos rápidos</p>
            <div className="grid grid-cols-5 gap-2">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setInitialCash(amount.toFixed(2))}
                  className="min-h-10 rounded-lg bg-gray-100 px-2 text-sm font-bold text-gray-900 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                >
                  {amount === 0 ? '$0' : formatCurrency(amount).replace('.00', '')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Nota de apertura
            </label>
            <div className="relative">
              <StickyNote className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <textarea
                value={openingNote}
                onChange={(event) => setOpeningNote(event.target.value)}
                placeholder="Opcional"
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg px-6 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 rounded-lg bg-orange-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-orange-700"
          >
            Abrir caja
          </button>
        </div>
      </div>
    </div>
  );
}

function ContextPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</p>
        <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
