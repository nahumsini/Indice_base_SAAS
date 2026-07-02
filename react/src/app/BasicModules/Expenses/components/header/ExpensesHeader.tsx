import { Coins, Columns3, Landmark, Plus, ReceiptText, Store } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { financeCurrencySelectOptions } from '../../constants/financeCurrencyOptions';
import { useFinanceTranslations } from '../../hooks/useFinanceTranslations';

type ExpensesHeaderProps = {
  createExpenseDisabled?: boolean;
  createExpenseDisabledReason?: string;
  onConfigureColumns: () => void;
  onCreatePayableAccount: () => void;
  onCreateExpense: () => void;
  onOpenPayablesKiosk: () => void;
  onPreferredCurrencyChange: (currency: string) => void;
  preferredCurrency: string;
};

export function ExpensesHeader({
  createExpenseDisabled = false,
  createExpenseDisabledReason,
  onConfigureColumns,
  onCreatePayableAccount,
  onCreateExpense,
  onOpenPayablesKiosk,
  onPreferredCurrencyChange,
  preferredCurrency,
}: ExpensesHeaderProps) {
  const t = useFinanceTranslations();

  return (
    <section className="rounded-lg border border-[#147514]/25 bg-[#147514]/10 p-5 shadow-sm dark:border-emerald-400/25 dark:bg-emerald-400/10 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#147514] text-white shadow-sm">
            <ReceiptText className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              {t.expenses.headerTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t.expenses.headerSubtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-11 items-center gap-2 rounded-xl border border-[#147514]/25 bg-white px-3 text-sm font-semibold text-slate-700 shadow-none dark:border-emerald-400/25 dark:bg-slate-800 dark:text-slate-100">
            <Coins className="h-4 w-4 text-[#147514]" />
            <span>{t.expenses.preferredCurrency}</span>
            <Select value={preferredCurrency} onValueChange={onPreferredCurrencyChange}>
              <SelectTrigger
                aria-label={t.expenses.preferredCurrency}
                className="h-8 w-[92px] rounded-lg border-slate-200 bg-slate-50 px-2 text-sm font-bold text-slate-900 shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {financeCurrencySelectOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            disabled={createExpenseDisabled}
            onClick={onCreatePayableAccount}
            title={createExpenseDisabledReason}
            variant="outline"
            className="h-11 justify-center gap-2 rounded-xl border-[#147514]/25 bg-white px-4 text-sm font-semibold text-[#147514] shadow-none hover:bg-[#147514] hover:text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:border-emerald-400/25 dark:bg-slate-800 dark:text-white"
          >
            <Landmark className="h-4 w-4" />
            Cuenta por pagar
          </Button>

          <Button
            onClick={onOpenPayablesKiosk}
            variant="outline"
            className="h-11 justify-center gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[#147514] shadow-none hover:bg-[#147514] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <Store className="h-4 w-4" />
            Kiosko CxP
          </Button>

          <Button
            onClick={onConfigureColumns}
            variant="outline"
            className="h-11 justify-center gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[#147514] shadow-none hover:bg-[#147514] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <Columns3 className="w-4 h-4" />
            {t.common.columns}
          </Button>

          <Button
            disabled={createExpenseDisabled}
            onClick={onCreateExpense}
            title={createExpenseDisabledReason}
            className="h-11 justify-center gap-2 rounded-xl bg-[#147514] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#105010] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          >
            <Plus className="w-4 h-4" />
            {t.expenses.headerButton}
          </Button>
        </div>
      </div>
    </section>
  );
}
