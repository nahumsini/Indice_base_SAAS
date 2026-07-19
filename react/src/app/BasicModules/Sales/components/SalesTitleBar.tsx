import type { ReactNode } from 'react';
import { IndiceTitleBar } from '../../../components/frontend-os';

export const salesTitleBarSecondaryActionClassName = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border-slate-200 bg-white px-4 text-sm font-semibold text-[#B63B32] shadow-sm shadow-slate-200/60 transition-all hover:border-[#FF6B5E]/45 hover:bg-white hover:text-[#B63B32] focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/25 sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-[#FFB0AA] dark:shadow-none dark:hover:bg-slate-900';

export const salesTitleBarPrimaryActionClassName = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#FF6B5E] px-5 text-sm font-semibold text-white shadow-sm shadow-[#FF6B5E]/25 transition-all hover:bg-[#E85C50] focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/25 sm:w-auto';

export function SalesTitleBar({
  actions,
  className,
  icon,
  rhIndent = false,
  subtitle,
  title,
}: {
  actions?: ReactNode;
  className?: string;
  icon: ReactNode;
  rhIndent?: boolean;
  subtitle: string;
  title: string;
}) {
  void rhIndent;
  return <IndiceTitleBar actions={actions} className={className} icon={icon} subtitle={subtitle} title={title} tone="coral" />;
}
