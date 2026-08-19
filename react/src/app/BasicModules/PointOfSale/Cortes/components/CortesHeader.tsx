import { Columns3, Printer, RefreshCw } from 'lucide-react';
import { LearningModeTitleBarBridge } from '../../../../learningMode';
import type { CortesCopy } from '../cortesTranslations';

interface CortesHeaderProps {
  copy: CortesCopy;
  loading: boolean;
  onColumns: () => void;
  onPrintReport: () => void;
  onRefresh: () => void;
}

export function CortesHeader({
  copy,
  loading,
  onColumns,
  onPrintReport,
  onRefresh,
}: CortesHeaderProps) {
  const actionLayout = (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={onColumns} className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-[#B63B32] shadow-none transition hover:bg-[#FF6B5E] hover:text-[#222831] dark:border-slate-700 dark:bg-slate-800 dark:text-white"><Columns3 className="h-4 w-4" />{copy.header.columns}</button>
      <button type="button" onClick={onRefresh} disabled={loading} className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-none transition hover:bg-[#FF6B5E]/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{copy.header.refresh}</button>
      <button type="button" onClick={onPrintReport} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#FF6B5E] px-4 text-sm font-medium text-[#222831] shadow-sm transition hover:bg-[#E85D52]"><Printer className="h-4 w-4" />{copy.header.printReport}</button>
    </div>
  );

  return (
    <LearningModeTitleBarBridge actions={actionLayout}>
    <section className="mb-5 rounded-lg border border-[#FF6B5E]/30 bg-[#FF6B5E]/10 p-6 shadow-sm dark:border-[#FF6B5E]/40 dark:bg-[#FF6B5E]/15">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-medium text-slate-900 dark:text-white">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#FF6B5E]/25 bg-white text-xl leading-none shadow-sm" aria-hidden="true">
              💵
            </span>
            {copy.header.title}
          </h2>
          <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            {copy.header.description}
          </p>
        </div>

        {actionLayout}
      </div>
    </section>
    </LearningModeTitleBarBridge>
  );
}
