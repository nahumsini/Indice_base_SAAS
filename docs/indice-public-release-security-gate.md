# Indice Public Release Security Gate v1.0

Status: canonical release gate; evidence checklist, not a security certification

Applies to: any internet-accessible production release, paid customer cohort, public signup,
public demo, kiosk/public portal, Stripe LIVE activation, or production data migration

Owner: release owner coordinates evidence; domain owners close findings in their area

## 1. Release Rule

A successful build is not proof that a release is safe. A public release is approved only when:

1. the exact release artifact and environment are identified;
2. every blocking gate has current evidence;
3. unresolved findings have an owner, severity, due date, and explicit acceptance by the authorized
   product/release owner;
4. rollback, backup, monitoring, and incident response are ready;
5. the decision is recorded without including secrets or sensitive customer data.

Never label the application "secure", "compliant", or "certified" from this checklist alone.
Security is an ongoing risk-management process and production controls must be revalidated after
material changes.

## 2. Verification Baseline

Use the following external standards as the test vocabulary:

- [OWASP ASVS 5.0.0](https://github.com/OWASP/ASVS/tree/v5.0.0_release/5.0) as the application
  verification baseline. Target Level 2 for the authenticated SaaS and explicitly select stronger
  controls for platform administration, authentication, payroll, biometrics, billing, and other
  high-impact functions through threat modeling.
- [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) for API
  object/function/property authorization, resource consumption, inventory, and unsafe integration
  risks.
- [OWASP Multi-Tenant Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html)
  for tenant context, database/cache/storage isolation, onboarding/offboarding, and tenant-aware
  monitoring.
- [NIST SP 800-218 SSDF](https://csrc.nist.gov/pubs/sp/800/218/final) for the secure development and
  vulnerability-response process.
- [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html) for authentication,
  authenticator, rate-limiting, recovery, and session guidance.
- [Spring Security CSRF](https://docs.spring.io/spring-security/reference/features/exploits/csrf.html)
  and [security header guidance](https://docs.spring.io/spring-security/reference/features/exploits/headers.html)
  for the servlet/browser boundary, even while Indice uses custom session and CSRF services.

Record the exact standard version used in the release evidence. Do not follow a moving development
branch without review.

## 3. Evidence Status

Use these states for every item:

- `PASS`: verified against the release candidate and target-like environment;
- `FAIL`: tested and not satisfied;
- `UNKNOWN`: not tested or evidence is stale;
- `N/A`: demonstrably outside the release scope, with rationale;
- `ACCEPTED`: known residual risk explicitly accepted by an authorized owner with expiry date.

`UNKNOWN` is not `PASS`. A blocking `FAIL` or `UNKNOWN` prevents release. An acceptance cannot waive
a known cross-tenant disclosure, authentication bypass, payment integrity issue, unrecoverable data
loss risk, exposed secret, or actively exploitable critical/high vulnerability.

Evidence should name:

- release commit/image digest;
- environment and configuration profile;
- command/test/check performed;
- timestamp and responsible reviewer;
- sanitized result or artifact location;
- linked finding when not `PASS`.

## 4. Gate 0 — Scope And Attack-Surface Inventory

- [ ] Exact Git commit and immutable frontend/backend image tags or digests are recorded.
- [ ] Target hostnames, reverse proxies, backend replicas, databases, object storage, email, Stripe,
      face/biometric services, scheduled jobs, and third-party integrations are inventoried.
- [ ] Every controller route is classified as authenticated, platform-admin, public, webhook,
      signup/recovery, kiosk/portal, internal health, or disabled.
- [ ] Every public route has an owner, purpose, accepted methods, request limit, authentication or
      alternate trust mechanism, sensitive-data classification, and audit expectation.
- [ ] Feature flags and commercial enforcement modes for the cohort are recorded. A disabled guard
      is not described as enforced.
- [ ] Released, pilot, demo, planned, and retired modules match the backend catalog and visible
      frontend routes.
- [ ] OpenAPI/API inventory matches deployed routes or differences are documented.
- [ ] Debug, development, test-only, actuator, database, MinIO console, and backend-direct ports are
      not publicly reachable unless explicitly protected and required.

Blocking evidence: endpoint/asset inventory and an external port/route review of the target-like
environment.

## 5. Gate 1 — Authentication And Session Security

- [ ] Login, MFA, password reset, invitation acceptance, email verification, logout, session
      expiry, and privileged account recovery have end-to-end tests.
- [ ] Production MFA policy is explicit. Platform root/super-admin access uses the strongest
      approved policy and cannot silently fall back when email or an external provider fails.
- [ ] Login, OTP send/verify, reset, invitation, signup, and other credential endpoints are rate
      limited with generic responses that do not enable account enumeration.
- [ ] Successful login/MFA changes the session identifier; logout and credential/security changes
      invalidate relevant sessions and rotate CSRF state.
- [ ] Session cookies are `Secure`, `HttpOnly`, and have the approved `SameSite`, path, domain, and
      lifetime for the deployed topology.
- [ ] Idle and absolute timeouts are tested for each privileged role, including multi-tab behavior
      and server restart behavior.
- [ ] State-changing browser requests require a valid `X-CSRF-Token`. Safe HTTP methods do not
      mutate durable state.
- [ ] Password policy, storage work factor, blocklist/rate-limit behavior, reset-token hashing,
      expiry, single use, and redaction are reviewed against the selected authentication baseline.
- [ ] No reusable authentication/session secret is stored in browser `localStorage` or exposed in
      URLs, analytics, referrers, logs, or error payloads.
- [ ] Security-relevant login/recovery events create sanitized audit records and operational alerts
      at reviewed thresholds.

Blocking evidence: `AuthLoginSecurityIntegrationTest` and related auth tests, negative CSRF tests,
cookie inspection over HTTPS, and manual/automated timeout verification in a target-like environment.

## 6. Gate 2 — Authorization And Tenant Isolation

- [ ] Authentication is fail-closed for every protected route. No route depends solely on a
      controller author remembering a manual check without inventory/test coverage.
- [ ] Entitlement, subscription lifecycle, company module assignment, tab permission, role,
      organizational scope, and object ownership are tested as separate gates where applicable.
- [ ] Tenant context is derived from the authenticated server session or an approved verified public
      context, never trusted from client body/query/path/header authority fields.
- [ ] Reads, mutations, existence checks, uniqueness checks, locks, exports, counts, search, and
      attachment operations are tenant-scoped.
- [ ] Every path/body object identifier is tested against a same-role user from another company.
      Tenant B data cannot be read, changed, deleted, attached to, counted, or inferred by tenant A.
- [ ] Unit-, business-, employee-, and self-service scope have negative tests, including references
      that exist but belong to a different scope.
- [ ] Platform-admin cross-tenant actions use a dedicated access service, reason/audit trail, and do
      not reuse an ordinary tenant endpoint with a client-supplied company override.
- [ ] Cache keys, queues/jobs, idempotency records, exports, storage keys, and notifications include
      and validate the correct tenant boundary.
- [ ] Public demo accounts cannot access real-customer data or privileged production operations and
      have an explicit reset/retention strategy.

Blocking evidence: automated two-tenant integration tests for every released module/API family and
an endpoint authorization matrix reviewed against deployed routes.

## 7. Gate 3 — API, Browser, And Input Security

- [ ] Request DTOs allow-list mutable fields and validate length, format, range, collection size,
      pagination, date windows, and nested depth.
- [ ] SQL is parameterized. Dynamic identifiers/sort fields are allow-listed rather than bound from
      arbitrary input.
- [ ] Responses expose only approved fields. Mass assignment and excessive data exposure tests cover
      privileged, personal, payroll, biometric, billing, and audit properties.
- [ ] Error responses do not contain stack traces, SQL/provider errors, secrets, filesystem paths,
      internal hostnames, or unnecessary PII.
- [ ] CORS uses the exact production origin allow-list with credentials; wildcard or reflected
      origins are rejected.
- [ ] HTTPS is enforced at the edge and proxy trust/forwarded-header configuration is reviewed.
- [ ] HSTS, content-type sniffing protection, frame protection/`frame-ancestors`, Referrer-Policy,
      Permissions-Policy, and a tested Content Security Policy are configured at Spring or Nginx.
- [ ] CSP is deployed in report-only mode first when necessary, violations are reviewed, and the
      enforced policy does not require broad `unsafe-*` exceptions without documented rationale.
- [ ] User-controlled rich text, filenames, URLs, redirects, CSV/Excel exports, print output, and
      rendered HTML are encoded or constrained for their output context.
- [ ] API and public-route rate limits protect resource-intensive search, export, upload, kiosk,
      signup, and integration endpoints from abuse.

Blocking evidence: header/CORS checks against the public URL, API negative tests, and an automated
dynamic scan authenticated as a non-privileged test tenant with destructive actions disabled or
isolated.

## 8. Gate 4 — Data Protection, Privacy, And Retention

- [ ] Data is classified at least as public, internal, confidential, sensitive personal, financial,
      credential/security, payroll, or biometric.
- [ ] Collection and API responses are minimized to the use case. Demo and test environments use
      synthetic data, not production copies without an approved anonymization process.
- [ ] TLS protects data in transit between public clients and the edge and across untrusted service
      boundaries.
- [ ] Database, backups, object-storage volumes, and secret files use the approved at-rest
      protections and access controls for their hosting environment.
- [ ] Payroll, HR records, biometrics, payment evidence, tax IDs, addresses, and identity documents
      have documented access, audit, retention, export, correction, and deletion/legal-hold policy.
- [ ] Customer cancellation/offboarding transitions access safely, supports approved export, and
      purges only after the documented retention period and legal constraints.
- [ ] Logs, traces, analytics, email, support tooling, and backups follow the same classification and
      retention limits.
- [ ] Privacy notices, consent flows, processor/subprocessor inventory, and jurisdiction-specific
      obligations for Canada and served LATAM markets have authorized legal review.

Blocking evidence: approved data-flow/retention inventory and sampled verification of database,
storage, logging, backup, and offboarding behavior. Engineering evidence does not replace legal
review.

## 9. Gate 5 — Files, MinIO, And Public Content

- [ ] Presigned operations are short-lived, operation-specific, and issued only after authorization.
- [ ] Object keys are generated server-side, tenant-scoped, non-guessable where appropriate, and do
      not contain unsafe raw filenames or unnecessary PII.
- [ ] Registration verifies expected object existence, tenant/target ownership, size, content type,
      quota, and entity state before making the file reachable.
- [ ] Upload limits exist at Nginx, Spring, presign policy, and application metadata layers without
      contradictory values.
- [ ] Executable/active/high-risk file types are rejected or quarantined and scanned according to
      the approved policy. Downloads use safe disposition and content-type behavior.
- [ ] Presigned URLs, bucket credentials, biometric objects, and private documents do not appear in
      logs, persistent frontend storage, public metadata, or unauthorized caches.
- [ ] Cross-tenant object-key substitution and stale/revoked access have negative tests.
- [ ] Orphan upload cleanup cannot delete another tenant's or a registered object's data.

Blocking evidence: two-tenant upload/download/registration tests, size/type abuse tests, CORS review,
and target-like MinIO policy inspection.

## 10. Gate 6 — Billing, Stripe, And Financial Integrity

- [ ] Stripe LIVE remains disabled until the live catalog, tax configuration, webhook endpoint,
      secrets, and accountant-approved jurisdictions pass the dedicated runbooks.
- [ ] Webhook signatures are verified against the raw body before parsing or durable business
      effects. Invalid signatures fail without leaking verification detail.
- [ ] Webhook events and client-triggered billing actions are idempotent, auditable, retryable, and
      reconcilable. Duplicate/out-of-order delivery tests pass.
- [ ] Client input never authoritatively sets price, currency, entitlement, seat allowance, tax,
      balance, paid status, or Stripe object ownership.
- [ ] Checkout/portal redirect targets are server-configured allow-listed HTTPS URLs.
- [ ] PAN, CVV, or raw reusable card credentials never reach Indice logs, API payloads, database, or
      support tooling.
- [ ] Subscription lifecycle, grace/read-only/retention transitions, seats, storage blocks, module
      entitlements, refunds/cancellations, ownership transfers, and reconciliation have regression
      and concurrency tests.
- [ ] Financial totals use `BigDecimal`, explicit currency/rounding, immutable evidence/snapshots,
      and balanced or domain-approved reversal behavior.
- [ ] Stripe restricted keys are used where feasible, stored outside the repository, and rotated
      after any suspected exposure or non-production sharing.

Blocking evidence: Stripe TEST end-to-end certification, webhook replay/signature suite,
`INDICE_STRIPE_LIVE_GO_LIVE_RUNBOOK.md`, and sanitized output from
`deployment/scripts/audit-stripe-live-readiness.sh` immediately before LIVE activation.

## 11. Gate 7 — Secrets And Production Configuration

- [ ] No real `.env`, private key, credential, token, database dump, customer export, or secret file
      is committed or included in build context/artifacts.
- [ ] Production secrets are unique per environment/purpose, sufficiently random, least-privileged,
      stored in protected files or a secret manager, and readable only by the required service.
- [ ] Default/local credentials and placeholder secrets cause production preflight/startup failure.
- [ ] Secret rotation and revocation are documented for database, MinIO, kiosk encryption/token,
      MFA hashing, email, Stripe, and external-service credentials.
- [ ] Production URLs, CORS, secure cookies, forwarded headers, storage endpoints, feature flags,
      email sender, Stripe mode, and datasource configuration are reviewed together.
- [ ] Build and runtime output redact secret values. Support diagnostics reveal presence/status, not
      the secret.
- [ ] Repository and release history have current secret scanning. Any discovered secret is revoked
      before history cleanup is considered.

Blocking evidence: production `preflight.sh` using the protected real environment, secret scan of
the repository/history and artifacts, filesystem/secret-manager permission review, and rotation
runbook availability.

## 12. Gate 8 — Dependencies And Build Supply Chain

- [ ] Maven and npm lock/resolve reproducibly; dependency changes are reviewed and direct sensitive
      integrations remain version-pinned where the build permits it.
- [ ] CI runs tests, migration validation, frontend typecheck/build/regressions, script/Compose
      validation, container builds, and backend runtime smoke tests.
- [ ] Software composition analysis covers Maven, npm, base container images, and runtime images.
      Known exploitable critical/high findings are fixed or explicitly triaged before release.
- [ ] Static analysis and secret scanning run in CI or as documented release checks.
- [ ] Third-party build actions/images are pinned to an approved version/digest strategy and use
      least-privileged CI permissions.
- [ ] Release artifacts have immutable identifiers, provenance/checksums, and an SBOM retained with
      the release evidence.
- [ ] Build contexts exclude `.git`, local env files, dumps, test artifacts, and unnecessary source
      or credentials.

Blocking evidence: green CI for the exact commit, SCA/container scan, static/secret scan, SBOM, and
artifact digest record.

## 13. Gate 9 — Logging, Monitoring, And Incident Response

- [ ] Structured correlation connects edge request, backend action, job/webhook, audit event, and
      safe tenant/resource references.
- [ ] Logs exclude passwords, OTPs, tokens, session IDs/cookies, PINs, raw signatures/secrets,
      card data, biometric payloads, full private URLs, and unnecessary PII.
- [ ] Privileged access, repeated auth failures, cross-tenant denials, entitlement changes, public
      token abuse, webhook failures, payment failures, job backlogs, storage failures, and destructive
      actions have reviewed alerts.
- [ ] Health checks distinguish liveness/readiness without exposing sensitive configuration.
- [ ] Audit events are durable, access-controlled, retention-defined, and protected from ordinary
      tenant mutation.
- [ ] A security contact, severity model, containment procedure, secret/session revocation plan,
      customer/regulatory communication owner, evidence preservation process, and post-incident
      review are documented.

Blocking evidence: alert tests, sanitized log sampling, audit queries, on-call ownership, and a
tabletop exercise for account takeover or cross-tenant exposure.

## 14. Gate 10 — Availability, Backup, Restore, And Rollback

- [ ] Database and object-storage backups are automated, encrypted/protected, monitored, retention-
      controlled, and isolated from ordinary application credentials where possible.
- [ ] A restore drill has proven the current backup format, schema, object references, and acceptable
      RPO/RTO in a non-production environment.
- [ ] Capacity limits and per-tenant protections cover database pools, uploads/storage, exports,
      queues/jobs, sessions, public endpoints, and external provider degradation.
- [ ] The deployment topology matches session storage. With in-memory servlet sessions, production
      remains one backend replica or deliberately uses sticky sessions; multi-replica deployment
      requires tested shared session storage.
- [ ] Flyway changes have compatibility and rollback/forward-fix analysis. Application rollback does
      not assume the database migration can be reversed.
- [ ] The prior immutable application images and a verified database/object backup are available.
- [ ] Restore and rollback commands identify exact targets and do not delete volumes or production
      data as a recovery shortcut.

Blocking evidence: dated restore drill, migration review, capacity/timeout review, and successful
dry-run of the release-specific rollback procedure.

## 15. Gate 11 — Deployment And Post-Deployment Verification

- [ ] `deployment/env/.env` is host-protected, production-specific, and never copied from APPTEST
      without complete review.
- [ ] `./deployment/scripts/preflight.sh` passes with the real production environment, not
      `--example`.
- [ ] Required pre-migration scope/data audits return the expected result and a verified backup
      exists before Flyway runs.
- [ ] Images use the exact approved immutable release identifier.
- [ ] A deployment dry-run validates paths, environment, images, ports, writable locations, and disk
      capacity without changing active containers.
- [ ] Post-deploy `smoke-test.sh` passes through the public HTTPS URL.
- [ ] Human UAT covers login/MFA, permissions for representative roles, file upload/download, one
      representative flow per released high-risk module, Stripe flow when applicable, and physical
      kiosk/device behavior when applicable.
- [ ] External verification confirms TLS/certificate, DNS, headers, CORS, public ports, asset hash,
      backend health, and no APPTEST/production crossover.
- [ ] Monitoring is observed during a defined canary window and rollback authority is present.

Blocking evidence: sanitized preflight, migration, smoke, UAT, external check, and canary records
for the exact release.

## 16. Initial Repository Risk Register

These are verification targets discovered while creating this gate. They are not declarations that
the deployed system is vulnerable, and they remain `UNKNOWN` until tested against the release:

| Target | Why it needs evidence | Required closure |
| --- | --- | --- |
| Complete protected-route auth inventory | The code uses custom/manual session guards plus several interceptors rather than one full `SecurityFilterChain`; missing-session behavior must be proven fail-closed for every protected controller. | Route matrix plus unauthenticated integration test coverage. |
| Cross-tenant sweep | Tenant services and scoped repositories exist, but a paid ERP needs systematic evidence across every released module and object identifier. | Automated two-tenant negative suite in CI. |
| Browser security headers/CSP | Spring Security crypto is present, but secure response-header enforcement must be verified at the deployed Nginx/public URL. | Automated public-header test and reviewed CSP. |
| SAST/SCA/secret scan/SBOM | Current CI visibly builds and tests; dedicated security scans and release SBOM need explicit evidence. | Add or document repeatable release checks and triage policy. |
| Shared sessions before horizontal scale | Deployment documentation identifies servlet sessions as single-replica unless externalized. | Remain single-replica or implement/test shared session storage before scaling out. |
| Backup restoration | A checklist requiring backup does not prove recoverability. | Dated database + object-storage restore drill. |
| Privacy/legal operating model | Indice handles HR, payroll, financial, identity, and biometric data across jurisdictions. | Approved classification, retention, consent, offboarding, and legal review. |

## 17. Minimum Repository Commands

Run commands against the isolated test database and the exact release candidate:

```bash
./mvnw -B -ntp -Dtest=MigrationVersionUniquenessTest,IndiceErpApiApplicationTests test
./mvnw -B -ntp test
npm ci --prefix react --no-audit --no-fund
npm run typecheck --prefix react
npm run build --prefix react
./deployment/scripts/preflight.sh
./deployment/scripts/smoke-test.sh
git diff --check
```

These are minimum engineering checks, not the entire security gate. The production preflight needs
the protected real environment; `--example` validates only repository mechanics. Add the security
scans, tenant sweep, dynamic/header checks, backup restore, and UAT evidence required above.

## 18. Release Decision Record

Store a sanitized release record outside secret-bearing environment files with:

```text
Release:
Commit and image digests:
Production/staging environment:
Customer cohort/features enabled:
Gate status summary:
Blocking findings: 0
Accepted residual risks (owner + expiry):
Backup/restore evidence:
Preflight/smoke/UAT evidence:
Monitoring/canary window:
Rollback target and authority:
Approved by:
Date:
```

No release is approved merely because the final line is filled in. The linked evidence and zero
unresolved blockers are the decision basis.
