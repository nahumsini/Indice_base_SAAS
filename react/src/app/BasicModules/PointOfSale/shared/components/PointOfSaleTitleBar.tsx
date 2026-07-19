import type { ReactNode } from 'react';
import { IndiceTitleBar } from '../../../../components/frontend-os';

export const pointOfSaleTitleBarPrimaryActionClassName = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#FF6B5E] px-5 text-sm font-semibold text-white shadow-sm shadow-[#FF6B5E]/25 transition hover:bg-[#E85C50] focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/25 sm:w-auto';

export const pointOfSaleTitleBarSecondaryActionClassName = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#FF6B5E]/20 bg-white px-4 text-sm font-semibold text-[#B63B32] shadow-sm shadow-slate-200/60 transition hover:border-[#FF6B5E]/40 hover:bg-[#FFF3F1] focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/25 sm:w-auto dark:border-[#FF6B5E]/30 dark:bg-gray-900 dark:text-[#FFB0AA] dark:shadow-none dark:hover:bg-[#FF6B5E]/10';

export function PointOfSaleTitleBar({
  actions,
  className,
  eyebrow,
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
  void rhIndent;
  return <IndiceTitleBar actions={actions} className={className} eyebrow={eyebrow} icon={icon} subtitle={subtitle} title={title} tone="coral" />;
}
