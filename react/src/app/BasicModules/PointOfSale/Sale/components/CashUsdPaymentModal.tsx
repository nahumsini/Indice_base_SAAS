import { useEffect, useState } from 'react';
import { Calculator, CheckCircle, DollarSign } from 'lucide-react';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from './PosModalFrame';

interface CashUsdPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onConfirmPayment: (amountPaid: number, change: number) => void;
}

const quickAmountsUsd = [10, 20, 50, 100];

export function CashUsdPaymentModal({ isOpen, onClose, totalAmount, onConfirmPayment }: CashUsdPaymentModalProps) {
  const [amountPaidUsd, setAmountPaidUsd] = useState('');
  const [exchangeRate, setExchangeRate] = useState(20);
  const [change, setChange] = useState(0);
  const [error, setError] = useState('');

  const formatCurrency = (amount: number, currency: 'MXN' | 'USD' = 'MXN') => new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(amount);

  const totalInUsd = exchangeRate > 0 ? totalAmount / exchangeRate : 0;
  const paidUsd = parseFloat(amountPaidUsd) || 0;
  const paidMxn = paidUsd * exchangeRate;
  const isEnough = paidMxn >= totalAmount;
  const missingAmount = Math.max(totalAmount - paidMxn, 0);

  useEffect(() => {
    const calculatedChange = paidMxn - totalAmount;
    setChange(calculatedChange > 0 ? calculatedChange : 0);
  }, [paidMxn, totalAmount]);

  const handleConfirm = () => {
    if (!isEnough) {
      setError('El monto pagado no puede ser menor al total.');
      return;
    }
    onConfirmPayment(paidMxn, change);
    setAmountPaidUsd('');
    setChange(0);
    setError('');
  };

  if (!isOpen) {
    return null;
  }

  return (
    <PosModalFrame
      modalType="standard-form"
      closeLabel="Cerrar cobro en dólares"
      eyebrow="Cobro POS"
      icon={<DollarSign className="h-6 w-6" />}
      onClose={onClose}
      size="sm"
      subtitle="Captura USD, valida el tipo de cambio y calcula el cambio en MXN."
      title="Cobro en dólares"
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footerLeading={(
        <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
          Cancelar
        </button>
      )}
      footerSummary={`${formatCurrency(totalAmount, 'MXN')} · ${formatCurrency(totalInUsd, 'USD')}`}
      footer={(
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!isEnough}
          className={posModalPrimaryActionClassName}
        >
          <CheckCircle className="h-5 w-5" />
          Confirmar cobro
        </button>
      )}
    >
      <div className="space-y-5">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-black text-blue-900 dark:text-blue-100">
              Tipo de cambio MXN por USD
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

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-sm font-black text-gray-500 dark:text-gray-400">Total MXN</p>
            <p className="mt-1 text-2xl font-black text-gray-950 dark:text-white">
              {formatCurrency(totalAmount, 'MXN')}
            </p>
          </div>
          <div className="rounded-lg border-2 border-emerald-500 bg-emerald-50 p-4 dark:bg-emerald-500/10">
            <p className="text-sm font-black text-emerald-700 dark:text-emerald-200">Equivalente USD</p>
            <p className="mt-1 text-2xl font-black text-emerald-800 dark:text-emerald-100">
              {formatCurrency(totalInUsd, 'USD')}
            </p>
          </div>
        </section>

        <section>
          <p className="mb-3 text-sm font-black text-gray-700 dark:text-gray-300">Montos rapidos USD</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAmountPaidUsd(totalInUsd.toFixed(2))}
              className="min-h-12 rounded-lg border-2 border-[#FF6B5E] bg-[#FF6B5E]/10 px-4 py-3 text-sm font-black text-[#A7352C] transition hover:bg-[#FF6B5E]/15 dark:text-[#FFB5AE]"
            >
              Exacto
            </button>
            {quickAmountsUsd.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setAmountPaidUsd(amount.toString())}
                className="min-h-12 rounded-lg bg-gray-100 px-4 py-3 text-sm font-black text-gray-900 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              >
                ${amount} USD
              </button>
            ))}
          </div>
        </section>

        <section>
          <label className="mb-2 block text-sm font-black text-gray-700 dark:text-gray-300">
            Con cuantos dolares paga el cliente
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-gray-500">$</span>
            <input
              type="number"
              step="0.01"
              value={amountPaidUsd}
              onChange={(event) => setAmountPaidUsd(event.target.value)}
              placeholder="0.00"
              className="min-h-16 w-full rounded-lg border-2 border-gray-300 bg-white py-4 pl-10 pr-16 text-2xl font-black text-gray-900 transition-all focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              autoFocus
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-500">USD</span>
          </div>
        </section>

        {paidUsd > 0 ? (
          <section className={`rounded-lg border-2 p-4 ${
            isEnough
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
              : 'border-red-500 bg-red-50 dark:bg-red-500/10'
          }`}>
            <div className="mb-2 flex items-center gap-2">
              <Calculator className={`h-5 w-5 ${isEnough ? 'text-emerald-700 dark:text-emerald-200' : 'text-red-700 dark:text-red-200'}`} />
              <p className={`text-sm font-black ${isEnough ? 'text-emerald-800 dark:text-emerald-100' : 'text-red-800 dark:text-red-100'}`}>
                {change > 0 ? 'Cambio a devolver MXN' : isEnough ? 'Pago exacto' : 'Monto insuficiente'}
              </p>
            </div>
            <p className={`text-3xl font-black ${isEnough ? 'text-emerald-800 dark:text-emerald-100' : 'text-red-800 dark:text-red-100'}`}>
              {formatCurrency(isEnough ? change : missingAmount, 'MXN')}
            </p>
          </section>
        ) : null}
      </div>
    </PosModalFrame>
  );
}
