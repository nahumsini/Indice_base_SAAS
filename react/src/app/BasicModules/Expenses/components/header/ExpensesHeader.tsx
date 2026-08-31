import { Columns3, Landmark, MoreHorizontal, Plus, TableProperties } from 'lucide-react';
import { IndiceTitleBar } from '../../../../components/frontend-os';
import { Button } from '../../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../../components/ui/dropdown-menu';
import { useExpensesModuleTranslations } from '../../hooks/useExpensesModuleTranslations';

type ExpensesHeaderProps = {
  createExpenseDisabled?: boolean;
  createExpenseDisabledReason?: string;
  onConfigureColumns: () => void;
  onBulkIntegration: () => void;
  onCreatePayableAccount: () => void;
  onCreateExpense: () => void;
};

export function ExpensesHeader({
  createExpenseDisabled = false,
  createExpenseDisabledReason,
  onConfigureColumns,
  onBulkIntegration,
  onCreatePayableAccount,
  onCreateExpense,
}: ExpensesHeaderProps) {
  const t = useExpensesModuleTranslations();
  const eligibleActionCount = 4;
  const hasOverflow = eligibleActionCount > 3;
  const ActionLayout = () => (
    <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
      <Button disabled={createExpenseDisabled} onClick={onCreatePayableAccount} title={createExpenseDisabledReason} variant="outline" className="h-11 w-full justify-center gap-2 whitespace-nowrap rounded-xl border-[#147514]/25 bg-white px-4 text-sm font-medium text-[#147514] shadow-none hover:bg-[#147514] hover:text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:border-emerald-400/25 dark:bg-slate-800 dark:text-white sm:w-auto">
        <Landmark className="h-4 w-4" />
        {t.expenses.headerActions.payableAccount}
      </Button>
      <Button disabled={createExpenseDisabled} onClick={onBulkIntegration} title={createExpenseDisabledReason} variant="outline" className="h-11 w-full justify-center gap-2 whitespace-nowrap rounded-xl border-[#147514]/25 bg-white px-4 text-sm font-medium text-[#147514] shadow-none hover:bg-[#147514] hover:text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 sm:w-auto">
        <TableProperties className="h-4 w-4" />
        Integración masiva
      </Button>
      <Button disabled={createExpenseDisabled} onClick={onCreateExpense} title={createExpenseDisabledReason} className="h-11 w-full justify-center gap-2 whitespace-nowrap rounded-xl bg-[#147514] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#105010] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 sm:w-auto">
        <Plus className="h-4 w-4" />
        {t.expenses.headerButton}
      </Button>
      {hasOverflow ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-11 w-full justify-center gap-2 whitespace-nowrap rounded-xl border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-none hover:border-[#147514]/30 hover:bg-[#147514]/5 hover:text-[#147514] dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-auto">
              <MoreHorizontal className="h-4 w-4" />
              {t.common.actions}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
            <DropdownMenuItem className="rounded-lg py-2.5" onClick={onConfigureColumns}>
              <Columns3 className="h-4 w-4" />
              {t.common.columns}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
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
