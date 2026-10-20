import { useEffect, useRef, useState } from 'react';
import { Columns2, LoaderCircle, RefreshCw, X } from 'lucide-react';
import { useLanguage } from '../../shared/context';
import { useWorkbarLayout } from './WorkbarLayoutContext';
import { getWorkbarLayoutCopy } from './translations';

export function DualWorkspacePane({ visible = true }: { visible?: boolean }) {
  const { currentLanguage } = useLanguage();
  const { closeDualScreen, savingPreferences } = useWorkbarLayout();
  const [loading, setLoading] = useState(true);
  const [frameFailed, setFrameFailed] = useState(false);
  const [closeFailed, setCloseFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const closing = useRef(false);
  const copy = getWorkbarLayoutCopy(currentLanguage.code);
  useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(() => { setFrameFailed(true); setLoading(false); }, 15000);
    return () => window.clearTimeout(timer);
  }, [attempt, loading]);
  const close = async () => {
    if (closing.current || savingPreferences) return;
    closing.current = true;
    setCloseFailed(false);
    try { await closeDualScreen(); }
    catch { setCloseFailed(true); }
    finally { closing.current = false; }
  };
  const retryFrame = () => { setFrameFailed(false); setLoading(true); setAttempt(value => value + 1); };

  return (
    <section
      aria-label={copy.secondaryWorkspace}
      aria-hidden={!visible || undefined}
      inert={!visible || undefined}
      className={`${visible ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-1 flex-col border-l border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-950`}
    >
      <div className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-[var(--indice-brand-border)] bg-[var(--indice-brand-soft)] px-3 py-1 dark:border-blue-800">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--indice-brand-text)] dark:text-[var(--indice-brand-text-dark)]">
          <Columns2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{copy.secondaryWorkspace}</span>
        </div>
        <button type="button" onClick={() => void close()} disabled={savingPreferences} aria-busy={savingPreferences}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[var(--indice-brand-border)] bg-white px-3 text-sm font-medium text-[var(--indice-brand-text)] shadow-sm transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--indice-brand-action)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:border-blue-700 dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-950"
          aria-label={copy.closeDualScreen} title={copy.closeDualScreen}>
          {savingPreferences ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
          <span>{savingPreferences ? copy.applying : copy.closeDualScreen}</span>
        </button>
      </div>
      {closeFailed ? <p role="alert" className="shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">{copy.closeError}</p> : null}
      <div className="relative min-h-0 flex-1">
        {loading || frameFailed ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white p-4 text-center text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300" role={frameFailed ? 'alert' : 'status'} aria-live="polite">
            {frameFailed ? <>
              <p>{copy.frameError}</p>
              <button type="button" onClick={retryFrame} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--indice-brand-border)] px-4 text-[var(--indice-brand-text)] dark:text-blue-200"><RefreshCw className="size-4" />{copy.reloadSecondary}</button>
            </> : <><LoaderCircle className="h-5 w-5 animate-spin text-[var(--indice-brand-action)]" aria-hidden="true" />{copy.loadingSecondaryWorkspace}</>}
          </div>
        ) : null}
        <iframe key={attempt} ref={frameRef}
          src="/dashboard?workspacePane=secondary"
          title={copy.secondaryWorkspace}
          inert={loading || frameFailed || undefined}
          className="h-full w-full border-0 bg-white dark:bg-slate-950"
          onLoad={() => {
            try {
              if (!frameRef.current?.contentDocument?.getElementById('root') || frameRef.current.contentWindow?.location.origin !== window.location.origin) { setFrameFailed(true); setLoading(false); return; }
              setFrameFailed(false); setLoading(false);
            } catch { setFrameFailed(true); setLoading(false); }
          }}
          onError={() => { setFrameFailed(true); setLoading(false); }}
          allow="clipboard-read; clipboard-write; fullscreen"
        />
      </div>
    </section>
  );
}
