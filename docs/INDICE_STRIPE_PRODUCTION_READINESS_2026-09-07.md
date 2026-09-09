# Stripe production readiness — 2026-09-07

Status: local implementation and verification record; production activation is not approved by this file.
Base commit: `7730c4991`; changes are in the working tree until separately committed and released.
Authority: `AGENTS.md`, the canonical billing architecture, `deployment/README.md`,
`INDICE_STRIPE_LIVE_GO_LIVE_RUNBOOK.md`, and the public release security gate.

## Delivered workflow

1. Platform administration → Catalog & modules → Commercial offer → Configure prices → **Save prices** stores both
   monthly and annual amounts in the draft. It works without Stripe credentials. Changed amounts
   invalidate their previous Stripe verification. An unchanged saved annual amount is preserved;
   applying the annual calculator is explicit.
2. **Sync and publish offer** is available to Platform Root when Stripe catalog synchronization
   is enabled. LIVE retains the temporary maintenance flag and exact confirmation phrase.
3. The backend reads the persisted commercial amounts, synchronizes sellable products, reuses
   matching immutable Stripe Prices, and verifies the whole offer. It checks concurrent changes
   before atomically activating the version. Existing subscriptions retain their previous version.
4. On partial failure the prior offer remains active. Successful product operations can be reused
   on retry. The UI refreshes the catalog after an uncertain response and checks the exact version
   before reporting success or offering a retry.

This does not make ordinary application deployment publish prices. It also does not remove the
existing LIVE maintenance policy or enable customer charging automatically.

### Catalog contract preservation follow-up — 2026-09-08

The Catalog UI remains the owner of commercial amounts. New seat and storage subscription items
now resolve their verified Stripe Price from the subscribing company's agreed catalog version,
including a superseded published version. Existing items change quantity or are removed without
selecting a replacement Price. Neither purchase path falls back to the current global offer or
environment Price IDs. Operators do not copy per-product Price IDs into the production environment
for these flows; missing historical verified mappings block a new add-on instead of choosing a
different price.

Subscription webhooks hydrate original signup commercial fields/products only once. Later events
preserve accepted contract changes, including zero amounts, cleared promotions and seat quantities.
The billing screen keeps its stored selection until an explicit edit and ignores stale preview
responses. An incomplete signup retry spanning catalog publication returns the existing conflict
response and asks the customer to review the current offer and restart checkout before any provider
call. A previously created Checkout session is replayed unchanged.

Publication uses one database timestamp at the same precision as the public catalog's effective-date
queries. New prices are available immediately after activation; they no longer disappear briefly
because a fractional publication timestamp is ahead of a whole-second availability comparison.

This follow-up does not change customer-approved whole-offer changes: that existing flow quotes
the current offer and can apply the accepted version at renewal. It also does not add a quote-version
field to first-time signup requests. The Stripe Checkout page still requires review of the actual
selected amount. Retry payloads across an explicit replacement of the underlying subscription
remain a separate durability limitation; these tests cover publication changes and retries of the
same contract. No applied migration or production catalog was changed.

Follow-up implementation touches `SubscriptionCatalogPriceResolver`, `SeatPurchaseService`,
`StorageBlockPurchaseService`, `StorageOverageSyncService`, `BillingSignupService`,
`BillingProjectionRepository`, `PlatformCatalogManagementService`, and the frontend
`Billing/hooks/useBillingManagement.ts`. Their focused regression tests, the canonical billing
architecture and environment example were updated. The production operator overlay in
`/tmp/indice-stripe-live.env.example` and its adjacent setup guide no longer request extra-seat
Price IDs. No credentials were written to those artifacts.

Follow-up validation on 2026-09-08:

| Check | Result |
| --- | --- |
| Backend focused and related regression suites | PASS: 117 tests across 16 classes; 0 failures, errors or skips after the final targeted reruns. |
| Publication preservation regression | PASS: existing subscription, items, products, promotion and historical prices remain unchanged; immediate new selection uses the new module and seat amounts. |
| Fresh isolated MySQL 8 schema | PASS: 264 migrations validated; schema reached v264. Used only disposable loopback port 13319 and `indice_test_db` with `utf8mb4_0900_ai_ci`. |
| Billing frontend regression | PASS: 15 tests, including historical summary and stale preview handling. |
| Frontend TypeScript / production build | PASS: `npm run typecheck --prefix react` and `npm run build --prefix react`. |
| Diff validation | PASS: `git diff --check`. |
| External execution | Stripe gateways mocked; no real Stripe API calls, charges, production deployment, commit or push. |

Initial validation attempts exposed stale compiled output, an incorrectly configured disposable
schema collation, and new test-fixture setup errors. Those were corrected before the passing runs.
The publication test also exposed the actual timestamp precision defect described above, which was
fixed in source. No functional or production database was repaired or reset.

**Billing** adds the Stripe connection setup panel alongside its existing billing records.
The panel reports server configuration; it does not prove working credentials, restricted-key
permissions, successful webhook processing or actual charges. Products, prices, validation and
publication remain in **Catalog & modules → Commercial offer**, with technical module availability
and existing navigation preserved.

For local demonstrations, **Billing → Connect Stripe demo → Activate demo** shows an explicitly
simulated connection. The control requires a development build on loopback and Platform Root.
Its state lives only in the page and resets on reload; it makes no Stripe calls, accepts no keys,
and never enables billing, webhook verification, catalog synchronization or publication. Production
builds do not expose this demo control. Actual server configuration remains separately visible.

Public signup now displays a pending price honestly, preserves cents, and obtains storage amounts
from the same configured quota defaults as the backend (5 GiB included / 5 GiB block). The catalog
badge uses the actual server mode. Calculator defaults follow the approved 20% for modules/packages
and 0% for extra users/storage; stored annual prices are not silently recalculated.

Refund/dispute events containing only a Charge ID now retrieve that Charge before the handler's
database transaction, verify its ID and mode, and require an unambiguous local company association.
Provider errors and unresolved/conflicting associations retry. This requires **Charges READ** on
the restricted API key. A verified Charge without a customer can be audited globally without
changing a tenant. Payment-intent-only events without a resolvable Charge require retry/review.

Delayed Stripe provisioning now restores lifecycle from the exact signup-linked subscription and
its latest processed paid/failed invoice, preserving event order. It does not restart an expired
trial when newer subscription/payment information exists. An initial zero-value trial invoice
does not end the trial early. Courtesy onboarding keeps its existing behavior.

## Evidence and remaining gates

| Check | Current evidence / required closure |
| --- | --- |
| Local source candidate | Based on `7730c4991`; final local test results are recorded below. |
| Production checkout | Read-only public config on 2026-09-07 returned `checkoutEnabled=false`, `provisioningEnabled=true`, `courtesyEnabled=true`, trial 15 days, five seats. |
| Production storage display | That config still returned 100 GiB included/block. The local correction must be deployed; current server quota overrides have not been inspected. |
| Production published prices | Public API still exposed legacy `basic_1/basic_2/basic_3/basic_all` prices as `READY`; no production catalog was changed during this work. |
| Stripe destination | User screenshot shows `indice-production-billing` Active with 17 events. A read-only GET to its URL returned 405 / Allow POST. Neither proves signed processing. |
| Restricted key and signing secret | User reports having both. Installation, file permissions, mounted paths, actual scopes and LIVE account identity remain UNKNOWN. No key was read or installed during this work. |
| Actual Stripe API operations | Automated local tests mock Stripe. Real TEST certification and current LIVE account/tax/catalog checks remain UNKNOWN. |
| Deployment | No production SSH session, deployment, activation, purchase, refund, commit or push is part of this local verification. |
| Release security / operations | Exact image digests, real-env preflight, backups/restore, CI scans, runtime smoke, UAT and monitoring need the release owner's current evidence. |

The source SDK is Stripe Java 33.1.0, API `2026-06-24.dahlia`. Verify that the deployed artifact and
the destination use the compatible version. Keep the existing **Your account / Snapshot** endpoint;
do not recreate it to install its existing `whsec_` secret.

## Production operator sequence

1. Certify the changed flow in an isolated Stripe TEST environment with an equivalent restricted
   key. Cover all 13 approved products, monthly/annual exact cents, existing-contract preservation,
   partial failure/retry, wrong account/mode, signature rejection, duplicate/out-of-order delivery,
   trial expiry/payment success and failure, cancellation, seats, storage and recovery.
2. Identify the exact release images and protected production environment. Verify MySQL and object
   backups with a restore drill. Run real-environment preflight and deployment dry-run per
   `deployment/README.md`; `--example` does not validate production credentials.
3. Install the restricted LIVE key and the existing destination's signing secret as protected files
   on the server. Use `APP_BILLING_STRIPE_SECRET_KEY_FILE` and
   `APP_BILLING_STRIPE_WEBHOOK_SECRET_FILE`; leave their direct-value variables empty. Never put
   either value in Git, chat, a browser build, or a diagnostic output.
4. Verify the LIVE account identity, charges/payouts readiness, branding/domain, restricted scopes
   and accountant-approved tax registrations. Do not copy example countries as approved tax policy.
5. Deploy with public billing maintenance enforced. Since `APP_BILLING_STRIPE_ENABLED` controls
   Checkout, catalog connectivity and webhook ingress together, the public maintenance rule must
   block new checkout and customer billing mutations while allowing signed webhook deliveries and
   authorized Root operations. Verify the real proxy rule from an ordinary customer session.
6. Temporarily enable LIVE catalog synchronization. Open **Platform administration → Catalog & modules →
   Commercial offer** and review the persisted draft's 13 products,
   monthly/annual amounts and availability. Root uses **Sync and publish offer**, confirms
   `PUBLICAR EN STRIPE LIVE`, and verifies the active version. Do not manually recreate its Products
   or Prices in Stripe. Restore the catalog LIVE sync flag to false afterward.
7. Verify signed delivery through to `PROCESSED` and the expected company/subscription/invoice
   effects. Observe retries, unresolved events, dead events, provisioning failures and payment
   failures. A 200 receipt alone is not proof of completed processing.
8. Complete the authorized internal LIVE trial/charge/refund checks from the go-live runbook.
   Initial 15-day trial checkout has no charge and does not prove a paid renewal. Real financial
   tests require the specific internal account and amount to be authorized in advance.
9. Record successful smoke/UAT, exact artifact, canary monitoring and rollback evidence. Open public
   billing only when all blocking production gates have current evidence.

For normal operation preserve one backend / one webhook processing worker as required by the
deployment architecture. Multi-worker lease-owner fencing is a separate prerequisite before adding
competing processors. The publication request uses one additional DB connection for its advisory
lock and may take multiple Stripe calls; verify pool capacity and proxy/provider timeouts. A timeout
does not undo confirmed Stripe operations—refresh the version and retry the same draft when needed.

Rollback preserves catalog/subscription history and existing volumes. Turning off Indice billing
does not cancel subscriptions or stop scheduled Stripe charges. If ingress/processing is disabled,
retain and reconcile pending deliveries when service returns.

## Local validation

The backend tests used a new disposable MySQL 8 container on loopback port 13317 and `indice_test_db`,
never the functional or production schema. Stripe calls were mocked; no real payment was made.

| Validation | Result |
| --- | --- |
| Focused backend catalog, authorization/CSRF, signup/provisioning, lifecycle, webhooks, subscriptions, seats and storage suite | PASS: 153 tests, 0 failures/errors/skips; includes 8 publication tests and 7 provisioning tests. |
| Fresh schema Flyway startup | PASS: validated 264 migrations and migrated the empty disposable schema to v264. No migration files changed in this task. |
| Migration version uniqueness | PASS: 2 tests, included in the 153 above. |
| `npm run test:auth --prefix react` | PASS: 14 tests. |
| `npm run test:platform-admin --prefix react` | PASS: 73 tests, including publication, failed-refresh recovery and local-demo visibility guards. |
| `npm run test:billing-flow --prefix react` | PASS: 12 tests. |
| `npm run typecheck --prefix react` | PASS. |
| `npm run build --prefix react` | PASS. |
| Documented Bash examples | PASS: syntax checked for 20 examples; no deployment commands executed. |
| `git diff --check` | PASS. |
| Local Stripe demo browser regression | PASS: 28 desktop/mobile assertions; activate, disconnect and reload reset. No demo API requests, Stripe requests or business mutations. Catalog price editors, technical availability and publication controls preserved. |

Local demo changes are in `PlatformAdminPage.tsx` and
`PlatformAdmin/BillingWorkspace/{StripeSetupPanel.tsx,StripeDemoConnectionDialog.tsx,localStripeDemo.ts}`
under `react/src/app`, with regressions in `react/tests/{stripe-setup-panel,platform-admin-flow-regression}.test.mjs`.
The canonical billing architecture and this record describe the demo boundary. No backend, API,
database, credentials or deployment configuration changes were needed for this demo follow-up.
The final demo checks passed; the existing panel-copy regression was updated to its revised wording.
Screenshots: `/tmp/indice-stripe-connect-demo-desktop.png` and
`/tmp/indice-stripe-connect-demo-mobile.png` (temporary local evidence).

Local backend logs: `/tmp/indice-stripe-readiness-backend.log` (first pass, 147 tests) and
`/tmp/indice-stripe-readiness-backend-final.log` (final pass, 153 tests). These temporary logs are
local diagnostics, not permanent production release evidence. The disposable test container is
removed after validation. This is a focused suite, not a claim that every repository test or
browser end-to-end scenario ran. Initial frontend assertions for the old publish labels were
updated to the new workflow before the final passing run.

No commit, push, production deployment, LIVE activation, key installation, Stripe catalog mutation
or real charge/refund was performed. The next release must attach its own exact commit/image
digests and close the production UNKNOWN gates above.
