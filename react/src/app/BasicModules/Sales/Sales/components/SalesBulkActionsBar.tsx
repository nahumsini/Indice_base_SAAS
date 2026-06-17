import { PackageCheck, Send, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { SalesRecordsTranslations } from '../translations';

export function SalesBulkActionsBar({
  selectedCount,
  t,
  onPrepareMovement,
  onSendToFinance,
  onClearSelection,
}: {
  selectedCount: number;
  t: SalesRecordsTranslations;
  onPrepareMovement: () => void;
  onSendToFinance: () => void;
  onClearSelection: () => void;
}) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3 rounded-[20px] border border-[#FF6B5E]/25 bg-[#FF6B5E]/[0.08] px-4 py-3 shadow-sm dark:border-[#FF6B5E]/25 dark:bg-[#FF6B5E]/15 md:flex-row md:items-center md:justify-between">
      <p className="text-sm font-black text-[#B63B32] dark:text-[#FFB0AA]">
        {t.table.bulkActions.selected(selectedCount)}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl border-[#59C3A5]/30 bg-white px-4 text-sm font-bold text-[#177d66] hover:bg-[#59C3A5]/10 dark:border-[#59C3A5]/30 dark:bg-slate-900 dark:text-emerald-300"
          onClick={onPrepareMovement}
        >
          <PackageCheck className="h-4 w-4" />
          {t.table.actions.prepareMovement}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl border-violet-500/25 bg-white px-4 text-sm font-bold text-violet-700 hover:bg-violet-500/10 dark:border-violet-500/30 dark:bg-slate-900 dark:text-violet-300"
          onClick={onSendToFinance}
        >
          <Send className="h-4 w-4" />
          {t.table.actions.sendToFinance}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
          {t.table.bulkActions.clear}
        </Button>
      </div>
    </section>
  );
}
