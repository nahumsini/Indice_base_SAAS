import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Loader2, LogOut } from 'lucide-react';
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
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from './PosModalFrame';

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
  const subtitle = `${shift.cashRegisterCode} - ${shift.businessName} - ${shift.cashierName}`;

  return (
    <PosModalFrame
      modalType="operational-workspace"
      closeLabel="Cerrar cierre de caja"
      eyebrow="Corte POS"
      icon={<LogOut className="h-6 w-6" />}
      isCloseDisabled={isSubmitting}
      onClose={onClose}
      size="lg"
      subtitle={subtitle}
      title="Corte y cierre de caja"
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footerLeading={(
        <button type="button" onClick={onClose} disabled={isSubmitting} className={posModalSecondaryActionClassName}>
          Cancelar
        </button>
      )}
      footerSummary={preview
        ? `Esperado ${formatClosingCurrency(preview.expected, currency)} · Contado ${formatClosingCurrency(preview.counted, currency)} · Diferencia ${formatClosingCurrency(preview.difference, currency)}`
        : 'Calculando el resumen del turno'}
      footer={(
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting || isLoadingSummary || !summary}
          className={posModalPrimaryActionClassName}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Cerrando...
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5" />
              Cerrar turno y generar corte
            </>
          )}
        </button>
      )}
    >
      <div className="space-y-5">
        {(error || summaryError) ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error || summaryError}
          </div>
        ) : null}

        {isLoadingSummary ? (
          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-4 text-sm font-medium text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando resumen real del turno...
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-4">
          <ShiftStat label="Tickets" value={summary ? String(summary.ticketsCount) : 'Pendiente'} />
          <ShiftStat label="Vendido" value={summary ? formatClosingCurrency(toClosingNumber(summary.totalSalesAmount), currency) : 'Pendiente'} />
          <ShiftStat label="Fondo inicial" value={formatClosingCurrency(toClosingNumber(summary?.openingCashAmount ?? shift.initialCash), currency)} />
          <ShiftStat label="Duracion" value={`${hours}h ${minutes}m`} />
        </section>

        {summary ? (
          <>
            <section className="grid gap-3 md:grid-cols-3">
              <SummaryCard label="Ventas efectivo" value={summary.cashSalesAmount} currency={currency} />
              <SummaryCard label="Entradas" value={summary.cashInAmount} currency={currency} tone="success" />
              <SummaryCard label="Salidas" value={summary.cashOutAmount} currency={currency} tone="warning" />
              <SummaryCard label="Retiros caja fuerte" value={summary.safeDropAmount} currency={currency} tone="warning" />
              <SummaryCard label="Correcciones" value={summary.correctionAmount} currency={currency} tone="info" />
              <SummaryCard label="Efectivo esperado" value={summary.expectedCashAmount} currency={currency} strong />
            </section>

            <section className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-400">
                Pagos capturados por metodo
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {summary.paymentsSummary.length > 0 ? (
                  summary.paymentsSummary.map((payment) => (
                    <PaymentSummaryRow key={payment.paymentMethod} payment={payment} currency={currency} />
                  ))
                ) : (
                  <p className="px-4 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Sin pagos capturados en este turno.
                  </p>
                )}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Efectivo contado
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={countedCash}
                  onChange={(event) => setCountedCash(event.target.value)}
                  className="min-h-14 w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-right text-xl font-medium text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>

              {preview ? (
                <div className={`rounded-lg border-2 p-4 ${
                  isBalanced
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                    : isOver
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                      : 'border-red-500 bg-red-50 dark:bg-red-500/10'
                }`}>
                  <div className="flex items-center gap-2">
                    {isBalanced ? (
                      <CheckCircle className="h-5 w-5 text-emerald-700 dark:text-emerald-200" />
                    ) : (
                      <AlertTriangle className={`h-5 w-5 ${isOver ? 'text-blue-700 dark:text-blue-200' : 'text-red-700 dark:text-red-200'}`} />
                    )}
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {isBalanced ? 'Cuadre balanceado' : isOver ? 'Sobrante detectado' : 'Faltante detectado'}
                    </p>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <ClosingTotal label="Esperado" value={preview.expected} currency={currency} />
                    <ClosingTotal label="Contado" value={preview.counted} currency={currency} />
                    <ClosingTotal label="Diferencia" value={preview.difference} currency={currency} highlight />
                  </div>
                </div>
              ) : null}
            </section>
          </>
        ) : null}

        <section>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nota de cierre
          </label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Opcional"
            className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
        </section>
      </div>
    </PosModalFrame>
  );
}
