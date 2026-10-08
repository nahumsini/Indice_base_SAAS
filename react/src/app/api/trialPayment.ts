import { apiClient } from '../lib/apiClient';

export type RegionalQuote = {
  productCode: string; displayName: string; billingInterval: 'MONTH' | 'YEAR'; currency: string;
  amountBeforeTaxCents: number; includedSeats: number; quoteHash: string; termsVersion: string;
  chargeTiming: 'AFTER_TRIAL' | 'IMMEDIATE'; originalTrialEndsAt: string; capabilities: string[];
};
export type TrialPaymentWorkspaceData = {
  cohort: boolean; converted: boolean; paymentReady: boolean; countryCode: string | null;
  trialEndsAt: string | null; setupStatus: string | null; checkoutUrl: string | null; offers: RegionalQuote[];
};
export const trialPaymentApi = {
  workspace(interval: 'MONTH' | 'YEAR' = 'MONTH') {
    return apiClient<TrialPaymentWorkspaceData>(`/api/v1/billing/subscription/trial-payment?interval=${interval}`);
  },
  activate(quote: RegionalQuote, acceptedAutomaticPayment: boolean, key: string) {
    return apiClient<{ status: string; checkoutUrl: string; expiresAt: string; replayed: boolean }>(
      '/api/v1/billing/subscription/trial-payment', {
        method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify({
          productCode: quote.productCode, billingInterval: quote.billingInterval, quoteHash: quote.quoteHash,
          termsVersion: quote.termsVersion, acceptedAutomaticPayment,
        }),
      });
  },
};

export const trialPaymentKey = () => Array.from(crypto.getRandomValues(new Uint8Array(32)),
  byte => byte.toString(16).padStart(2, '0')).join('');

export function hostedPaymentUrl(value: string, portal = false) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password
    || (url.port && url.port !== '443')
    || url.hostname !== (portal ? 'billing.stripe.com' : 'checkout.stripe.com')) {
    throw new Error('Invalid hosted payment URL');
  }
  return url.href;
}
