import { Eye, Loader2, RefreshCw } from 'lucide-react';
import type { PosShiftClosingSummaryResponse } from '../services/posBackendApi';
import type { Shift } from '../types/shift.types';
import { PaymentSummaryRow, ShiftStat, SummaryCard, formatClosingCurrency, toClosingNumber } from './CloseShiftModalParts';
import {
  PosModalFrame,
  posWorkspacePrimaryActionClassName,
  posWorkspaceSecondaryActionClassName,
} from './PosModalFrame';

interface ShiftSummaryWorkspaceProps {
  isOpen: boolean;
  shift: Shift;
  summary: PosShiftClosingSummaryResponse | null;
  isLoading?: boolean;
  error?: string;
  onClose: () => void;
  onRefresh: () => void | Promise<void>;
}

export function ShiftSummaryWorkspace({
  isOpen,
  shift,
  summary,
  isLoading = false,
  error = '',
  onClose,
  onRefresh,
}: ShiftSummaryWorkspaceProps) {
  if (!isOpen) {
    return null;
  }

  const currency = summary?.currencyCode || shift.currencyCode || 'MXN';
  const durationMinutes = Math.max(0, Math.floor((Date.now() - shift.startTime.getTime()) / 60_000));
  const duration = `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`;

  return (
    <PosModalFrame
      presentation="workspace"
      modalType="operational-workspace"
      closeLabel="Cerrar resumen del corte"
      eyebrow="Consulta del turno"
      icon={<Eye className="h-6 w-6" />}
      onClose={onClose}
      size="lg"
      subtitle={`Caja ${shift.cashRegisterCode} · ${shift.cashierName}`}
      title="Resumen del corte actual"
      tone="graphite"
      footerLeading={
        <button type="button" onClick={onClose} className={posWorkspaceSecondaryActionClassName}>
          Cerrar
        </button>
      }
      footerSummary="Vista informativa · No cierra ni modifica el turno"
      footer={
        <button
          type="button"
          onClick={() => {
            void onRefresh();
          }}
          disabled={isLoading}
          className={posWorkspacePrimaryActionClassName}
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
          Actualizar
        </button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Información acumulada hasta este momento. Puedes consultarla sin iniciar el cierre de caja.
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
        ) : null}

        {isLoading ? (
          <div className="flex min-h-32 items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin text-[#FF6B5E]" />
            Actualizando el corte actual...
          </div>
        ) : null}

        {!isLoading && summary ? (
          <>
            <section className="grid grid-cols-2 gap-3">
              <ShiftStat label="Tickets" value={String(summary.ticketsCount)} />
              <ShiftStat label="Duración" value={duration} />
              <ShiftStat label="Vendido" value={formatClosingCurrency(toClosingNumber(summary.totalSalesAmount), currency)} />
              <ShiftStat label="Devoluciones" value={formatClosingCurrency(toClosingNumber(summary.totalRefundsAmount), currency)} />
            </section>

            <section className="grid grid-cols-2 gap-3">
              <SummaryCard label="Fondo inicial" value={summary.openingCashAmount} currency={currency} />
              <SummaryCard label="Ventas en efectivo" value={summary.cashSalesAmount} currency={currency} />
              <SummaryCard label="Entradas" value={summary.cashInAmount} currency={currency} tone="success" />
              <SummaryCard label="Salidas" value={summary.cashOutAmount} currency={currency} tone="warning" />
              <SummaryCard label="Retiros a caja fuerte" value={summary.safeDropAmount} currency={currency} tone="warning" />
              <SummaryCard label="Correcciones" value={summary.correctionAmount} currency={currency} tone="info" />
            </section>

            <section className="rounded-xl border-2 border-[#59C3A5] bg-[#E8F8F3] p-4">
              <p className="text-xs font-medium text-[#0B6B57]">Efectivo esperado en caja</p>
              <p className="mt-1 text-3xl font-medium text-[#0B4F40]">
                {formatClosingCurrency(toClosingNumber(summary.expectedCashAmount), currency)}
              </p>
            </section>

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-sm font-medium text-gray-900">Cobros por método</p>
                <p className="text-xs text-gray-500">Importes confirmados durante el turno.</p>
              </div>
              <div className="divide-y divide-gray-100">
                {summary.paymentsSummary.length > 0 ? (
                  summary.paymentsSummary.map((payment) => (
                    <PaymentSummaryRow key={payment.paymentMethod} payment={payment} currency={currency} />
                  ))
                ) : (
                  <p className="px-4 py-5 text-center text-sm text-gray-500">Aún no hay cobros registrados.</p>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </PosModalFrame>
  );
}
