import { Banknote, CreditCard, Smartphone, Wallet } from 'lucide-react';
import type { PosPaymentMethodSummary } from '../services/posBackendApi';

export const toClosingNumber = (value: number | string | null | undefined) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const formatClosingCurrency = (amount: number, currency: string) => (
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(amount)
);

const paymentLabels: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  WALLET: 'Wallet',
  CREDIT: 'Credito',
};

const paymentIcons = {
  CASH: Banknote,
  CARD: CreditCard,
  TRANSFER: Smartphone,
  WALLET: Wallet,
  CREDIT: CreditCard,
} as const;

export function ShiftStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
      <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 truncate text-lg font-black text-gray-950 dark:text-white">{value}</p>
    </div>
  );
}

export function SummaryCard({
  label,
  value,
  currency,
  tone = 'neutral',
  strong = false,
}: {
  label: string;
  value: number | string;
  currency: string;
  tone?: 'neutral' | 'success' | 'warning' | 'info';
  strong?: boolean;
}) {
  const toneClass = {
    neutral: 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40',
    success: 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10',
    warning: 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10',
    info: 'border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10',
  }[tone];

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 ${strong ? 'text-2xl' : 'text-xl'} font-black text-gray-950 dark:text-white`}>
        {formatClosingCurrency(toClosingNumber(value), currency)}
      </p>
    </div>
  );
}

export function PaymentSummaryRow({ payment, currency }: { payment: PosPaymentMethodSummary; currency: string }) {
  const Icon = paymentIcons[payment.paymentMethod] ?? CreditCard;

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
            {paymentLabels[payment.paymentMethod] ?? payment.paymentMethod}
          </p>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {payment.count} movimiento{payment.count === 1 ? '' : 's'}
          </p>
        </div>
      </div>
      <p className="text-right text-sm font-black text-gray-950 dark:text-white">
        {formatClosingCurrency(toClosingNumber(payment.amount), currency)}
      </p>
    </div>
  );
}

export function ClosingTotal({
  label,
  value,
  currency,
  highlight = false,
}: {
  label: string;
  value: number;
  currency: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-xl font-black ${highlight ? 'text-gray-950 dark:text-white' : 'text-gray-800 dark:text-gray-100'}`}>
        {value > 0 && highlight ? '+' : ''}{formatClosingCurrency(value, currency)}
      </p>
    </div>
  );
}
