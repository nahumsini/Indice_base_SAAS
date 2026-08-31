import type { ReactNode } from 'react';

export const squareButtonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#FF6B5E]/30 bg-white px-3 text-sm font-medium text-[#B63B32] shadow-sm hover:bg-[#FFF3F1] disabled:opacity-50';
export const squareSelectClass = 'min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20';

export function SquareSetupStep({
  children,
  icon,
  title,
  value,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">{icon}{title}</h3>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-500 shadow-sm">{value}</span>
      </div>
      {children}
    </div>
  );
}
