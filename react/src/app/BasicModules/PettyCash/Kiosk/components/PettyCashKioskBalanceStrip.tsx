import { Banknote, ReceiptText, ShieldCheck, WalletCards } from 'lucide-react';

interface BalanceMetric {
  label: string;
  tone: 'blue' | 'green' | 'orange' | 'slate';
  value: string;
}

interface PettyCashKioskBalanceStripProps {
  currentBalance: BalanceMetric;
  fundLimit: BalanceMetric;
  periodExpenses: BalanceMetric;
  periodIncome: BalanceMetric;
}

const toneClasses = {
  blue: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300',
  green: 'bg-emerald-50 text-[#147514] dark:bg-emerald-500/10 dark:text-emerald-300',
  orange: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
} as const;

export function PettyCashKioskBalanceStrip({
  currentBalance,
  fundLimit,
  periodExpenses,
  periodIncome,
}: PettyCashKioskBalanceStripProps) {
  const metrics = [
    { ...currentBalance, icon: <WalletCards className="h-4 w-4" /> },
    { ...fundLimit, icon: <ShieldCheck className="h-4 w-4" /> },
    { ...periodIncome, icon: <Banknote className="h-4 w-4" /> },
    { ...periodExpenses, icon: <ReceiptText className="h-4 w-4" /> },
  ];

  return (
    <section className="grid grid-cols-2 gap-2" aria-label={metrics.map(metric => metric.label).join(', ')}>
      {metrics.map(metric => (
        <div key={metric.label} className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${toneClasses[metric.tone]}`}>{metric.icon}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{metric.value}</p>
            <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{metric.label}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
