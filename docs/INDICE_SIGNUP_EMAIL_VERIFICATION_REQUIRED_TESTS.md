# Indice Signup Email Verification Required Tests

This checklist is required before enabling payment collection for public signup.

## Backend

- Signup config returns `emailVerificationRequired=true`.
- Starting verification requires full name, company name, email, and matching confirm email.
- Starting verification rejects malformed emails and emails already present in `users`.
- Verification email sends a 6 digit OTP and stores only the hash in `billing_signup_email_verifications`.
- Resend respects cooldown and does not send a second email during the cooldown window.
- Send abuse is limited to 5 verification emails per email address per 30 minute window.
- Five wrong OTP attempts lock the verification reference.
- Expired OTPs cannot verify and move the row to `EXPIRED`.
- `requireVerified` rejects missing, unverified, mismatched, locked, and expired references.
- Public Stripe checkout and public courtesy signup require a verified email reference for the same email.
- Platform-admin trusted courtesy provisioning still works without using the public email challenge.
- Successful paid or courtesy provisioning sends the welcome email and never includes a password.

## Frontend

- Account step shows email and confirm email fields and blocks mismatched values.
- First continue action sends the verification code instead of opening payment.
- OTP screen verifies the code, stores the verified reference, and advances to billing.
- Direct navigation to billing is blocked until the email is verified.
- Resend button shows cooldown state and calls the resend endpoint only after cooldown.
- Payment submission includes `emailVerificationReference`.
- Error banners render backend validation, rate limit, expired, and locked verification responses.

## Commands

```bash
./mvnw -q -Dtest=BillingSignupEmailVerificationServiceIntegrationTest,BillingSignupServiceTest,CourtesySignupIntegrationTest,BillingTenantProvisioningIntegrationTest,StripePhaseTwoIntegrationTest test
npm --prefix react run typecheck
npm --prefix react run test:billing-flow
```
