import type { ReactNode } from 'react';
import { cn } from '../../../components/ui/utils';

export const salesTitleBarSecondaryActionClassName = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-bold text-[#B63B32] shadow-sm shadow-slate-200/60 transition-all hover:border-[#FF6B5E]/45 hover:bg-white hover:text-[#B63B32] focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/25 sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-[#FFB0AA] dark:shadow-none dark:hover:bg-slate-900';

export const salesTitleBarPrimaryActionClassName = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B5E] px-5 text-sm font-bold text-white shadow-sm shadow-[#FF6B5E]/25 transition-all hover:bg-[#E85C50] focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/25 sm:w-auto';

export function SalesTitleBar({
  actions,
  className,
  icon,
  subtitle,
  title,
}: {
  actions?: ReactNode;
  className?: string;
  icon: ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <section className={cn('rounded-[24px] border border-[#FF6B5E]/20 bg-[#FFF3F1] p-5 shadow-sm shadow-[#FF6B5E]/5 dark:border-[#FF6B5E]/25 dark:bg-[#2A1718]', className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#FF6B5E]/20 bg-white/80 text-[1.65rem] leading-none text-[#B63B32] shadow-sm shadow-[#FF6B5E]/10 dark:border-[#FF6B5E]/30 dark:bg-slate-950/30 dark:text-[#FFB0AA]" aria-hidden="true">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold leading-tight text-slate-950 dark:text-white">
              {title}
            </h2>
            <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
              {subtitle}
            </p>
          </div>
        </div>

        {actions ? (
          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-none sm:flex sm:flex-wrap sm:items-center sm:justify-end lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
