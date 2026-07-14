import { Columns3, Plus } from 'lucide-react';
import { useBudgetsTranslations } from '../hooks/useBudgetsTranslations';

type BudgetTableHeaderProps = {
  onConfigureColumns: () => void;
  onCreate: () => void;
};

export function BudgetTableHeader({ onConfigureColumns, onCreate }: BudgetTableHeaderProps) {
  const t = useBudgetsTranslations();

  return (
    <section className="rounded-xl border border-[#147514]/25 bg-[#147514]/10 p-5 shadow-sm dark:border-emerald-700/40 dark:bg-emerald-950/30">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#147514]/25 bg-white/90 text-2xl shadow-sm dark:border-emerald-700/40 dark:bg-slate-800" aria-hidden="true">
            📋
          </span>
          <div className="min-w-0">
            <h2 className="mb-1 text-xl font-bold text-slate-950 dark:text-white">{t.budgets.headerTitle}</h2>
            <p className="max-w-3xl text-sm font-medium leading-5 text-slate-600 dark:text-slate-300">
              {t.budgets.headerSubtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-row sm:items-center lg:justify-end">
          <button
            type="button"
            onClick={onConfigureColumns}
            className="inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#147514]/30 bg-white px-4 text-sm font-semibold text-[#147514] shadow-none transition hover:border-[#147514] hover:bg-[#147514]/10 dark:border-emerald-700/50 dark:bg-slate-800 dark:text-emerald-300 dark:hover:bg-emerald-900/40 sm:w-auto"
          >
            <Columns3 className="h-4 w-4" />
            {t.common.columns}
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-transparent bg-[#147514] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#105010] dark:bg-emerald-600 dark:hover:bg-emerald-500 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            {t.budgets.headerButton}
          </button>
        </div>
      </div>
    </section>
  );
}
