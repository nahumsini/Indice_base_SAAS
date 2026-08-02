import { AlertTriangle, LockKeyhole } from 'lucide-react';
import { Button } from '../../../components/ui/button';

interface PanelInicialStateProps {
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  title: string;
  tone: 'error' | 'restricted';
}

export function PanelInicialState({
  description,
  onRetry,
  retryLabel,
  title,
  tone,
}: PanelInicialStateProps) {
  const isError = tone === 'error';
  const Icon = isError ? AlertTriangle : LockKeyhole;

  return (
    <section
      role={isError ? 'alert' : 'status'}
      className={isError
        ? 'rounded-3xl border border-red-200 bg-red-50 p-5 text-red-950 shadow-sm dark:border-red-800 dark:bg-red-950/30 dark:text-red-100 sm:p-6'
        : 'rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:p-6'}
    >
      <div className="flex items-start gap-3">
        <span className={isError
          ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
          : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--indice-blue)] dark:bg-blue-900/20 dark:text-blue-300'}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-medium">{title}</h2>
          <p className={isError
            ? 'mt-1 text-sm leading-6 text-red-800 dark:text-red-100/80'
            : 'mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300'}>
            {description}
          </p>
          {onRetry && retryLabel ? (
            <Button type="button" variant="outline" onClick={onRetry} className="mt-4">
              {retryLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
