import { AlertCircle, Check, Plus, X } from 'lucide-react';
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
  formatCurrency,
}: SalePaymentPanelProps) {
  return (
    <div className="w-96 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className={`px-6 py-6 ${
        totals.isPaid
          ? 'bg-gradient-to-br from-green-500 to-green-600'
          : 'bg-gradient-to-br from-orange-500 to-orange-600'
      } text-white transition-all`}>
        <p className="text-sm font-medium opacity-90 mb-1">Total a Cobrar</p>
        <p className="text-5xl font-bold tracking-tight">
          {formatCurrency(totals.total)}
        </p>
      </div>

      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Total Pagado:</span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {formatCurrency(totals.paid)}
          </span>
        </div>

        {totals.isPaid ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-500 rounded-lg">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">Pago Completo</p>
              {totals.change > 0 && (
                <p className="text-xs text-green-600 dark:text-green-500">
                  Cambio: {formatCurrency(totals.change)}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-500 rounded-lg">
            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
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
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Pagos Agregados</p>
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white dark:bg-gray-600 rounded-lg flex items-center justify-center">
                    {payment.method === 'cash' && <span className="text-xl">💵</span>}
                    {payment.method === 'card' && <span className="text-xl">💳</span>}
                    {payment.method === 'transfer' && <span className="text-xl">📱</span>}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                      {payment.method === 'cash' && 'Efectivo'}
                      {payment.method === 'card' && 'Tarjeta'}
                      {payment.method === 'transfer' && 'Transferencia'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {payment.reference || 'Sin referencia'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-gray-900 dark:text-white">
                    {formatCurrency(payment.amount)}
                  </p>
                  <button
                    onClick={() => onRemovePayment(payment.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 p-6 space-y-3 overflow-y-auto">
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
            disabled={cartItemCount === 0}
            className="w-full p-5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl">⚡</span>
              <div className="text-left">
                <p className="text-xl font-bold">COBRAR EXACTO</p>
                <p className="text-sm opacity-90">Efectivo • Sin cambio</p>
              </div>
            </div>
          </button>
        )}

        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {payments.length > 0 ? 'O agregar otro pago' : 'Pago personalizado'}
        </p>

        <PaymentMethodButton
          label="Efectivo"
          shortcut="F1"
          icon="💵"
          tone="green"
          disabled={cartItemCount === 0 || totals.isPaid}
          onClick={() => onAddPayment('cash')}
        />
        <PaymentMethodButton
          label="Tarjeta"
          shortcut="F2"
          icon="💳"
          tone="blue"
          disabled={cartItemCount === 0 || totals.isPaid}
          onClick={() => onAddPayment('card')}
        />
        <PaymentMethodButton
          label="Transferencia"
          shortcut="F3"
          icon="📱"
          tone="purple"
          disabled={cartItemCount === 0 || totals.isPaid}
          onClick={() => onAddPayment('transfer')}
        />
      </div>

      <div className="p-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onCompleteSale}
          disabled={!totals.isPaid}
          className={`w-full p-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
            totals.isPaid
              ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:shadow-xl active:scale-98'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          {totals.isPaid ? (
            <div className="flex items-center justify-center gap-2">
              <Check className="w-6 h-6" />
              <span>COMPLETAR VENTA (F4)</span>
            </div>
          ) : (
            <span>AGREGAR PAGOS PARA CONTINUAR</span>
          )}
        </button>
      </div>

      <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
        <OperationalActivityFeed activities={recentActivities} />
      </div>
    </div>
  );
}

function PaymentMethodButton({
  label,
  shortcut,
  icon,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  shortcut: string;
  icon: string;
  tone: 'green' | 'blue' | 'purple';
  disabled: boolean;
  onClick: () => void;
}) {
  const toneClasses = {
    green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:hover:from-green-500',
    blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:hover:from-blue-500',
    purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:hover:from-purple-500',
  }[tone];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full p-4 bg-gradient-to-r ${toneClasses} text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-3`}
    >
      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="flex-1 text-left">
        <p className="font-bold">{label}</p>
        <p className="text-xs opacity-90">{shortcut}</p>
      </div>
      <Plus className="w-5 h-5" />
    </button>
  );
}

