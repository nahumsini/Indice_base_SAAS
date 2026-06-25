import { Columns3, Plus } from 'lucide-react';
import { useFinanceTranslations } from '../../hooks/useFinanceTranslations';

type BudgetTableHeaderProps = {
  onConfigureColumns: () => void;
  onCreate: () => void;
};

export function BudgetTableHeader({ onConfigureColumns, onCreate }: BudgetTableHeaderProps) {
  const t = useFinanceTranslations();

  return (
    <div className="rounded-xl border border-[#147514]/20 bg-[#147514]/10 px-4 py-4 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30 sm:px-6 sm:py-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none sm:text-4xl">📋</span>
            <h2 className="text-2xl font-bold text-slate-950 dark:text-white sm:text-[28px]">{t.budgets.headerTitle}</h2>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
            {t.budgets.headerSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-row sm:items-center lg:justify-end">
          <button
            type="button"
            onClick={onConfigureColumns}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-[#147514] shadow-sm transition-colors hover:bg-[#147514] hover:text-white dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-300 sm:w-auto"
          >
            <Columns3 className="h-4 w-4" />
            {t.common.columns}
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#147514] px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#105010] dark:bg-emerald-600 dark:hover:bg-emerald-500 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            {t.budgets.headerButton}
          </button>
        </div>
      </div>
    </div>
  );
}
