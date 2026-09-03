import { ChevronRight, ShieldCheck } from 'lucide-react';
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
}

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
}: MultiKioskToolTileProps) {
  const presentation = getMultiKioskToolPresentation(source);
  const hasSelectionState = typeof selected === 'boolean';
  const resolvedModuleLabel = moduleLabel ?? presentation.ownerModule.replace(/_/g, ' ');

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
