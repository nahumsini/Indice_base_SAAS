import type { ReactNode } from 'react';
import { cn } from '../../../../components/ui/utils';

export const financeModalInputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-none placeholder:text-slate-400 transition-colors focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-[#147514]/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800';

export function FinanceModalSection({
  children,
  className,
  description,
  title,
}: {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  title: ReactNode;
}) {
  return (
    <section className={cn('rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900', className)}>
      <div className="mb-4">
        <h3 className="text-sm font-medium text-slate-950 dark:text-white">{title}</h3>
        {description ? <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function FinanceFieldLabel({ label, required }: { label: ReactNode; required?: boolean }) {
  return (
    <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}{required ? <span aria-hidden="true"> *</span> : null}
    </span>
  );
}

export const financeModalSecondaryButtonClass = 'h-10 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-medium text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50';
export const financeModalPrimaryButtonClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-medium text-[#147514] shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-white/50 disabled:text-[#147514]/60';
