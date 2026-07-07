import { AlertCircle, Check, Plus, X } from 'lucide-react';
import type { Payment, PaymentMethod } from '../types/sale.types';
import type { SaleTotals } from '../utils/saleCalculations';

interface TouchCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  totals: SaleTotals;
  payments: Payment[];
  cartItemCount: number;
  onRemovePayment: (paymentId: string) => void;
  onExactPayment: () => void;
  onAddPayment: (method: PaymentMethod) => void;
  onCompleteSale: () => void;
  isCompletingSale?: boolean;
  checkoutNotice?: string;
  onClearCheckoutNotice?: () => void;
  formatCurrency: (amount: number) => string;
}

const paymentMethodConfig: Array<{
  method: PaymentMethod;
  label: string;
  shortcut: string;
  emoji: string;
  tone: 'aqua' | 'blue' | 'yellow' | 'disabled';
  disabled?: boolean;
}> = [
  { method: 'cash', label: 'Efectivo', shortcut: 'F1', emoji: '💵', tone: 'aqua' },
  { method: 'card', label: 'Tarjeta', shortcut: 'F2', emoji: '💳', tone: 'blue' },
  { method: 'transfer', label: 'Transferencia', shortcut: 'F3', emoji: '🏦', tone: 'blue' },
  { method: 'credit', label: 'Crédito', shortcut: 'F5', emoji: '🧾', tone: 'yellow' },
];

export function TouchCheckoutModal({
  isOpen,
  onClose,
  totals,
  payments,
  cartItemCount,
  onRemovePayment,
  onExactPayment,
  onAddPayment,
  onCompleteSale,
  isCompletingSale = false,
  checkoutNotice = '',
  onClearCheckoutNotice,
  formatCurrency,
}: TouchCheckoutModalProps) {
  if (!isOpen) return null;

  const hasCart = cartItemCount > 0;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#111827]/70 px-4 py-6 backdrop-blur-sm">
      <section className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl dark:bg-gray-950">
        <header className="flex items-center justify-between gap-4 bg-[#222831] px-6 py-5 text-white">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FF6B5E]/20 text-3xl" aria-hidden="true">
              💰
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-normal text-[#F4C84A]">Cobro touch</p>
              <h2 className="text-2xl font-black leading-tight">Resumen de cobro</h2>
              <p className="mt-1 text-sm font-semibold text-gray-300">Elige método, agrega pagos y finaliza la venta.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Cerrar cobro"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#F7F8FA] p-5 dark:bg-[#111827]">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
            <div className="space-y-5">
              <section className="rounded-[24px] bg-[#222831] p-5 text-white shadow-sm">
                <p className="text-sm font-bold text-gray-300">Total a cobrar</p>
                <p className="mt-2 break-words text-5xl font-black leading-none">{formatCurrency(totals.total)}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <AmountTile label="Pagado" value={formatCurrency(totals.paid)} />
                  <AmountTile
                    label={totals.isPaid ? 'Cambio' : 'Falta'}
                    value={formatCurrency(totals.isPaid ? totals.change : totals.remaining)}
                    tone={totals.isPaid ? 'aqua' : 'coral'}
                  />
                  <AmountTile label="Artículos" value={String(cartItemCount)} tone="yellow" />
                </div>
              </section>

              <section className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-[#222831] dark:text-white">Métodos de pago</h3>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Botones grandes para operación en pantalla táctil.</p>
                  </div>
                  <button
                    type="button"
                    onClick={onExactPayment}
                    disabled={!hasCart || totals.isPaid || isCompletingSale}
                    className="min-h-12 rounded-2xl bg-[#FF6B5E] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#ff5a4b] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ⚡ Cobrar exacto
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {paymentMethodConfig.map((method) => (
                    <PaymentTouchButton
                      key={method.method}
                      {...method}
                      disabled={method.disabled || !hasCart || totals.isPaid || isCompletingSale || (payments.length > 0 && method.method === 'credit')}
                      onClick={() => onAddPayment(method.method)}
                    />
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-5">
              {checkoutNotice && (
                <section className="rounded-[24px] border border-[#FF6B5E]/35 bg-[#FF6B5E]/10 p-4 shadow-sm dark:border-[#FF6B5E]/30 dark:bg-[#FF6B5E]/10">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-[#C64237]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-[#A7352C] dark:text-[#FFB5AE]">
                        No se pudo finalizar
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-5 text-[#7F2A23] dark:text-[#FFE5E2]">
                        {checkoutNotice}
                      </p>
                    </div>
                    {onClearCheckoutNotice && (
                      <button
                        type="button"
                        onClick={onClearCheckoutNotice}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#A7352C] transition hover:bg-[#FF6B5E]/15 dark:text-[#FFB5AE]"
                        aria-label="Ocultar mensaje de checkout"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </section>
              )}

              <section className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-[#222831] dark:text-white">Pagos agregados</h3>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                      {payments.length === 0 ? 'Todavía no hay pagos capturados.' : `${payments.length} pago${payments.length === 1 ? '' : 's'} registrado${payments.length === 1 ? '' : 's'}.`}
                    </p>
                  </div>
                  {totals.isPaid ? (
                    <span className="rounded-full bg-[#59C3A5]/15 px-3 py-1 text-xs font-black text-[#14745F] dark:text-[#9DE7D3]">Completo</span>
                  ) : (
                    <span className="rounded-full bg-[#F4C84A]/20 px-3 py-1 text-xs font-black text-[#8A6500] dark:text-[#F4C84A]">Pendiente</span>
                  )}
                </div>

                <div className="space-y-2">
                  {payments.map((payment) => (
                    <PaymentRow
                      key={payment.id}
                      payment={payment}
                      onRemove={() => onRemovePayment(payment.id)}
                      formatCurrency={formatCurrency}
                    />
                  ))}

                  {payments.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-[#F7F8FA] p-5 text-center dark:border-gray-700 dark:bg-gray-950/40">
                      <p className="text-3xl" aria-hidden="true">🧾</p>
                      <p className="mt-2 text-sm font-black text-[#222831] dark:text-white">Sin pagos</p>
                      <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">Selecciona un método para capturar el primer pago.</p>
                    </div>
                  )}
                </div>
              </section>

              <section className={`rounded-[24px] border p-5 shadow-sm ${
                totals.isPaid
                  ? 'border-[#59C3A5]/50 bg-[#59C3A5]/10'
                  : 'border-[#F4C84A]/60 bg-[#F4C84A]/15'
              }`}>
                <div className="flex items-start gap-3">
                  {totals.isPaid ? (
                    <Check className="mt-1 h-5 w-5 shrink-0 text-[#14745F]" />
                  ) : (
                    <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-[#B77900]" />
                  )}
                  <div>
                    <p className="text-sm font-black text-[#222831] dark:text-white">
                      {totals.isPaid ? 'Pago listo para finalizar' : 'Falta cubrir el total'}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      {totals.isPaid
                        ? 'Verifica el cambio antes de cerrar la venta.'
                        : 'Agrega pago exacto o captura un método personalizado.'}
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>

        <footer className="flex flex-col gap-3 border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            Total {formatCurrency(totals.total)} · Pagado {formatCurrency(totals.paid)}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 rounded-2xl border border-gray-200 px-5 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={onCompleteSale}
              disabled={!totals.isPaid || isCompletingSale}
              className="min-h-12 rounded-2xl bg-[#59C3A5] px-6 py-3 text-sm font-black text-[#123D34] shadow-sm transition hover:bg-[#4FB596] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
            >
              {isCompletingSale ? 'Guardando venta...' : 'Finalizar venta'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function AmountTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'aqua' | 'coral' | 'yellow';
}) {
  const toneClass = {
    default: 'bg-white/10 text-white',
    aqua: 'bg-[#59C3A5]/20 text-[#CFF8EE]',
    coral: 'bg-[#FF6B5E]/20 text-[#FFE5E2]',
    yellow: 'bg-[#F4C84A]/20 text-[#FFF2BF]',
  }[tone];

  return (
    <div className={`rounded-2xl px-4 py-3 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-normal opacity-80">{label}</p>
      <p className="mt-1 break-words text-lg font-black">{value}</p>
    </div>
  );
}

function PaymentTouchButton({
  label,
  shortcut,
  emoji,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  shortcut: string;
  emoji: string;
  tone: 'aqua' | 'blue' | 'yellow' | 'disabled';
  disabled: boolean;
  onClick: () => void;
}) {
  const toneClass = {
    aqua: 'border-[#59C3A5]/50 bg-[#59C3A5]/10 text-[#14745F] hover:bg-[#59C3A5]/20 dark:text-[#9DE7D3]',
    blue: 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
    yellow: 'border-[#F4C84A]/60 bg-[#F4C84A]/15 text-[#8A6500] hover:bg-[#F4C84A]/25 dark:text-[#F4C84A]',
    disabled: 'border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500',
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex min-h-[116px] items-center gap-4 rounded-[22px] border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm transition group-hover:scale-105 dark:bg-gray-950/50" aria-hidden="true">
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-black leading-tight">{label}</span>
        <span className="mt-1 block text-xs font-bold opacity-75">{shortcut}</span>
      </span>
      {!disabled && <Plus className="h-5 w-5 shrink-0" />}
    </button>
  );
}

function PaymentRow({
  payment,
  onRemove,
  formatCurrency,
}: {
  payment: Payment;
  onRemove: () => void;
  formatCurrency: (amount: number) => string;
}) {
  const methodLabel = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    credit: 'Crédito',
  }[payment.method] ?? 'Pago';
  const methodEmoji = {
    cash: '💵',
    card: '💳',
    transfer: '🏦',
    credit: '🧾',
  }[payment.method] ?? '💰';

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-[#F7F8FA] p-3 dark:border-gray-700 dark:bg-gray-950/40">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm dark:bg-gray-900" aria-hidden="true">
          {methodEmoji}
        </span>
        <div className="min-w-0">
          <p className="font-black text-[#222831] dark:text-white">{methodLabel}</p>
          <p className="truncate text-xs font-semibold text-gray-500 dark:text-gray-400">
            {payment.creditDetails?.customerName ?? payment.reference ?? 'Sin referencia'}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <p className="text-base font-black text-[#222831] dark:text-white">{formatCurrency(payment.amount)}</p>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#EF4444] transition hover:bg-red-50 dark:hover:bg-red-900/20"
          aria-label={`Quitar pago ${methodLabel}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
