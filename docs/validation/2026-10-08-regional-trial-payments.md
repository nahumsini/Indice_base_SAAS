# Regional trial payments and web navigation — local increment

Branch: `codex/regional-trial-payments-20261008`, based on main `25fd637a`.
Scope: [customer entry owner contract](../public-customer-entry-mx-ca-contract-v1.md).
Public enablement, real catalog publication and deployment: **not performed**.

## Changed / preserved behavior

Adds regional catalog preparation, CAD/MXN quotes with ten people, immutable separate mandate,
hosted method setup, original-deadline subscription request and bound positive paid-invoice
conversion through native activation. Uncertain provider retries/out-of-order events fail safely.
All entry/payment/web flags remain default-off. Native portal/invoices are reused, not rebuilt.

Historical USD/five-person products, prices, contracts, courtesy, manual diagnosis, auth/tenant
roles and the other agent's Agenda/Meeting Control files are deliberately preserved. No real
provider customer, subscription, Price, invoice or charge was created. No functional/production
DB was used. No applied migration was edited: V307/V308/V309 were added forward-only.

## Changed files

- Billing owner: `PublicTrialPayment{Contracts,Controller,Repository,Service}`, native activation,
  public readiness/expiry guard, webhook handler/processor and hosted trial gateway.
- Catalog owner: regional draft controller/service, native recurring price edit/clone/sync/
  verification/publication, separate regional selection and legacy USD selection exclusion.
- Native UI: regional billing workspace/API/eight-language copy; Root preparation action and
  correct catalog currency rendering/localized validation code.
- Config/schema: default-off application/env/compose flag and V307–V309.
- CI compatibility: lazy Learning advice owner dependencies preserve behaviour and stop unrelated
  MVC slices requiring owner persistence beans. No Learning workflow is refactored.
- Marketing repository: gated header/home/pricing/footer/CA access CTAs, isolated navigation
  helper, four keys in every one of its ten locale JSON files, PHP/Node contract tests. Existing
  dirty marketing work is preserved; it must not be silently bundled into this ERP change.
- Canonical/domain documentation and focused regression/browser tests. Exact inventory: Git diff.

## Verification

Initial isolated MySQL container `indice-entry-tests-memory-20261008`, loopback port 13312,
`indice_test_db`; synthetic records only, transactional rollback. Flyway startup through V309
and migration uniqueness passed. Focused final suite before the public-readiness follow-up:
**45 tests, no failures/errors**. It includes native MX/CA provisioning, stored receipt replay,
original window preservation, customer binding, bounded subscription attempts, controller
auth/CSRF/context checks, invoice/mode/price checks and native webhook dispatch gates.

```sh
TEST_DATASOURCE_URL='jdbc:mysql://127.0.0.1:13315/indice_test_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&forceConnectionTimeZoneToSession=true' \
./mvnw -B -Dspring.test.context.cache.maxSize=8 test
```

Initial full suite: 3343 tests, 3 failures, 0 errors, 1 skip. Two cohort unit mocks were updated
for the persistent regional-cohort query, retaining both expired and unexpired USD denial and
adding converted-cohort denial. Messaging's committed-outbox retry assertion failed once
(expected attempts 1, actual 0), then all 23 messaging tests passed in the focused rerun without
changing messaging code. This is not evidence that the unrelated timing/race risk is resolved.
Final full-suite result is recorded below; remote exact-SHA CI is separate.

The full follow-up on tmpfs was interrupted after Docker killed MySQL for insufficient memory
(OOM/exit 137). A new Docker-volume attempt could not initialize because the VM disk was full.
No functional database/container/image was deleted or changed to make room. A host-disk attempt
on 13314 failed the immutable B60 baseline because the case-insensitive filesystem forces
`lower_case_table_names=2` and incompatible information-schema collations. It reported 3351
tests, 792 errors, no assertion failures and one skip; one additional unit error was an invalid
Mockito record fixture in the new readiness test, corrected to a real typed value. The baseline
and failed test database were not repaired. That synthetic container was stopped intact.

The next run uses fresh synthetic MySQL `indice-regional-tests-bounded-20261008` on loopback
13315, Linux case-sensitive tmpfs limited to 1 GiB, no binary logging/performance schema and a
64 MiB buffer/redo budget. Spring's context cache is capped at eight to bound parallel cached
connection pools/jobs. No test, assertion or scheduling toggle is disabled. Default-cache
exact Linux CI remains required separately; this local resource profile is recorded explicitly.

Final bounded Linux run: **3351 tests, 0 failures, 0 errors, 1 skip; BUILD SUCCESS** in 2:30.
Flyway applied 249 migrations through V309 from an empty isolated schema; migration uniqueness
passed. This run includes the latest public readiness, immediate-consent timestamp and readiness
regression. The unrelated messaging suite also passed here, but default-cache CI remains a
separate gate and the earlier timing failure is retained above. Log:
`/tmp/indice-regional-full-bounded-tests-20261008.log`.

Frontend: TypeScript and production build passed (existing >600 kB chunk warning).
**192 regressions passed**: native billing, platform administration/localization, public entry,
regional mandates, exact hosted URL validation and all ERP locales. The newly added catalog
validation code has a localized mapping; its missing mapping was caught and fixed during tests.

Two browser scripts run real native components/router/API client with synthetic intercepted
backend and no external requests. Entry: lead → OTP → account, bad OTP, lost-response retry,
default-off mobile and French/Canada independence. Regional billing: separate mandate, CSRF,
same retry key, quote-change reset, saved method not paid, post-expiry consent, default-off,
390px/dark layout. Three scenarios each passed. Screenshots were visually inspected; test data
only. The billing harness mounts the actual native wrapper, not a provider-certified checkout.

Website: 32 Node tests passed; eight changed PHP files linted using local Docker PHP 8.4 with
network disabled/read-only mount. Isolated helper tests pass without loading `.env`, DB,
registration or provider APIs: disabled fallback, MX/CA route/plan, UTM allowlist, no contact
URL parameters and invalid app URL rejection. Git whitespace checks pass in both repositories.

## Remaining release gates / risks

- Real Stripe TEST certification: absolute cutoff including last-day setup, lost provider
  response, setup completion after cutoff, paid conversion with native grants, first-charge
  decline/3DS, duplicate/out-of-order webhooks, renewal/cancellation and portal recovery.
  Certify provider portal configuration does not expose legacy USD or unsupported regional
  add-ons/plan changes to this cohort.
  Parameter/unit/repository/browser mocks do **not** certify these external behaviours.
- Existing secret exposure requires fresh revocation/rotation evidence; legal/tax and consent
  approval, trusted edge/header deployment, exact combined SHA CI and rollback evidence.
- Other agent's Agenda/Meeting Control basic release/catalog integration; additional-person
  blocks, regional storage, reminders and reconciliation tools are still pending.
- Mexico implementation mandatory/optional payment policy remains undecided and excluded.
- Marketing has substantial pre-existing uncommitted work and main ahead of its remote.
  Coordinate that candidate before commit/deploy; no broad publish is implied here.
- Real APPTEST session acceptance before any public flag/catalog enablement or production.

Main update / APPTEST deployment / production deployment / financial catalog publication:
N/A for this increment. Branch checkpoint is not launch approval.
