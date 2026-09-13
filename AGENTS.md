# Indice Repository Working Rules

These instructions apply to the entire repository.

## Authority And Documentation

Use this precedence when repository documents disagree:

1. The user's latest explicit instruction for the current task.
2. This file.
3. The canonical document for the affected area.
4. The affected module's domain contract or approved standard.
5. Dated implementation notes and historical plans.

Within the extension points allowed by a canonical document, the most specific approved contract
controls its named domain. It cannot weaken repository-wide tenant, authorization, data-integrity,
or release-safety invariants without an explicit replacement decision.

Canonical documents:

- Frontend: `docs/indice-frontend-operating-system-v2.md`
- Backend: `docs/indice-backend-operating-system-v1.md`
- Public release security: `docs/indice-public-release-security-gate.md`
- Deployment and rollback: `deployment/README.md`
- Premium multitenancy and billing: `docs/INDICE_PREMIUM_MULTITENANT_BILLING_ARCHITECTURE.md`
- Kiosks: `docs/kiosk-standard-engine-v2.md`
- MCP and AI tools: `docs/indice-mcp-operating-system-v1.md`

`saas-multitenant/`, dated change reports, closeout reports, pasted prompts, and
`react/figmaDoc/` are historical or supporting material unless a canonical document explicitly
adopts them. Do not use an old statement about the code as evidence of current behavior. Inspect
the implementation and tests.

If a new product decision supersedes a canonical rule, implement only what the current task
authorizes and update the relevant canonical document or decision record in the same change.
Personal, family, health, immigration, or financial context about contributors does not belong in
this repository.

## Protect Working Software

- Treat `released` or explicitly closed modules as behavior-locked, not code-frozen.
- Before refactoring behavior-locked code, identify its public behavior and add or locate regression
  coverage for the affected flow.
- Preserve API shapes, routes, permissions, calculations, persistence semantics, translations, and
  operational workflows unless the task explicitly changes them.
- Keep refactors incremental. Do not combine a structural rewrite, feature work, schema redesign,
  and visual redesign in one unreviewable change.
- Do not modify unrelated files or erase existing work in a dirty worktree.

## Architecture Boundaries

- New identifiers in application code, database objects, API fields, routes, and canonical statuses
  are English. User-visible copy remains localized.
- Frontend work follows the active runtime architecture under `react/src/app` and the Frontend
  Operating System. Do not add production work to the dormant `react/src/modules` scaffold unless
  an approved migration task activates it.
- Backend work follows the Backend Operating System and the existing Spring Boot + JdbcTemplate
  architecture. Do not introduce another ORM, state system, authorization system, modal engine,
  table engine, or module framework without an explicit architecture decision.
- Cross-module use must go through an explicit owner contract. Shared code must not absorb business
  ownership from a module.
- Frontend authorization is only UX. The backend must enforce authentication, tenant scope,
  entitlement, module/tab permission, and object ownership.

## Data And Security Invariants

- Never trust client-provided company, user, role, entitlement, unit, or business authority.
- Every tenant-owned read and mutation must be scoped to the authenticated company in the query or
  in an equally strong repository boundary. Validate narrower unit/business ownership when the
  domain requires it.
- New protected endpoints fail closed. Public endpoints must be explicitly classified and must use
  their documented alternate trust mechanism, rate limits, and audit trail.
- Browser session mutations require the repository's CSRF protection. Webhooks require signature
  verification over the raw body and idempotent processing.
- Never log or commit secrets, raw credentials, session tokens, reset/invitation tokens, payment
  data, biometric material, or unnecessary personal data.
- Use `BigDecimal` and explicit currency/rounding rules for money. Derived and authoritative totals
  are computed by the backend.
- Flyway migrations are forward-only. Never edit an applied versioned migration or an adopted
  baseline. Determine the next version from the migration directory and run the uniqueness test.

## Change Discipline

- Prefer cohesive files and single responsibilities. Line counts are review signals, not reasons to
  create empty layers or split one responsibility across arbitrary fragments.
- Use explicit DTOs for new stable API contracts. Dynamic maps are acceptable only when the domain
  is genuinely dynamic or a compatibility boundary already requires them.
- Put transaction boundaries around complete use cases, especially money, inventory, status,
  billing, attachment registration, and multi-record mutations.
- Validate ownership and invariants before mutation. Make retries safe where duplicate delivery or
  network retry is realistic.
- Do not hard-delete business, financial, audit, or legally relevant records unless an approved
  lifecycle explicitly requires it.

## Verification And Handoff

- Run focused tests first, then the relevant compile/typecheck/build and regression suite in
  proportion to risk.
- Database tests must use the isolated test database, never the functional or production database.
- Frontend behavior changes require TypeScript/build validation and a relevant flow regression.
- Backend changes require focused tests and compilation; schema changes also require Flyway startup
  and migration uniqueness validation.
- Deployment-affecting work must follow `deployment/README.md` and preserve rollback.
- Report behavior changed, behavior deliberately preserved, files changed, tests run, failures, and
  remaining risks. Use `N/A` for irrelevant report fields instead of manufacturing work.
