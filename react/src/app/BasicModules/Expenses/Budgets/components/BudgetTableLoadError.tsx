import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useBudgetsTranslations } from '../hooks/useBudgetsTranslations';

export function BudgetTableLoadError({ errorMessage, onRetry }: { errorMessage: string; onRetry?: () => void }) {
  const t = useBudgetsTranslations();

  return (
    <section role="alert" className="flex flex-col gap-3 border-b border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900/60 dark:bg-amber-950/25 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-700 dark:border-amber-900/60 dark:bg-slate-900 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-amber-950 dark:text-amber-100">{t.budgets.messages.loadErrorTitle}</p>
          <p className="mt-1 text-sm leading-5 text-amber-800 dark:text-amber-200">{t.budgets.messages.loadErrorDescription}</p>
          <p className="mt-1 break-words text-xs text-amber-700/80 dark:text-amber-300/80">{errorMessage}</p>
        </div>
      </div>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 text-sm text-amber-800 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-amber-950/50">
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          {t.budgets.messages.retryLoad}
        </button>
      ) : null}
    </section>
  );
}
