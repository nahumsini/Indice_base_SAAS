import { Trash2, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { useBudgetsTranslations } from '../hooks/useBudgetsTranslations';

export function BudgetBulkActionsBar({
  selectedCount,
  onClearSelection,
  onDeleteSelected,
}: {
  selectedCount: number;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
}) {
  const t = useBudgetsTranslations();

  return (
    <section className="border-b border-[#147514]/20 bg-[#147514]/10 px-4 py-3 dark:border-[#147514]/40 dark:bg-[#147514]/15">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="w-fit rounded-full border border-[#147514]/30 bg-white px-3 py-1 text-sm text-[#147514] dark:bg-slate-800 dark:text-emerald-200">
          {t.budgets.summary.selectedRows(selectedCount)}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-9 rounded-xl border-red-200 bg-red-50 px-3 text-sm text-red-700 shadow-none hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300" onClick={onDeleteSelected}>
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            {t.common.delete}
          </Button>
          <Button type="button" variant="outline" className="h-9 rounded-xl border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" onClick={onClearSelection}>
            <X aria-hidden="true" className="h-4 w-4" />
            {t.common.cancel}
          </Button>
        </div>
      </div>
    </section>
  );
}
