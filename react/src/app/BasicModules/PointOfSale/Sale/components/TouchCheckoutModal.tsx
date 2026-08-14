import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Banknote, Check, CreditCard, Landmark, Plus, ReceiptText, Wallet, X } from 'lucide-react';
import type { Payment, PaymentMethod } from '../types/sale.types';
import type { SaleTotals } from '../utils/saleCalculations';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from './PosModalFrame';

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
  icon: ReactNode;
  tone: 'aqua' | 'blue' | 'yellow' | 'disabled';
  disabled?: boolean;
}> = [
  { method: 'cash', label: 'Efectivo', shortcut: 'F1', icon: <Banknote className="h-6 w-6" />, tone: 'aqua' },
  { method: 'card', label: 'Tarjeta', shortcut: 'F2', icon: <CreditCard className="h-6 w-6" />, tone: 'blue' },
  { method: 'transfer', label: 'Transferencia', shortcut: 'F3', icon: <Landmark className="h-6 w-6" />, tone: 'blue' },
  { method: 'credit', label: 'Credito', shortcut: 'F5', icon: <ReceiptText className="h-6 w-6" />, tone: 'yellow' },
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
  if (!isOpen) {
    return null;
  }

  const hasCart = cartItemCount > 0;

  return createPortal((
    <PosModalFrame
      modalType="operational-workspace"
      closeLabel="Cerrar cobro"
      eyebrow="Cobro touch"
      icon={<Wallet className="h-6 w-6" />}
      onClose={onClose}
      size="xl"
      subtitle="Elige un método, agrega pagos y finaliza la venta."
      title="Resumen de cobro"
      tone="coral"
      zIndexClassName="z-40"
      footerClassName={posModalModuleFooterClassName}
      footerLeading={(
        <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
          Volver
        </button>
      )}
      footerSummary={`Total ${formatCurrency(totals.total)} · Pagado ${formatCurrency(totals.paid)} · ${cartItemCount} artículos`}
      footer={(
        <button
          type="button"
          onClick={onCompleteSale}
          disabled={!totals.isPaid || isCompletingSale}
          className={posModalPrimaryActionClassName}
        >
          {isCompletingSale ? 'Guardando venta...' : 'Finalizar venta'}
        </button>
      )}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="space-y-5">
          <section className="rounded-lg bg-[#222831] p-5 text-white shadow-sm">
            <p className="text-sm font-medium text-gray-300">Total a cobrar</p>
            <p className="mt-2 break-words text-5xl font-medium leading-none">{formatCurrency(totals.total)}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <AmountTile label="Pagado" value={formatCurrency(totals.paid)} />
              <AmountTile
                label={totals.isPaid ? 'Cambio' : 'Falta'}
                value={formatCurrency(totals.isPaid ? totals.change : totals.remaining)}
                tone={totals.isPaid ? 'aqua' : 'coral'}
              />
              <AmountTile label="Articulos" value={String(cartItemCount)} tone="yellow" />
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-medium text-[#222831] dark:text-white">Metodos de pago</h3>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Botones grandes para operacion en pantalla tactil.</p>
              </div>
              <button
                type="button"
                onClick={onExactPayment}
                disabled={!hasCart || totals.isPaid || isCompletingSale}
                className="min-h-12 rounded-lg bg-[#FF6B5E] px-5 py-3 text-sm font-medium text-[#222831] shadow-sm transition hover:bg-[#ff5a4b] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Cobrar exacto
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {paymentMethodConfig.map((method) => (
                <PaymentTouchButton
                  key={method.method}
                  {...method}
                  disabled={Boolean(method.disabled || !hasCart || totals.isPaid || isCompletingSale || (payments.length > 0 && method.method === 'credit'))}
                  onClick={() => onAddPayment(method.method)}
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          {checkoutNotice ? (
            <section className="rounded-lg border border-[#FF6B5E]/35 bg-[#FF6B5E]/10 p-4 shadow-sm dark:border-[#FF6B5E]/30 dark:bg-[#FF6B5E]/10">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-[#C64237]" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#A7352C] dark:text-[#FFB5AE]">
                    No se pudo finalizar
                  </p>
                  <p className="mt-1 text-sm font-medium leading-5 text-[#7F2A23] dark:text-[#FFE5E2]">
                    {checkoutNotice}
                  </p>
                </div>
                {onClearCheckoutNotice ? (
                  <button
                    type="button"
                    onClick={onClearCheckoutNotice}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#A7352C] transition hover:bg-[#FF6B5E]/15 dark:text-[#FFB5AE]"
                    aria-label="Ocultar mensaje de checkout"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-medium text-[#222831] dark:text-white">Pagos agregados</h3>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {payments.length === 0 ? 'Todavia no hay pagos capturados.' : `${payments.length} pago${payments.length === 1 ? '' : 's'} registrado${payments.length === 1 ? '' : 's'}.`}
                </p>
              </div>
              {totals.isPaid ? (
                <span className="rounded-full bg-[#59C3A5]/15 px-3 py-1 text-xs font-medium text-[#14745F] dark:text-[#9DE7D3]">Completo</span>
              ) : (
                <span className="rounded-full bg-[#F4C84A]/20 px-3 py-1 text-xs font-medium text-[#8A6500] dark:text-[#F4C84A]">Pendiente</span>
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

              {payments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-[#F7F8FA] p-5 text-center dark:border-gray-700 dark:bg-gray-950/40">
                  <ReceiptText className="mx-auto h-8 w-8 text-[#FF6B5E]" aria-hidden="true" />
                  <p className="mt-2 text-sm font-medium text-[#222831] dark:text-white">Sin pagos</p>
                  <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">Selecciona un metodo para capturar el primer pago.</p>
                </div>
              ) : null}
            </div>
          </section>

          <section className={`rounded-lg border p-5 shadow-sm ${
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
                <p className="text-sm font-medium text-[#222831] dark:text-white">
                  {totals.isPaid ? 'Pago listo para finalizar' : 'Falta cubrir el total'}
                </p>
                <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                  {totals.isPaid
                    ? 'Verifica el cambio antes de cerrar la venta.'
                    : 'Agrega pago exacto o captura un metodo personalizado.'}
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </PosModalFrame>
  ), document.body);
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
    <div className={`rounded-lg px-4 py-3 ${toneClass}`}>
      <p className="text-[10px] font-medium tracking-normal opacity-80">{label}</p>
      <p className="mt-1 break-words text-lg font-medium">{value}</p>
    </div>
  );
}

function PaymentTouchButton({
  label,
  shortcut,
  icon,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  shortcut: string;
  icon: ReactNode;
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
      className={`group flex min-h-[116px] items-center gap-4 rounded-lg border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm transition group-hover:scale-105 dark:bg-gray-950/50" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-medium leading-tight">{label}</span>
        <span className="mt-1 block text-xs font-medium opacity-75">{shortcut}</span>
      </span>
      {!disabled ? <Plus className="h-5 w-5 shrink-0" /> : null}
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
    credit: 'Credito',
  }[payment.method] ?? 'Pago';
  const methodIcon = {
    cash: <Banknote className="h-5 w-5" />,
    card: <CreditCard className="h-5 w-5" />,
    transfer: <Landmark className="h-5 w-5" />,
    credit: <ReceiptText className="h-5 w-5" />,
  }[payment.method] ?? <Wallet className="h-5 w-5" />;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-[#F7F8FA] p-3 dark:border-gray-700 dark:bg-gray-950/40">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-gray-900" aria-hidden="true">
          {methodIcon}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-[#222831] dark:text-white">{methodLabel}</p>
          <p className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">
            {payment.creditDetails?.customerName ?? payment.reference ?? 'Sin referencia'}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <p className="text-base font-medium text-[#222831] dark:text-white">{formatCurrency(payment.amount)}</p>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#EF4444] transition hover:bg-red-50 dark:hover:bg-red-900/20"
          aria-label={`Quitar pago ${methodLabel}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
