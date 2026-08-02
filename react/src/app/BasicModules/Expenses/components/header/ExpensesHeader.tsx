import { Columns3, Landmark, Plus, Store } from 'lucide-react';
import { IndiceTitleBar } from '../../../../components/frontend-os';
import { Button } from '../../../../components/ui/button';
import { useExpensesModuleTranslations } from '../../hooks/useExpensesModuleTranslations';

type ExpensesHeaderProps = {
  createExpenseDisabled?: boolean;
  createExpenseDisabledReason?: string;
  onConfigureColumns: () => void;
  onCreatePayableAccount: () => void;
  onCreateExpense: () => void;
  onOpenPayablesKiosk: () => void;
};

export function ExpensesHeader({
  createExpenseDisabled = false,
  createExpenseDisabledReason,
  onConfigureColumns,
  onCreatePayableAccount,
  onCreateExpense,
  onOpenPayablesKiosk,
}: ExpensesHeaderProps) {
  const t = useExpensesModuleTranslations();
  const ActionLayout = () => (
    <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
      <Button disabled={createExpenseDisabled} onClick={onCreatePayableAccount} title={createExpenseDisabledReason} variant="outline" className="h-11 w-full justify-center gap-2 whitespace-nowrap rounded-xl border-[#147514]/25 bg-white px-4 text-sm font-medium text-[#147514] shadow-none hover:bg-[#147514] hover:text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:border-emerald-400/25 dark:bg-slate-800 dark:text-white sm:w-auto">
        <Landmark className="h-4 w-4" />
        {t.expenses.headerActions.payableAccount}
      </Button>
      <Button onClick={onOpenPayablesKiosk} variant="outline" className="h-11 w-full justify-center gap-2 whitespace-nowrap rounded-xl border-slate-200 bg-white px-4 text-sm font-medium text-[#147514] shadow-none hover:bg-[#147514] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-auto">
        <Store className="h-4 w-4" />
        {t.expenses.headerActions.payablesKiosk}
      </Button>
      <Button onClick={onConfigureColumns} variant="outline" className="h-11 w-full justify-center gap-2 whitespace-nowrap rounded-xl border-slate-200 bg-white px-4 text-sm font-medium text-[#147514] shadow-none hover:bg-[#147514] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-auto">
        <Columns3 className="w-4 h-4" />
        {t.common.columns}
      </Button>
      <Button disabled={createExpenseDisabled} onClick={onCreateExpense} title={createExpenseDisabledReason} className="h-11 w-full justify-center gap-2 whitespace-nowrap rounded-xl bg-[#147514] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#105010] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 sm:w-auto">
        <Plus className="w-4 h-4" />
        {t.expenses.headerButton}
      </Button>
    </div>
  );

  return (
    <IndiceTitleBar
      actions={<ActionLayout />}
      icon="💸"
      subtitle={t.expenses.headerSubtitle}
      title={t.expenses.headerTitle}
      tone="green"
    />
  );
}
