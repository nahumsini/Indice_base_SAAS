# Customer entry MX/CA — local foundation validation

Date: 2026-10-08. Branch: `codex/customer-entry-mx-ca-20261008`.
Base: `e3c83653d594c4cfe3a1170bd2575b1f5c9910d7`.
Scope: the [approved entry contract](../public-customer-entry-mx-ca-contract-v1.md).
Result: focused local checks PASS; public launch and production deployment **NOT APPROVED**.

## Changed behavior

- New `/start` browser entry saves a consented MX/CA lead before requesting native email OTP.
- Verified email + accepted trial terms + password provision a native account without a card,
  preserving a linked 15-day window and 10 included seats. Product grants are released basics;
  active-but-unreleased Core is also excluded. No platform administrator is created.
- Entry and account retries do not duplicate leads/accounts or restart the deadline.
- New-cohort expiry denies operational reads/writes, module access and subscription access,
  even with legacy lifecycle enforcement disabled. Auth/billing recovery remains available.
- Pending verify/resend and final account proof are bound to the server-owned lead email.
- Legacy USD selection/checkout cannot quote or charge this cohort before regional conversion
  and separate automatic-payment consent are implemented. Availability remains default-off.
- Native lead queries use `lead_row`, replacing the MySQL 8 reserved `lead` alias without
  changing filters, shapes or workflows. Signup diagnostics avoid contact/provider details.

## Deliberately preserved

Legacy card signup and courtesy contracts, current users/sessions, published prices, Stripe
subscriptions and provider configuration, existing company policies and native role/tab
permissions. Manual lead-stage transitions still do not provision accounts. No Agenda/Meetings
operational files, applied migration identity, functional DB, marketing working files or
production data were changed. No live provider API call, card collection or charge was made.

## Files changed

- Entry owner: `billing/signup/PublicTrialEntry{Contracts,Controller,Service,Repository,RateLimit}`
  and `PublicTrialAccessService`, plus explicit native signup-intent/provisioning/email contracts.
- Access/catalog: `ModuleAccessService`, `CommercialLifecycleAccessService`,
  `CompanySubscriptionService`, `CommercialOfferSelectionService`,
  `BillingProductSelectionService` and `BillingActivationService`.
- Lead owner: `PlatformLeadService` / `PlatformLeadRepository`; safe welcome-email logging.
- Schema: new forward-only `V305__public_verified_trial_entry.sql` and
  `V306__public_trial_deadline_required.sql`. No prior migration was edited.
- UI: `Auth/TrialStartPage.tsx`, eight-language `Auth/translations/trialEntry.ts`,
  `api/publicTrialEntry.ts`, native routes/export/provider exclusion and compatible login
  header/footer props. New regression and browser tests under `react/tests`.
- Configuration: default-off property, deployment `.env.example` and compose pass-through.
- Documentation: owner contract, coordination decision, this report, Premium Billing §3.4,
  Lead policy and scoped Frontend/Backend Operating System additions.
- Tests: new entry/access/availability/contracts/controller integration tests and a focused
  closed-commercial-lead regression. Full changed-path inventory is in the branch diff.

## Verification run

Backend: **114 tests, 0 failures, 0 errors, BUILD SUCCESS**. Maven test includes Java compilation.
Flyway startup validated/applied through V306 on the isolated test schema; numbering uniqueness
passed. Native provisioning/account races, email verification, historical catalog resolution,
commercial lifecycle, collection protections and lead intake are included.

```sh
TEST_DATASOURCE_URL='jdbc:mysql://127.0.0.1:13312/indice_test_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&forceConnectionTimeZoneToSession=true' \
./mvnw -B -ntp \
  -Dtest=PublicTrialEntryAvailabilityTest,PublicTrialEntryIntegrationTest,PublicTrialEntryControllerTest,PublicTrialEntryContractsTest,PublicTrialAccessServiceTest,BillingSignupServiceTest,BillingSignupControllerConfigurationTest,ModuleAccessServiceTest,MigrationVersionUniquenessTest,BillingTenantProvisioningIntegrationTest,BillingSignupEmailVerificationServiceIntegrationTest,CompanySubscriptionServiceTest,CommercialLifecycleIntegrationTest,PlatformLeadServiceTest,PlatformLeadIntakeIntegrationTest,SignupWelcomeEmailServiceTest,BillingCollectionActivationTest,CommercialOfferSelectionIntegrationTest,SubscriptionCatalogPriceResolverIntegrationTest \
  test
```

The isolated test container is `indice-entry-tests-memory-20261008`, loopback port 13312,
synthetic `indice_test_db` only. Its storage is ephemeral tmpfs. The first independent Docker
DB attempt hit Docker-VM disk exhaustion; it was not replaced with a functional datasource.
Functional/local/production databases and other containers were not used for tests.

Frontend (from `react/`):

```sh
npm run typecheck
npm run build
node --experimental-strip-types --test \
  tests/public-trial-entry.test.mjs tests/auth-session-regression.test.mjs \
  tests/global-product-identity-regression.test.mjs tests/billing-flow-regression.test.mjs \
  tests/platform-lead-analytics-flow.test.mjs
```

TypeScript/build PASS; **49 regression tests PASS**. Build retains the existing warning about
chunks above 600 kB; no build error. Complete copy is checked for all eight ERP language codes.

Browser regression: **3 scenarios PASS**, real Vite/router/components with synthetic intercepted
backend, separate headless browser profile, no external request/mail/payment/database. Tests
cover lead-before-OTP, wrong-code retry using the native empty-reference error shape, required
trial consent, lost-account-response retry without another lead, disabled entry, French language
independent from Canada market, and absence of private tenant API calls.

```sh
INDICE_PLAYWRIGHT_MODULE=/tmp/indice-flow-ui-browser-20261006.ICkbZV/node_modules/playwright/index.mjs \
INDICE_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
node tests/public-trial-entry-browser.mjs
```

Desktop 1440 px and mobile 390 px screenshots were visually inspected. Mobile has no horizontal
overflow. Screenshots/logs are local transient `/tmp/indice-entry-*-20261008.*` artifacts,
not committed personal-data evidence. Mocked browser success is not live end-to-end acceptance.
The backend integration additionally exercises anonymous routes through the real Spring MVC
context/interceptors, CSRF and native lead persistence, not only a standalone controller mock.

`git diff --check`: PASS.

## Failures found and resolved locally

- MySQL 8 reserved lead alias in the pre-existing lead repository was fixed without a rewrite.
- Durable rate-limit timestamp mapping now uses an explicit row mapper.
- The new Core-pilot fixture uses explicit binary comparisons for mixed historical collations.
- After V305 isolated application, V306 strengthens a nullable deadline CHECK forward-only:
  MySQL permits an UNKNOWN check expression, so `trial_ends_at IS NOT NULL` is explicit.
  The regression asserts the named check violation without assuming a driver's exception subclass.

The final focused suite is green. These resolved iterations are not release exceptions.

## Remaining failures, risks and handoff

- Full baseline main CI is failed on exact `e3c83653…`:
  [run 37734480938](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/37734480938).
  The missing Learning advice dependency in MVC slices was separately reproduced before this
  increment. The full suite is not claimed green. Coordinate its fix with the module owner;
  focused tests and an application build do not certify the exact merged release SHA.
- Regional CAD/MXN paid selection, separate payment consent, original-cutoff checkout/charge,
  signature-verified paid conversion and failure recovery remain unimplemented. New cohort's
  legacy paid routes intentionally fail closed. Public entry remains off.
- Marketing CTA wiring, real email delivery and authenticated APPTEST/production acceptance
  are pending. Prior marketing working files remain uncommitted by this branch.
- Existing historical secret-exposure remediation requires fresh rotation/revocation evidence;
  the previous deferral expired. Legal/tax, edge real-IP, headers and rollback evidence remain
  release gates, not assertions supplied by these local tests.
- Another agent must finish basic Agenda/Meeting Control delivery. V305/V306 are allocated;
  reconcile next migration numbering and scoped canonical additions before combining branches.
- Initial main update: N/A at foundation handoff. The owner subsequently requested the
  default-off development checkpoint; see the coordination decision. This is not release approval.
- APPTEST/production deployment: N/A — not performed. Catalog publication/payment mutations: N/A.

Next safe increment: close versioned regional payment/consent and marketing wiring while the
entry stays off, then combine tested module work, clear full CI/security gates and run actual
APPTEST end-to-end acceptance before public enablement/production rollout.

## Remote CI follow-up and receipt precision

The full foundation CI finished FAILED:
[run 37846979481](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/37846979481),
3,323 tests, 1 failure, 363 context errors, 1 skipped. The context errors retain the missing
LearningProgressRepository MVC-slice dependency. The new entry failure exposed Linux clock
nanoseconds being lost on DATETIME(6) persistence: the first interest response and its replay
had slightly different continuation timestamps.

The entry owner now normalizes that timestamp to database microsecond precision **before**
persisting and returning it. It does not loosen the assertion, change the 24-hour window, trial
duration, payment policy or schema. A fixed nanosecond-clock regression covers the platform
difference. Compilation plus the complete entry/access/controller/availability/contracts and
migration-uniqueness subset passed: **20 tests, 0 failures, 0 errors** on the isolated test DB.
The original broader 114-test local result remains historical, not a full-CI claim.

Only `PublicTrialEntryService`, `PublicTrialEntryPrecisionTest` and this report change in the
precision follow-up. Full CI, Learning integration and all public-release blockers still need
to be cleared on the final combined main SHA. No deployment, provider call or charge was made.
