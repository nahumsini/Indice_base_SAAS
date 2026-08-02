import { Columns3, Plus } from 'lucide-react';
import { IndiceTitleBar } from '../../../../components/frontend-os';
import { useBudgetsTranslations } from '../hooks/useBudgetsTranslations';

type BudgetTableHeaderProps = {
  onConfigureColumns: () => void;
  onCreate: () => void;
};

export function BudgetTableHeader({ onConfigureColumns, onCreate }: BudgetTableHeaderProps) {
  const t = useBudgetsTranslations();
  const actionLayout = (
    <>
      <button type="button" onClick={onConfigureColumns} className="inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#147514]/30 bg-white px-4 text-sm font-medium text-[#147514] shadow-none transition hover:border-[#147514] hover:bg-[#147514]/10 dark:border-emerald-700/50 dark:bg-slate-800 dark:text-emerald-300 dark:hover:bg-emerald-900/40 sm:w-auto">
        <Columns3 className="h-4 w-4" />
        {t.common.columns}
      </button>
      <button type="button" onClick={onCreate} className="inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-transparent bg-[#147514] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#105010] dark:bg-emerald-600 dark:hover:bg-emerald-500 sm:w-auto">
        <Plus className="h-4 w-4" />
        {t.budgets.headerButton}
      </button>
    </>
  );

  return (
    <IndiceTitleBar actions={actionLayout} icon="📋" subtitle={t.budgets.headerSubtitle} title={t.budgets.headerTitle} tone="green" />
  );
}
