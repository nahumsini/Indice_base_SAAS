import { apiClient } from '../lib/apiClient';
import type { BillingSignupEmailVerificationResponse } from './billingSignup';

const base = '/api/v1/billing/signup/trial-entry';
export type TrialEntryConfig = {
  enabled: boolean; trialDays: number; includedSeats: number; cardRequired: boolean;
  paidActivationReady: boolean; countries: string[];
};
export type TrialInterest = {
  fullName: string; companyName: string; email: string; confirmEmail: string; phone: string;
  countryCode: string; challenge: string; planInterest: string; contactConsent: boolean;
  utmSource: string; utmMedium: string; utmCampaign: string;
};
export type TrialEntryResult = {
  provisioned: boolean; requiresReview: boolean; replayed: boolean;
  trialStartsAt: string | null; trialEndsAt: string | null; loginPath: string;
};
const post = <T>(path: string, body: unknown, headers?: HeadersInit) => apiClient<T>(`${base}${path}`, {
  method: 'POST', headers, body: JSON.stringify(body),
});
export const publicTrialEntryApi = {
  config: () => apiClient<TrialEntryConfig>(`${base}/config`),
  interest: (input: TrialInterest, key: string) => post<{ entryReference: string; expiresAt: string }>(
    '/interest', input, { 'Idempotency-Key': key },
  ),
  startVerification: (entryReference: string) => post<BillingSignupEmailVerificationResponse>(
    '/email-verification/start', { entryReference },
  ),
  verify: (entryReference: string, verificationReference: string, otpCode: string) => post<BillingSignupEmailVerificationResponse>(
    '/email-verification/verify', { entryReference, verificationReference, otpCode },
  ),
  resend: (entryReference: string, verificationReference: string) => post<BillingSignupEmailVerificationResponse>(
    '/email-verification/resend', { entryReference, verificationReference },
  ),
  activate: (entryReference: string, emailVerificationReference: string, password: string, acceptedTrialTerms: boolean) => (
    post<TrialEntryResult>('/account', { entryReference, emailVerificationReference, password, acceptedTrialTerms })
  ),
};
