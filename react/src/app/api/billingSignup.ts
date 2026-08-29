import { apiClient } from '../lib/apiClient';
import { endpoints } from './endpoints';

export type BillingSignupProduct = {
  id: number;
  code: string;
  displayName: string;
  productType: 'BASIC' | 'ADDON' | string;
  commercialKind?: 'MODULE' | 'PACKAGE' | string;
  unitAmountCents: number | null;
  externalPriceId?: string | null;
  description?: string | null;
  includedProductCodes?: string[];
  capabilities?: string[];
};

export type BillingSignupPrice = {
  billableCode: string;
  priceType: 'BASE' | 'ADDON' | 'PRODUCT' | 'PACKAGE' | 'SEAT' | string;
  billingInterval: 'MONTH' | 'YEAR';
  currency: string;
  unitAmountCents: number | null;
  includedQuantity: number;
  status: string;
};

export type BillingSignupConfig = {
  csrfToken: string;
  checkoutEnabled: boolean;
  courtesyEnabled: boolean;
  provisioningEnabled: boolean;
  emailVerificationRequired: boolean;
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
  confirmEmail: string;
  password: string;
  companyName: string;
  countryCode: string;
  phone: string;
  industry: string;
  companySize: string;
  billingInterval: 'MONTH' | 'YEAR';
  extraSeats: number;
  selectedProductCodes: string[];
  courtesyCode: string;
  emailVerificationReference: string;
};

export type BillingSignupEmailVerificationStartRequest = {
  fullName: string;
  email: string;
  confirmEmail: string;
  companyName: string;
};

export type BillingSignupEmailVerificationResponse = {
  started: boolean;
  verified: boolean;
  blocked: boolean;
  verificationReference: string;
  maskedEmail: string;
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
  verifiedExpiresAt: string | null;
  message: string;
};

export type BillingSignupCheckout = {
  signupReference: string;
  status: string;
  checkoutSessionId: string | null;
  checkoutUrl: string | null;
  expiresAt: string | null;
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

  startEmailVerification: (request: BillingSignupEmailVerificationStartRequest) => (
    apiClient<BillingSignupEmailVerificationResponse>(endpoints.billingSignup.emailVerificationStart, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  ),

  resendEmailVerification: (verificationReference: string) => (
    apiClient<BillingSignupEmailVerificationResponse>(endpoints.billingSignup.emailVerificationResend, {
      method: 'POST',
      body: JSON.stringify({ verificationReference }),
    })
  ),

  verifyEmail: (verificationReference: string, otpCode: string) => (
    apiClient<BillingSignupEmailVerificationResponse>(endpoints.billingSignup.emailVerificationVerify, {
      method: 'POST',
      body: JSON.stringify({ verificationReference, otpCode }),
    })
  ),

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
