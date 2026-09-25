import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, RotateCcw } from 'lucide-react';
import { usePointOfSaleResolvedLocale } from '../../hooks/usePointOfSaleTranslations';
import { posReturnsApi, type PosReturn, type ReturnCandidate } from '../services/posReturnsApi';
import { toBackendId } from '../utils/posShiftMappers';
import { PosModalFrame, posModalPrimaryActionClassName, posModalSecondaryActionClassName } from './PosModalFrame';
import { returnCopy } from './returnCopy';

export function ReturnModal({ isOpen, onClose, workspaceMode = false, shiftId, onCompleted }: {
  isOpen: boolean; onClose: () => void; workspaceMode?: boolean; shiftId?: string; onCompleted?: () => Promise<void>;
}) {
  const locale = usePointOfSaleResolvedLocale();
  const t = returnCopy(locale);
  const [search, setSearch] = useState('');
  const [tickets, setTickets] = useState<ReturnCandidate[]>([]);
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [goods, setGoods] = useState(false);
  const [cash, setCash] = useState(false);
  const [references, setReferences] = useState<Record<number, string>>({});
  const [result, setResult] = useState<PosReturn | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const keys = useRef(new Map<number, string>());
  const selectedGeneration = useRef(0);
  const money = (amount: string | number, currency: string) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(amount));
  const rejected = Boolean(result?.payments.length && result.payments.every(p => ['FAILED', 'REJECTED'].includes(p.status)));
  const card = Boolean(result?.payments.some(p => p.paymentMethod === 'CARD'));
  const manualReady = Boolean(result?.payments.every(p => p.paymentMethod === 'CASH' ? cash
    : p.paymentMethod === 'TRANSFER' ? (references[p.paymentId]?.trim().length ?? 0) >= 5 : false));

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    const handle = setTimeout(() => {
      const id = toBackendId(shiftId);
      if (!id) { if (active) { setTickets([]); setLoading(false); } return; }
      void posReturnsApi.tickets(id, search).then(rows => { if (active) setTickets(rows); })
        .catch(e => { if (active) { setTickets([]); setError(e instanceof Error ? e.message : t.error); } })
        .finally(() => { if (active) setLoading(false); });
    }, 200);
    return () => { active = false; clearTimeout(handle); };
  }, [isOpen, shiftId, search, t.error]);

  const select = async (id: number) => {
    if (inFlight.current) return;
    const generation = ++selectedGeneration.current;
    setTicketId(id); setResult(null); setReason(''); setGoods(false); setCash(false); setReferences({}); setError('');
    setLoading(true);
    try {
      const prior = await posReturnsApi.active(id);
      if (generation === selectedGeneration.current) {
        setResult(prior?.status === 'CANCELLED' ? null : prior);
        if (prior) setReason(prior.reason);
      }
    } catch (e) {
      if (generation === selectedGeneration.current) {
        setTicketId(null);
        setError(e instanceof Error ? e.message : t.error);
      }
    } finally { if (generation === selectedGeneration.current) setLoading(false); }
  };

  const run = async (action: () => Promise<PosReturn>) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const saved = await action();
      setResult(saved);
      if (saved.status === 'CANCELLED' && ticketId) keys.current.delete(ticketId);
      if (saved.status === 'COMPLETED') {
        try { await onCompleted?.(); } catch { setError(t.sync); }
      }
    } catch (e) { setError(e instanceof Error ? e.message : t.error); }
    finally { inFlight.current = false; setBusy(false); }
  };

  if (!isOpen) return null;
  return (
    <PosModalFrame
      modalType="standard-form" title={t.title} subtitle={t.scope} closeLabel={t.close}
      icon={<RotateCcw className="h-6 w-6" />} onClose={onClose} isCloseDisabled={busy}
      presentation={workspaceMode ? 'workspace' : 'modal'} tone={workspaceMode ? 'graphite' : 'coral'}
      footer={<div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={onClose} className={posModalSecondaryActionClassName}>{t.close}</button>
        {!result || result.status === 'CANCELLED' ? (
          <button type="button" disabled={busy || loading || !ticketId || !goods || reason.trim().length < 5}
            className={posModalPrimaryActionClassName}
            onClick={() => { if (!ticketId) return; const key = keys.current.get(ticketId) ?? crypto.randomUUID(); keys.current.set(ticketId, key); void run(() => posReturnsApi.prepare(ticketId, reason.trim(), goods, key)); }}>{t.prepare}</button>
        ) : result.status !== 'COMPLETED' ? <>
          {result.status === 'PREPARED' || rejected ? <button type="button" disabled={busy} className={posModalSecondaryActionClassName}
            onClick={() => void run(() => posReturnsApi.cancel(result.id))}>{t.cancel}</button> : null}
          <button type="button" disabled={busy || rejected || (!card && !manualReady)} className={posModalPrimaryActionClassName}
            onClick={() => void run(() => posReturnsApi.confirm(result.id, cash, references))}>{card && result.status === 'PROCESSING' ? t.refresh : t.confirm}</button>
        </> : null}
      </div>}
    >
      <div className="space-y-4">
        {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p> : null}
        {!result || result.status === 'CANCELLED' ? <>
          <label className="block text-sm">{t.search}<input value={search} onChange={e => setSearch(e.target.value)} disabled={busy}
            className="mt-1 min-h-11 w-full rounded-lg border bg-transparent px-3" /></label>
          {loading ? <p role="status" className="text-sm">{t.loading}</p> : null}
          <label className="block text-sm">{t.select}<select value={ticketId ?? ''} disabled={busy || loading}
            onChange={e => { if (e.target.value) void select(Number(e.target.value)); }}
            className="mt-1 min-h-11 w-full rounded-lg border bg-transparent px-3">
            <option value="" disabled>{t.select}</option>
            {tickets.map(ticket => <option key={ticket.id} value={ticket.id}>{ticket.ticketNumber} · {money(ticket.totalAmount, ticket.currency)}</option>)}
          </select></label>
          {!loading && tickets.length === 0 ? <p className="text-sm text-slate-500">{t.empty}</p> : null}
          <label className="block text-sm">{t.reason}<textarea value={reason} maxLength={500} disabled={busy}
            onChange={e => setReason(e.target.value)} className="mt-1 min-h-20 w-full rounded-lg border bg-transparent p-3" /></label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={goods} disabled={busy}
            onChange={e => setGoods(e.target.checked)} />{t.goods}</label>
        </> : <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{result.ticketNumber}</span>
            <span>{money(result.totalAmount, result.currency)}</span><span>{t.statuses[result.status]}</span></div>
          <p className="text-sm text-slate-500">{result.reason}</p>
          <div className="space-y-2">
            {result.payments.map(payment => <div key={payment.id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between gap-2"><span>{t.methods[payment.paymentMethod] ?? payment.paymentMethod}</span><span>{money(payment.amount, payment.currency)}</span></div>
              {result.status !== 'COMPLETED' && payment.paymentMethod === 'TRANSFER' ? <label className="mt-2 block">{t.transfer}
                <input maxLength={200} disabled={busy} value={references[payment.paymentId] ?? ''} onChange={e => setReferences(prev => ({ ...prev, [payment.paymentId]: e.target.value }))}
                  className="mt-1 min-h-11 w-full rounded-lg border bg-transparent px-3" /></label> : null}
              {payment.providerRefundId || payment.evidenceReference ? <p className="mt-2 break-all text-slate-500">{payment.providerRefundId ?? payment.evidenceReference}</p> : null}
            </div>)}
          </div>
          {result.status !== 'COMPLETED' && result.payments.some(p => p.paymentMethod === 'CASH') ? <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" disabled={busy} checked={cash} onChange={e => setCash(e.target.checked)} />{t.cash}</label> : null}
          <p role="status" className="flex items-start gap-2 rounded-lg border p-3 text-sm">
            {result.status === 'COMPLETED' ? <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" /> : <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />}
            {result.status === 'COMPLETED' ? t.complete : rejected ? t.failed : t.pending}
          </p>
        </>}
      </div>
    </PosModalFrame>
  );
}
