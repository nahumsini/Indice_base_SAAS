import { AlertCircle, Check, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import type { ChangeEventHandler, HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { MODULE_COLORS, getModulePrimaryForeground } from '../../styles/moduleColors';
import { cn } from '../ui/utils';
import type { KioskThemeTone } from './KioskWorkspacePrimitives';

export function KioskToolWorkspaceFrame({
  className,
  width = 'compact',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  width?: 'compact' | 'catalog';
}) {
  return (
    <div
      className={cn(
        'mx-auto min-w-0 max-w-full space-y-3 overflow-x-hidden',
        width === 'compact' ? 'w-full max-w-[32rem]' : 'w-full max-w-3xl',
        className,
      )}
      {...props}
    />
  );
}

export function KioskWorkspaceContextBar({
  action,
  density = 'comfortable',
  description,
  eyebrow,
  icon,
  meta,
  title,
  tone,
}: {
  action?: ReactNode;
  density?: 'comfortable' | 'compact';
  description?: ReactNode;
  eyebrow: string;
  icon: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
  tone: KioskThemeTone;
}) {
  const theme = MODULE_COLORS[tone];

  return (
    <section
      className={cn(
        'rounded-2xl border bg-white shadow-sm dark:bg-slate-950',
        density === 'compact' ? 'p-2.5 sm:p-3' : 'p-3 sm:p-4',
        theme.border,
        theme.darkBorder,
      )}
      data-kiosk-workspace-context
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'grid shrink-0 place-items-center rounded-xl text-sm font-medium',
            density === 'compact' ? 'h-10 w-10' : 'h-11 w-11',
            theme.lightBg,
            theme.darkBg,
            theme.text,
            theme.darkText,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('text-xs font-medium', theme.text, theme.darkText)}>{eyebrow}</p>
          <p className="mt-0.5 truncate text-base font-medium text-slate-950 dark:text-white">{title}</p>
          {description ? (
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {meta ? (
        <div className={cn('rounded-xl px-3', density === 'compact' ? 'mt-2 py-2' : 'mt-3 py-2.5', theme.lightBg, theme.darkBg)}>
          {meta}
        </div>
      ) : null}
    </section>
  );
}

export function KioskWorkspaceSurface({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5',
        className,
      )}
      {...props}
    />
  );
}

export function KioskWorkspaceSectionHeader({
  action,
  description,
  icon,
  title,
  tone,
}: {
  action?: ReactNode;
  description?: ReactNode;
  icon: ReactNode;
  title: ReactNode;
  tone: KioskThemeTone;
}) {
  const theme = MODULE_COLORS[tone];

  return (
    <header className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
            theme.lightBg,
            theme.darkBg,
            theme.text,
            theme.darkText,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-medium text-slate-950 dark:text-white">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm leading-5 text-slate-500 dark:text-slate-400">{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </header>
  );
}

export function KioskWorkspaceNotice({
  children,
  kind,
}: {
  children: ReactNode;
  kind: 'error' | 'success';
}) {
  return (
    <p
      aria-live={kind === 'success' ? 'polite' : undefined}
      className={cn(
        'rounded-xl border px-4 py-3 text-sm',
        kind === 'error'
          ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200',
      )}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      {children}
    </p>
  );
}

export function KioskWorkspaceChoiceCard({
  className,
  density = 'comfortable',
  description,
  disabled,
  icon,
  onClick,
  selected,
  title,
  tone,
}: {
  className?: string;
  density?: 'comfortable' | 'compact';
  description?: ReactNode;
  disabled?: boolean;
  icon: ReactNode;
  onClick: () => void;
  selected: boolean;
  title: ReactNode;
  tone: KioskThemeTone;
}) {
  const theme = MODULE_COLORS[tone];

  return (
    <button
      aria-pressed={selected}
      className={cn(
        'w-full rounded-xl border text-left outline-none transition disabled:cursor-not-allowed disabled:opacity-45 focus-visible:ring-4 focus-visible:ring-slate-400/20',
        density === 'compact' ? 'min-h-14 p-2.5' : 'min-h-[4.5rem] p-3',
        selected
          ? `${theme.lightBg} ${theme.darkBg} ${theme.border} ${theme.darkBorder} shadow-sm`
          : `border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950 ${theme.iconHover}`,
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className={cn('flex items-start', density === 'compact' ? 'gap-2' : 'gap-3')}>
        <span
          aria-hidden="true"
          className={cn(
            'grid shrink-0 place-items-center rounded-xl',
            density === 'compact' ? 'h-9 w-9' : 'h-10 w-10',
            selected ? 'shadow-sm' : `${theme.lightBg} ${theme.darkBg} ${theme.text} ${theme.darkText}`,
          )}
          style={selected ? {
            backgroundColor: theme.primary,
            color: getModulePrimaryForeground(tone),
          } : undefined}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-950 dark:text-white">{title}</span>
          {description ? (
            <span className={cn('mt-0.5 block leading-4 text-slate-500 dark:text-slate-400', density === 'compact' ? 'text-[11px]' : 'text-xs')}>{description}</span>
          ) : null}
        </span>
        {selected ? (
          <span
            aria-hidden="true"
            className={cn('grid shrink-0 place-items-center rounded-full', density === 'compact' ? 'h-5 w-5' : 'h-6 w-6')}
            style={{ backgroundColor: theme.primary, color: getModulePrimaryForeground(tone) }}
          >
            <Check className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function KioskWorkspaceFieldStatus({
  children,
  className,
  kind = 'help',
}: {
  children: ReactNode;
  className?: string;
  kind?: 'error' | 'help' | 'success' | 'warning';
}) {
  const presentation = {
    error: {
      className: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-200',
      icon: <AlertCircle className="h-4 w-4" />,
    },
    help: {
      className: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
      icon: <Info className="h-4 w-4" />,
    },
    success: {
      className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-200',
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    warning: {
      className: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-200',
      icon: <TriangleAlert className="h-4 w-4" />,
    },
  }[kind];

  return (
    <p
      className={cn('flex items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-5', presentation.className, className)}
      data-kiosk-field-status={kind}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0">{presentation.icon}</span>
      <span className="min-w-0">{children}</span>
    </p>
  );
}

export function KioskFileDropzone({
  accept,
  capture,
  className,
  density = 'comfortable',
  description,
  disabled,
  icon,
  multiple,
  onChange,
  title,
  tone,
}: {
  accept?: string;
  capture?: InputHTMLAttributes<HTMLInputElement>['capture'];
  className?: string;
  density?: 'comfortable' | 'compact';
  description?: ReactNode;
  disabled?: boolean;
  icon: ReactNode;
  multiple?: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  title: ReactNode;
  tone: KioskThemeTone;
}) {
  const theme = MODULE_COLORS[tone];

  return (
    <label
      className={cn(
        'flex w-full cursor-pointer items-center rounded-xl border border-dashed text-left outline-none transition focus-within:ring-4 focus-within:ring-slate-400/20',
        density === 'compact' ? 'min-h-14 gap-2 p-2.5' : 'min-h-16 gap-3 p-3',
        disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-55 dark:border-slate-700 dark:bg-slate-900'
          : `${theme.border} ${theme.darkBorder} ${theme.lightBg} ${theme.darkBg} ${theme.iconHover}`,
        className,
      )}
      data-kiosk-file-dropzone
    >
      <input
        accept={accept}
        capture={capture}
        className="sr-only"
        disabled={disabled}
        multiple={multiple}
        onChange={onChange}
        type="file"
      />
      <span
        aria-hidden="true"
        className={cn(
          'grid shrink-0 place-items-center rounded-xl bg-white shadow-sm dark:bg-slate-950',
          density === 'compact' ? 'h-9 w-9' : 'h-10 w-10',
          theme.text,
          theme.darkText,
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-950 dark:text-white">{title}</span>
        {description ? (
          <span className={cn('mt-0.5 block leading-4 text-slate-500 dark:text-slate-400', density === 'compact' ? 'text-[11px]' : 'text-xs')}>{description}</span>
        ) : null}
      </span>
    </label>
  );
}

export function KioskWorkspaceEmptyState({
  action,
  description,
  icon,
  title,
  tone,
}: {
  action?: ReactNode;
  description: ReactNode;
  icon: ReactNode;
  title?: ReactNode;
  tone: KioskThemeTone;
}) {
  const theme = MODULE_COLORS[tone];

  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950" data-kiosk-empty-state>
      <div className={cn('mx-auto flex h-14 w-14 items-center justify-center rounded-2xl', theme.lightBg, theme.darkBg, theme.text, theme.darkText)}>{icon}</div>
      {title ? <h3 className="mt-4 text-lg font-medium tracking-tight text-slate-950 dark:text-white">{title}</h3> : null}
      <p className={cn('mx-auto max-w-sm text-sm leading-5 text-slate-500 dark:text-slate-400', title ? 'mt-2' : 'mt-4')}>{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </section>
  );
}

export function KioskWorkflowStepper({
  ariaLabel,
  currentStep,
  density = 'comfortable',
  labels,
  tone,
}: {
  ariaLabel: string;
  currentStep: number;
  density?: 'comfortable' | 'compact';
  labels: readonly string[];
  tone: KioskThemeTone;
}) {
  const theme = MODULE_COLORS[tone];

  return (
    <div
      aria-label={ariaLabel}
      className={cn('grid', density === 'compact' ? 'gap-1' : 'gap-1.5')}
      data-kiosk-workflow-stepper
      role="list"
      style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}
    >
      {labels.map((label, index) => {
        const step = index + 1;
        const complete = step < currentStep;
        const active = step === currentStep;
        return (
          <div className="min-w-0 text-center" key={label} role="listitem">
            <span
              className={cn(
                'mx-auto grid place-items-center rounded-full font-medium',
                density === 'compact' ? 'h-7 w-7 text-[11px]' : 'h-8 w-8 text-xs',
                complete
                  ? 'bg-emerald-500 text-white'
                  : active
                    ? 'shadow-sm'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
              )}
              style={active ? {
                backgroundColor: theme.primary,
                color: getModulePrimaryForeground(tone),
              } : undefined}
            >
              {complete ? <Check aria-hidden="true" className="h-4 w-4" /> : step}
            </span>
            <span className={cn(
              'block truncate font-medium',
              density === 'compact' ? 'mt-1 text-[10px] min-[390px]:text-[11px]' : 'mt-1.5 text-[11px] sm:text-xs',
              active ? `${theme.text} ${theme.darkText}` : 'text-slate-500 dark:text-slate-400',
            )}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function KioskStickyActionBar({
  children,
  className,
  position = 'sticky',
  summary,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  children: ReactNode;
  position?: 'contained' | 'sticky';
  summary?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white/95 p-2 pb-[max(.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-18px_rgba(15,23,42,0.55)] backdrop-blur dark:border-slate-700 dark:bg-slate-950/95',
        position === 'sticky' ? 'sticky bottom-0 z-20 -mx-1' : 'relative',
        className,
      )}
      data-kiosk-sticky-action
      {...props}
    >
      {summary ? <div className="mb-2 px-1">{summary}</div> : null}
      <div className="flex gap-2">{children}</div>
    </div>
  );
}
