import type { BillingSelectionResponse, BillingSubscriptionResponse } from '../api/billing';

export type BillingPrimaryAction = 'ACTIVATE' | 'RETRY_SYNC' | 'SCHEDULE' | 'NONE';

export type BillingPresentation = {
  currentModuleCount: number;
  targetModuleCount: number;
  cutoffAt: string | null;
  pendingSelection: boolean;
  primaryAction: BillingPrimaryAction;
};

export function toBillingPresentation(
  selection: BillingSelectionResponse,
  subscription: BillingSubscriptionResponse | null,
  hasChanges = false,
): BillingPresentation {
  const pendingSelection = ['DRAFT', 'PENDING_STRIPE', 'SCHEDULED'].includes(selection.selection_state);
  const currentModuleCount = selection.current_product_codes.length > 0
    ? selection.current_product_codes.length
    : selection.selection_state === 'CURRENT'
      ? selection.selected_product_codes.length
      : 0;

  let primaryAction: BillingPrimaryAction = 'NONE';
  if (selection.payment_method_required) primaryAction = 'ACTIVATE';
  else if (selection.selection_state === 'PENDING_STRIPE') primaryAction = 'RETRY_SYNC';
  else if (hasChanges) primaryAction = 'SCHEDULE';

  return {
    currentModuleCount,
    targetModuleCount: selection.selected_product_codes.length,
    cutoffAt: selection.effective_at || subscription?.current_period_end_at || selection.trial_ends_at || null,
    pendingSelection,
    primaryAction,
  };
}
