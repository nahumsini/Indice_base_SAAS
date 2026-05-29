import { Columns3, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { SalesRecordsTranslations } from '../translations';

export function SalesHeader({
  t,
  onOpenColumns,
  onCreateSale,
}: {
  t: SalesRecordsTranslations;
  onOpenColumns: () => void;
  onCreateSale: () => void;
}) {
  return (
    <section className="rounded-lg border border-[#FF6B5E]/30 bg-[#FF6B5E]/10 p-6 shadow-sm dark:border-[#FF6B5E]/25 dark:bg-[#FF6B5E]/15">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
            <span className="text-2xl leading-none" aria-hidden="true">{t.header.emoji}</span>
            {t.header.title}
          </h2>
          <p className="max-w-3xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{t.header.subtitle}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-lg border-[#FF6B5E]/25 bg-white px-4 text-sm font-semibold text-[#B63B32] shadow-none hover:bg-[#FF6B5E]/10"
            onClick={onOpenColumns}
          >
            <Columns3 className="h-4 w-4" />
            {t.header.columnsAction}
          </Button>
          <Button
            className="h-10 gap-2 rounded-lg bg-[#FF6B5E] px-4 text-sm font-semibold text-white shadow-sm shadow-[#FF6B5E]/20 hover:bg-[#E85C50]"
            onClick={onCreateSale}
          >
            <Plus className="h-4 w-4" />
            {t.header.primaryAction}
          </Button>
        </div>
      </div>
    </section>
  );
}
