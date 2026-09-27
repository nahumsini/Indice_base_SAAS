import { useCallback, useEffect, useRef, useState } from 'react';
import type { SaleItem } from '../types/sale.types';
import type { Shift } from '../types/shift.types';
import type { SaleTotals } from '../utils/saleCalculations';
import type { MercadoPagoPaymentRequest, MercadoPagoPaymentResponse } from '../services/mercadoPagoTerminalTypes';
import { mercadoPagoTerminalApi } from '../services/mercadoPagoTerminalApi';
import { createMercadoPagoPaymentAndWait, isMercadoPagoPaymentUnresolved, isMercadoPagoRequestNotSubmitted, isMercadoPagoNotSubmittedReceipt } from '../services/mercadoPagoTerminalWorkflow';
import { isValidMercadoPagoMerchantReview, requiresMercadoPagoMerchantReview } from '../services/mercadoPagoMerchantReview';
import { useMercadoPagoTerminalCopy } from '../../CashRegisters/useMercadoPagoTerminalCopy';

export interface MercadoPagoSaleSnapshot { items: SaleItem[]; totals: SaleTotals; identity: string }
interface StoredAttempt { key: string; intentId: number | null; cartHash: string }
interface Options {
  cart: SaleItem[];
  draftIdentity: string;
  currentShift: Shift | null;
  setNotice: (notice: string) => void;
  onCompleted: (payment: MercadoPagoPaymentResponse, snapshot: MercadoPagoSaleSnapshot | null, matchesCart: boolean) => Promise<void>;
}

function storageScope(shift: Shift | null) {
  return shift ? `indice:pos:mp-attempt:${shift.companyId}:${shift.cashRegisterId}:${shift.id}` : '';
}
function readAttempt(scope: string): StoredAttempt | null {
  if (!scope) return null;
  try {
    const value = JSON.parse(window.sessionStorage.getItem(scope) ?? 'null');
    return value && typeof value.key === 'string' && typeof value.cartHash === 'string' && (value.intentId === null || Number.isSafeInteger(value.intentId)) ? value : null;
  } catch { return null; }
}
async function hashCart(identity: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
function clearAttemptAt(scope: string, key: string, intentId: number) {
  try {
    const current = readAttempt(scope);
    if (current?.key === key && current.intentId === intentId) window.sessionStorage.removeItem(scope);
  } catch { /* A completed receipt remains authoritative if browser storage is unavailable. */ }
}

export function useMercadoPagoTerminalCheckout({ cart, draftIdentity, currentShift, setNotice, onCompleted }: Options) {
  const { copy } = useMercadoPagoTerminalCopy();
  const scope = storageScope(currentShift);
  const [items, setItems] = useState<MercadoPagoPaymentResponse[]>([]);
  const [loading, setLoading] = useState(Boolean(currentShift));
  const [verifiedScope, setVerifiedScope] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [unknownDelivery, setUnknownDelivery] = useState(false);
  const [error, setError] = useState('');
  const stored = useRef<StoredAttempt | null>(readAttempt(scope));
  const request = useRef<MercadoPagoPaymentRequest | null>(null);
  const snapshot = useRef<MercadoPagoSaleSnapshot | null>(null);
  const operation = useRef(false);
  const cancelling = useRef(false);
  const completed = useRef(new Set<number>());
  const completedDraft = useRef<{ scope: string; identity: string } | null>(null);
  const latest = useRef({ cart, draftIdentity, currentShift, scope, onCompleted });
  latest.current = { cart, draftIdentity, currentShift, scope, onCompleted };

  const persist = (value: StoredAttempt | null) => {
    stored.current = value;
    try {
      if (value) window.sessionStorage.setItem(latest.current.scope, JSON.stringify(value));
      else window.sessionStorage.removeItem(latest.current.scope);
    } catch { /* In-memory recovery remains guarded if browser storage is unavailable. */ }
  };
  const releaseRejectedRequest = (nextError: unknown) => {
    const attempt = stored.current;
    if (!attempt || attempt.intentId !== null || !isMercadoPagoRequestNotSubmitted(nextError, attempt.key)) return false;
    persist(null); request.current = null; snapshot.current = null;
    setUnknownDelivery(false); setError(''); setNotice(copy.notSubmitted);
    return true;
  };
  const consume = async (payment: MercadoPagoPaymentResponse) => {
    if (completed.current.has(payment.intentId)) return;
    const attempt = stored.current;
    const matchingScope = latest.current.scope;
    const attemptKey = attempt?.key ?? null;
    setItems((existing) => isMercadoPagoPaymentUnresolved(payment)
      ? [...existing.filter((item) => item.intentId !== payment.intentId), payment]
      : existing.filter((item) => item.intentId !== payment.intentId));
    const attemptMatches = attempt?.intentId === payment.intentId;
    if (['approved', 'partially_refunded', 'refunded'].includes(payment.status) && payment.checkout) {
      const original = attemptMatches ? snapshot.current : null;
      const matchingDraft = latest.current.draftIdentity;
      const matches = attemptMatches && latest.current.cart.length > 0 && (original
        ? original.identity === matchingDraft
        : stored.current?.cartHash === await hashCart(matchingDraft))
        && matchingDraft === latest.current.draftIdentity && matchingScope === latest.current.scope;
      if (matchingScope !== latest.current.scope || completed.current.has(payment.intentId)) return;
      completed.current.add(payment.intentId);
      if (matches) completedDraft.current = { scope: matchingScope, identity: latest.current.draftIdentity };
      try { await latest.current.onCompleted(payment, original, matches); }
      catch (nextError) { completed.current.delete(payment.intentId); throw nextError; }
      if (attemptMatches && attemptKey) clearAttemptAt(matchingScope, attemptKey, payment.intentId);
      if (matchingScope !== latest.current.scope) return;
      setItems((existing) => existing.filter((item) => item.intentId !== payment.intentId));
      if (attemptMatches && stored.current?.key === attemptKey && stored.current.intentId === payment.intentId) {
        stored.current = null; request.current = null; snapshot.current = null; setUnknownDelivery(false);
      }
    } else if (!isMercadoPagoPaymentUnresolved(payment) && payment.canRetry) {
      if (attemptMatches) { persist(null); request.current = null; snapshot.current = null; setUnknownDelivery(false); }
      setNotice(payment.message || copy.recoveryHelp);
    } else {
      setNotice(payment.status === 'waiting' ? copy.waiting : payment.status === 'approved' ? copy.receiptPending : copy.uncertain);
    }
  };

  const load = useCallback(async () => {
    const selected = latest.current;
    if (!selected.currentShift) { setItems([]); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const response = await mercadoPagoTerminalApi.recoverable(Number(selected.currentShift.cashRegisterId), selected.currentShift.id);
      if (selected.scope !== latest.current.scope) return;
      setItems(response.items.filter((item) => !completed.current.has(item.intentId)
        && (isMercadoPagoPaymentUnresolved(item) || ['approved', 'partially_refunded', 'refunded'].includes(item.status))));
      const attempt = readAttempt(selected.scope);
      stored.current = attempt;
      setUnknownDelivery(Boolean(attempt && !response.items.some((item) => item.intentId === attempt.intentId)));
      setVerifiedScope(selected.scope);
    } catch {
      if (selected.scope === latest.current.scope) setError(copy.error);
    } finally { if (selected.scope === latest.current.scope) setLoading(false); }
  }, [scope, copy.error]);
  useEffect(() => {
    request.current = null; snapshot.current = null; stored.current = readAttempt(scope);
    setUnknownDelivery(Boolean(stored.current)); setItems([]); setError(''); setActionBusy(false);
    void load();
  }, [scope]);
  useEffect(() => {
    const value = completedDraft.current;
    if (value && (value.scope !== scope || cart.length === 0 || value.identity !== draftIdentity))
      completedDraft.current = null;
  }, [cart.length, draftIdentity, scope]);

  const start = async (payload: Omit<MercadoPagoPaymentRequest, 'idempotencyKey'>, saleSnapshot: MercadoPagoSaleSnapshot) => {
    if (operation.current || loading || items.length || stored.current
        || completedDraft.current?.identity === saleSnapshot.identity) { setNotice(copy.recoveryHelp); return; }
    operation.current = true; setBusy(true); setError('');
    const attemptScope = latest.current.scope;
    try {
      const status = await mercadoPagoTerminalApi.status();
      if (attemptScope !== latest.current.scope) return;
      if (!status.enabled || !status.connected || !status.liveChargeAllowed) { setNotice(copy.chargeUnavailable); return; }
      const cartHash = await hashCart(saleSnapshot.identity);
      if (attemptScope !== latest.current.scope || saleSnapshot.identity !== latest.current.draftIdentity) return;
      const key = `indice-mp-${crypto.randomUUID()}`;
      persist({ key, intentId: null, cartHash });
      request.current = { ...payload, idempotencyKey: key };
      snapshot.current = saleSnapshot;
      setUnknownDelivery(true);
      const payment = await createMercadoPagoPaymentAndWait(request.current, mercadoPagoTerminalApi, (update) => {
        if (attemptScope !== latest.current.scope) return;
        if (stored.current) persist({ ...stored.current, intentId: update.intentId });
        setUnknownDelivery(false);
        setItems((existing) => [...existing.filter((item) => item.intentId !== update.intentId), update]);
        setNotice(update.status === 'waiting' ? copy.waiting : update.status === 'approved' ? copy.approved : copy.uncertain);
      }, () => new Promise<void>((resolve) => window.setTimeout(resolve, 2000)));
      if (attemptScope === latest.current.scope) await consume(payment);
    } catch (nextError) { if (attemptScope === latest.current.scope && !releaseRejectedRequest(nextError)) {
      setError(stored.current ? copy.uncertain : ''); setNotice(stored.current ? copy.uncertain : copy.error); setUnknownDelivery(Boolean(stored.current));
    } }
    finally { operation.current = false; setBusy(false); }
  };
  const recover = async (intentId: number) => {
    if (operation.current) return;
    operation.current = true; setActionBusy(true); setError('');
    const attemptScope = latest.current.scope;
    try { const response = await mercadoPagoTerminalApi.recoverPayment(intentId); if (attemptScope === latest.current.scope) await consume(response); }
    catch { if (attemptScope === latest.current.scope) setError(copy.error); }
    finally { operation.current = false; setActionBusy(false); }
  };
  const recoverRequest = async () => {
    if (operation.current || !stored.current || !latest.current.currentShift) return;
    operation.current = true; setActionBusy(true); setError('');
    const attemptScope = latest.current.scope;
    try {
      const response = request.current
        ? await mercadoPagoTerminalApi.createPayment(request.current)
        : await mercadoPagoTerminalApi.byRequest(stored.current.key, Number(latest.current.currentShift.cashRegisterId));
      if (attemptScope !== latest.current.scope || !stored.current) return;
      persist({ ...stored.current, intentId: response.intentId }); setUnknownDelivery(false);
      await consume(response);
    }
    catch (nextError) { if (attemptScope === latest.current.scope && !releaseRejectedRequest(nextError)) setError(copy.uncertain); }
    finally { operation.current = false; setActionBusy(false); }
  };
  const cancel = async (intentId: number) => {
    if (cancelling.current || actionBusy || !items.find((item) => item.intentId === intentId)?.canCancel) return;
    cancelling.current = true;
    setActionBusy(true); setError('');
    const attemptScope = latest.current.scope;
    try { const response = await mercadoPagoTerminalApi.cancelPayment(intentId); if (attemptScope === latest.current.scope) await consume(response); }
    catch { if (attemptScope === latest.current.scope) setError(copy.error); }
    finally { cancelling.current = false; if (attemptScope === latest.current.scope) setActionBusy(false); }
  };
  const merchantReview = async (intentId: number, providerOrderId: string, reason: string) => {
    const item = items.find((candidate) => candidate.intentId === intentId);
    if (operation.current || !item || !requiresMercadoPagoMerchantReview(item)) return;
    if (!isValidMercadoPagoMerchantReview(providerOrderId, reason)) { setError(copy.reviewInvalid); return; }
    operation.current = true; setActionBusy(true); setError('');
    const attemptScope = latest.current.scope;
    try {
      const response = await mercadoPagoTerminalApi.merchantReview(intentId, {
        providerOrderId: providerOrderId.trim(), reason: reason.trim(), expectedVersion: item.version,
      });
      if (attemptScope !== latest.current.scope) return;
      await consume(response);
      if (attemptScope === latest.current.scope) await load();
    } catch (nextError) {
      if (attemptScope !== latest.current.scope) return;
      if (typeof nextError === 'object' && nextError !== null && (nextError as { status?: number }).status === 409) {
        await load(); setError(copy.reviewConflict);
      } else setError(copy.reviewError);
    } finally { operation.current = false; setActionBusy(false); }
  };
  const closeRequest = async () => {
    if (operation.current || !stored.current || !latest.current.currentShift) return;
    operation.current = true; setActionBusy(true); setError('');
    const attemptScope = latest.current.scope, attemptKey = stored.current.key;
    try {
      const response = await mercadoPagoTerminalApi.closeRequest(attemptKey, Number(latest.current.currentShift.cashRegisterId));
      if (attemptScope !== latest.current.scope || stored.current?.key !== attemptKey) return;
      if (isMercadoPagoNotSubmittedReceipt(response, attemptKey)) {
        if (!releaseRejectedRequest({ payload: response })) setError(copy.uncertain);
      } else if ('intentId' in response && Number.isSafeInteger(response.intentId)) {
        persist({ ...stored.current, intentId: response.intentId }); setUnknownDelivery(false);
        await consume(response);
      } else setError(copy.uncertain);
    } catch { if (attemptScope === latest.current.scope) setError(copy.uncertain); }
    finally { operation.current = false; setActionBusy(false); }
  };
  const blocked = Boolean(scope && verifiedScope !== scope) || loading || Boolean(error) || unknownDelivery || items.length > 0 || busy || actionBusy;
  return { start, items, loading, busy, actionBusy, blocked, error, unknownDelivery, canRecoverRequest: Boolean(stored.current), recover, cancel, merchantReview, recoverRequest, closeRequest, load,
    isCompletedDraft: () => completedDraft.current?.scope === latest.current.scope
      && completedDraft.current.identity === latest.current.draftIdentity };
}
