import { apiClient } from '../lib/apiClient';
import { endpoints } from './endpoints';

export type BillingSignupProduct = {
  id: number;
  code: string;
  displayName: string;
};

export type BillingSignupPrice = {
  billableCode: string;
  priceType: 'BASE' | 'ADDON';
  billingInterval: 'MONTH' | 'YEAR';
  currency: string;
  unitAmountCents: number | null;
  includedQuantity: number;
  status: string;
};

export type BillingSignupConfig = {
  csrfToken: string;
  checkoutEnabled: boolean;
  provisioningEnabled: boolean;
  trialDays: number;
  cardRequired: boolean;
  automaticCharge: boolean;
  includedSeats: number;
  currency: string;
  launchCountries: string[];
  products: BillingSignupProduct[];
  prices: BillingSignupPrice[];
};

export type BillingSignupRequest = {
  fullName: string;
  email: string;
  password: string;
  companyName: string;
  countryCode: string;
  phone: string;
  industry: string;
  companySize: string;
  billingInterval: 'MONTH' | 'YEAR';
  extraSeats: number;
  selectedProductCodes: string[];
};

export type BillingSignupCheckout = {
  signupReference: string;
  status: string;
  checkoutSessionId: string;
  checkoutUrl: string;
  expiresAt: string;
  replayed: boolean;
  provisioned: boolean;
};

export type BillingSignupStatus = {
  checkoutStatus: string;
  provisioningStatus: string;
  provisioned: boolean;
  loginReady: boolean;
  requiresReview: boolean;
  message: string;
};

export const billingSignupApi = {
  config: () => apiClient<BillingSignupConfig>(endpoints.billingSignup.config),

  checkout: (request: BillingSignupRequest, idempotencyKey: string) => (
    apiClient<BillingSignupCheckout>(endpoints.billingSignup.checkout, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(request),
    })
  ),

  status: (reference: string) => apiClient<BillingSignupStatus>(
    `${endpoints.billingSignup.status}?reference=${encodeURIComponent(reference)}`,
  ),
};
