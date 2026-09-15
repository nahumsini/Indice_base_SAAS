# Indice Backend Operating System v1.0

Status: canonical backend engineering standard

Applies to: Spring Boot API, MySQL schema, Flyway migrations, object storage, background jobs, and
backend-facing integrations

Stack: Java 21, Spring Boot 3.5+, Maven, JdbcTemplate, MySQL, Flyway, servlet sessions, custom CSRF,
and MinIO-compatible object storage

## 1. Purpose And Authority

Indice is a modular SaaS ERP for SMEs in LATAM and Canada. Backend work must protect tenant
isolation, financial correctness, authorization, modular ownership, auditability, and backward
compatibility.

This document governs general backend engineering. More specific approved contracts extend it:

- `docs/INDICE_PREMIUM_MULTITENANT_BILLING_ARCHITECTURE.md` for commercial multitenancy and billing;
- `docs/kiosk-standard-engine-v2.md` for kiosks and public operational channels;
- module domain contracts, such as the Finance contracts under
  `react/src/app/BasicModules/Expenses/domain/`, for approved business meaning;
- `docs/petty-cash-managed-assets-contract-v1.md` for fund asset collections and immutable
  statement identity snapshots;
- `react/src/app/BasicModules/Expenses/domain/PETTY_CASH_DOMAIN_CONTRACT.md` for account-based
  funding and external means, including the approved 2026-09-10 funding-source extension;
- `docs/petty-cash-fund-classification-stages-v1.md` for prospective internal/external changes,
  historical statement snapshots and owned-cash treatment;
- `deployment/README.md` for deployment, production configuration, and rollback.

The folder `saas-multitenant/` is a superseded proposal, not a description of the current backend.
When a dated report conflicts with the implementation, inspect current code, migrations, tests,
and the newer canonical document.

## 2. Core Engineering Principles

Use a pragmatic combination of:

- domain ownership;
- single-purpose classes and cohesive packages;
- explicit contracts;
- service-owned use cases and transactions;
- JdbcTemplate repositories;
- centralized security primitives;
- forward-only Flyway migrations;
- focused automated tests.

Do not create an endpoint merely because a table exists. Every endpoint needs an authorized use
case, an owner, an input contract, a scope, an error contract, and verification.

Do not introduce JPA/Hibernate, a second authorization framework, a second tenant model, or a new
application-wide architecture solely to make one module look cleaner. A cross-cutting replacement
requires an explicit architecture decision and a migration plan.

## 3. Product Decisions And Behavior-Locked Modules

Product policy comes from the product owner and approved product documents. The agent may make
local engineering decisions inside the authorized task, but must surface decisions that change
pricing, permissions, legal behavior, retention, accounting meaning, or module ownership.

A module marked `released`, explicitly closed, or already used by customers is behavior-locked:

1. Inventory the routes, API contracts, permissions, calculations, side effects, and critical UI
   consumers affected by the change.
2. Locate or add characterization/regression tests before structural refactoring.
3. Refactor in bounded steps with no silent behavior change.
4. Keep database and API changes backward compatible, or version and migrate them explicitly.
5. Record any intentional behavior change and its acceptance evidence.

Behavior-locked does not prohibit splitting files, extracting repositories, improving queries, or
adding tests. It prohibits accidental product change disguised as cleanup.

## 4. Language And Naming

New backend identifiers are English:

- packages, classes, records, methods, variables, and fields;
- routes and API field names;
- tables, columns, constraints, and indexes;
- enum constants and persisted canonical statuses;
- technical comments and log event names.

User-visible messages may be localized by the presentation layer. Never store a translated label
as a status or compare a localized string to make a business decision.

Do not rename stable legacy identifiers only to satisfy this rule unless the task includes a safe
compatibility migration. Report Spanish identifiers introduced or changed by the current work,
not every historical identifier in the repository.

## 5. Package And Responsibility Model

Each business capability belongs to one module package under `com.indice.erp`. Organize deeper by
capability or aggregate when that improves ownership. A representative structure is:

```text
com.indice.erp.{module}
├── {Module}AccessService.java
├── {Module}RequestGuard.java
├── {Module}ApiExceptionHandler.java
├── shared/
└── {capability}/
    ├── {Capability}Controller.java
    ├── {Capability}Service.java
    ├── {Capability}Repository.java
    ├── dto/
    └── support classes required by the use case
```

This is a responsibility map, not a requirement to create every file. Do not create empty
`Mapper`, `Validator`, `Sql`, `Command`, or `shared` classes. Extract one when it owns meaningful,
testable behavior.

Responsibilities:

- **Controller:** HTTP mapping, DTO binding, guard invocation, delegation, status/response mapping.
  No SQL and no financial or domain calculations.
- **Request guard/access service:** authentication, CSRF for browser mutations, role/capability,
  module/tab permission, tenant and organizational scope entry.
- **Service/use case:** business orchestration, invariant enforcement, transaction boundary, and
  calls to owned or explicit cross-module contracts.
- **Repository:** parameterized SQL, row mapping, persistence operations, locking primitives, and
  mandatory tenant filters. No permission policy or UI behavior.
- **Mapper:** transformation when the mapping is large, reusable, or semantically meaningful.
- **Validator/policy:** reusable validation or transition policy that is too substantial for the
  use case without hiding data access.
- **DTO:** explicit external request/response contract. Persistence rows are not API contracts.

File size is a review signal. Around 250–300 lines, reassess cohesion, dependencies, and testability.
Do not split a cohesive file merely to hit a number, and do not excuse multi-responsibility classes
because they remain below one.

## 6. Tenant And Organizational Scope

`company_id` is the tenant root in the approved product model. `unit_id` and `business_id` narrow
operational scope; they are not universal ownership fields.

Every new table and use case must declare one ownership class:

- system/global;
- company-owned;
- unit-owned;
- business-owned;
- user-owned within a company;
- append-only integration/audit record tied to one of the above.

Rules:

- Tenant-owned records use `company_id NOT NULL` unless an approved transitional migration states
  otherwise.
- Add `unit_id` or `business_id` only when the domain meaning requires that scope. Do not add
  nullable scope columns to every table pre-emptively.
- A referenced unit/business/user/employee/object must be validated as belonging to the same
  company, preferably in the scoped query itself.
- Do not trust authority fields from the body, query, path, or headers. Derive company and actor
  identity from the authenticated session or the approved public-channel context.
- An object lookup by `id` alone is insufficient. Scope reads, updates, locks, and deletes by tenant
  and applicable organizational boundary.
- Cross-tenant administrative operations require an explicit platform-admin contract and audit;
  they are not exceptions hidden inside a normal repository.
- Cache keys, idempotency keys, object-storage paths, scheduled jobs, and audit records carry the
  same tenant boundary as the data they affect.
- A scheduled batch that processes records from multiple tenants isolates each record in its own
  transaction. One invalid record must be identified with tenant/object context and must not roll
  back successful work for other tenants or stop the remaining candidates.

Access roles do not replace object ownership checks. Entitlement, module assignment, tab permission,
role/capability, organizational scope, and object ownership are separate gates and must all pass
where applicable.

## 7. Authentication, Authorization, And CSRF

Reuse the repository's established primitives, including:

- `SessionAuthService` and `TenantContextResolver`;
- `SessionCsrfService`;
- module request guards/access services;
- subscription, entitlement, module-access, and tab-permission interceptors;
- platform-admin access services;
- Kiosk Engine sessions/capabilities for public operational channels.

Protected endpoints fail closed:

- A missing or invalid authenticated session returns `401` before business execution.
- A valid user without the required permission/scope returns `403` or the established non-disclosing
  equivalent.
- Subscription or commercial lifecycle restrictions use their approved response contract.
- Frontend hiding or route guards never replace backend authorization.

All browser-session state mutations (`POST`, `PUT`, `PATCH`, `DELETE`) require the current
`X-CSRF-Token` mechanism. A safe-method endpoint (`GET`, `HEAD`, `OPTIONS`) must not mutate state.

Public endpoints are explicit exceptions, never accidental absences of auth. Each public route must
document and test its alternative trust boundary, such as:

- Stripe signature verification over the raw body;
- short-lived, revocable kiosk session/capability;
- one-time invitation/reset/verification token;
- restricted public catalog token.

Public flows also require appropriate expiration, replay/idempotency handling, rate limiting,
generic error responses, and audit. No controller may opt out of security because a frontend cannot
provide the expected credential.

## 8. API Contracts

Use stable resource-oriented routes beneath the existing API version. Follow the owner module's
route conventions rather than inventing a parallel namespace.

For new stable primary APIs, prefer typed DTOs such as:

- `Create{Entity}Request`;
- `Update{Entity}Request`;
- `{Entity}Response`;
- a typed page/list response.

`Map<String, Object>` is acceptable for genuinely dynamic metadata, audit snapshots, adapters, or
legacy compatibility boundaries. Do not use it to avoid designing a stable primary contract.

API requirements:

- validate shape, length, range, format, cardinality, and allowed transitions server-side;
- derive Sales product commercial readiness from active status, an explicit commercial channel
  (`commercial`, `pos_ready`, or `quote_only`), and a positive price. Product type describes the
  item and must not silently override an explicit commercial channel; new operational items still
  default to internal visibility;
- allow-list writable fields; never bind client payloads directly to persistence models;
- bound page size, bulk sizes, date ranges, and export volume;
- return stable machine-readable error codes where clients need decisions;
- do not expose SQL messages, stack traces, secrets, internal file paths, or provider payloads;
- preserve existing consumers or introduce a versioned/compatible migration;
- keep OpenAPI and integration tests aligned when a public contract changes.

Use the established HTTP meaning for `400`, `401`, `403`, `404`, `409`, `422` when adopted by the
module, `429`, and `5xx`. For object authorization, choose a consistent non-disclosing `403`/`404`
policy within the module.

## 9. Persistence And Flyway

Flyway is the only schema-change path for Spring-owned data.

- Never edit an applied versioned migration or an adopted baseline.
- Inspect `src/main/resources/db/migration/` to choose the next unused version; do not rely on a
  stale number in prose.
- Use descriptive `V{version}__{scope}_{purpose}.sql` names.
- Keep migrations deterministic, bounded, and compatible with MySQL.
- Add precondition/audit guards before making existing data stricter. Do not invent tenant scope or
  silently discard inconsistent data just to make a migration pass.
- Separate schema expansion, data backfill, enforcement, and destructive cleanup when a staged
  rollout reduces risk.
- Index the actual tenant-scoped access paths and foreign keys. Avoid speculative indexes on every
  column.
- Define foreign keys and uniqueness from domain ownership. With soft deletion, design active-row
  uniqueness deliberately for MySQL rather than assuming a nullable timestamp solves it.
- Use optimistic `version` columns only for aggregates that need concurrent edit detection.
- Add `custom_fields_json` or `metadata_json` only for approved extensibility/dynamic metadata;
  do not hide stable searchable business fields in JSON.

Common mutable business records normally carry creator/updater timestamps and actor references.
Retention strategy depends on the record class:

- mutable operational records may use soft deletion;
- financial ledgers, audit, and billing events are normally append-only or reversed, not deleted;
- ephemeral security tokens may be irreversibly consumed and later purged;
- privacy/offboarding purges follow the approved retention workflow and audit requirements.

Hard deletion is a lifecycle decision, not a generic CRUD endpoint.

Business Structure units and businesses use an inactive lifecycle when removed from the active
structure. Inactive organizational records are excluded from new-assignment selectors but retain
their identifiers and labels for related historical records and historical filters. Saving the
structure, its active map, and lifecycle changes is one transaction.

The Sales commission reporting owner contract is documented in
[`sales-commission-reporting-contract.md`](./sales-commission-reporting-contract.md). Its summary POST
is a filter-only read and uses the central KPI conversion engine; it does not create financial entries.

## 10. Transactions, Concurrency, And Idempotency

Services/use cases own transaction boundaries. A single transaction must cover the invariant being
protected, particularly for:

- money, balances, budgets, payments, refunds, and billing;
- inventory movements and POS checkout;
- status transitions and approvals;
- entitlement/seat allocation;
- attachment registration after object verification;
- multi-record provisioning or scope changes.

Use database locks, unique keys, optimistic versions, or compare-and-set updates according to the
concurrency risk. Do not use an in-memory check followed by an unprotected write for a shared
capacity or balance.

Webhook delivery, checkout, payment, kiosk actions, imports, and retryable commands need explicit
idempotency. Store enough outcome information to return or reconcile duplicate attempts safely.
Do not hold database transactions open across slow network calls when a durable intent/outbox or a
two-step workflow can protect consistency.

## 11. Money, Quantity, And Time

- Java monetary values use `BigDecimal`; SQL uses a reviewed `DECIMAL` precision/scale, normally
  `DECIMAL(19,4)` for the existing financial modules.
- Never use binary floating point for authoritative money.
- Currency is explicit with an ISO-style canonical `currency_code`; validate supported currencies
  and define rounding at the business boundary.
- The backend computes authoritative totals, balances, taxes, availability, counts, and health
  states. Requests contain inputs, not trusted derived outcomes.
- Store timestamps in the repository's UTC convention. Resolve company/user timezone only at the
  domain or presentation boundary.
- Effective-dated fiscal/payroll rules retain the exact version or snapshot used for an approved
  calculation.

### 11.1 Exchange-Rate Reference Contract

The `exchange` package owns the authenticated operational-reference endpoint
`GET /api/v1/exchange-rates/daily`. Its response remains based on USD and includes the rate,
observation date, institution, dataset, source URL, verification status and any fallback warning
for every supported currency.

Rules:

- the server owns an allow-listed provider chain and fixed URLs; the browser cannot supply an
  arbitrary provider or target URL
- MXN uses Banxico SIE when its server-side token is configured, then the European Central Bank
  reference distributed by Frankfurter; undocumented Yahoo Finance or Google Finance endpoints
  are not production dependencies
- if current providers fail, use the last verified persisted observation before the documented
  internal reference, and expose that degraded status and warning in the response
- normal reads reuse the current-day snapshot; an explicit `refresh=true` may refetch and replace
  that day's cache without changing user preferences or financial source records
- the daily lock and same-day upsert prevent competing refreshes and duplicate snapshots
- provider calls use bounded timeouts, validate the expected currency pair and never log tokens or
  raw credentials

These are informational rates for operational estimates. Native currencies, transaction records
and legally relevant values remain unchanged.

## 12. Canonical Status And Workflow Rules

Persist canonical English values, normally uppercase constants such as `DRAFT`,
`PENDING_APPROVAL`, `PAID`, or `CLOSED`. Use `VARCHAR`, not database `ENUM`, following the current
schema convention.

A workflow transition must validate:

- current status and allowed next status;
- actor capability and organizational scope;
- required evidence or fields;
- concurrency/version;
- financial/inventory side effects;
- immutable snapshot/audit requirements.

Legacy frontend values are translated by an adapter at the compatibility boundary. They never
become a second backend vocabulary.

## 13. Finance Invariants

Approved Finance domain contracts remain authoritative. General rules include:

- Treasury is the sole owner of payment-account balance mutations. New account impacts from
  Expenses, Funds, and POS append idempotent movements through that owner contract; they do not
  update account balance projections directly. Sales collections use `SalesCollectionService` as
  the explicit Sales-to-Treasury owner bridge. A confirmed electronic route sale must carry a
  tenant-, currency-, type-, and scope-valid bank account and append its Treasury movement in the
  same transaction as the sale. Route cash remains in seller custody until an explicit handoff, and
  route credit remains receivable; neither invents a bank deposit.
- A payment account answers where money is held, a fund answers its purpose and custody, and a
  budget answers how much spending is authorized. These concepts remain separate even when one
  operation links all three.
- Available and pending balances remain distinct. A pending collection becomes available only
  through an auditable settlement movement.
- A petty-cash issuance or bank-to-fund transfer is a fund movement, not an expense.
- Every petty-cash entry increases the fund exactly once and every captured exit decreases it
  exactly once. Receipt approval classifies evidence and must not move cash a second time.
- Both internal and external funds may receive from an authenticated company Payment Account.
  Only external funds may instead name Medios externos. The former moves company Treasury; the
  latter changes custody and external-fund balance together, leaving company-owned cash unchanged.
- A positive balance return selects its destination per closing operation. Validate a company
  account against tenant, active status and native currency before mutation; an external fund may
  instead record a named external destination. Legacy defaults are compatibility fallback only.
- Fund-type changes are prospective stages with reason, effective date, optimistic version and
  immutable statement snapshots. Earlier Expenses and external validations retain their original
  treatment. The transition preserves the fund balance and creates no Treasury movement.
- An expense represents actual business consumption.
- Expense payment state is derived only from approval, idempotent payment, close, and reversal
  workflows. A generic status endpoint may preserve an already-current legacy value for
  compatibility, but it must not manufacture paid amounts or move money.
- Every expense payment locks the expense aggregate, carries a company-scoped idempotency key when
  supplied by the client, and records its payment history in one transaction. An assigned payment
  account also receives its Treasury movement in that transaction. The explicitly approved paid
  capture and single-expense settlement exceptions below can record payment without a bank
  assignment and cannot move bank money.
- Generic PUT/delete remain draft-only; explicit removal is governed below. Per the 2026-09-09 user correction decision,
  `POST /api/v1/finance/expenses/{id}/corrections` allows versioned, audited corrections to ordinary
  unposted drafts, submitted, approved, partially paid and paid expenses. It preserves paid amounts,
  payment dates/history and Treasury movements; recalculates balance/status and refreshes budget
  consumption. Paid/budget-linked currency, source links, fund custody and posted journals remain
  protected. A total below recorded payments requires a payment correction/reversal first. Bulk
  edits invoke this same owner atomically. Closed/cancelled/rejected and PO sources remain protected.
- Per the 2026-09-10 payment-correction decision,
  `POST /api/v1/finance/expenses/{expenseId}/payments/{paymentId}/reversal` is an authenticated,
  capability/tab/CSRF protected write with `expectedVersion` and a nonempty reason (max 500).
  It locks company, scoped expense and history, and reverses only the last registered active
  installment. Payment ID makes retries idempotent without undoing a subsequent payment. Original
  amount/date/actor/evidence remain; V273 adds reversal timestamp, actor and reason. Effective paid
  amount, balance and latest effective payment context are recomputed. With no effective payments,
  the expense is approved/unpaid (overdue when due); otherwise it retains its earlier partial balance.
  Consumption, expense date and native currency are preserved, including currency after reversal.
  Treasury restores only the matching actual original debit, including inactive source accounts;
  an unassigned payment or legacy history without a bank movement never creates cash. Inconsistent
  history or an ambiguous bank movement fails atomically. Fund, PO, audited/closed/terminal records
  and any posted expense/payment journal require their source/accounting adjustment workflow.
  Reversed history is excluded from payment KPIs, payable-kiosk projections, accounting discovery
  and subledger totals. A new payment requires a fresh key; keyless legacy clients receive an internal
  UUID to prevent reuse of a cumulative-amount Treasury event after reversal.
- The explicit payment use case resolves draft/submitted approval and records the payment in one
  transaction, serialized with corrections; failure rolls back approval too. Retrying the same key
  returns the recorded result without another debit.
- Per the 2026-09-10 payment-action decision, `POST /api/v1/finance/expenses/{id}/settle-payment`
  is a protected, CSRF-checked Expenses write. Its typed request supplies an optional payment account
  and a required idempotency key; the server locks company and scoped expense, calculates the exact
  remaining balance and defaults the payment date to today in the company's business timezone.
  It records one final installment through the same transactional payment owner, preserving prior
  payments and the original expense date. A supplied account must be active, company-owned, outside
  fund custody and match native currency. An explicitly unassigned settlement records history with
  a null account and no Treasury debit, following the paid-capture rule. No evidence file is required.
  Audited/terminal/fund-owned expenses remain protected. The `SETTLE:` key namespace is reserved;
  settlement retries return the existing result without a second payment, including across midnight.
  The ordinary record-payment and selected-row settlement contracts still require an account.
- Selected-row classification adjustments and audited bulk reversals follow
  `docs/finance-bulk-actions-and-workspace-memory-contract-v1.md`. Ordinary unposted expenses
  may change organizational/provider/account classifications through that explicit owner contract;
  existing payment history and fund custody remain protected.
- Per the 2026-09-10 expense-removal decision, DELETE in the explicit bulk-action owner performs
  a reasoned, versioned soft deletion plus exact Treasury/posted-journal reversal atomically.
  Audited/closed expenses and purchase orders with any receipt are protected; fund ownership remains
  unchanged. The detailed reversal and accounting-period requirements live in the bulk-actions contract.
- Expense accounting classification is an explicit account-only operation, with company/scope
  checks, optimistic version validation and server-owned audit history. Ordinary expenses may be
  classified before journal posting without modifying amounts, payment evidence, currency or
  status. Fund-origin expenses, cancelled/rejected expenses, and posted journal sources are protected.
  Classification and financial synchronization serialize through the authenticated company row.
- Bulk expense imports and edits are atomic transactions (1–200 rows). Per the 2026-09-09 user
  decision, paid imports and individual paid capture allow unassigned payment and accounting accounts. The import-specific
  expense owner records full payment history with native currency, original expense/payment date,
  actor and timestamp even when the payment account is null. It creates no Treasury movement and
  chooses no default account for such a payment. If supplied, the account must be active,
  company-owned, match native currency and be outside fund custody; payment history and Treasury
  remain atomic. Ordinary payment endpoints and selected-row settlement still require an account.
  Pending imports preserve the supplied due date and only preselect an optional eligible account.
  Import-specific included-tax markers require a boolean and an explicit valid rate when enabled;
  the backend splits the gross amount with BigDecimal and existing two-decimal rounding. Legacy
  callers retain their explicit tax breakdown. Import retry evidence is unique by company/request
  key, bound to actor and payload hash, and returns original expense IDs on an identical retry.
  Automatic folio creation serializes by company. Selected-row payment/due-date operations follow
  the Finance bulk owner contract and cannot erase payment history by changing a status label.
- A petty-cash settlement links or creates expenses from accepted evidence without double counting
  issuance, settlement, and resulting expenses.
- Signed monthly fund closure and explicit approval without an attachment follow
  `docs/petty-cash-statement-close-resolution-contract-v1.md`. Accepted receipt states survive
  attachment changes; carryover is an opening projection, and balance resolutions are audited
  adjustments. Payroll remains the owner of applying a queued shortage deduction.
- A purchase order commits budget but does not itself move money.
- A budget is a container; the budget line is the operational control aggregate.
- Per the 2026-09-10 monthly-obligation decision, scheduled Budget Control lines create real unpaid
  payables through the Expense owner when their scheduled month arrives. The occurrence ledger,
  company/scope validation, rollout reconciliation and retry rules are defined in
  `docs/budget-monthly-obligations-contract-v1.md`. Generation creates no payment or Treasury
  movement; existing installments, deletions and linked expenses cannot be regenerated or overwritten.
- Reporting distinguishes committed, actual, issued, and settled amounts.
- Approved financial records are reversed or adjusted through an auditable workflow, not silently
  overwritten or deleted.

POS destination policy, universal cash, retained cash, cut settlement, and the Treasury ledger are
governed by `docs/pos-treasury-settlement-contract-v1.md`.

For the current budget-line foundation, `plannedAmount` is the editable input. The backend derives:

```text
availableAmount =
  plannedAmount
  - committedAmount
  - actualExpenseAmount
```

Funding transfers custody and does not consume budget. Issued and settled fund amounts remain
separate disclosures; an authorized receipt consumes actual expense once. This decision is adopted
in `docs/kpi-financial-closeout-contract-v1.md`.

The approved health state remains derived from the approved domain contract. Do not copy this
formula into controllers or frontend components, and do not expand it to another financial domain
without confirming that domain's accounting meaning.

## 14. Files, Object Storage, And Sensitive Data

Use the existing `ObjectStorageService`/presigned flow:

1. authorize the actor and target entity;
2. issue a short-lived presigned upload for a server-generated tenant-scoped object key;
3. upload directly to object storage;
4. verify object existence, ownership metadata, expected size/type, and target state;
5. register attachment metadata transactionally;
6. serve access through a newly authorized short-lived URL or backend stream.

Never store normal file bodies in MySQL. Never trust a raw client filename as an object key. Enforce
size, type, extension/content consistency, quota, and attachment count. High-risk formats require
quarantine/scanning policy before they become downloadable.

Object keys, buckets/prefixes, presigned operations, background cleanup, and logs must preserve
tenant isolation. Biometric material, payroll documents, credentials, and legal/financial evidence
need their approved retention and access audit.

## 15. Cross-Module And External Integrations

The owner module remains the source of truth. Another module may reference it through an explicit
service/contract, immutable snapshot, identifier, or event; it must not write the owner's tables
directly as a shortcut.

External providers are behind narrow gateways. Validate signatures/callback state, use timeouts,
classify retryable failures, redact logs, and reconcile asynchronous truth. Stripe remains the
external payment processor/source for processor events; Indice stores verified projections and
audit needed for product operation.

No PAN, CVV, raw card credential, provider secret, or reusable third-party token belongs in normal
Indice application payloads or tables.

## 16. Observability And Audit

Use structured, sanitized events with request correlation. Record the actor, tenant, action,
resource reference, outcome, and safe reason for privileged, financial, billing, access, lifecycle,
and public-channel events.

Do not log request bodies by default. Never log passwords, OTP values, raw reset/invitation tokens,
session/cookie values, webhook secrets/signatures, PINs, full object-storage URLs, biometric data, or
unnecessary PII. Audit trails must be queryable and retention-controlled; application logs are not
a substitute for domain audit.

Background jobs need bounded batches, leases/locking when multiple workers are possible, retry and
dead-letter/reconciliation behavior, tenant context, metrics, and safe failure visibility.

## 17. Execution And Scope Control

Prefer bounded vertical slices that can be verified independently:

1. inspect the current contract and risks;
2. define ownership, scope, permission, API, and persistence impact;
3. add or update regression coverage;
4. implement the smallest coherent use case;
5. verify and report remaining work.

Do not arbitrarily build catalog CRUD, financial workflow, attachments, analytics, frontend
redesign, and deployment in one change. Conversely, do not split an atomic invariant across phases
that would leave production unsafe. Scope work by risk and deployability, not by an inflexible
"one entity per prompt" rule.

Only modify the requested module and necessary shared contracts. Explain and test any shared or
cross-module change.

## 18. Testing Standard

New behavior needs focused tests at the lowest useful layer plus integration coverage at security,
transaction, persistence, or contract boundaries.

At minimum, consider:

- happy path and validation failures;
- unauthenticated, unauthorized, wrong-module, and wrong-tab cases;
- tenant A cannot read, mutate, attach to, or infer tenant B data;
- unit/business/user scope violations;
- CSRF failure for every browser mutation family;
- duplicate/idempotent delivery and concurrency where applicable;
- status transitions and immutable/derived fields;
- rollback on partial financial or multi-record failure;
- error response redaction;
- migration startup and existing-data preconditions.

Run focused tests first, for example:

```bash
./mvnw -Dtest=SpecificTest test
./mvnw -DskipTests compile
```

For schema work, also run `MigrationVersionUniquenessTest` and an application startup/migration
test against the isolated test database. Run the full suite when the change is cross-cutting or
release-bound. Never point tests at `indice_db` or production.

## 19. Completion And Reporting

A backend change is complete only when its authorized behavior works, protected behavior remains
covered, relevant tests pass, and documentation/contracts reflect intentional changes.

Report, in proportion to the task:

- files and contracts changed;
- migrations/tables/endpoints/DTOs affected;
- authentication, CSRF, entitlement, tenant, and narrower-scope enforcement;
- transaction, money/status, derived-field, idempotency, and audit behavior where applicable;
- focused tests, compile/full-suite results, and unrelated failures;
- largest changed Java file if structural size was relevant;
- non-English identifiers introduced or changed;
- known risks and the next safe phase.

Use `N/A` when a category does not apply. Do not create files or abstractions merely to satisfy the
report format.

## 20. Golden Rule

The backend is the authority for access, business invariants, and durable state.

Build scoped use cases, not quick endpoints. Preserve customer behavior, make tenant boundaries
unavoidable, keep financial truth reproducible, and require evidence before declaring a public
release safe.
