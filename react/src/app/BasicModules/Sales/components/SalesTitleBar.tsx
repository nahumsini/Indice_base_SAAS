import type { ReactNode } from 'react';
import { cn } from '../../../components/ui/utils';

export const salesTitleBarSecondaryActionClassName = 'h-11 gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[#B63B32] shadow-none hover:border-[#FF6B5E]/45 hover:bg-white hover:text-[#B63B32] dark:border-slate-700 dark:bg-slate-900 dark:text-[#FFB0AA] dark:hover:bg-slate-900';

export const salesTitleBarPrimaryActionClassName = 'h-11 gap-2 rounded-xl bg-[#FF6B5E] px-4 text-sm font-semibold text-white shadow-sm shadow-[#FF6B5E]/20 hover:bg-[#E85C50]';

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
    <section className={cn('rounded-[24px] border border-[#FF6B5E]/25 bg-[#FF6B5E]/[0.08] p-5 shadow-sm dark:border-[#FF6B5E]/25 dark:bg-[#FF6B5E]/15', className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="mt-0.5 shrink-0 text-[2rem] leading-none text-[#B63B32] dark:text-[#FFB0AA]" aria-hidden="true">
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
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
