import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { billingApi, type BillingSelectionPayload } from '../../api/billing';
import { managedCompanyApi } from '../../api/managedCompanies';
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
    managedContext: null,
    draft: emptyDraft,
    loading: true,
    action: '',
    error: '',
    success: '',
  });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '', success: '' }));
    try {
      const [subscription, selection, invoiceHistory, managedContext] = await Promise.all([
        billingApi.subscriptionOptional(),
        billingApi.selection(),
        billingApi.invoices(),
        managedCompanyApi.context(),
      ]);
      const draft = toDraft(selection);
      setState((current) => ({
        ...current,
        subscription,
        selection,
        preview: selection,
        invoices: invoiceHistory.invoices,
        managedContext,
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
  const readOnly = Boolean(state.managedContext?.active && state.managedContext.read_only);
  const readOnlyMessage = state.managedContext?.active_company
    ? copy.delegatedReadOnly(state.managedContext.active_company.name)
    : '';

  useEffect(() => {
    if (state.loading || readOnly || !state.selection || !payload.product_codes.length) return;
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
  }, [copy.emptySelection, payload, readOnly, state.loading, state.selection]);

  const updateDraft = (patch: Partial<BillingDraft>) => {
    if (readOnly) return;
    setState((current) => ({
      ...current,
      draft: { ...current.draft, ...patch },
      success: '',
      error: '',
    }));
  };

  const toggleProduct = (code: string) => {
    if (readOnly) return;
    updateDraft({
      productCodes: state.draft.productCodes.includes(code)
        ? state.draft.productCodes.filter((item) => item !== code)
        : [...state.draft.productCodes, code],
    });
  };

  const reset = () => {
    if (readOnly) return;
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
    if (readOnly) {
      setState((current) => ({ ...current, error: readOnlyMessage }));
      return;
    }
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
    if (readOnly) {
      setState((current) => ({ ...current, error: readOnlyMessage }));
      return;
    }
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
    if (readOnly) {
      setState((current) => ({ ...current, error: readOnlyMessage }));
      return;
    }
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

  const goBack = async () => {
    if (!state.managedContext?.active) {
      if (window.history.length > 1) navigate(-1);
      else navigate('/dashboard');
      return;
    }

    const destination = state.managedContext.authority_mode === 'PLATFORM_ROOT'
      ? '/platform-admin'
      : state.managedContext.authority_mode === 'DISTRIBUTOR_PORTFOLIO'
        ? '/distributor-portal'
        : '/dashboard';

    setState((current) => ({ ...current, action: 'back', error: '', success: '' }));
    try {
      await managedCompanyApi.clear();
      navigate(destination, { replace: true });
    } catch (error) {
      setState((current) => ({
        ...current,
        action: '',
        error: error instanceof Error ? error.message : copy.loading,
      }));
    }
  };

  return {
    ...state,
    readOnly,
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
