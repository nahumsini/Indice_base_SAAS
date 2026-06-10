import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Banknote, CheckCircle, CreditCard, LogOut, Smartphone, X } from 'lucide-react';
import type { CashClosingInput } from '../../shared/cashClosing.types';
import type { Shift } from '../types/shift.types';

interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: Shift | null;
  onConfirm: (closing: CashClosingInput) => void;
}

const formatCurrency = (amount: number) => (
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
);

export function CloseShiftModal({ isOpen, onClose, shift, onConfirm }: CloseShiftModalProps) {
  const [countedCash, setCountedCash] = useState('');
  const [countedCard, setCountedCard] = useState('');
  const [countedTransfer, setCountedTransfer] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && shift) {
      setCountedCash(shift.expectedCash.toFixed(2));
      setCountedCard(shift.cardSales.toFixed(2));
      setCountedTransfer(shift.transferSales.toFixed(2));
      setNotes('');
    }
  }, [isOpen, shift]);

  const summary = useMemo(() => {
    if (!shift) {
      return null;
    }

    const cash = Number(countedCash) || 0;
    const card = Number(countedCard) || 0;
    const transfer = Number(countedTransfer) || 0;
    const expectedTotal = shift.expectedCash + shift.cardSales + shift.transferSales;
    const countedTotal = cash + card + transfer;

    return {
      cash,
      card,
      transfer,
      expectedTotal,
      countedTotal,
      difference: countedTotal - expectedTotal,
    };
  }, [countedCard, countedCash, countedTransfer, shift]);

  const handleConfirm = () => {
    if (!summary) {
      return;
    }

    const values = [countedCash, countedCard, countedTransfer].map(Number);
    if (values.some((value) => Number.isNaN(value) || value < 0)) {
      alert('Los montos contados no pueden ser negativos');
      return;
    }

    if (Math.abs(summary.difference) > 100) {
      const confirmed = confirm(`Hay una diferencia de ${formatCurrency(Math.abs(summary.difference))}. ¿Continuar?`);
      if (!confirmed) {
        return;
      }
    }

    onConfirm({
      countedCash: summary.cash,
      countedCard: summary.card,
      countedTransfer: summary.transfer,
      notes: notes.trim() || undefined,
    });
  };

  if (!isOpen || !shift || !summary) {
    return null;
  }

  const durationMinutes = Math.floor((new Date().getTime() - shift.startTime.getTime()) / (1000 * 60));
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const isBalanced = Math.abs(summary.difference) < 1;
  const isOver = summary.difference > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between bg-gray-950 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <LogOut className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white">Corte y cierre de caja</h2>
              <p className="truncate text-xs text-white/70">
                {shift.cashRegisterCode} · {shift.businessName} · {shift.cashierName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Cerrar cierre de caja"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-136px)] space-y-5 overflow-y-auto p-6">
          <div className="grid gap-3 md:grid-cols-4">
            <ShiftStat label="Ventas" value={String(shift.sales)} />
            <ShiftStat label="Vendido" value={formatCurrency(shift.totalSales)} />
            <ShiftStat label="Fondo inicial" value={formatCurrency(shift.initialCash)} />
            <ShiftStat label="Duracion" value={`${hours}h ${minutes}m`} />
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
              <span>Metodo</span>
              <span className="text-right">Esperado</span>
              <span className="text-right">Contado</span>
            </div>
            <ClosingMethodRow
              icon={Banknote}
              label="Efectivo"
              expected={shift.expectedCash}
              value={countedCash}
              onChange={setCountedCash}
            />
            <ClosingMethodRow
              icon={CreditCard}
              label="Tarjeta"
              expected={shift.cardSales}
              value={countedCard}
              onChange={setCountedCard}
            />
            <ClosingMethodRow
              icon={Smartphone}
              label="Transferencia"
              expected={shift.transferSales}
              value={countedTransfer}
              onChange={setCountedTransfer}
            />
          </div>

          <div className={`rounded-lg border-2 p-4 ${
            isBalanced
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
              : isOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-red-500 bg-red-50 dark:bg-red-900/20'
          }`}>
            <div className="flex items-center gap-2">
              {isBalanced ? (
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className={`h-5 w-5 ${isOver ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`} />
              )}
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {isBalanced ? 'Cuadre balanceado' : isOver ? 'Sobrante detectado' : 'Faltante detectado'}
              </p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <ClosingTotal label="Esperado" value={summary.expectedTotal} />
              <ClosingTotal label="Contado" value={summary.countedTotal} />
              <ClosingTotal label="Diferencia" value={summary.difference} highlight />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Nota de cierre
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Opcional"
              className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
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
            className="flex-1 rounded-lg bg-red-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
          >
            Hacer corte de caja
          </button>
        </div>
      </div>
    </div>
  );
}

function ShiftStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
      <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 truncate text-lg font-black text-gray-950 dark:text-white">{value}</p>
    </div>
  );
}

function ClosingMethodRow({
  icon: Icon,
  label,
  expected,
  value,
  onChange,
}: {
  icon: typeof Banknote;
  label: string;
  expected: number;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-[1.2fr_1fr_1fr] items-center gap-2 border-b border-gray-100 px-4 py-3 last:border-b-0 dark:border-gray-700">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
          <Icon className="h-4 w-4" />
        </span>
        <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{label}</p>
      </div>
      <p className="text-right text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(expected)}</p>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-right text-sm font-bold text-gray-900 focus:border-transparent focus:ring-2 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
      />
    </div>
  );
}

function ClosingTotal({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-xl font-black ${highlight ? 'text-gray-950 dark:text-white' : 'text-gray-800 dark:text-gray-100'}`}>
        {value > 0 && highlight ? '+' : ''}{formatCurrency(value)}
      </p>
    </div>
  );
}
