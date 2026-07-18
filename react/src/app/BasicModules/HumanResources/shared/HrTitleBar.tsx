import type { ReactNode } from 'react';
import { cn } from '../../../components/ui/utils';
import { LearningModeTitleBarBridge } from '../../../learningMode';

interface HrTitleBarProps {
  actions?: ReactNode;
  className?: string;
  emoji: ReactNode;
  subtitle: ReactNode;
  title: ReactNode;
}

export const hrTitleBarSecondaryActionClass =
  'inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#59C3A5]/30 bg-white px-4 text-sm font-semibold text-[#177D66] shadow-none transition hover:border-[#59C3A5] hover:bg-[#59C3A5]/10 hover:text-[#177D66] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#59C3A5]/40 dark:bg-slate-800 dark:text-[#8FE0CA] dark:hover:bg-[#59C3A5]/15 sm:w-auto';

export const hrTitleBarPrimaryActionClass =
  'inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-transparent bg-[#59C3A5] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3AAE90] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400 sm:w-auto';

export function HrTitleBar({ actions, className, emoji, subtitle, title }: HrTitleBarProps) {
  const actionLayout = actions ? (
    <div className="grid w-full grid-cols-1 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
      {actions}
    </div>
  ) : undefined;

  return (
    <LearningModeTitleBarBridge actions={actionLayout}>
      <section className={cn('mb-5 rounded-xl border border-[#59C3A5]/30 bg-[#59C3A5]/10 p-5 shadow-sm dark:border-[#59C3A5]/40 dark:bg-[#59C3A5]/15', className)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#59C3A5]/35 bg-white/80 text-2xl shadow-sm dark:border-[#59C3A5]/35 dark:bg-slate-800" aria-hidden="true">
              {emoji}
            </span>
            <div className="min-w-0">
              <h2 className="mb-1 text-xl font-bold text-slate-950 dark:text-white">{title}</h2>
              <p className="max-w-3xl text-sm font-medium leading-5 text-slate-600 dark:text-slate-300">{subtitle}</p>
            </div>
          </div>
          {actionLayout}
        </div>
      </section>
    </LearningModeTitleBarBridge>
  );
}
