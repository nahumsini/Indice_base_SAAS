import { humanResourcesLearningAreaEmoji } from '../humanResourcesLearningContent';
import type { HumanResourcesGuidanceTabId } from '../types';

export function HumanResourcesLearningToolPreview({
  areaId,
}: {
  areaId: HumanResourcesGuidanceTabId;
}) {
  return (
    <div
      aria-label="Vista indicativa de la herramienta"
      className="w-full max-w-[164px] rounded-xl border border-sky-200 bg-white p-2.5 shadow-sm dark:border-sky-900 dark:bg-slate-950"
      role="img"
    >
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-200">
          <span aria-hidden="true" className="text-base leading-none">{humanResourcesLearningAreaEmoji[areaId]}</span>
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <span className="block h-1.5 w-20 rounded-full bg-slate-300 dark:bg-slate-700" />
          <span className="block h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-[28px_1fr_32px] items-center gap-1.5 rounded-md bg-slate-50 p-1.5 dark:bg-slate-900">
        <span className="h-6 rounded bg-sky-100 dark:bg-sky-950" />
        <span className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
        <span className="h-4 rounded border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950" />
      </div>
      <div className="mt-1 grid grid-cols-[28px_1fr_32px] items-center gap-1.5 rounded-md bg-slate-50 p-1.5 dark:bg-slate-900">
        <span className="h-6 rounded bg-violet-100 dark:bg-violet-950" />
        <span className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
        <span className="h-4 rounded border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950" />
      </div>
    </div>
  );
}
