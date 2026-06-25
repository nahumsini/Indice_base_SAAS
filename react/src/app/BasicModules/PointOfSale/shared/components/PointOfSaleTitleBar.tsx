import type { ReactNode } from 'react';
import { cn } from '../../../../components/ui/utils';

export const pointOfSaleTitleBarPrimaryActionClassName = 'inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600';

export const pointOfSaleTitleBarSecondaryActionClassName = 'inline-flex h-11 items-center gap-2 rounded-xl border border-orange-200 bg-white px-4 text-sm font-semibold text-orange-700 shadow-none transition hover:border-orange-300 hover:bg-orange-50 dark:border-orange-500/30 dark:bg-gray-900 dark:text-orange-200 dark:hover:bg-orange-500/10';

export function PointOfSaleTitleBar({
  actions,
  className,
  eyebrow = 'Retail operativo',
  icon,
  subtitle,
  title,
}: {
  actions?: ReactNode;
  className?: string;
  eyebrow?: string;
  icon: ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <section className={cn('rounded-[24px] border border-orange-200 bg-orange-50/80 p-5 shadow-sm dark:border-orange-500/25 dark:bg-orange-500/10', className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="mt-0.5 shrink-0 text-[2rem] leading-none" aria-hidden="true">
            {icon}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-semibold leading-tight text-slate-950 dark:text-white">
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
