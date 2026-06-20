import { useState } from 'react';
import { AlertCircle, Banknote, Check, ChevronDown, ChevronUp, CreditCard, Plus, Smartphone, WalletCards, X, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { OperationalActivity } from './OperationalActivityFeed';
import { OperationalActivityFeed } from './OperationalActivityFeed';
import { SuspendedSalesPanel, type SuspendedSale } from './SuspendedSalesPanel';
import { TouchKeypad } from './TouchKeypad';
import type { Payment, PaymentMethod } from '../types/sale.types';
import type { SaleTotals } from '../utils/saleCalculations';

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
  onExactPayment: () => void;
  onAddPayment: (method: PaymentMethod) => void;
  onCompleteSale: () => void;
  isCompletingSale?: boolean;
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
  onExactPayment,
  onAddPayment,
  onCompleteSale,
  isCompletingSale = false,
  formatCurrency,
}: SalePaymentPanelProps) {
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className={`px-5 py-5 ${
        totals.isPaid
          ? 'bg-emerald-600'
          : 'bg-gray-950'
      } text-white transition`}>
        <p className="mb-1 text-sm font-semibold opacity-90">Resumen de cobro</p>
        <p className="break-words text-4xl font-black leading-none">
          {formatCurrency(totals.total)}
        </p>
      </div>

      <div className="space-y-3 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Total pagado:</span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {formatCurrency(totals.paid)}
          </span>
        </div>

        {totals.isPaid ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500 bg-emerald-50 p-3 dark:bg-emerald-900/20">
            <Check className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Pago completo</p>
              {totals.change > 0 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-500">
                  Cambio: {formatCurrency(totals.change)}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-orange-500 bg-orange-50 p-3 dark:bg-orange-900/20">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-orange-600 dark:text-orange-400" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">Falta por pagar</p>
              <p className="text-lg font-bold text-orange-600 dark:text-orange-500">
                {formatCurrency(totals.remaining)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <SuspendedSalesPanel
          suspendedSales={suspendedSales}
          canSuspend={cartItemCount > 0}
          onSuspend={onSuspendSale}
          onResume={onResumeSuspendedSale}
          onDiscard={onDiscardSuspendedSale}
          formatCurrency={formatCurrency}
        />
      </div>

      {payments.length > 0 && (
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <p className="mb-3 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Pagos agregados</p>
          <div className="space-y-2">
            {payments.map((payment) => {
              const PaymentIcon = payment.method === 'cash'
                ? Banknote
                : payment.method === 'card'
                ? CreditCard
                : payment.method === 'transfer'
                ? Smartphone
                : WalletCards;

              return (
                <div
                  key={payment.id}
                  className="group flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-700 shadow-sm dark:bg-gray-600 dark:text-gray-100">
                      <PaymentIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {payment.method === 'cash' && 'Efectivo'}
                        {payment.method === 'card' && 'Tarjeta'}
                        {payment.method === 'transfer' && 'Transferencia'}
                        {payment.method === 'credit' && 'Credito'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {payment.creditDetails?.customerName ?? payment.reference ?? 'Sin referencia'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-gray-900 dark:text-white">
                      {formatCurrency(payment.amount)}
                    </p>
                    <button
                      onClick={() => onRemovePayment(payment.id)}
                      className="rounded p-1 text-red-600 opacity-100 transition hover:bg-red-50 dark:hover:bg-red-900/20 xl:opacity-0 xl:group-hover:opacity-100"
                      aria-label="Quitar pago"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
        <TouchKeypad
          selectedQuantity={selectedQuickQuantity}
          suspendedCount={suspendedSales.length}
          canSuspendSale={cartItemCount > 0}
          onQuantityChange={onQuantityChange}
          onOpenSalePanel={onOpenSalePanel}
          onOpenReturn={onOpenReturn}
          onSuspendSale={onSuspendSale}
          onFullscreen={onFullscreen}
        />

        {!totals.isPaid && payments.length === 0 && (
          <button
            onClick={onExactPayment}
            disabled={cartItemCount === 0 || isCompletingSale}
            className="w-full rounded-lg bg-orange-600 p-5 text-white shadow-lg transition hover:bg-orange-700 hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <div className="flex items-center justify-center gap-3">
              <Zap className="h-7 w-7" />
              <div className="text-left">
                <p className="text-xl font-bold">COBRAR EXACTO</p>
                <p className="text-sm opacity-90">Efectivo • Sin cambio</p>
              </div>
            </div>
          </button>
        )}

        <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
          {payments.length > 0 ? 'O agregar otro pago' : 'Pago personalizado'}
        </p>

        <PaymentMethodButton
          label="Efectivo"
          shortcut="F1"
          icon={Banknote}
          tone="green"
          disabled={cartItemCount === 0 || totals.isPaid || isCompletingSale}
          onClick={() => onAddPayment('cash')}
        />
        <PaymentMethodButton
          label="Tarjeta"
          shortcut="F2"
          icon={CreditCard}
          tone="blue"
          disabled={cartItemCount === 0 || totals.isPaid || isCompletingSale}
          onClick={() => onAddPayment('card')}
        />
        <PaymentMethodButton
          label="Transferencia"
          shortcut="F3"
          icon={Smartphone}
          tone="purple"
          disabled={cartItemCount === 0 || totals.isPaid || isCompletingSale}
          onClick={() => onAddPayment('transfer')}
        />
        <PaymentMethodButton
          label="Credito"
          shortcut="F5"
          icon={WalletCards}
          tone="amber"
          disabled
          onClick={() => onAddPayment('credit')}
        />
      </div>

      <div className="border-t border-gray-200 p-5 dark:border-gray-700">
        <button
          onClick={onCompleteSale}
          disabled={!totals.isPaid || isCompletingSale}
          className={`w-full rounded-lg p-4 text-lg font-bold shadow-lg transition ${
            totals.isPaid && !isCompletingSale
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-xl active:scale-[0.98]'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          {isCompletingSale ? (
            <div className="flex items-center justify-center gap-2">
              <Check className="h-6 w-6" />
              <span>GUARDANDO VENTA...</span>
            </div>
          ) : totals.isPaid ? (
            <div className="flex items-center justify-center gap-2">
              <Check className="h-6 w-6" />
              <span>COBRAR VENTA (F4)</span>
            </div>
          ) : (
            <span>AGREGAR PAGOS PARA CONTINUAR</span>
          )}
        </button>
      </div>

      <div className="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
        <button
          onClick={() => setIsActivityOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
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
  );
}

function PaymentMethodButton({
  label,
  shortcut,
  icon: Icon,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  shortcut: string;
  icon: LucideIcon;
  tone: 'green' | 'blue' | 'purple' | 'amber';
  disabled: boolean;
  onClick: () => void;
}) {
  const toneClasses = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200 dark:hover:bg-emerald-900/30',
    blue: 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200 dark:hover:bg-blue-900/30',
    purple: 'border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-200 dark:hover:bg-purple-900/30',
    amber: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200 dark:hover:bg-amber-900/30',
  }[tone];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-lg border p-4 shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 ${toneClasses}`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-gray-900/60">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 text-left">
        <p className="font-bold">{label}</p>
        <p className="text-xs opacity-80">{shortcut}</p>
      </div>
      <Plus className="h-5 w-5" />
    </button>
  );
}
