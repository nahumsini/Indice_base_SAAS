# Lupita RH / Processes: local operational foundation

Date: 2026-10-06.
Branch: `codex/lupita-hr-processes-2026-10-05`.
Status: local foundation verified; this is not release or full-module certification.
Owner: [approved delivery contract](../lupita-hr-processes-delivery-contract-v1.md).

## Behavior changed

- Reviewed training for the 10 RH and 4 Processes/Tasks tabs in es-MX/en-CA, generated from the
  existing Modo aprendiz. Current module/tab/role access filters content and action availability.
- Task creation/editing can select validated units/businesses with `tasks.organize`. Moves validate
  retained collaborators and linked project scope. New confirmed tools cover scheduling, follow-up,
  own contribution, team sharing, completion, audit and cancellation. Team previews show names,
  the complete prior/new team and additions/removals. Completion previews do not mark anyone ready.
- Typed employee file reads, create/edit/import/inactivate, asset create/read, announcement
  create/read and scoped audience resolution. Records reads include agreements, history and
  attachment metadata. New employee batches contain 1–100 fully reviewed rows, applied atomically.
- Employment preparations require a country for new employees and compensation changes on legacy
  files without one. Payroll projects the compensation currency; Mexico and Canada use their
  existing MXN/CAD rules. Existing files with unknown country expose a null currency.
- New action consent and bilingual frontend labels; stored connections and OAuth refresh do not
  gain permissions. The closed catalog now has 96 tools: 48 reads/resolvers and 24 action pairs.
- Complete employee/task/attendance-exception query counts and opaque continuation; HR lists also
  bind continuation to actor, tool, filters and page size. No page is represented as the full list.
- Legacy HR reads now repeat subscription/module/tab checks. Employee overviews require separate
  stored task/attendance scopes before querying those sources; unavailable counts are null.
- The Seat owner serializes HR create/import capacity checks with invitation/activation writes.
  Preview remains read-only; capacity failure rolls back the whole batch and confirmation use.

## Behavior preserved

Existing ERP routes, owner calculations, permissions, default employee access, payroll rules,
task notifications, completion/evidence/team policies, retention and historical business records
remain owned by their existing services. Employee edits preserve current account roles and omitted
fields. Inactivation retains records and is separate from employment termination. Normal UI
announcement reads retain their scheduled-publishing behavior; delegated reads are now pure.

All current writes still require a five-minute immutable preview, explicit approval, current
access, one owner transaction, idempotency and safe audit. No alternative action/auth framework,
ORM, frontend runtime, task engine or training UI was introduced. Compensation is allowed only
through its new RH management read scope; legacy summaries remain redacted. Audit payloads exclude
copied employee contact/compensation, private keys, signed URLs, banking, legal IDs and health data.

## Files changed

- Backend delegated contracts/services/controllers: `src/main/java/com/indice/erp/ai/hr/`,
  `ai/learning/`, `ai/query/`, `ai/reference/`, `ai/task/` and `ai/access/`.
- HR owner boundary: `src/main/java/com/indice/erp/hr/assistant/`, `hr/users/HrUserService.java`,
  `hr/assets/HrAssetService.java`, announcement actor/query/normalization services and the read-only
  currency projection in `hr/payroll/HrPayrollService.java`.
- Task owner: `processTasks/tasks/ProcessTaskAssistantService.java`, `ProcessTaskOperation.java`,
  the read-only completion check in `ProcessTaskCollaborationService.java` and `ProcessTasksService.java`.
- Capacity owner: `billing/seats/SeatService.java` and its concurrency regression.
- MCP: contracts, client, catalog, tool policy, assistant instructions, HR/learning/task operation
  registrations and tests under `integrations/indice-mcp/src/`.
- Frontend: `react/src/app/Auth/AiOAuthAuthorizePage.tsx`, Integrations consent catalog and
  translations under `react/src/app/BasicModules/Dashboard/Integrations/`, and its flow regression.
- Guide generator/resource: `scripts/generate-lupita-learning-catalog.mjs` and
  `src/main/resources/ai/learning-catalog-v1.json`.
- Canonical MCP/evolution documentation, approved delivery matrix and MCP README.

## Verification

| Check | Result |
| --- | --- |
| Final focused backend suite / compile | 142 passed across 20 suites; no failures, errors or skips; compile passed |
| MCP TypeScript build and tests | 78 passed; no failures or skips |
| Frontend TypeScript | `npx tsc --noEmit` passed |
| Frontend consent flow regression | 9 passed |
| Frontend production build | Passed; existing chunk-size warning above 600 kB |
| Reviewed guide parity | Generator `--check` passed |
| Whitespace | `git diff --check` passed |
| Schema changes / migration uniqueness | N/A: no new or edited migrations |
| Flyway startup | Disposable MySQL validated 292 migrations; current schema up to date |
| Deployment / rollback execution | N/A: no environment deployment requested or performed |
| Real ChatGPT APPTEST text/voice OAuth | Not performed; required before public enablement |

Backend integration data uses only a disposable MySQL 8 container at loopback port 13307 and
synthetic tenants. Business fixture transactions roll back; the capacity concurrency suite cleans
its synthetic rows. Functional/production databases were not used. The disposable test container
was verified by its exact name and loopback mapping and removed after verification; port 13307
is not an application preview or a persistent database service.

The focused suites cover owner writes and preview purity, tenant/organization rejection, retained
account roles, duplicate imports, missing country and CA/MX currency, stale confirmation rejection,
safe retries, whole-batch capacity failure, simultaneous capacity contention, evidence/team completion
rules, read redaction, cursor binding, current tab/entitlement and old consent. MCP tests validate
strict authority inputs, normalized nullable previews, immutable commits, scope metadata, typed
pagination, closed discovery and lack of automatic write retries.

### Local verification recovery

Initial checks exposed an outdated default-scope expectation, test fixture numeric types and the
new guide-denial expectation; these were corrected. Windows locks prevented cleaning the normal
`target` output. Final Maven verification uses an ignored temporary POM under `.run/` with the same
sources, resources, dependencies and plugins, directing artifacts to `.run/lupita-maven/`.
The real `pom.xml` is unchanged. The Maven wrapper launcher is broken locally; tests use the
installed Maven 3.9.14 distribution with Java 21. No unrelated process or output directory was removed.

## Remaining work and practical limits

This is the operational foundation delivery, not closure of RH and Processes/Tasks. The approved
matrix still lists termination, private/binary documents and evidence, dependencies, asset lifecycle
and photos, existing announcement edits/read receipts, control/attendance configuration, permissions,
incentives, payroll actions, projects/process versions/runs, imports from files and owner KPI coverage.
Other ERP modules do not yet have a reviewed MCP training guide.

HR pages and several legacy queries filter current owner lists in memory. Their counts cover the
full authorized filter, but they are live pages rather than a fixed snapshot; large-volume SQL
pagination remains future owner work. The guide lists only verified actions available now and
must not imply that an interface capability is already an executable MCP tool.

APPTEST conversations, delegated refresh/revocation against the deployed revision, public-route
release checks and rollback acceptance remain required. No branch push or public release is implied.
