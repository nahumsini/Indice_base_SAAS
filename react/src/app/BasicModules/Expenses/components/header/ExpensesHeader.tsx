import { Coins, Columns3, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { financeCurrencySelectOptions } from '../../constants/financeCurrencyOptions';
import { useFinanceTranslations } from '../../hooks/useFinanceTranslations';

type ExpensesHeaderProps = {
  createExpenseDisabled?: boolean;
  createExpenseDisabledReason?: string;
  onConfigureColumns: () => void;
  onCreateExpense: () => void;
  onPreferredCurrencyChange: (currency: string) => void;
  preferredCurrency: string;
};

export function ExpensesHeader({
  createExpenseDisabled = false,
  createExpenseDisabledReason,
  onConfigureColumns,
  onCreateExpense,
  onPreferredCurrencyChange,
  preferredCurrency,
}: ExpensesHeaderProps) {
  const t = useFinanceTranslations();

  return (
    <div className="rounded-xl border border-[#147514]/20 bg-[#147514]/10 px-4 py-4 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-400/10 sm:px-6 sm:py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white sm:text-[28px]">
            <span className="text-3xl leading-none" aria-hidden="true">💰</span>
            {t.expenses.headerTitle}
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {t.expenses.headerSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-row sm:items-center">
          <label className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#147514] shadow-none transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-auto">
            <Coins className="h-4 w-4" />
            <span>{t.expenses.preferredCurrency}</span>
            <select
              aria-label={t.expenses.preferredCurrency}
              value={preferredCurrency}
              onChange={(event) => onPreferredCurrencyChange(event.target.value)}
              className="cursor-pointer border-0 bg-transparent p-0 text-sm font-extrabold text-[#147514] outline-none focus:ring-0 dark:text-white"
            >
              {financeCurrencySelectOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <Button
            onClick={onConfigureColumns}
            variant="outline"
            className="h-11 w-full justify-center gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[#147514] shadow-none hover:bg-[#147514] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-auto"
          >
            <Columns3 className="w-4 h-4" />
            {t.common.columns}
          </Button>

          <Button
            disabled={createExpenseDisabled}
            onClick={onCreateExpense}
            title={createExpenseDisabledReason}
            className="h-11 w-full justify-center gap-2 rounded-xl bg-[#147514] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#105010] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            {t.expenses.headerButton}
          </Button>
        </div>
      </div>
    </div>
  );
}
