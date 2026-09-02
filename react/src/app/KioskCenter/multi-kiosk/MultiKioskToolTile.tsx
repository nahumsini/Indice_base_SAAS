import { ArrowRight, ShieldCheck } from 'lucide-react';
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
        'group relative flex h-full min-h-[9.75rem] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:shadow-sm motion-reduce:hover:translate-y-0 motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-950 sm:min-h-48 sm:p-4',
        presentation.toneClasses.tileHover,
        selected && presentation.toneClasses.tileSelected,
        className,
      )}
    >
      <span aria-live="polite" className="sr-only">
        {busy ? `${actionLabel}: ${presentation.name}` : ''}
      </span>
      <span className="flex w-full items-start justify-between gap-2">
        <MultiKioskToolEmoji source={source} selected={selected} busy={busy} />
        <span
          aria-hidden="true"
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors group-hover:border-current group-hover:bg-white group-focus-visible:border-current dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:group-hover:bg-slate-950',
            presentation.toneClasses.module,
          )}
        >
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5" />
        </span>
      </span>

      <span className="mt-3 min-w-0">
        <span
          className={cn('block truncate text-[11px] font-medium leading-4 sm:text-xs', presentation.toneClasses.module)}
          data-kiosk-tool-module
        >
          {resolvedModuleLabel}
        </span>
        <span
          className="mt-1 block line-clamp-3 text-[15px] font-medium leading-5 text-slate-950 dark:text-white sm:line-clamp-2 sm:text-base"
          data-kiosk-tool-name
        >
          {presentation.name}
        </span>
        <span
          className="mt-1.5 hidden line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400 sm:block"
          data-kiosk-tool-description
        >
          {presentation.description}
        </span>
      </span>

      {statusLabel ? (
        <span className={cn(
          'mt-2 inline-flex max-w-full items-start gap-1 self-start rounded-lg border px-2 py-1.5 text-left text-xs font-medium leading-4 sm:mt-3 sm:gap-1.5 sm:rounded-xl sm:px-2.5 sm:py-2',
          statusTone === 'attention'
            ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/45 dark:text-amber-200'
            : presentation.toneClasses.badge,
        )}>
          <ShieldCheck aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 break-words" data-kiosk-tool-status>{statusLabel}</span>
        </span>
      ) : null}

      <span className={cn(
        'mt-auto hidden w-full border-t border-slate-100 pt-3 text-sm font-medium dark:border-slate-800 sm:block',
        presentation.toneClasses.module,
      )} data-kiosk-tool-action>
        {actionLabel}
      </span>
    </button>
  );
}
