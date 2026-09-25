import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { posBackendApi, type PosSquareTerminalPaymentResponse } from '../services/posBackendApi';
import {
  clearSquareTerminalAttempt,
  readSquareTerminalAttempt,
  SQUARE_TERMINAL_ATTEMPT_CHANGED,
  type SquareTerminalAttempt,
} from '../services/squareTerminalAttemptStore';
import type { SquareTerminalRecoveryCopy } from '../services/squareTerminalRecoveryCopy';

interface Props {
  companyId: number | string;
  cashRegisterId: number | string;
  shiftId: number | string;
  disabled?: boolean;
  formatCurrency: (amount: number) => string;
  copy: SquareTerminalRecoveryCopy;
  onRecover: (intentId: number | string, attempt?: SquareTerminalAttempt) => Promise<PosSquareTerminalPaymentResponse | null>;
  onRequestResult: (response: PosSquareTerminalPaymentResponse, attempt: SquareTerminalAttempt) => Promise<boolean>;
  onRetryRequest: () => Promise<void>;
  onUnresolvedChange?: (blocked: boolean) => void;
}

const recoverable = (status: string) => ['waiting', 'approved', 'partially_refunded', 'uncertain'].includes(status.toLowerCase());
const closed = (status: string) => ['declined', 'cancelled'].includes(status.toLowerCase());
const linked = (status: string) => ['approved', 'partially_refunded', 'refunded'].includes(status.toLowerCase());
const number = (value: number | string | null | undefined) => Number.isFinite(Number(value)) ? Number(value) : 0;
const merge = (items: PosSquareTerminalPaymentResponse[], item: PosSquareTerminalPaymentResponse) => (
  [...items.filter((candidate) => candidate.intentId !== item.intentId), item]
);

export function SquareTerminalRecoveryPanel({ companyId, cashRegisterId, shiftId, disabled = false,
  formatCurrency, copy, onRecover, onRequestResult, onRetryRequest, onUnresolvedChange }: Props) {
  const scope = useMemo(() => ({ companyId, cashRegisterId, shiftId }), [companyId, cashRegisterId, shiftId]);
  const recoveryScope = `${companyId}:${cashRegisterId}:${shiftId}`;
  const activeRecoveryScope = useRef(recoveryScope);
  activeRecoveryScope.current = recoveryScope;
  const resultHandler = useRef(onRequestResult);
  resultHandler.current = onRequestResult;
  const [items, setItems] = useState<PosSquareTerminalPaymentResponse[]>([]);
  const [attempt, setAttempt] = useState<SquareTerminalAttempt | null>(() => readSquareTerminalAttempt(scope));
  const [requestIntentId, setRequestIntentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifiedScope, setVerifiedScope] = useState('');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const requestedScope = recoveryScope;
    const active = () => activeRecoveryScope.current === requestedScope;
    if (!active()) return;
    setLoading(true);
    const stored = readSquareTerminalAttempt(scope);
    let nextItems: PosSquareTerminalPaymentResponse[] = [];
    let nextError = '';
    try {
      const response = await posBackendApi.listRecoverableSquareTerminalPayments({ cashRegisterId, shiftId, limit: 10 });
      if (!active()) return;
      nextItems = response.items.filter((item) => recoverable(String(item.status)));
    } catch { if (!active()) return; nextError = copy.loadError; }
    if (stored) {
      try {
        const keyed = await posBackendApi.getSquareTerminalPaymentByRequestKey(stored.requestKey);
        if (!active()) return;
        setRequestIntentId(keyed.intentId);
        if (closed(String(keyed.status))) {
          if (!active()) return;
          clearSquareTerminalAttempt(scope, stored.requestKey);
          setNotice(statusMessage(keyed, copy));
        } else if (String(keyed.status).toLowerCase() === 'refunded' && !keyed.posTicketId) {
          if (!active()) return;
          clearSquareTerminalAttempt(scope, stored.requestKey);
          setNotice(copy.refundedReleased);
        } else if (linked(String(keyed.status)) && keyed.checkout && keyed.posTicketId) {
          if (!active()) return;
          const consumed = await resultHandler.current(keyed, stored);
          if (!active()) return;
          if (consumed) clearSquareTerminalAttempt(scope, stored.requestKey);
          else nextItems = merge(nextItems, keyed);
        } else nextItems = merge(nextItems, keyed);
      } catch { if (!active()) return; nextError = copy.lookupError; setRequestIntentId(null); }
    } else setRequestIntentId(null);
    if (!active()) return;
    setAttempt(readSquareTerminalAttempt(scope));
    setItems(nextItems);
    setError(nextError);
    setVerifiedScope(recoveryScope);
    setLoading(false);
  }, [cashRegisterId, copy, recoveryScope, scope, shiftId]);

  useEffect(() => {
    setAttempt(readSquareTerminalAttempt(scope));
    setItems([]);
    setVerifiedScope('');
    setBusyId(''); setError(''); setNotice('');
    void load();
    const intervalId = window.setInterval(() => void load(), 30000);
    const changed = () => void load();
    window.addEventListener(SQUARE_TERMINAL_ATTEMPT_CHANGED, changed);
    return () => { window.clearInterval(intervalId); window.removeEventListener(SQUARE_TERMINAL_ATTEMPT_CHANGED, changed); };
  }, [load, scope]);

  useEffect(() => {
    onUnresolvedChange?.(verifiedScope !== recoveryScope || Boolean(error) || Boolean(attempt) || items.length > 0);
  }, [attempt, error, items.length, onUnresolvedChange, recoveryScope, verifiedScope]);
  useEffect(() => () => onUnresolvedChange?.(false), [onUnresolvedChange]);

  const recover = async (intentId: number | string) => {
    const requestedScope = recoveryScope;
    const active = () => activeRecoveryScope.current === requestedScope;
    setBusyId(`recover-${intentId}`); setNotice('');
    try {
      const response = await onRecover(intentId, Number(intentId) === requestIntentId ? attempt ?? undefined : undefined);
      if (!active()) return;
      if (response) setNotice(statusMessage(response, copy));
      await load();
    } finally { if (active()) setBusyId(''); }
  };
  const retry = async () => {
    const requestedScope = recoveryScope;
    const active = () => activeRecoveryScope.current === requestedScope;
    setBusyId('retry'); setNotice(''); setError('');
    try { await onRetryRequest(); if (active()) await load(); }
    finally { if (active()) setBusyId(''); }
  };
  const cancel = async (intentId: number | string) => {
    const requestedScope = recoveryScope;
    const active = () => activeRecoveryScope.current === requestedScope;
    const selectedAttempt = attempt, selectedIntentId = requestIntentId;
    setBusyId(`cancel-${intentId}`); setNotice('');
    try {
      const response = await posBackendApi.cancelSquareTerminalPayment(intentId);
      if (!active()) return;
      if (Number(intentId) === selectedIntentId && selectedAttempt && closed(String(response.status))) {
        clearSquareTerminalAttempt(scope, selectedAttempt.requestKey);
      }
      setNotice(statusMessage(response, copy)); await load();
    } catch { if (active()) setError(copy.cancelError); }
    finally { if (active()) setBusyId(''); }
  };

  if (!items.length && !attempt && !loading && !error && !notice) return null;
  return (
    <section className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" /><div>
          <h2 className="font-medium">{copy.title}</h2><p className="text-xs font-medium text-amber-700 dark:text-amber-200">{copy.help}</p>
        </div></div>
        <div className="flex flex-wrap items-center gap-2">
          {attempt ? <button type="button" onClick={() => void retry()} disabled={disabled || Boolean(busyId)} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white disabled:opacity-50"><RotateCcw className={`h-4 w-4 ${busyId === 'retry' ? 'animate-spin' : ''}`} />{copy.retry}</button> : null}
          <button type="button" onClick={() => void load()} disabled={loading || disabled} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 text-xs font-medium text-amber-800 disabled:opacity-50 dark:border-amber-500/40 dark:bg-slate-950 dark:text-amber-100"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{copy.refresh}</button>
        </div>
      </div>
      {loading ? <p aria-live="polite" className="mt-2 text-xs font-medium">{copy.loading}</p> : null}
      {error ? <p role="alert" className="mt-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700">{error}</p> : null}
      {notice ? <p role="status" aria-live="polite" className="mt-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-amber-800">{notice}</p> : null}
      {items.length ? <div className="mt-3 grid gap-2">{items.map((item) => (
        <div key={item.intentId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-slate-900 shadow-sm dark:border-amber-500/30 dark:bg-slate-950 dark:text-white">
          <div className="min-w-0"><p className="font-medium">{copy.intent} #{item.intentId} · {formatCurrency(number(item.amount))}</p><p className="text-xs text-slate-500 dark:text-slate-300">{statusMessage(item, copy)} · {item.squareCheckoutId || copy.notSent}</p></div>
          <div className="flex items-center gap-2"><button type="button" onClick={() => void recover(item.intentId)} disabled={disabled || Boolean(busyId)} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white disabled:opacity-50"><RotateCcw className={`h-4 w-4 ${busyId === `recover-${item.intentId}` ? 'animate-spin' : ''}`} />{copy.recover}</button>
          {String(item.status).toLowerCase() === 'waiting' ? <button type="button" onClick={() => void cancel(item.intentId)} disabled={disabled || Boolean(busyId)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-medium text-red-700 disabled:opacity-50 dark:border-red-500/30 dark:text-red-200"><XCircle className={`h-4 w-4 ${busyId === `cancel-${item.intentId}` ? 'animate-spin' : ''}`} />{copy.cancel}</button> : null}</div>
        </div>
      ))}</div> : null}
    </section>
  );
}

function statusMessage(response: PosSquareTerminalPaymentResponse, copy: SquareTerminalRecoveryCopy) {
  switch (String(response.status).toLowerCase()) {
    case 'waiting': return copy.waiting;
    case 'approved': return response.checkout ? copy.approved : copy.finalizing;
    case 'partially_refunded': return response.checkout ? copy.approved : copy.finalizing;
    case 'refunded': return response.posTicketId ? (response.checkout ? copy.approved : copy.finalizing) : copy.refundedReleased;
    case 'declined': return copy.declined;
    case 'cancelled': return copy.cancelled;
    default: return copy.uncertain;
  }
}
