import type { ReactNode } from 'react';
import { cn } from '../../../../components/ui/utils';

export const pointOfSaleTitleBarPrimaryActionClassName = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B5E] px-5 text-sm font-semibold text-white shadow-sm shadow-[#FF6B5E]/25 transition hover:bg-[#E85C50] focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/25 sm:w-auto';

export const pointOfSaleTitleBarSecondaryActionClassName = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#FF6B5E]/20 bg-white px-4 text-sm font-semibold text-[#B63B32] shadow-sm shadow-slate-200/60 transition hover:border-[#FF6B5E]/40 hover:bg-[#FFF3F1] focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/25 sm:w-auto dark:border-[#FF6B5E]/30 dark:bg-gray-900 dark:text-[#FFB0AA] dark:shadow-none dark:hover:bg-[#FF6B5E]/10';

export function PointOfSaleTitleBar({
  actions,
  className,
  eyebrow = 'Retail operativo',
  icon,
  rhIndent = false,
  subtitle,
  title,
}: {
  actions?: ReactNode;
  className?: string;
  eyebrow?: ReactNode | null;
  icon: ReactNode;
  rhIndent?: boolean;
  subtitle: string;
  title: string;
}) {
  return (
    <section className={cn('rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 p-6 shadow-sm dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/15', className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {rhIndent ? (
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B63B32] dark:text-[#FFB0AA]">
                {eyebrow}
              </p>
            ) : null}
            <h2 className={cn('mb-1 flex min-w-0 items-center gap-2 text-2xl font-semibold leading-tight text-slate-950 dark:text-white', eyebrow && 'mt-1')}>
              <span className="shrink-0 text-[2rem] leading-none" aria-hidden="true">
                {icon}
              </span>
              <span className="min-w-0">{title}</span>
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              {subtitle}
            </p>
          </div>
        ) : (
          <div className="flex min-w-0 items-start gap-4">
            <span className="mt-0.5 shrink-0 text-[2rem] leading-none" aria-hidden="true">
              {icon}
            </span>
            <div className="min-w-0">
              {eyebrow ? (
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B63B32] dark:text-[#FFB0AA]">
                  {eyebrow}
                </p>
              ) : null}
              <h2 className={cn('text-2xl font-semibold leading-tight text-slate-950 dark:text-white', eyebrow && 'mt-1')}>
                {title}
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                {subtitle}
              </p>
            </div>
          </div>
        )}

        {actions ? (
          <div className={cn(
            rhIndent
              ? 'flex w-full flex-wrap items-center gap-3 sm:w-auto lg:justify-end'
              : 'grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-none sm:flex sm:flex-wrap sm:items-center sm:justify-end lg:justify-end',
          )}>
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
