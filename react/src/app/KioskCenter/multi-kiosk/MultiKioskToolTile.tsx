import { ArrowRight, ChevronRight, ShieldCheck } from 'lucide-react';
import { cn } from '../../components/ui/utils';
import {
  getMultiKioskToolPresentation,
  MultiKioskToolEmoji,
  type MultiKioskToolSource,
} from './toolPresentation';

export interface MultiKioskToolTileProps {
  actionLabel: string;
  busy?: boolean;
  className?: string;
  disabled?: boolean;
  moduleLabel?: string;
  onClick: () => void;
  selected?: boolean;
  source: MultiKioskToolSource;
  statusLabel?: string;
  statusTone?: 'attention' | 'ready';
  compact?: boolean;
}

const compactAccents = {
  aqua: 'bg-[#59C3A5]', blue: 'bg-[#2563EB]', coral: 'bg-[#FF6B5E]',
  green: 'bg-[#147514]', violet: 'bg-violet-500', yellow: 'bg-[#F4C84A]',
};

export function MultiKioskToolTile({
  actionLabel,
  busy = false,
  className,
  disabled = false,
  moduleLabel,
  onClick,
  selected,
  source,
  statusLabel,
  statusTone = 'ready',
  compact = false,
}: MultiKioskToolTileProps) {
  const presentation = getMultiKioskToolPresentation(source);
  const hasSelectionState = typeof selected === 'boolean';
  const resolvedModuleLabel = moduleLabel ?? presentation.ownerModule.replace(/_/g, ' ');

  if (compact) return (
    <button
      type="button"
      aria-label={[`${actionLabel}: ${presentation.name}`, statusLabel].filter(Boolean).join('. ')}
      aria-busy={busy || undefined}
      aria-pressed={hasSelectionState ? selected : undefined}
      data-multi-kiosk-id={'id' in source ? source.id : undefined}
      disabled={disabled || busy}
      onClick={onClick}
      className={cn(
        'group relative flex h-full min-h-32 w-full items-center gap-3 overflow-hidden rounded-[1.5rem] border border-[#E0E7F1] bg-white p-4 text-left shadow-[0_3px_12px_-8px_rgba(20,54,117,0.22)] transition-[border-color,background-color,box-shadow,transform] duration-150 hover:shadow-[0_6px_18px_-8px_rgba(20,54,117,0.22)] focus-visible:outline-none focus-visible:ring-4 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 disabled:active:scale-100 motion-reduce:transform-none motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-900 sm:gap-4',
        presentation.toneClasses.tileHover,
        selected && presentation.toneClasses.tileSelected,
        className,
      )}
    >
      <span aria-hidden="true" className={cn('absolute inset-y-5 left-0 w-1 rounded-r-full', compactAccents[presentation.tone])} />
      <MultiKioskToolEmoji source={source} busy={busy} selected={selected} className="h-14 w-14 self-start rounded-[1.125rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] [&>span:first-child]:text-[2rem]" />
      <span className="flex min-w-0 flex-1 flex-col py-0.5">
        <span data-kiosk-tool-name className="text-base font-medium leading-[1.375rem] text-[#143675] [overflow-wrap:anywhere] dark:text-blue-100">{presentation.name}</span>
        <span data-kiosk-tool-description className="mt-1 line-clamp-2 text-sm leading-5 text-[#425466] [overflow-wrap:anywhere] dark:text-slate-300">{presentation.description}</span>
        {statusLabel ? <span data-kiosk-tool-status className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs leading-5 text-amber-900 dark:bg-amber-950 dark:text-amber-200"><ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden="true" />{statusLabel}</span> : null}
        <span data-kiosk-tool-action className="mt-2 inline-flex items-center gap-1 text-sm font-medium leading-5 text-[#1D4ED8] dark:text-blue-300">
          {actionLabel}<ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
        </span>
      </span>
    </button>
  );

  return (
    <button
      type="button"
      aria-label={[
        `${actionLabel}: ${presentation.name}`,
        resolvedModuleLabel,
        statusLabel,
      ].filter(Boolean).join('. ')}
      aria-busy={busy || undefined}
      aria-pressed={hasSelectionState ? selected : undefined}
      data-multi-kiosk-id={'id' in source ? source.id : undefined}
      disabled={disabled || busy}
      onClick={onClick}
      className={cn(
        'group relative flex h-full min-h-[12rem] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:shadow-sm motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-950 sm:min-h-[12.5rem] sm:p-4',
        presentation.toneClasses.tileHover,
        selected && presentation.toneClasses.tileSelected,
        className,
      )}
    >
      <span aria-live="polite" className="sr-only">
        {busy ? `${actionLabel}: ${presentation.name}` : ''}
      </span>
      <span className="flex w-full min-w-0 flex-1 flex-col items-center">
        <MultiKioskToolEmoji
          source={source}
          selected={selected}
          busy={busy}
          className="h-11 w-11 rounded-xl sm:h-12 sm:w-12"
        />
        <span className="flex min-w-0 w-full flex-1 flex-col items-center">
          <span
            className={cn('mt-3 block text-[11px] font-medium leading-4', presentation.toneClasses.module)}
            data-kiosk-tool-module
          >
            {resolvedModuleLabel}
          </span>
          <span
            className="mt-0.5 block line-clamp-2 text-[15px] font-medium leading-5 text-slate-950 dark:text-white sm:text-base"
            data-kiosk-tool-name
          >
            {presentation.name}
          </span>
          <span
            className="mt-1 block line-clamp-2 text-xs leading-[1.125rem] text-slate-500 dark:text-slate-400"
            data-kiosk-tool-description
          >
            {presentation.description}
          </span>

          {statusLabel ? (
            <span className={cn(
              'mt-2 inline-flex max-w-full items-start justify-center gap-1 rounded-lg border px-2 py-1 text-center text-[11px] font-medium leading-4 sm:gap-1.5 sm:px-2.5',
              statusTone === 'attention'
                ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/45 dark:text-amber-200'
                : presentation.toneClasses.badge,
            )}>
              <ShieldCheck aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 break-words" data-kiosk-tool-status>{statusLabel}</span>
            </span>
          ) : null}

          <span
            className={cn(
              'mt-auto inline-flex items-center gap-1 pt-3 text-xs font-medium sm:text-sm',
              presentation.toneClasses.module,
            )}
            data-kiosk-tool-action
          >
            {actionLabel}
            <ChevronRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5" />
          </span>
        </span>
      </span>
    </button>
  );
}
