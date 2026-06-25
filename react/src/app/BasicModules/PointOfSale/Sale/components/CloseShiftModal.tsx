import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Loader2, LogOut, X } from 'lucide-react';
import type { CashClosingInput } from '../../shared/cashClosing.types';
import type { PosShiftClosingSummaryResponse } from '../services/posBackendApi';
import type { Shift } from '../types/shift.types';
import {
  ClosingTotal,
  PaymentSummaryRow,
  ShiftStat,
  SummaryCard,
  formatClosingCurrency,
  toClosingNumber,
} from './CloseShiftModalParts';

interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: Shift | null;
  summary: PosShiftClosingSummaryResponse | null;
  isLoadingSummary?: boolean;
  summaryError?: string;
  onConfirm: (closing: CashClosingInput) => void | Promise<void>;
  isSubmitting?: boolean;
}

export function CloseShiftModal({
  isOpen,
  onClose,
  shift,
  summary,
  isLoadingSummary = false,
  summaryError = '',
  onConfirm,
  isSubmitting = false,
}: CloseShiftModalProps) {
  const [countedCash, setCountedCash] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCountedCash(summary ? toClosingNumber(summary.expectedCashAmount).toFixed(2) : '');
      setNotes('');
      setError('');
    }
  }, [isOpen, summary]);

  const currency = summary?.currencyCode || shift?.currencyCode || 'MXN';
  const preview = useMemo(() => {
    if (!summary) {
      return null;
    }

    const cash = Number(countedCash);
    const counted = Number.isFinite(cash) ? cash : 0;
    const expected = toClosingNumber(summary.expectedCashAmount);

    return {
      counted,
      expected,
      difference: counted - expected,
    };
  }, [countedCash, summary]);

  const handleConfirm = () => {
    if (isSubmitting || isLoadingSummary || !summary || !preview) {
      return;
    }

    if (Number.isNaN(Number(countedCash)) || preview.counted < 0) {
      setError('El efectivo contado no puede ser negativo.');
      return;
    }

    onConfirm({
      countedCash: preview.counted,
      notes: notes.trim() || undefined,
    });
  };

  if (!isOpen || !shift) {
    return null;
  }

  const durationMinutes = Math.floor((Date.now() - shift.startTime.getTime()) / 60000);
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const isBalanced = preview ? Math.abs(preview.difference) < 1 : false;
  const isOver = preview ? preview.difference > 0 : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-800">
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
            disabled={isSubmitting}
            className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cerrar cierre de caja"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-136px)] space-y-5 overflow-y-auto p-6">
          {(error || summaryError) && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {error || summaryError}
            </div>
          )}

          {isLoadingSummary && (
            <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-4 text-sm font-bold text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando resumen real del turno...
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-4">
            <ShiftStat label="Tickets" value={summary ? String(summary.ticketsCount) : 'Pendiente'} />
            <ShiftStat label="Vendido" value={summary ? formatClosingCurrency(toClosingNumber(summary.totalSalesAmount), currency) : 'Pendiente'} />
            <ShiftStat label="Fondo inicial" value={formatClosingCurrency(toClosingNumber(summary?.openingCashAmount ?? shift.initialCash), currency)} />
            <ShiftStat label="Duracion" value={`${hours}h ${minutes}m`} />
          </div>

          {summary && (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <SummaryCard label="Ventas efectivo" value={summary.cashSalesAmount} currency={currency} />
                <SummaryCard label="Entradas" value={summary.cashInAmount} currency={currency} tone="success" />
                <SummaryCard label="Salidas" value={summary.cashOutAmount} currency={currency} tone="warning" />
                <SummaryCard label="Retiros caja fuerte" value={summary.safeDropAmount} currency={currency} tone="warning" />
                <SummaryCard label="Correcciones" value={summary.correctionAmount} currency={currency} tone="info" />
                <SummaryCard label="Efectivo esperado" value={summary.expectedCashAmount} currency={currency} strong />
              </div>

              <section className="rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                  Pagos capturados por metodo
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {summary.paymentsSummary.length > 0 ? (
                    summary.paymentsSummary.map((payment) => (
                      <PaymentSummaryRow key={payment.paymentMethod} payment={payment} currency={currency} />
                    ))
                  ) : (
                    <p className="px-4 py-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
                      Sin pagos capturados en este turno.
                    </p>
                  )}
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Efectivo contado
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={countedCash}
                    onChange={(event) => setCountedCash(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-right text-xl font-black text-gray-900 focus:border-transparent focus:ring-2 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                {preview && (
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
                      <ClosingTotal label="Esperado" value={preview.expected} currency={currency} />
                      <ClosingTotal label="Contado" value={preview.counted} currency={currency} />
                      <ClosingTotal label="Diferencia" value={preview.difference} currency={currency} highlight />
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

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
            disabled={isSubmitting}
            className="flex-1 rounded-lg px-6 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || isLoadingSummary || !summary}
            className="flex-1 rounded-lg bg-red-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Cerrando...' : 'Cerrar turno'}
          </button>
        </div>
      </div>
    </div>
  );
}
