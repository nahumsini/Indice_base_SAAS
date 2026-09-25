import { useRef, useState } from 'react';
import { posReturnsApi, type PosReturnRefundRequest, type PosReturnSummary } from '../services/posReturnsApi';

export type PosReturnKind = 'full' | 'partial';
export type PosReturnError = 'reference' | 'reason' | 'review_reason' | 'amount' | 'amount_exceeds' | 'lookup' | 'submit' | 'refresh' | 'recheck' | 'conflict';
const activeStatuses = new Set(['WAITING', 'SUBMITTING', 'PENDING', 'UNCERTAIN', 'RECONCILIATION_REQUIRED', 'DEAD_LETTER']);
const reviewableStatuses = new Set(['PENDING', 'UNCERTAIN', 'RECONCILIATION_REQUIRED', 'DEAD_LETTER']);
const safelyRetryableStatuses = new Set(['REJECTED', 'FAILED', 'NOT_SUBMITTED']);

export const isActiveRefund = (summary: PosReturnSummary | null) => (
  Boolean(summary?.latestRefund && activeStatuses.has(summary.latestRefund.status.toUpperCase()))
);
export const isReviewableRefund = (summary: PosReturnSummary | null) => (
  Boolean(summary?.latestRefund && reviewableStatuses.has(summary.latestRefund.status.toUpperCase()))
);
export const posReturnReasonLimit = (provider?: string | null) => provider === 'SQUARE' ? 192 : 500;
export const posReturnProviderLabel = (provider?: string | null) => (
  provider === 'MERCADO_PAGO' ? 'Mercado Pago' : provider === 'SQUARE' ? 'Square' : '—'
);

export function validatePosRefund(summary: PosReturnSummary, kind: PosReturnKind, amount: string, reason: string): PosReturnError | null {
  if (reason.trim().length < 3 || reason.trim().length > posReturnReasonLimit(summary.providerCode)) return 'reason';
  if (kind === 'full') return null;
  const normalized = amount.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized) || Number(normalized) <= 0) return 'amount';
  return Number(normalized) > Number(summary.refundableAmount) ? 'amount_exceeds' : null;
}

const requestKey = () => globalThis.crypto?.randomUUID?.()
  ?? `refund_${Date.now()}_${Math.random().toString(36).slice(2)}`;

export function usePosReturnRefund() {
  const [reference, setReference] = useState('');
  const [summary, setSummary] = useState<PosReturnSummary | null>(null);
  const [kind, setKind] = useState<PosReturnKind>('full');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [reviewReason, setReviewReason] = useState('');
  const [operation, setOperation] = useState<PosReturnRefundRequest | null>(null);
  const [error, setError] = useState<PosReturnError | null>(null);
  const [failureDetail, setFailureDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const run = async (action: () => Promise<PosReturnSummary>, failure: PosReturnError) => {
    if (lock.current) return null;
    lock.current = true; setBusy(true); setError(null); setFailureDetail('');
    try { const next = await action(); setSummary(next); return next; }
    catch (caught) { setError(failure); setFailureDetail(caught instanceof Error ? caught.message : ''); return null; }
    finally { lock.current = false; setBusy(false); }
  };

  const lookup = async () => {
    const value = reference.trim();
    if (!value) { setError('reference'); return null; }
    const next = await run(() => posReturnsApi.lookup(value), 'lookup');
    if (next) { setReference(next.ticketNumber); setOperation(null); setKind('full'); setAmount(''); setReason(''); setReviewReason(''); }
    return next;
  };

  const submit = async () => {
    if (lock.current) return null;
    if (!summary) { setError('reference'); return null; }
    const invalid = validatePosRefund(summary, kind, amount, reason);
    if (invalid) { setError(invalid); return null; }
    const nextOperation = operation ?? { idempotencyKey: requestKey(),
      amount: kind === 'full' ? null : Number(amount.trim().replace(',', '.')), reason: reason.trim() };
    if (!operation) setOperation(nextOperation);
    const next = await run(() => posReturnsApi.submit(summary.ticketNumber, nextOperation), 'submit');
    if (next?.latestRefund?.requestKey === nextOperation.idempotencyKey
        && safelyRetryableStatuses.has(next.latestRefund.status.toUpperCase())) setOperation(null);
    return next;
  };

  const refresh = () => summary
    ? run(() => posReturnsApi.refresh(summary.ticketNumber), 'refresh') : Promise.resolve(null);
  const reloadAfterConflict = async (caught: unknown) => {
    if (!summary || typeof caught !== 'object' || caught === null || (caught as { status?: number }).status !== 409) return false;
    try { setSummary(await posReturnsApi.lookup(summary.ticketNumber)); }
    catch { /* Preserve the review conflict as the primary failure. */ }
    setError('conflict'); setFailureDetail(caught instanceof Error ? caught.message : '');
    return true;
  };
  const review = async () => {
    const refund = summary?.latestRefund, auditReason = reviewReason.trim();
    if (lock.current || !summary || !refund || !isReviewableRefund(summary)) return null;
    if (auditReason.length < 8 || auditReason.length > 500) { setError('review_reason'); return null; }
    lock.current = true; setBusy(true); setError(null); setFailureDetail('');
    try { const next = await posReturnsApi.recheck(summary.ticketNumber, { reason: auditReason, expectedVersion: refund.version }); setSummary(next); return next; }
    catch (caught) { if (!await reloadAfterConflict(caught)) { setError('recheck'); setFailureDetail(caught instanceof Error ? caught.message : ''); } return null; }
    finally { lock.current = false; setBusy(false); }
  };
  const reset = () => { setReference(''); setSummary(null); setOperation(null); setKind('full'); setAmount(''); setReason(''); setReviewReason(''); setError(null); setFailureDetail(''); };
  const startAnother = () => { setOperation(null); setKind('full'); setAmount(''); setReason(''); setReviewReason(''); setError(null); setFailureDetail(''); };

  return { reference, setReference, summary, kind, setKind, amount, setAmount, reason, setReason,
    reviewReason, setReviewReason, operation, error, failureDetail, busy, lookup, submit, refresh, review, reset, startAnother };
}

export type PosReturnRefundWorkflow = ReturnType<typeof usePosReturnRefund>;
