import type { ReactNode } from 'react';
import { cn } from '../ui/utils';

export type IndiceModalFooterProps = {
  actions?: ReactNode;
  className?: string;
  leading?: ReactNode;
  summary?: ReactNode;
  tone?: IndiceModalFooterTone;
};

export type IndiceModalFooterTone = 'aqua' | 'blue' | 'coral' | 'green' | 'yellow';

const actionToneStyles: Record<IndiceModalFooterTone, string> = {
  aqua: [
    '[&>button]:!border-white [&>button]:!bg-white [&>button]:!text-slate-600 [&>button]:shadow-sm',
    '[&>button:hover]:!bg-white/90',
    '[&>button:last-child]:!border-white [&>button:last-child]:!bg-white [&>button:last-child]:!text-[#177D66]',
    '[&>button:last-child:hover]:!bg-white/90',
  ].join(' '),
  blue: [
    '[&>button]:!border-white [&>button]:!bg-white [&>button]:!text-slate-600 [&>button]:shadow-sm',
    '[&>button:hover]:!bg-white/90',
    '[&>button:last-child]:!border-white [&>button:last-child]:!bg-white [&>button:last-child]:!text-[#1D4ED8]',
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
  aqua: 'text-white/85',
  blue: 'text-white/85',
  coral: 'text-white/85',
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
    <div className={cn('flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      {leading || summary ? (
        <div className="flex min-w-0 flex-col gap-2 sm:flex-1 sm:flex-row sm:items-center sm:gap-4">
          {leading ? <div className="shrink-0">{leading}</div> : null}
          {summary ? (
            <div aria-live="polite" className={cn('min-w-0 text-sm font-medium sm:truncate', summaryToneStyles[tone])}>
              {summary}
            </div>
          ) : null}
        </div>
      ) : null}
      {actions ? (
        <div className={cn(
          'flex w-full flex-col-reverse gap-2 [&>button]:h-11 [&>button]:w-full [&>button]:rounded-xl [&>button]:px-5 [&>button]:text-sm [&>button]:font-semibold [&>button[data-modal-destructive=true]]:!border-red-600 [&>button[data-modal-destructive=true]]:!bg-red-600 [&>button[data-modal-destructive=true]]:!text-white [&>button[data-modal-destructive=true]:hover]:!bg-red-700 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:[&>button]:w-auto',
          actionToneStyles[tone],
        )}>
          {actions}
        </div>
      ) : null}
    </div>
  );
}
