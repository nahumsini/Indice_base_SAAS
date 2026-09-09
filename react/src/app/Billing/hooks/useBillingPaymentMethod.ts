import { useEffect, useState } from 'react';
import { billingApi } from '../../api/billing';
import { ApiClientError } from '../../lib/apiClient';
import type { BillingPaymentMethodState } from '../types';

/** Card lookup failure must not block plan, invoice or activation workflows. */
export function useBillingPaymentMethod(enabled: boolean, readOnly: boolean): BillingPaymentMethodState {
  const [state, setState] = useState<BillingPaymentMethodState>({ loading: false, ownerOnly: false, summary: null });
  useEffect(() => {
    let cancelled = false;
    setState({ loading: enabled && !readOnly, ownerOnly: readOnly, summary: null });
    if (!enabled || readOnly) return;
    void billingApi.paymentMethod()
      .then((summary) => { if (!cancelled) setState({ loading: false, ownerOnly: false, summary }); })
      .catch((error) => {
        if (!cancelled) setState({ loading: false, ownerOnly: error instanceof ApiClientError && error.status === 403, summary: null });
      });
    return () => { cancelled = true; };
  }, [enabled, readOnly]);
  // Never expose a previous owner's metadata during a delegated or loading render.
  if (readOnly) return { loading: false, ownerOnly: true, summary: null };
  if (!enabled) return { loading: false, ownerOnly: false, summary: null };
  return state;
}
