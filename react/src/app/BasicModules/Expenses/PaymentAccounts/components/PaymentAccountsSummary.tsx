import { Banknote, CheckCircle2, CircleSlash, CreditCard } from 'lucide-react';
import type { ReactNode } from 'react';
import { usePaymentAccountsTranslations } from '../hooks/usePaymentAccountsTranslations';
import type { PaymentAccount } from '../types';
import { useLearningModeHeaderActions } from '../../../../learningMode';

export function PaymentAccountsSummary({ accounts }: { accounts: PaymentAccount[] }) {
  const learningModeActive = useLearningModeHeaderActions()?.active ?? false;
  const t = usePaymentAccountsTranslations();
  const totalCount = accounts.length;
  const activeCount = accounts.filter(account => account.isActive).length;
  const inactiveCount = accounts.filter(account => !account.isActive).length;
  const internalCashCount = accounts.filter(account => account.source === 'petty_cash').length;
  const activeWidth = totalCount > 0 ? `${(activeCount / totalCount) * 100}%` : '0%';
  const inactiveWidth = totalCount > 0 ? `${(inactiveCount / totalCount) * 100}%` : '0%';

  if (learningModeActive) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Metric icon={<CreditCard className="h-4 w-4" />} label={t.expenses.modal.summaryTotal} value={totalCount} />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <Metric icon={<CheckCircle2 className="h-4 w-4" />} label={t.common.active} value={activeCount} valueClassName="text-[#147514]" />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <Metric icon={<CircleSlash className="h-4 w-4" />} label={t.common.inactive} value={inactiveCount} valueClassName="text-rose-600 dark:text-rose-400" />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <Metric icon={<Banknote className="h-4 w-4" />} label={t.paymentAccounts.table.pettyCash} value={internalCashCount} valueClassName="text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex min-w-[220px] flex-col gap-2">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div className="flex h-full">
              <div className="bg-[#147514] transition-all duration-300" style={{ width: activeWidth }} />
              <div className="bg-rose-500 transition-all duration-300" style={{ width: inactiveWidth }} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#147514]" />{t.common.active}</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />{t.common.inactive}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, valueClassName = 'text-slate-900 dark:text-white' }: { icon: ReactNode; label: string; value: number; valueClassName?: string }) {
  return (
    <div className="flex min-w-fit items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#147514] shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">{icon}</span>
      <span className={`font-medium ${valueClassName}`}>{value}</span>
      <span>{label}</span>
    </div>
  );
}
