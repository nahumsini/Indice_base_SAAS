import type { ReactNode } from 'react';
import { IndiceTitleBar } from '../../../components/frontend-os';

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
  return (
    <IndiceTitleBar actions={actions} className={className ? `mb-5 ${className}` : 'mb-5'} icon={emoji} subtitle={subtitle} title={title} tone="aqua" />
  );
}
