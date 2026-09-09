import type { BillingPaymentMethodState } from './types';
import { paymentMethodCopies, type PaymentMethodCopy } from './translations/paymentMethod';

export function paymentMethodPresentation(state: BillingPaymentMethodState, copy: PaymentMethodCopy) {
  const summary = state.summary;
  const status = summary?.status;
  const label = state.loading ? copy.loading : state.ownerOnly ? copy.ownerOnly
    : status === 'SAVED' ? copy.saved : status === 'EXPIRED' ? copy.expired
      : status === 'NO_CARD' ? copy.missing : copy.unavailable;
  const description = state.ownerOnly ? copy.ownerDescription : state.loading ? copy.loading
    : status === 'SAVED' ? copy.savedDescription : status === 'EXPIRED' ? copy.expiredDescription
      : status === 'NO_CARD' ? copy.missingDescription : copy.unavailableDescription;
  const tone = !state.loading && !state.ownerOnly && status === 'SAVED' ? 'saved'
    : !state.loading && !state.ownerOnly && ['NO_CARD', 'EXPIRED'].includes(status ?? '') ? 'attention' : 'neutral';
  const showMetadata = !state.loading && !state.ownerOnly && (status === 'SAVED' || status === 'EXPIRED');
  const brands: Record<string, string> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', discover: 'Discover', diners: 'Diners Club', jcb: 'JCB', unionpay: 'UnionPay' };
  const brand = summary?.brand && Object.prototype.hasOwnProperty.call(brands, summary.brand) ? brands[summary.brand] : copy.card;
  const card = showMetadata && /^\d{4}$/.test(summary?.last4 ?? '') ? `${brand} •••• ${summary!.last4}` : null;
  return { label, description, tone, card, checkedAt: !state.ownerOnly && !state.loading ? summary?.checked_at ?? null : null };
}

export function formatPaymentMethodCheckedAt(value: string | null, languageCode: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const locale = Object.prototype.hasOwnProperty.call(paymentMethodCopies, languageCode) ? languageCode : 'en-CA';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
