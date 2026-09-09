import type { OwnerPaymentRequestSnapshot, PaymentRequestWorkspace } from '../api/paymentRequests';
import { getPaymentRequestCopy, paymentRequestLocale, type PaymentRequestMessage } from './paymentRequestTranslations';

export const PAYMENT_REQUEST_OVERDUE = 'PAYMENT_REQUEST_OVERDUE';

export function paymentRequestProtectionMessage(language: string | boolean) {
  return getPaymentRequestCopy(language).t('protection');
}

export function isCollectionBlocked(snapshot: OwnerPaymentRequestSnapshot | null, lockReason?: string) {
  return snapshot?.collection_blocked === true || lockReason === PAYMENT_REQUEST_OVERDUE;
}

export function canSubmitPaymentRequest(
  workspace: PaymentRequestWorkspace | null,
  action: 'request' | 'extend',
  reason: string,
) {
  if (!workspace || !reason.trim()) return false;
  if (action === 'extend') return workspace.request?.status === 'OPEN' && workspace.request.protected_indefinitely !== true;
  return workspace.request?.status !== 'OPEN' && workspace.eligible && Boolean(workspace.quote?.token);
}

export function paymentRequestDate(value: string | null | undefined, language: string | boolean) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(paymentRequestLocale(language), { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
const deliveryKeys: Record<string, PaymentRequestMessage> = {
  PENDING: 'scheduled', PROCESSING: 'sending', SENT: 'sent', DELIVERED: 'delivered', FAILED: 'failedRetry',
  CANCELED: 'canceled', CANCELLED: 'canceled', SKIPPED: 'skipped', DISABLED: 'deliveryDisabled',
};
export function paymentDeliveryStatus(status: string, language: string | boolean) {
  return getPaymentRequestCopy(language).t(deliveryKeys[status] ?? 'statusUnavailable');
}
const blockerKeys = ["COLLECTION_NOT_ENABLED", "COMPANY_NOT_ELIGIBLE", "BILLING_OWNER_REQUIRED", "INDEPENDENT_ACCOUNT_HOLD", "REQUEST_ALREADY_OPEN", "STRIPE_NOT_CONFIGURED", "STRIPE_ACCOUNT_NOT_READY", "STRIPE_CATALOG_MAINTENANCE", "STRIPE_VERIFICATION_UNAVAILABLE", "MULTIPLE_STRIPE_SUBSCRIPTIONS", "PAID_PERIOD_EXTENDS_BEYOND_PAYMENT_WINDOW", "TRIAL_EXTENDS_BEYOND_PAYMENT_WINDOW", "TOO_MANY_OPEN_INVOICES", "INVOICE_NOT_PAYABLE", "NO_PAYABLE_INVOICE", "MIXED_INVOICE_CURRENCIES", "ACTIVE_INDEFINITE_BENEFIT", "SELECTION_REQUIRED", "ACTIVATION_ALREADY_IN_PROGRESS", "TRIAL_EXTENSION_IN_PROGRESS", "PROTECTED_PERIOD_EXTENDS_BEYOND_PAYMENT_WINDOW", "SUBSCRIPTION_REFERENCE_INVALID", "CATALOG_NOT_PAYABLE", "PROMOTION_NOT_PAYABLE"] as const;
export function paymentRequestBlocker(blocker: string, language: string | boolean) {
  const key = blockerKeys.find((key) => key === blocker);
  return getPaymentRequestCopy(language).t(key ?? 'reviewRequired');
}
export function paymentRequestFailure(failure: unknown, language: string | boolean, fallback: PaymentRequestMessage) {
  const details = failure && typeof failure === 'object' ? failure as { status?: number; code?: string } : {};
  if (details.status === 409) return getPaymentRequestCopy(language).t('requestConflict');
  const key = blockerKeys.find((key) => key === details.code);
  return getPaymentRequestCopy(language).t(key ?? fallback);
}
