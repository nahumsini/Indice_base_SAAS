import { useCallback, useEffect, useRef, useState } from 'react';
import { paymentRequestsApi, type OwnerPaymentRequestSnapshot } from '../../api/paymentRequests';

export function usePaymentRequest(companyId: number | undefined, authorizationRevision: number) {
  const [state, setState] = useState<{
    companyId: number | undefined;
    snapshot: OwnerPaymentRequestSnapshot | null;
    loading: boolean;
    error: string;
  }>({ companyId, snapshot: null, loading: Boolean(companyId), error: '' });
  const sequence = useRef(0);
  const activeCompany = useRef(companyId);
  activeCompany.current = companyId;

  const reload = useCallback(async () => {
    if (!companyId) return;
    const requestSequence = ++sequence.current;
    setState((current) => current.companyId === companyId
      ? { ...current, loading: true }
      : { companyId, snapshot: null, loading: true, error: '' });
    try {
      const snapshot = await paymentRequestsApi.snapshot();
      if (sequence.current === requestSequence && activeCompany.current === companyId) {
        setState({ companyId, snapshot, loading: false, error: '' });
      }
    } catch (failure) {
      if (sequence.current === requestSequence && activeCompany.current === companyId) {
        setState((current) => ({ ...current, loading: false, error: failure instanceof Error ? failure.message : 'Payment status could not be loaded.' }));
      }
    }
  }, [companyId]);

  useEffect(() => {
    void reload();
    const refreshVisible = () => {
      if (document.visibilityState === 'visible') void reload();
    };
    const timer = window.setInterval(refreshVisible, 15_000);
    window.addEventListener('focus', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
    return () => {
      sequence.current += 1;
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshVisible);
      document.removeEventListener('visibilitychange', refreshVisible);
    };
  }, [reload, authorizationRevision]);

  const acceptSnapshot = useCallback((snapshot: OwnerPaymentRequestSnapshot) => {
    if (activeCompany.current !== companyId) return;
    sequence.current += 1;
    setState({ companyId, snapshot, loading: false, error: '' });
  }, [companyId]);

  const current = state.companyId === companyId ? state : { snapshot: null, loading: Boolean(companyId), error: '' };
  return { ...current, reload, acceptSnapshot };
}
