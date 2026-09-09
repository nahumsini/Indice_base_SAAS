# Administrator payment requests

This production feature adds **Customers → row Actions → Request payment** for Platform Root.
The action is a visible credit-card icon beside the user-management icon. Its tooltip and
accessible label follow the selected language, and it opens the payment-request review dialog.
It does not enroll customers automatically. Catalog editing/publication stays in Catalog & modules;
Stripe setup stays in Billing. This document describes code behavior, not proof of a live deployment.

## Customer flow

1. Root reviews the actual owner, payable invoice total or published activation selection, currency,
   interval, tax estimate and seven-day deadline. Missing configuration or protected paid/trial periods
   appear as blockers. Root enters a reason and explicitly starts the request.
2. The company retains its commercial grace access for seven days, subject to existing authorization
   and independent holds. The current owner receives an in-app notification and email daily.
   The first reminder is due immediately and normally dispatched on the next worker tick.
3. At the exact persisted deadline, the company becomes payment-only. Login and account recovery
   remain available; operational pages and APIs are denied even with an existing session.
   Nonowners see that the billing owner must pay. Switching to a different authorized company remains possible.
   Public kiosk bootstrap and actions, including older and multi-kiosk routes, also stop after
   resolving the company. They retain the existing generic kiosk-unavailable response.
4. Root can extend the specific open request by seven days from confirmation, with another reason.
   This replaces the reminder window and restores only this request's commercial grace. Stale or
   duplicate actions do not create another request or affect a newer request.
5. The owner pays through a protected hosted Stripe invoice or Checkout session. Multiple bound
   invoices are paid separately. New activation uses the existing company and frozen published Price IDs;
   it neither creates another company nor provides another trial. Existing paid/trial protection must end first.
6. **Check payment status** or the reconciliation worker verifies the exact obligation with Stripe.
   All bound invoices must be fully paid by Stripe. A card, zero-value trial invoice, unrelated payment,
   browser redirect, or manually marked off-Stripe invoice cannot clear the hold. Ordinary subscription
   and entitlement projection may still be pending until the existing webhook worker processes the event.

Existing customers keep their contracted prices. Starting collection does not edit a subscription,
create another outstanding invoice, or immediately charge a saved card. New catalog publications do
not rewrite an open request. The separate fifteen-day trial extension is unchanged.

An explicit later trial or product benefit is honored: the displayed effective deadline is no earlier
than that grant's end. An indefinite product benefit pauses the payment restriction and pending reminders.
This does not add reminder slots or silently clear the debt. An unrelated paid invoice cannot extend the
request's grace or prove settlement. Existing paid periods are checked before a request can be created.
Once an activation payment is pending, resolve it before granting another trial or product benefit.
An in-progress or uncertain trial extension likewise blocks activation until it is reconciled. These
checks use the same company lock and preserve completed retry results.
While an activation request is open, ordinary activation is blocked; the owner must use its linked payment
flow. After verified conversion, only the pinned internal/legacy source is retired and its access projection
is synchronized. Historical rows and other subscriptions remain intact.

## Configuration

The new switches default to false. Creation requires all four and a configured email provider.
Use the existing protected restricted Stripe key and webhook signing secret configuration. Products
and Price IDs remain catalog data; this feature adds no product-specific environment variables.

```dotenv
APP_BILLING_COLLECTION_ENABLED=true
APP_BILLING_COLLECTION_REMINDERS_ENABLED=true
APP_BILLING_COLLECTION_EMAIL_ENABLED=true
APP_BILLING_COLLECTION_RECONCILIATION_ENABLED=true
APP_BILLING_COLLECTION_REMINDER_DELAY_MS=60000
APP_BILLING_COLLECTION_RECONCILIATION_DELAY_MS=60000
```

Prerequisites: existing Stripe API, webhook processor and provisioning settings must be configured
for the same account and mode. Keep existing catalog/entitlement/lifecycle settings appropriate to
that environment. The restricted key also needs read access to invoices, invoice lines and Checkout
Sessions for verification, in addition to the existing catalog read/sync and Customer/Checkout creation
permissions. Validate the actual allowed operations in an isolated Stripe test environment first.
No Stripe Connect marketplace onboarding is introduced.

Email uses existing `APP_EMAIL_ENABLED`, `APP_EMAIL_PROVIDER`, `APP_EMAIL_FROM`,
`APP_EMAIL_FROM_NAME`, optional reply-to, and either the existing SendGrid key or SMTP configuration.
`APP_WEB_PUBLIC_URL` must resolve to the deployed HTTPS application; reminder links open `/billing`.
Keys remain server-side. Never place them in frontend configuration or paste them into a ticket.
Preflight checks configuration presence and required flags; it does not prove delivery or payment readiness.

## Persistence and operation

Migrations V265 and V266 add case, audit, delivery, invoice-obligation and pinned activation state tables.
They do not seed or enroll companies. Case changes, event history and reminder enqueue commit together.
Provider IO occurs outside these transactions. One OPEN request per company is enforced in MySQL.
All tenant reads and mutations retain company scope; Root administration has explicit server authority.

Reminder workers use persisted claims, bounded provider timeouts, retries and generation checks.
There are seven daily slots per channel, at start plus zero through six days; slots at/after the
deadline are never sent. Missed previous days are skipped rather than sent in a burst. Current ownership
is resolved at dispatch. Email and in-app failures are independent and visible in the request details.
In-app notification creation and its SENT record are atomic. Email accepted remotely before a timeout
can be delivered twice on retry, and an already-sent message cannot be recalled after settlement.

Reconciliation checks eligible open requests in batches, at most once per request per five-minute claim
window. The owner can request an immediate check. Provider errors leave the case open and retryable;
they never infer payment. Access restriction is evaluated synchronously from the deadline, regardless
of worker outages. Logs contain company/request/delivery IDs and sanitized error classifications.

An uncertain Checkout creation result after its attempt window does not create a replacement blindly.
Investigate the existing bound intent and Stripe session, then reconcile. A confirmed expired session
can be replaced safely without changing the frozen prices. Do not delete intents, invoices or case history
to recover an uncertain payment.

## Verification and rollout

Run focused collection, activation, subscription-access and lifecycle regressions; apply the full
Flyway chain to an isolated MySQL test database and run migration uniqueness; run frontend flow tests,
TypeScript and build. Never use the functional or production database for automated tests.

Before live use, verify the restricted key permissions and same-mode catalog, signed webhook delivery,
provider processing, current-owner email delivery, worker operation, and recovery routing. Exercise
the complete seven-day clock, extension, duplicate delivery, unrelated payment, positive settlement and
tenant-isolation cases in a Stripe test environment without real charges. Record live evidence separately;
local test success does not certify live credentials, email delivery, webhooks or payment acceptance.

Local verification on 2026-09-08: the full Flyway chain reached V266 on disposable MySQL 8;
184 tests across 25 collection, payment/activation, subscription, entitlement, trial-extension and kiosk
suites passed with no failures or skips. Database cases ran against that isolated database. Frontend
validation passed 27 billing/request-flow, 15 auth and 73 platform regressions, TypeScript and the
production build. Production Compose and shell syntax checks also passed. No live provider calls, customer notifications,
production database changes or deployment were performed during this implementation.

Primary implementation locations:

- `src/main/java/com/indice/erp/billing/collection/`: request API, durable cases, protection,
  settlement, conversion, reminder delivery and reconciliation workers.
- `src/main/java/com/indice/erp/billing/subscription/` and `billing/lifecycle/`: activation and
  access integration; normal subscription grace and trial contracts remain separate.
- `src/main/java/com/indice/erp/kiosk/engine/`: company collection checks at resolved public boundaries.
- `react/src/app/PlatformAdmin/Customers/PaymentRequestModal.tsx` and
  `react/src/app/Billing/components/PaymentRequestRecovery.tsx`: administrator and customer flows,
  supported by the payment request API, hook and presentation helpers.
- `src/main/resources/db/migration/V265__company_payment_collection_requests.sql` and
  `V266__payment_collection_obligations.sql`: forward schema additions.
- `src/main/resources/application.properties`, deployment Compose/environment/preflight files,
  and the canonical billing architecture: rollout switches and operating contract.

Existing unrelated worktree changes were preserved. This implementation was not committed or pushed.

Deploy through `deployment/README.md`, with backup and rollback artifacts. Keep creation disabled
until operational verification is complete; then enable the workers and creation explicitly. Creating
the first request is a separate Root action against a reviewed customer and payable obligation.

## Rollback

Disable `APP_BILLING_COLLECTION_ENABLED` to stop new requests. Leave reminder/reconciliation workers
running to service existing cases. Disabling worker switches stops their side effects but deliberately
does not remove existing overdue restrictions. Existing requests can still be extended or paid.
Do not roll back to an application version lacking collection access enforcement while open requests
exist: it could restore operations without payment. Retain the compatible access/recovery code and
forward migrations; do not delete case/audit tables or financial records. Resolve an operational issue
through a reviewed extension or verified settlement, preserving its audit trail.
