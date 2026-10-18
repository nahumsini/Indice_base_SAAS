import type { ReactNode } from 'react';
import { cn } from '../ui/utils';

export type IndiceModalFooterProps = {
  actions?: ReactNode;
  className?: string;
  leading?: ReactNode;
  summary?: ReactNode;
  tone?: IndiceModalFooterTone;
};

export type IndiceModalFooterTone = 'aqua' | 'blue' | 'coral' | 'green' | 'yellow' | 'gray';

const actionToneStyles: Record<IndiceModalFooterTone, string> = {
  gray: [
    '[&>button]:!border-white [&>button]:!bg-white [&>button]:!text-slate-600 [&>button]:shadow-sm',
    '[&>button:hover]:!bg-white/90',
    '[&>button:last-child]:!border-white [&>button:last-child]:!bg-white [&>button:last-child]:!text-slate-800',
    '[&>button:last-child:hover]:!bg-white/90',
  ].join(' '),
  aqua: [
    '[&>button]:!border-white [&>button]:!bg-white [&>button]:!text-slate-600 [&>button]:shadow-sm',
    '[&>button:hover]:!bg-white/90',
    '[&>button:last-child]:!border-white [&>button:last-child]:!bg-white [&>button:last-child]:!text-[#177D66]',
    '[&>button:last-child:hover]:!bg-white/90',
  ].join(' '),
  blue: [
    '[&>button]:!border-white [&>button]:!bg-white [&>button]:!text-slate-600 [&>button]:shadow-sm',
    '[&>button:hover]:!bg-white/90',
    '[&>button:last-child]:!border-white [&>button:last-child]:!bg-white [&>button:last-child]:!text-[var(--indice-brand-action-hover)]',
    '[&>button:last-child:hover]:!bg-white/90',
  ].join(' '),
  coral: [
    '[&>button]:!border-white [&>button]:!bg-white [&>button]:!text-slate-600 [&>button]:shadow-sm',
    '[&>button:hover]:!bg-white/90',
    '[&>button:last-child]:!border-white [&>button:last-child]:!bg-white [&>button:last-child]:!text-[#B63B32]',
    '[&>button:last-child:hover]:!bg-white/90',
  ].join(' '),
  green: [
    '[&>button]:!border-white [&>button]:!bg-white [&>button]:!text-slate-600 [&>button]:shadow-sm',
    '[&>button:hover]:!bg-white/90',
    '[&>button:last-child]:!border-white [&>button:last-child]:!bg-white [&>button:last-child]:!text-[#147514]',
    '[&>button:last-child:hover]:!bg-white/90',
  ].join(' '),
  yellow: [
    '[&>button]:!border-white [&>button]:!bg-white [&>button]:!text-slate-600 [&>button]:shadow-sm',
    '[&>button:hover]:!bg-white/90',
    '[&>button:last-child]:!border-white [&>button:last-child]:!bg-white [&>button:last-child]:!text-[#8A6200]',
    '[&>button:last-child:hover]:!bg-white/90',
  ].join(' '),
};

const summaryToneStyles: Record<IndiceModalFooterTone, string> = {
  gray: 'text-white/85',
  aqua: 'text-white/85',
  blue: 'text-white/85',
  coral: 'text-[#222831]/75 dark:text-white/85',
  green: 'text-white/85',
  yellow: 'text-[#222831]/75',
};

export function IndiceModalFooter({
  actions,
  className,
  leading,
  summary,
  tone = 'green',
}: IndiceModalFooterProps) {
  return (
    <div className={cn('flex min-w-0 w-full flex-col gap-2 md:gap-3 md:flex-row md:items-center md:justify-between', className)}>
      {leading || summary ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 md:flex-1 md:justify-start md:gap-4">
          {leading ? <div className="min-w-0 max-w-full shrink-0 [&>div]:flex-wrap [&_button]:min-h-11 [&_button]:min-w-0 [&_button]:max-w-full">{leading}</div> : null}
          {summary ? (
            <div aria-live="polite" className={cn('min-w-0 break-words text-xs md:text-sm font-medium md:truncate', summaryToneStyles[tone])}>
              {summary}
            </div>
          ) : null}
        </div>
      ) : null}
      {actions ? (
        <div data-slot="indice-modal-actions" className={cn(
          'flex min-w-0 w-full flex-row flex-wrap gap-2 [&>button]:min-h-11 [&>button]:h-auto [&>button]:min-w-0 [&>button]:flex-1 [&>button]:basis-[7rem] [&>button]:whitespace-normal [&>button]:break-words [&>button]:py-2 [&>button]:cursor-pointer [&>button]:rounded-xl [&>button]:px-5 [&>button]:text-sm [&>button]:font-medium [&>button:disabled]:cursor-not-allowed [&>button:disabled]:opacity-50 [&>button[data-modal-destructive=true]]:!border-red-600 [&>button[data-modal-destructive=true]]:!bg-red-600 [&>button[data-modal-destructive=true]]:!text-white [&>button[data-modal-destructive=true]:hover]:!bg-red-700 md:ml-auto md:w-auto md:flex-row md:items-center md:justify-end md:[&>button]:w-auto md:[&>button]:flex-none',
          actionToneStyles[tone],
        )}>
          {actions}
        </div>
      ) : null}
    </div>
  );
}
