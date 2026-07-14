import { useState, type ReactNode } from 'react';
import { AlertCircle, Banknote, CheckCircle, CreditCard, Landmark, Wallet } from 'lucide-react';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from './PosModalFrame';

interface MixedPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onConfirmPayment: () => void;
}

export function MixedPaymentModal({ isOpen, onClose, totalAmount, onConfirmPayment }: MixedPaymentModalProps) {
  const [cashAmount, setCashAmount] = useState('');
  const [cashUsdAmount, setCashUsdAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState(20);
  const [error, setError] = useState('');

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);

  const cash = parseFloat(cashAmount) || 0;
  const cashUsd = (parseFloat(cashUsdAmount) || 0) * exchangeRate;
  const card = parseFloat(cardAmount) || 0;
  const transfer = parseFloat(transferAmount) || 0;

  const totalPaid = cash + cashUsd + card + transfer;
  const remaining = totalAmount - totalPaid;
  const isComplete = totalPaid >= totalAmount;
  const isOverpaid = totalPaid > totalAmount;

  const handleQuickFill = (method: 'cash' | 'cash_usd' | 'card' | 'transfer') => {
    const remainingAmount = totalAmount - totalPaid;
    if (remainingAmount <= 0) {
      return;
    }

    switch (method) {
      case 'cash':
        setCashAmount((cash + remainingAmount).toFixed(2));
        break;
      case 'cash_usd':
        setCashUsdAmount(((parseFloat(cashUsdAmount || '0') || 0) + (remainingAmount / exchangeRate)).toFixed(2));
        break;
      case 'card':
        setCardAmount((card + remainingAmount).toFixed(2));
        break;
      case 'transfer':
        setTransferAmount((transfer + remainingAmount).toFixed(2));
        break;
    }
  };

  const handleConfirm = () => {
    if (!isComplete) {
      setError('El monto total pagado debe cubrir el total de la venta.');
      return;
    }

    onConfirmPayment();
    handleClear();
    setError('');
  };

  const handleClear = () => {
    setCashAmount('');
    setCashUsdAmount('');
    setCardAmount('');
    setTransferAmount('');
  };

  if (!isOpen) {
    return null;
  }

  return (
    <PosModalFrame
      closeLabel="Cerrar pago mixto"
      eyebrow="Cobro POS"
      icon={<Wallet className="h-6 w-6" />}
      onClose={onClose}
      size="md"
      subtitle="Distribuye el total entre efectivo, dolares, tarjeta y transferencia."
      title="Pago mixto"
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footer={(
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={handleClear}
            disabled={totalPaid === 0}
            className={posModalSecondaryActionClassName}
          >
            Limpiar
          </button>
          <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isComplete}
            className={posModalPrimaryActionClassName}
          >
            <CheckCircle className="h-5 w-5" />
            Confirmar pago mixto
          </button>
        </div>
      )}
    >
      <div className="space-y-5">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm font-black text-gray-500 dark:text-gray-400">Total a cobrar</p>
          <p className="mt-1 text-3xl font-black text-gray-950 dark:text-white">
            {formatCurrency(totalAmount)}
          </p>
        </section>

        <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-black text-blue-900 dark:text-blue-100">
              Tipo de cambio USD a MXN
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-blue-700 dark:text-blue-200">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={exchangeRate}
                onChange={(event) => setExchangeRate(parseFloat(event.target.value) || 20)}
                className="h-10 w-24 rounded-lg border border-blue-300 bg-white px-3 text-sm font-black text-blue-900 focus:ring-2 focus:ring-blue-500 dark:border-blue-700 dark:bg-gray-900 dark:text-blue-100"
              />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-black text-gray-700 dark:text-gray-300">Metodos de pago</h3>
          <PaymentAmountField
            icon={<Banknote className="h-5 w-5" />}
            label="Efectivo MXN"
            tone="green"
            value={cashAmount}
            onChange={setCashAmount}
            onQuickFill={() => handleQuickFill('cash')}
          />
          <PaymentAmountField
            icon={<Banknote className="h-5 w-5" />}
            label={`Efectivo USD = ${formatCurrency(cashUsd)}`}
            tone="green"
            value={cashUsdAmount}
            suffix="USD"
            onChange={setCashUsdAmount}
            onQuickFill={() => handleQuickFill('cash_usd')}
          />
          <PaymentAmountField
            icon={<CreditCard className="h-5 w-5" />}
            label="Tarjeta"
            tone="blue"
            value={cardAmount}
            onChange={setCardAmount}
            onQuickFill={() => handleQuickFill('card')}
          />
          <PaymentAmountField
            icon={<Landmark className="h-5 w-5" />}
            label="Transferencia"
            tone="purple"
            value={transferAmount}
            onChange={setTransferAmount}
            onQuickFill={() => handleQuickFill('transfer')}
          />
        </section>

        <section className={`rounded-lg border-2 p-4 ${
          isComplete && !isOverpaid
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
            : isOverpaid
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
              : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10'
        }`}>
          <div className="space-y-2">
            <SummaryRow label="Total pagado" value={formatCurrency(totalPaid)} />
            <SummaryRow label="Total requerido" value={formatCurrency(totalAmount)} />
            <div className="border-t border-black/10 pt-3 dark:border-white/10">
              <div className="flex items-center gap-2">
                {isComplete && !isOverpaid ? (
                  <CheckCircle className="h-5 w-5 text-emerald-700 dark:text-emerald-200" />
                ) : (
                  <AlertCircle className={`h-5 w-5 ${isOverpaid ? 'text-blue-700 dark:text-blue-200' : 'text-yellow-700 dark:text-yellow-200'}`} />
                )}
                <span className={`font-black ${
                  isComplete && !isOverpaid
                    ? 'text-emerald-800 dark:text-emerald-100'
                    : isOverpaid
                      ? 'text-blue-800 dark:text-blue-100'
                      : 'text-yellow-800 dark:text-yellow-100'
                }`}>
                  {isComplete && !isOverpaid
                    ? 'Pago completo'
                    : isOverpaid
                      ? `Excede por ${formatCurrency(Math.abs(remaining))}`
                      : `Falta ${formatCurrency(remaining)}`}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PosModalFrame>
  );
}

function PaymentAmountField({
  icon,
  label,
  tone,
  value,
  suffix,
  onChange,
  onQuickFill,
}: {
  icon: ReactNode;
  label: string;
  tone: 'green' | 'blue' | 'purple';
  value: string;
  suffix?: string;
  onChange: (value: string) => void;
  onQuickFill: () => void;
}) {
  const toneClass = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100',
    blue: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100',
    purple: 'border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-100',
  }[tone];

  return (
    <div className={`rounded-lg border-2 p-4 ${toneClass}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="truncate font-black">{label}</span>
        </div>
        <button
          type="button"
          onClick={onQuickFill}
          className="shrink-0 text-xs font-black underline-offset-4 hover:underline"
        >
          Completar resto
        </button>
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-gray-500">$</span>
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0.00"
          className="min-h-12 w-full rounded-lg border border-white/60 bg-white py-2.5 pl-8 pr-16 text-lg font-black text-gray-900 focus:ring-2 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
        />
        {suffix ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-gray-500">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="font-bold text-gray-700 dark:text-gray-300">{label}:</span>
      <span className="font-black text-gray-950 dark:text-white">{value}</span>
    </div>
  );
}
