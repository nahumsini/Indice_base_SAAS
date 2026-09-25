import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import { ApiClientError } from '../../../../lib/apiClient';
import { terminalRefundAdjustmentsService, type TerminalRefundAdjustment, type TerminalRefundAdjustmentState } from '../../services/terminal-refund-adjustments.service';
import { usePaymentAccountsResolvedLocale } from '../hooks/usePaymentAccountsTranslations';
import { terminalRefundAdjustmentsCopy } from '../terminalRefundAdjustmentsCopy';

type AdjustmentFilter = TerminalRefundAdjustmentState | 'ALL' | 'ATTENTION';
const states: AdjustmentFilter[] = ['ATTENTION', 'PENDING_REVIEW', 'RECONCILIATION_REQUIRED', 'FAILED', 'APPROVED', 'POSTED', 'ALL'];

export function TerminalRefundAdjustmentsPanel() {
  const locale = usePaymentAccountsResolvedLocale();
  const copy = terminalRefundAdjustmentsCopy[locale];
  const [items, setItems] = useState<TerminalRefundAdjustment[]>([]);
  const [filter, setFilter] = useState<AdjustmentFilter>('ATTENTION');
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const page = await terminalRefundAdjustmentsService.page(filter === 'ALL' ? undefined : filter);
      setItems(page.items);
      setNextCursor(page.nextCursor);
      setTotalCount(page.totalCount);
      setHidden(false);
    } catch (failure) {
      if (failure instanceof ApiClientError && failure.status === 403) setHidden(true);
      else setError(copy.error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [copy.error, filter]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const replace = (next: TerminalRefundAdjustment) => setItems(current => current.map(item => item.id === next.id ? next : item));
  const loadMore = async () => {
    if (!nextCursor) return;
    setLoading(true); setError('');
    try {
      const page = await terminalRefundAdjustmentsService.page(filter === 'ALL' ? undefined : filter, nextCursor);
      setItems(current => [...current, ...page.items]); setNextCursor(page.nextCursor);
    } catch { setError(copy.error); }
    finally { setLoading(false); }
  };
  const approve = async (item: TerminalRefundAdjustment) => {
    const reason = reasons[item.id]?.trim() ?? '';
    if (reason.length < 8) return;
    setBusyId(item.id); setError('');
    try { replace(await terminalRefundAdjustmentsService.approve(item.id, reason, item.version)); }
    catch { setError(copy.error); }
    finally { setBusyId(null); }
  };
  const post = async (item: TerminalRefundAdjustment) => {
    setBusyId(item.id); setError('');
    try { replace(await terminalRefundAdjustmentsService.post(item.id, item.version)); }
    catch { setError(copy.error); }
    finally { setBusyId(null); }
  };
  const resolve = async (item: TerminalRefundAdjustment) => {
    const reason = reasons[item.id]?.trim() ?? '';
    if (reason.length < 8) return;
    setBusyId(item.id); setError('');
    try { replace(await terminalRefundAdjustmentsService.resolve(item.id, reason, item.version)); }
    catch { setError(copy.resolveError); }
    finally { setBusyId(null); }
  };
  const label = (state: TerminalRefundAdjustmentState) => ({ PENDING_REVIEW: copy.pending, APPROVED: copy.approved, FAILED: copy.failed, RECONCILIATION_REQUIRED: copy.reconcile, POSTED: copy.posted })[state];
  const money = (item: TerminalRefundAdjustment) => new Intl.NumberFormat(locale, { style: 'currency', currency: item.currencyCode }).format(Number(item.amount));
  if (hidden) return null;

  return <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white dark:border-amber-900/60 dark:bg-slate-900">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-100 bg-amber-50/70 px-4 py-4 dark:border-amber-900/50 dark:bg-amber-950/20">
      <div><h2 className="flex items-center gap-2 font-medium text-slate-900 dark:text-white"><RotateCcw className="h-5 w-5 text-amber-600" />{copy.title}<span aria-label={copy.count.replace('{count}', String(totalCount))} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/50 dark:text-amber-100">{totalCount}</span></h2><p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{copy.description}</p></div>
      <div className="flex gap-2"><label className="sr-only" htmlFor="terminal-refund-state">{copy.filter}</label><select id="terminal-refund-state" aria-label={copy.filter} value={filter} onChange={event => setFilter(event.target.value as AdjustmentFilter)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800">{states.map(state => <option key={state} value={state}>{state === 'ALL' ? copy.all : state === 'ATTENTION' ? copy.attention : label(state)}</option>)}</select><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{copy.refresh}</button></div>
    </header>
    <p className="m-4 flex gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:bg-blue-950/30 dark:text-blue-200"><CheckCircle2 className="h-4 w-4 shrink-0" />{copy.safety}</p>
    {error ? <p role="alert" aria-live="assertive" className="mx-4 mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    {loading && !items.length ? <p className="px-4 pb-5 text-sm text-slate-500">{copy.loading}</p> : null}
    {!loading && !items.length ? <p className="px-4 pb-5 text-sm text-slate-500">{copy.empty}</p> : null}
    <div className="divide-y divide-slate-100 dark:divide-slate-800">{items.map(item => <article key={item.id} className="space-y-3 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-slate-900 dark:text-white">{money(item)}</strong><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">{label(item.state)}</span></div><p className="mt-1 text-xs text-slate-500">{copy.ticket} {item.ticketNumber} · {copy.closing} #{item.closingId} · {copy.account}: {item.paymentAccountName ?? '—'} · {copy.created}: {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}</p></div></div>
      {item.failureMessage ? <p className="flex gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700"><AlertTriangle className="h-4 w-4 shrink-0" />{item.failureCode ? `${item.failureCode}: ` : ''}{item.failureMessage}</p> : null}
      {item.state === 'PENDING_REVIEW' ? <div className="flex flex-col gap-2 sm:flex-row"><div className="flex-1"><label className="text-xs font-medium text-slate-600">{copy.reason}<input value={reasons[item.id] ?? ''} onChange={event => setReasons(current => ({ ...current, [item.id]: event.target.value }))} maxLength={500} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-800" /></label><p className="mt-1 text-xs text-slate-500">{copy.reasonHint}</p></div><button type="button" onClick={() => void approve(item)} disabled={busyId === item.id || (reasons[item.id]?.trim().length ?? 0) < 8} className="min-h-10 self-end rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white disabled:opacity-50">{busyId === item.id ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : copy.approve}</button></div> : null}
      {item.state === 'RECONCILIATION_REQUIRED' ? <div className="flex flex-col gap-2 sm:flex-row"><div className="flex-1"><label className="text-xs font-medium text-slate-600">{copy.resolutionReason}<input value={reasons[item.id] ?? ''} onChange={event => setReasons(current => ({ ...current, [item.id]: event.target.value }))} maxLength={500} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-800" /></label><p className="mt-1 text-xs text-slate-500">{copy.resolveHint}</p></div><button type="button" onClick={() => void resolve(item)} disabled={busyId === item.id || (reasons[item.id]?.trim().length ?? 0) < 8} className="min-h-10 self-end rounded-lg bg-amber-700 px-4 text-sm font-medium text-white disabled:opacity-50">{busyId === item.id ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : copy.resolve}</button></div> : null}
      {(item.state === 'APPROVED' || item.state === 'FAILED') ? <div className="flex justify-end"><button type="button" onClick={() => void post(item)} disabled={busyId === item.id} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#147514] px-4 text-sm font-medium text-white disabled:opacity-50">{busyId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{item.state === 'FAILED' ? copy.retry : copy.post}</button></div> : null}
    </article>)}</div>
    {nextCursor ? <div className="border-t border-slate-100 p-4 text-center dark:border-slate-800"><button type="button" onClick={() => void loadMore()} disabled={loading} className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium disabled:opacity-50 dark:border-slate-700">{copy.loadMore}</button></div> : null}
  </section>;
}
