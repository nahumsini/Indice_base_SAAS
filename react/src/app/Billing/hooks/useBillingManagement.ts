import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { billingApi, type BillingSelectionPayload } from '../../api/billing';
import type { BillingCopy } from '../translations';
import type { BillingDraft, BillingManagementState } from '../types';

const emptyDraft: BillingDraft = {
  productCodes: [],
  extraSeats: 0,
  billingInterval: 'MONTH',
};

const mutationKey = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `billing-selection-${crypto.randomUUID()}`
    : `billing-selection-${Date.now()}-${Math.random().toString(16).slice(2)}`
);

export function useBillingManagement(copy: BillingCopy) {
  const navigate = useNavigate();
  const [state, setState] = useState<BillingManagementState>({
    subscription: null,
    selection: null,
    preview: null,
    invoices: [],
    draft: emptyDraft,
    loading: true,
    action: '',
    error: '',
    success: '',
  });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '', success: '' }));
    try {
      const [subscription, selection, invoiceHistory] = await Promise.all([
        billingApi.subscriptionOptional(),
        billingApi.selection(),
        billingApi.invoices(),
      ]);
      const draft = toDraft(selection);
      setState((current) => ({
        ...current,
        subscription,
        selection,
        preview: selection,
        invoices: invoiceHistory.invoices,
        draft,
        loading: false,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : copy.loading,
      }));
    }
  }, [copy.loading]);

  useEffect(() => {
    void load();
  }, [load]);

  const payload = useMemo<BillingSelectionPayload>(() => ({
    product_codes: state.draft.productCodes,
    extra_seats: state.draft.extraSeats,
    billing_interval: state.draft.billingInterval,
  }), [state.draft]);

  useEffect(() => {
    if (state.loading || !state.selection || !payload.product_codes.length) return;
    const timeout = window.setTimeout(async () => {
      try {
        const preview = await billingApi.previewSelection(payload);
        setState((current) => ({ ...current, preview, error: '' }));
      } catch (error) {
        setState((current) => ({
          ...current,
          preview: null,
          error: error instanceof Error ? error.message : copy.emptySelection,
        }));
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [copy.emptySelection, payload, state.loading, state.selection]);

  const updateDraft = (patch: Partial<BillingDraft>) => {
    setState((current) => ({
      ...current,
      draft: { ...current.draft, ...patch },
      success: '',
      error: '',
    }));
  };

  const toggleProduct = (code: string) => {
    updateDraft({
      productCodes: state.draft.productCodes.includes(code)
        ? state.draft.productCodes.filter((item) => item !== code)
        : [...state.draft.productCodes, code],
    });
  };

  const reset = () => {
    if (!state.selection) return;
    setState((current) => ({
      ...current,
      draft: toDraft(state.selection!),
      preview: state.selection,
      error: '',
      success: '',
    }));
  };

  const save = async () => {
    if (!payload.product_codes.length) {
      setState((current) => ({ ...current, error: copy.emptySelection }));
      return;
    }
    setState((current) => ({ ...current, action: 'save', error: '', success: '' }));
    try {
      const selection = await billingApi.updateSelection(payload, mutationKey());
      const subscription = await billingApi.subscriptionOptional();
      setState((current) => ({
        ...current,
        subscription,
        selection,
        preview: selection,
        draft: toDraft(selection),
        action: '',
        success: copy.saved,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        action: '',
        error: error instanceof Error ? error.message : copy.emptySelection,
      }));
    }
  };

  const subscriptionAction = async (name: 'portal' | 'cancel' | 'resume') => {
    setState((current) => ({ ...current, action: name, error: '', success: '' }));
    try {
      if (name === 'portal') {
        const response = await billingApi.openPortal();
        window.location.assign(response.url);
        return;
      }
      const subscription = name === 'cancel'
        ? await billingApi.cancelSubscription()
        : await billingApi.resumeSubscription();
      setState((current) => ({ ...current, subscription, action: '' }));
    } catch (error) {
      setState((current) => ({
        ...current,
        action: '',
        error: error instanceof Error ? error.message : copy.loading,
      }));
    }
  };

  const activate = async () => {
    if (!payload.product_codes.length) {
      setState((current) => ({ ...current, error: copy.emptySelection }));
      return;
    }
    setState((current) => ({ ...current, action: 'activate', error: '', success: '' }));
    try {
      const response = await billingApi.activate(payload, mutationKey());
      window.location.assign(response.checkout_url);
    } catch (error) {
      setState((current) => ({
        ...current,
        action: '',
        error: error instanceof Error ? error.message : copy.activationFailed,
      }));
    }
  };

  const hasChanges = Boolean(state.selection) && (
    state.draft.extraSeats !== state.selection?.extra_seats
    || state.draft.billingInterval !== state.selection?.billing_interval
    || [...state.draft.productCodes].sort().join('|')
      !== [...(state.selection?.selected_product_codes ?? [])].sort().join('|')
  );

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/dashboard');
  };

  return {
    ...state,
    hasChanges,
    load,
    goBack,
    reset,
    save,
    activate,
    subscriptionAction,
    toggleProduct,
    updateDraft,
  };
}

function toDraft(selection: NonNullable<BillingManagementState['selection']>): BillingDraft {
  return {
    productCodes: selection.selected_product_codes,
    extraSeats: selection.extra_seats,
    billingInterval: selection.billing_interval,
  };
}
