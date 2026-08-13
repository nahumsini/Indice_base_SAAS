import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, Check, ChevronDown, ChevronUp, Eye, Monitor, Pause, RotateCcw, Trash2, User } from 'lucide-react';
import type { OperationalActivity } from './OperationalActivityFeed';
import { OperationalActivityFeed } from './OperationalActivityFeed';
import type { SuspendedSale } from './SuspendedSalesPanel';
import { TouchCheckoutModal } from './TouchCheckoutModal';
import type { Payment, PaymentMethod } from '../types/sale.types';
import type { SaleTotals } from '../utils/saleCalculations';

const quantityOptions = [1, 2, 3, 5, 10];

interface SalePaymentPanelProps {
  totals: SaleTotals;
  payments: Payment[];
  cartItemCount: number;
  selectedQuickQuantity: number;
  suspendedSales: SuspendedSale[];
  recentActivities: OperationalActivity[];
  onRemovePayment: (paymentId: string) => void;
  onSuspendSale: () => void;
  onResumeSuspendedSale: (saleId: string) => void;
  onDiscardSuspendedSale: (saleId: string) => void;
  onQuantityChange: (quantity: number) => void;
  onOpenSalePanel: () => void;
  onOpenReturn: () => void;
  onFullscreen: () => void;
  onOpenCustomerDisplay: () => void;
  onExactPayment: () => void;
  onAddPayment: (method: PaymentMethod) => void;
  onCompleteSale: () => void;
  isCompletingSale?: boolean;
  checkoutNotice?: string;
  onClearCheckoutNotice?: () => void;
  formatCurrency: (amount: number) => string;
}

export function SalePaymentPanel({
  totals,
  payments,
  cartItemCount,
  selectedQuickQuantity,
  suspendedSales,
  recentActivities,
  onRemovePayment,
  onSuspendSale,
  onResumeSuspendedSale,
  onDiscardSuspendedSale,
  onQuantityChange,
  onOpenSalePanel,
  onOpenReturn,
  onFullscreen,
  onOpenCustomerDisplay,
  onExactPayment,
  onAddPayment,
  onCompleteSale,
  isCompletingSale = false,
  checkoutNotice = '',
  onClearCheckoutNotice,
  formatCurrency,
}: SalePaymentPanelProps) {
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const canOpenCheckout = cartItemCount > 0 || payments.length > 0;

  useEffect(() => {
    if (
      isCheckoutOpen
      && !isCompletingSale
      && cartItemCount === 0
      && payments.length === 0
      && checkoutNotice.startsWith('Venta ')
    ) {
      setIsCheckoutOpen(false);
    }
  }, [cartItemCount, checkoutNotice, isCheckoutOpen, isCompletingSale, payments.length]);

  return (
    <>
      <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-[#222831]/10 bg-white dark:border-gray-700 dark:bg-gray-800">
        <section className="space-y-2.5 border-b border-gray-200 p-3 dark:border-gray-700">
          <div className={`rounded-xl p-3 ${totals.isPaid ? 'bg-[#59C3A5] text-[#222831]' : 'bg-[#222831] text-white'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium opacity-90">Cobro</p>
                <p className="mt-1 break-words text-3xl font-medium leading-none">
                  {formatCurrency(totals.total)}
                </p>
              </div>
              <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium">
                {totals.isPaid ? 'Listo' : 'Pendiente'}
              </span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <StatusTile label="Pagado" value={formatCurrency(totals.paid)} />
            <StatusTile
              label={totals.isPaid ? 'Cambio' : 'Falta'}
              value={formatCurrency(totals.isPaid ? totals.change : totals.remaining)}
              tone={totals.isPaid ? 'aqua' : 'warning'}
            />
          </div>

          <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 ${
            totals.isPaid
              ? 'border-[#59C3A5]/50 bg-[#59C3A5]/10'
              : 'border-[#F4C84A]/60 bg-[#F4C84A]/15'
          }`}>
            {totals.isPaid ? (
              <Check className="mt-1 h-5 w-5 shrink-0 text-[#14745F] dark:text-[#9DE7D3]" />
            ) : (
              <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-[#B77900] dark:text-[#F4C84A]" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#222831] dark:text-white">
                {totals.isPaid ? 'Pago completo' : 'Listo para cobrar'}
              </p>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {totals.isPaid
                  ? 'Abre el cobro para revisar y finalizar la venta.'
                  : 'Abre el modal touch para elegir método de pago.'}
              </p>
            </div>
          </div>

          {payments.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-[#F7F8FA] px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Pagos registrados</p>
              <p className="text-base font-medium text-[#222831] dark:text-white">
                {payments.length} pago{payments.length === 1 ? '' : 's'} · {formatCurrency(totals.paid)}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCheckoutOpen(true)}
            disabled={!canOpenCheckout || isCompletingSale}
            className="min-h-12 w-full rounded-xl bg-[#FF6B5E] px-5 py-2.5 text-lg font-medium text-[#222831] transition hover:bg-[#ff5a4b] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {cartItemCount === 0 && payments.length === 0
              ? 'Agrega productos'
              : totals.isPaid
              ? 'Revisar y finalizar'
              : 'Cobrar'}
          </button>
        </section>

        <div className="border-b border-gray-200 p-3 dark:border-gray-700">
          <CompactPosActions
            selectedQuickQuantity={selectedQuickQuantity}
            suspendedSales={suspendedSales}
            canSuspend={cartItemCount > 0}
            onSuspend={onSuspendSale}
            onResume={onResumeSuspendedSale}
            onDiscard={onDiscardSuspendedSale}
            onQuantityChange={onQuantityChange}
            onOpenSalePanel={onOpenSalePanel}
            onOpenReturn={onOpenReturn}
            onFullscreen={onFullscreen}
            onOpenCustomerDisplay={onOpenCustomerDisplay}
            formatCurrency={formatCurrency}
          />
        </div>

        <div className="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
          <button
            onClick={() => setIsActivityOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            aria-expanded={isActivityOpen}
          >
            <span>Actividad reciente</span>
            {isActivityOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {isActivityOpen && (
            <div className="border-t border-gray-200 p-4 dark:border-gray-700">
              <OperationalActivityFeed activities={recentActivities} />
            </div>
          )}
        </div>
      </div>

      <TouchCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        totals={totals}
        payments={payments}
        cartItemCount={cartItemCount}
        onRemovePayment={onRemovePayment}
        onExactPayment={onExactPayment}
        onAddPayment={onAddPayment}
        onCompleteSale={onCompleteSale}
        isCompletingSale={isCompletingSale}
        checkoutNotice={checkoutNotice}
        onClearCheckoutNotice={onClearCheckoutNotice}
        formatCurrency={formatCurrency}
      />
    </>
  );
}

function CompactPosActions({
  selectedQuickQuantity,
  suspendedSales,
  canSuspend,
  onSuspend,
  onResume,
  onDiscard,
  onQuantityChange,
  onOpenSalePanel,
  onOpenReturn,
  onFullscreen,
  onOpenCustomerDisplay,
  formatCurrency,
}: {
  selectedQuickQuantity: number;
  suspendedSales: SuspendedSale[];
  canSuspend: boolean;
  onSuspend: () => void;
  onResume: (saleId: string) => void;
  onDiscard: (saleId: string) => void;
  onQuantityChange: (quantity: number) => void;
  onOpenSalePanel: () => void;
  onOpenReturn: () => void;
  onFullscreen: () => void;
  onOpenCustomerDisplay: () => void;
  formatCurrency: (amount: number) => string;
}) {
  const visibleSuspendedSales = suspendedSales.slice(0, 1);

  return (
    <section className="space-y-2.5">
      <div>
        <p className="mb-1.5 text-[10px] font-medium tracking-normal text-gray-500 dark:text-gray-400">
          Cantidad rápida
        </p>
        <div className="grid grid-cols-5 gap-2">
          {quantityOptions.map((quantity) => (
            <button
              key={quantity}
              type="button"
              onClick={() => onQuantityChange(quantity)}
              className={`min-h-11 rounded-xl text-sm font-medium transition active:scale-95 ${
                selectedQuickQuantity === quantity
                  ? 'bg-[#FF6B5E] text-[#222831]'
                  : 'bg-[#F7F8FA] text-gray-700 ring-1 ring-gray-200 hover:bg-[#FF6B5E]/10 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-700'
              }`}
            >
              x{quantity}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <QuickActionButton label="Pausar" icon={<Pause className="h-4 w-4" />} disabled={!canSuspend} onClick={onSuspend} />
        <QuickActionButton label="Ticket" icon={<Eye className="h-4 w-4" />} onClick={onOpenSalePanel} />
        <QuickActionButton label="Devolución" icon={<RotateCcw className="h-4 w-4" />} onClick={onOpenReturn} />
        <QuickActionButton label="Pantalla" icon={<Monitor className="h-4 w-4" />} onClick={onFullscreen} />
        <QuickActionButton label="Espejo" icon={<User className="h-4 w-4" />} onClick={onOpenCustomerDisplay} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-[#F7F8FA] p-3 dark:border-gray-700 dark:bg-gray-900/40">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#222831] dark:text-white">Tickets pausados</p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {suspendedSales.length === 0
                ? 'Sin tickets en espera'
                : `${suspendedSales.length} ticket${suspendedSales.length === 1 ? '' : 's'} en espera`}
            </p>
          </div>
          {suspendedSales.length > 0 && (
            <span className="rounded-full bg-[#F4C84A]/20 px-2 py-1 text-xs font-medium text-[#8A6500] dark:text-[#F4C84A]">
              {suspendedSales.length}
            </span>
          )}
        </div>

        {suspendedSales.length > 0 && (
          <div className="mt-2 space-y-2">
            {visibleSuspendedSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 dark:bg-gray-950/40">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-[#222831] dark:text-white">{sale.title}</p>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{formatCurrency(sale.total)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => onResume(sale.id)}
                    className="min-h-9 rounded-xl bg-[#222831] px-3 py-1 text-xs font-medium text-white"
                  >
                    Abrir
                  </button>
                  <button
                    type="button"
                    onClick={() => onDiscard(sale.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-900/20"
                    aria-label="Descartar ticket pausado"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {suspendedSales.length > visibleSuspendedSales.length && (
              <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                +{suspendedSales.length - visibleSuspendedSales.length} ticket{(suspendedSales.length - visibleSuspendedSales.length) === 1 ? '' : 's'} en espera
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function QuickActionButton({
  label,
  icon,
  onClick,
  disabled = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-white px-2.5 py-2 text-xs font-medium text-gray-700 ring-1 ring-gray-200 transition hover:bg-[#FF6B5E]/10 hover:text-[#B63B32] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-700 dark:hover:text-[#FFB0AA]"
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}

function StatusTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'aqua' | 'warning';
}) {
  const toneClass = {
    default: 'bg-[#F7F8FA] text-[#222831] dark:bg-gray-900/40 dark:text-white',
    aqua: 'bg-[#59C3A5]/10 text-[#14745F] dark:bg-[#59C3A5]/10 dark:text-[#9DE7D3]',
    warning: 'bg-[#F4C84A]/15 text-[#8A6500] dark:bg-[#F4C84A]/10 dark:text-[#F4C84A]',
  }[tone];

  return (
    <div className={`rounded-xl px-3 py-2.5 ${toneClass}`}>
      <p className="text-[10px] font-medium tracking-normal opacity-75">{label}</p>
      <p className="mt-0.5 break-words text-base font-medium leading-tight">{value}</p>
    </div>
  );
}
