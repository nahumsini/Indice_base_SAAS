# Indice Stripe Full Flow - September 2026

Status: production operating document. This explains how Stripe is intended to work with
Indice after the September 2026 billing work. It does not approve a production launch by
itself; production still requires the verification gates listed below.

Related authority:

- `docs/INDICE_PREMIUM_MULTITENANT_BILLING_ARCHITECTURE.md`
- `docs/INDICE_STRIPE_LIVE_GO_LIVE_RUNBOOK.md`
- `docs/INDICE_PAYMENT_COLLECTION_RUNBOOK.md`
- `docs/INDICE_SAVED_CARD_FLOW_VERIFICATION_2026-09-08.md`
- `deployment/README.md`

## 1. Plain-English Model

Stripe is the payment processor. Indice is the commercial source of truth.

Stripe owns:

- hosted Checkout pages;
- hosted Customer Portal pages;
- card collection and saved payment methods;
- automatic recurring invoices and card charges;
- bank authentication such as 3D Secure when required;
- official payment, refund, dispute and invoice state.

Indice owns:

- which products, modules, packages, users and storage the customer is buying;
- the catalog version and exact price that was accepted by the customer;
- tenant provisioning, users, module entitlements and access mode;
- platform-admin payment requests for old customers that must be converted to Stripe;
- webhook verification, idempotent processing, audit history and customer-facing state.

The practical rule is:

> The customer pays in Stripe, but Indice decides what they bought and when access changes.

## 2. What "Connect Stripe" Means Here

For the current Indice use case, "connect Stripe" means connecting the Indice production
Stripe account to the backend with:

- one restricted LIVE API key stored only on the server;
- one LIVE webhook signing secret stored only on the server;
- one active LIVE webhook destination pointing to the Indice webhook endpoint;
- Customer Portal enabled in the same Stripe mode/account;
- Stripe Tax and business identity configured in Stripe.

This is not Stripe Connect marketplace onboarding. Do not create connected accounts unless
Indice later decides to become a marketplace/platform that processes payments on behalf of
other businesses.

## 3. Production Environment Required

Use protected file-backed secrets on the production server. Keep the direct value variables
empty when file-backed secrets are used.

```dotenv
APP_BILLING_STRIPE_ENABLED=true
APP_BILLING_STRIPE_MODE=live
APP_BILLING_STRIPE_SECRET_KEY=
APP_BILLING_STRIPE_SECRET_KEY_FILE=/root/indice-production/secrets/stripe-live-key
APP_BILLING_STRIPE_WEBHOOK_SECRET=
APP_BILLING_STRIPE_WEBHOOK_SECRET_FILE=/root/indice-production/secrets/stripe-live-webhook
APP_BILLING_STRIPE_SUCCESS_URL=https://app.indiceapp.com/signup/complete?session_id={CHECKOUT_SESSION_ID}
APP_BILLING_STRIPE_CANCEL_URL=https://app.indiceapp.com/signup
APP_BILLING_STRIPE_PORTAL_RETURN_URL=https://app.indiceapp.com/home-panel/billing
APP_BILLING_STRIPE_AUTOMATIC_TAX_ENABLED=true
APP_BILLING_STRIPE_TAX_ID_COLLECTION_ENABLED=true
APP_BILLING_STRIPE_PROCESSOR_ENABLED=true
APP_BILLING_PROVISIONING_ENABLED=true
APP_ENTITLEMENTS_ENFORCEMENT_ENABLED=true
APP_BILLING_LIFECYCLE_ENABLED=true
APP_BILLING_LIFECYCLE_SCHEDULER_ENABLED=true
APP_BILLING_LIFECYCLE_GRACE_DAYS=14
APP_BILLING_LIFECYCLE_READ_ONLY_DAYS=14
APP_BILLING_LIFECYCLE_RETENTION_DAYS=90
APP_BILLING_COLLECTION_ENABLED=true
APP_BILLING_COLLECTION_REMINDERS_ENABLED=true
APP_BILLING_COLLECTION_EMAIL_ENABLED=true
APP_BILLING_COLLECTION_RECONCILIATION_ENABLED=true
APP_BILLING_COLLECTION_REMINDER_DELAY_MS=60000
APP_BILLING_COLLECTION_RECONCILIATION_DELAY_MS=60000
APP_WEB_PUBLIC_URL=https://app.indiceapp.com
APP_EMAIL_ENABLED=true
APP_EMAIL_PROVIDER=sendgrid
APP_EMAIL_FROM=contacto@indiceapp.com
APP_EMAIL_FROM_NAME=Indice
```

The restricted Stripe key must have the permissions needed by the backend for the enabled
features. Validate these permissions in Stripe before production:

- Customers: read and write;
- Checkout Sessions: read and write;
- Subscriptions and Subscription Items: read and write;
- Customer Portal Sessions: write;
- Products and Prices: read and write for catalog publication;
- Payment Methods: read, for saved-card summary;
- Invoices and invoice lines: read, for payment-request verification;
- Charges: read, for refunds and disputes that arrive by charge ID;
- Tax settings and tax registrations: read, for readiness/audit checks;
- Promotion Codes and Coupons: read, if promotions are published.

No publishable key is required for the current hosted Checkout/Portal flow, because the
frontend does not mount Stripe Elements or collect card details directly.

## 4. Stripe Dashboard Setup Required

The Stripe dashboard must be configured in LIVE mode, not only test/sandbox mode.

Required Stripe setup:

- account fully activated for charges and payouts;
- public business name, branding and domain showing Indice;
- Stripe Tax enabled only for accountant-approved jurisdictions;
- Customer Portal configured for customers to update payment methods and view invoices;
- Customer Portal return URL points back to the Indice billing page;
- webhook destination is active and points exactly to:
  `https://app.indiceapp.com/api/v1/billing/stripe/webhook`;
- webhook scope is "Your account";
- payload style is "Snapshot";
- API version matches the deployed backend expectation.

The current webhook event set should include:

- `checkout.session.completed`
- `checkout.session.expired`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.paused`
- `customer.subscription.resumed`
- `invoice.finalized`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_succeeded`
- `invoice.voided`
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.updated`
- `charge.dispute.closed`
- `refund.updated`

An active webhook in Stripe is not enough proof. Production proof requires a signed event
to be received, stored, processed as `PROCESSED`, and reflected in the correct company,
subscription, invoice and access state.

## 5. Catalog And Price Flow

The practical solution is: manage all customer-facing products and prices from Indice
Platform Administration, not manually in Stripe.

Root flow:

1. Open Platform administration.
2. Go to Catalog and modules.
3. Open Commercial offer.
4. Configure product/module/package/user/storage amounts.
5. Save prices into the draft.
6. Validate the offer.
7. When production gates are open, use Sync and publish offer.
8. Indice creates or reuses the matching Stripe Products and Prices.
9. Indice stores the verified Stripe Price IDs in the catalog version.
10. The published catalog becomes the active offer for new customers.

Stripe Prices are immutable. If Root changes an amount later, Indice must create a new
Stripe Price for that new amount. Existing customers keep the old Stripe Price they already
accepted. Publishing a new catalog does not automatically reprice existing subscriptions.

This is the key rule for the concern "whatever price we set here should be charged and
users who already paid should not be affected":

> New customers use the active published catalog. Existing customers keep their agreed
> catalog version and Stripe Price until they explicitly accept a future change.

Do not manually create product/price IDs in the production environment as the normal
operating process. The long-term source of truth is the Indice catalog database.

## 6. New Customer Signup Flow

New customer flow:

1. Customer opens signup.
2. Customer selects modules/package, billing interval, users and add-ons.
3. Indice calculates the amount from the active published catalog.
4. Indice creates a Stripe Checkout Session in subscription mode.
5. Customer enters card details only on Stripe's hosted page.
6. Stripe creates the customer, saves the payment method and creates the subscription.
7. Stripe redirects the customer to Indice after Checkout.
8. Stripe sends webhook events to Indice.
9. Indice verifies the webhook signature and stores the event.
10. The processor projects the subscription, invoice, products and lifecycle state.
11. Indice provisions the tenant, owner, users, modules and trial/access state.

Current launch behavior uses a 15-day trial for signup. During that trial, Checkout still
collects the card so Stripe can charge automatically when the trial ends. Older architecture
notes mention 30 days; the September 2026 launch/runbook path is 15 days, with separate
admin-controlled extension rules.

If there is no trial, or if a payment is due immediately, access must depend on a paid
invoice. A browser redirect alone is not payment proof.

## 7. Recurring Monthly Or Annual Deduction

The recurring deduction is handled by Stripe Billing.

Monthly subscription:

- Stripe uses the subscription billing cycle anchor.
- A new invoice is created for the next monthly period.
- Stripe attempts to charge the saved default payment method.
- If the invoice is paid, Indice keeps or restores full access.
- If payment fails, Indice moves the company into payment recovery according to lifecycle rules.

Annual subscription:

- The same process runs once per annual billing interval.
- The annual price is the Stripe Price accepted by the customer for that catalog version.

The subscription does not "end every 30 days." It renews on its billing schedule. For a
monthly plan, the next invoice usually follows the monthly billing anchor set by Stripe,
which may be based on the checkout date or trial-end date. For a trial, Stripe charges at
trial end and that becomes the next billing cycle anchor unless configured differently.

## 8. Saved Card And Card Update Flow

Indice should never store full card numbers or CVV.

Card flow:

1. New customers add a card during Stripe Checkout.
2. Existing customers update cards in Stripe Customer Portal.
3. Indice can ask Stripe for a masked payment-method summary.
4. Indice may show only safe fields such as card brand and last four digits.
5. Indice treats `SAVED` as "Stripe has a default card that is not expired."
6. Indice does not treat `SAVED` as proof that the next charge will succeed.

The saved-card summary states are:

- `SAVED`: Stripe returned a default non-expired card.
- `NO_CARD`: no default payment method exists.
- `EXPIRED`: a default card exists but its expiration month has passed.
- `UNAVAILABLE`: Stripe/config/permission/association is uncertain, so Indice must not guess.

If a subscriber has no card or an expired card, they should go to the Customer Portal. Indice
must not create a second subscription just to replace a card.

## 9. Existing Customer Payment Request Flow

This flow is for customers already in the system who need to be pushed into payment or
converted to Stripe.

Root flow:

1. Root opens Platform administration.
2. Root opens Customers.
3. Root clicks the credit-card payment-request action on the customer row.
4. Indice loads the payable amount, owner, billing interval, tax estimate and blockers.
5. Root reviews the amount and owner.
6. Root enters an operational reason.
7. Root sends the payment request.
8. The company gets seven days to pay.
9. The owner receives daily reminders for seven days.
10. If unpaid at the deadline, the company becomes payment-only.
11. The owner can log in only far enough to pay or manage billing.
12. Operational modules and APIs are blocked until payment is verified.
13. Root can extend the request by seven days with another reason.
14. When the exact obligation is paid through Stripe, Indice clears the hold.

Important limits:

- Starting a payment request does not immediately charge a saved card.
- Adding a card does not settle a debt.
- A zero-value trial invoice does not settle a debt.
- An unrelated invoice payment does not settle a debt.
- A manually marked off-Stripe invoice does not settle a debt.
- Existing paid/trial protection is honored before a request can restrict access.
- Existing customers keep contracted prices.

## 10. Customer Portal Flow

The Customer Portal is for billing self-service only.

Allowed customer actions should include:

- update payment method;
- view invoices;
- open hosted invoice/payment pages when needed;
- cancel or manage renewal only if Indice intentionally permits that feature.

Product composition, modules, users and storage quantities should remain controlled by Indice.
The portal should not allow a customer to switch products in a way that bypasses Indice
catalog/version rules.

## 11. Product, Seat And Storage Changes

Changes made after a subscription already exists must preserve the paid period.

Target behavior:

- The active paid access stays unchanged during the current paid period.
- A requested product/seat/storage change is scheduled for the next billing cut.
- Stripe subscription items can be updated with no immediate proration when that is the
  approved business rule.
- Indice applies the new entitlements only after Stripe confirms a paid invoice for the
  correct subscription and period.
- If a later catalog version changes prices, the existing subscriber still uses the
  historical price version unless they accept a new change.

This prevents accidental mid-cycle charges and prevents customers from receiving unpaid
modules.

## 12. Webhook Processing Flow

Webhook flow:

1. Stripe sends an event to the production webhook endpoint.
2. Indice verifies `Stripe-Signature` against the raw request body.
3. Indice stores the event in the Stripe event inbox.
4. Duplicate events are detected and processed idempotently.
5. Out-of-order events are handled by event time and existing local associations.
6. Provider lookups needed for charges/refunds happen with sanitized errors.
7. The processor updates local subscription, invoice, lifecycle and audit state.
8. Access changes only from trusted, reconciled provider state.

Payment success must be tied to an invoice that is actually paid. A successful payment-attempt
event with an invoice still open is not enough to restore access.

## 13. Access Lifecycle

Normal subscription lifecycle:

- `TRIAL`: full access during the trial window.
- `ACTIVE`: full access while subscription is paid/current.
- `GRACE`: full access after failed payment for the configured grace period.
- `READ_ONLY`: account can view limited data but cannot continue normal operations.
- `SUSPENDED` or `BILLING_ONLY`: billing/recovery access only.
- `PURGE_PENDING`: retention process may begin after the retention window.

Current default lifecycle configuration:

- failed-payment grace: 14 days;
- read-only window after grace: 14 days;
- retention window: 90 days.

Payment request lifecycle:

- seven-day reminder window;
- daily owner reminders;
- payment-only restriction after the deadline;
- optional seven-day Root extension;
- recovery only after the exact Stripe obligation is paid.

These are related but separate flows. Failed recurring renewal uses the subscription lifecycle.
Admin payment collection for old customers uses the payment-request lifecycle.

## 14. What Happens If Payment Fails

If Stripe cannot charge the saved card:

1. Stripe emits invoice/subscription events.
2. Indice records the failure.
3. The company enters grace if the subscription lifecycle applies.
4. Customer sees billing/payment recovery.
5. Owner updates card or pays the hosted invoice in Stripe.
6. Stripe emits a paid event after successful recovery.
7. Indice verifies the paid invoice and restores full access.

If the customer only updates a card but does not pay the failed invoice, access should not be
restored. The paid invoice is the recovery proof.

## 15. Refund And Dispute Flow

Refunds and disputes must be treated as payment-state events, not manual edits.

Flow:

1. Stripe sends charge/refund/dispute webhook events.
2. Indice resolves the Charge to the correct customer/company.
3. If the association is ambiguous, Indice retries or requires review.
4. A dispute can move the account into payment risk/grace.
5. A won dispute or valid recovery can restore active state.
6. The audit trail remains append-only.

Never guess the company from incomplete payment data.

## 16. Production Launch Sequence

Safe launch sequence:

1. Back up MySQL and file/object storage and prove restore works.
2. Deploy the approved code with Stripe public charging disabled.
3. Verify login, dashboard, Root, invitations and existing non-billing flows.
4. Install the LIVE restricted key and webhook secret as protected files.
5. Verify Stripe account identity, scopes, branding, domain, Tax and Customer Portal.
6. Run deployment preflight.
7. Temporarily enable catalog LIVE synchronization.
8. Root publishes the approved Indice catalog to Stripe LIVE.
9. Turn catalog live-sync back off after publication unless maintenance requires it.
10. Enable Stripe processor, provisioning, lifecycle, entitlements and collection workers.
11. Create an internal test signup/customer using the controlled runbook.
12. Verify Checkout, card, customer, subscription, trial, invoice, webhook, access and audit.
13. Test failed payment and recovery in Stripe sandbox/test flow before trusting LIVE.
14. Only then open public signup or start pushing real customers to pay.

Turning off Indice billing does not cancel subscriptions already scheduled in Stripe. If
Stripe already has an active subscription, Stripe can keep invoicing until that subscription
is canceled or changed in Stripe/through the backend.

## 17. What Is Still Missing Before Real Money

Even if keys and webhook are present, the following still need direct evidence before public
production charging:

- backend deployed and restarted with the final production environment;
- database migrations applied through the current version with backup/rollback ready;
- restricted key scopes verified by real API calls in the correct Stripe account/mode;
- webhook signed delivery tested end to end, not only shown as Active in Stripe;
- active catalog published from Indice and verified against Stripe LIVE products/prices;
- Customer Portal card update and invoice history tested in the same account/mode;
- trial-end automatic charge tested in Stripe sandbox with Test Clocks or equivalent;
- monthly renewal success tested;
- payment failure tested;
- card replacement plus failed-invoice payment recovery tested;
- existing paid customer remains on old price after a new catalog publish;
- old non-Stripe customer receives payment request, pays, and gets access restored;
- reminder email delivery verified from production email configuration;
- monitoring and rollback evidence recorded.

## 18. What To Use For No-Real-Money Verification

Use Stripe sandbox/test mode and Test Clocks for full payment behavior without real customer
charges. This is the correct way to confirm:

- trial starts;
- trial will end;
- trial converts to paid;
- monthly renewal invoice is generated;
- card charge succeeds;
- card charge fails;
- customer updates card;
- failed invoice is paid later;
- webhook updates Indice correctly.

For LIVE, use only an authorized internal account and a small controlled charge/refund after
approval. Do not test by altering a real customer's subscription.

## 19. Source References

Stripe references used for this operating model:

- Saved payment methods during Checkout:
  `https://docs.stripe.com/payments/checkout/save-during-payment`
- Customer Portal:
  `https://docs.stripe.com/customer-management/integrate-customer-portal`
- Subscription webhooks:
  `https://docs.stripe.com/billing/subscriptions/webhooks`
- Trials and trial-end billing:
  `https://docs.stripe.com/billing/subscriptions/trials`

Indice references:

- Current live runbook: `docs/INDICE_STRIPE_LIVE_GO_LIVE_RUNBOOK.md`
- Billing architecture: `docs/INDICE_PREMIUM_MULTITENANT_BILLING_ARCHITECTURE.md`
- Payment collection: `docs/INDICE_PAYMENT_COLLECTION_RUNBOOK.md`
- Saved-card verification: `docs/INDICE_SAVED_CARD_FLOW_VERIFICATION_2026-09-08.md`
