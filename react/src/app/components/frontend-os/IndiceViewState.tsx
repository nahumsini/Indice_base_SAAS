import { AlertTriangle, CheckCircle2, Inbox, Loader2, LockKeyhole } from 'lucide-react';
import type { ReactNode } from 'react';
import { MODULE_COLORS, type IndiceModuleTone } from '../../styles/moduleColors';
import { cn } from '../ui/utils';

export type IndiceViewStateVariant = 'empty' | 'error' | 'loading' | 'restricted' | 'success';

const variantStyles: Record<IndiceViewStateVariant, string> = {
  empty: 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800',
  error: 'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/20',
  loading: 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800',
  restricted: 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/20',
  success: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20',
};

export function IndiceViewState({
  action,
  className,
  compact = false,
  description,
  icon,
  title,
  tone,
  variant,
}: {
  action?: ReactNode;
  className?: string;
  compact?: boolean;
  description?: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
  tone: IndiceModuleTone;
  variant: IndiceViewStateVariant;
}) {
  const theme = MODULE_COLORS[tone];
  const defaultIcon = {
    empty: <Inbox className="h-6 w-6" />,
    error: <AlertTriangle className="h-6 w-6" />,
    loading: <Loader2 className="h-6 w-6 animate-spin" />,
    restricted: <LockKeyhole className="h-6 w-6" />,
    success: <CheckCircle2 className="h-6 w-6" />,
  }[variant];

  return (
    <section
      aria-live={variant === 'loading' || variant === 'success' ? 'polite' : undefined}
      role={variant === 'error' || variant === 'restricted' ? 'alert' : 'status'}
      className={cn(
        'flex flex-col items-center justify-center rounded-[24px] border text-center shadow-sm',
        compact ? 'px-5 py-8' : 'px-6 py-12',
        variantStyles[variant],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-2xl border bg-white shadow-sm dark:bg-slate-900',
          variant === 'error'
            ? 'border-rose-200 text-rose-600 dark:border-rose-900/60 dark:text-rose-300'
            : variant === 'restricted'
              ? 'border-amber-200 text-amber-700 dark:border-amber-900/60 dark:text-amber-300'
              : variant === 'success'
                ? 'border-emerald-200 text-emerald-700 dark:border-emerald-900/60 dark:text-emerald-300'
                : cn(theme.border, theme.darkBorder, theme.text, theme.darkText),
        )}
      >
        {icon ?? defaultIcon}
      </span>
      <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-white">{title}</h3>
      {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p> : null}
      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </section>
  );
}
