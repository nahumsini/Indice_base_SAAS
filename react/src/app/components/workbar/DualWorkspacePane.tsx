import { useState } from 'react';
import { Columns2, LoaderCircle, X } from 'lucide-react';
import { useLanguage } from '../../shared/context';
import { useWorkbarLayout } from './WorkbarLayoutContext';
import { getWorkbarLayoutCopy } from './translations';

export function DualWorkspacePane() {
  const { currentLanguage } = useLanguage();
  const { setDualScreenEnabled } = useWorkbarLayout();
  const [loading, setLoading] = useState(true);
  const copy = getWorkbarLayoutCopy(currentLanguage.code);

  return (
    <section
      aria-label={copy.secondaryWorkspace}
      className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-950"
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[var(--indice-brand-border)] bg-[var(--indice-brand-soft)] px-3 dark:border-blue-800">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--indice-brand-text)] dark:text-[var(--indice-brand-text-dark)]">
          <Columns2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{copy.secondaryWorkspace}</span>
        </div>
        <button
          type="button"
          onClick={() => setDualScreenEnabled(false)}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--indice-brand-border)] bg-white px-3 text-sm font-medium text-[var(--indice-brand-text)] shadow-sm transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--indice-brand-action)] focus-visible:ring-offset-2 dark:border-blue-700 dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-950"
          aria-label={copy.closeDualScreen}
          title={copy.closeDualScreen}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span>{copy.closeDualScreen}</span>
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300" role="status" aria-live="polite">
            <LoaderCircle className="mr-2 h-5 w-5 animate-spin text-[var(--indice-brand-action)]" aria-hidden="true" />
            {copy.loadingSecondaryWorkspace}
          </div>
        ) : null}
        <iframe
          src="/dashboard?workspacePane=secondary"
          title={copy.secondaryWorkspace}
          className="h-full w-full border-0 bg-white dark:bg-slate-950"
          onLoad={() => setLoading(false)}
          allow="clipboard-read; clipboard-write; fullscreen"
        />
      </div>
    </section>
  );
}
