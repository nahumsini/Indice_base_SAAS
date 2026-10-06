# Lupita / Controla: RH and Processes/Tasks cycle verification

Date: 2026-10-06. Branch: `codex/lupita-hr-processes-2026-10-05`.
Scope: [approved operational completion](../lupita-hr-processes-delivery-contract-v1.md).
Status: local implementation delivered; real APPTEST/client acceptance remains a release gate.

## Behavior delivered

- RH guides for ten tabs and Processes/Tasks guides for four, in es-MX/en-CA, sourced from the
  active Modo aprendiz; current permissions determine the recommended available tools.
- Employee employment/contact/compensation file, registration country/currency, creation,
  complete batch import, edit, inactivation/termination, document metadata and operational files.
- Schedules/sites, assignments and partial range removal, allowed locations, administrative
  corrections/manual events, rest plans, candidate discovery, calendars and own/admin event reads.
- Announcement lifecycle/audience/receipts; asset assignment/status/history/photos; record
  agreements/witnesses/history; own permissions and administrative review/attachments; incentives.
- Payroll read/prepare/adjust/recalculate/approve/settled-paid registration/cancel, pure financial
  previews, explicit separate consents and private CSV/PDF export with currency. CSV protects
  formula strings. Registering paid never executes money movement.
- Tasks organization/team/scheduling/follow-up/contribution/sharing/dependencies/evidence and
  completion/audit/cancellation; owner-required evidence is enforced before completing a task.
- Projects owner lifecycle; processes immutable versions, task generation and occasional runs.
  Run statuses continue to follow their tasks.
- RH and Processes/Tasks KPIs over full authorized populations; independent source access and
  nullable N/A for unavailable sources or empty measurement samples.
- Native ChatGPT and base64 temporary file intake, format/hash/size validation, quota, confirmed
  registration with seven owners, active private attachment reads and expired-stage cleanup.

Closed catalog: **232 tools = 80 reads/resolvers + 150 preview/commit steps for 75 actions +
2 reversible temporary intake tools**. This is a catalog total, not 232 new independent actions.

## Behavior preserved

Tenant/authentication/entitlement/tab/role/org/object checks remain authoritative in the backend.
OAuth scopes are additional consent, not authority. Refresh never broadens stored grants.
All business writes require immutable review, explicit confirmation, current authorization,
atomic consumption/mutation/result/audit and safe replay with the original retry identity.
The new `files.read` and `files.attach` permissions are off by default.

Existing ERP routes, owner tables/lifecycles, UI payroll exports, country money rules, historical
records, task evidence/completion policy, storage quota and seat limits are retained. Employee
seat mutations share the existing Seat owner serialization. Physical biometric/kiosk operations,
national identity/birth certificate documents, health/banking data and credentials retain their
original channels. Guides do not claim training certification or independent specialist execution.

## Changed files and ownership

| Area | Main changed paths |
| --- | --- |
| Delegated RH actions/reads | `src/main/java/com/indice/erp/ai/hr/`, `src/main/java/com/indice/erp/hr/assistant/` |
| Projects/processes adapter | `src/main/java/com/indice/erp/ai/process/`, `src/main/java/com/indice/erp/processTasks/assistant/` |
| Tasks | `src/main/java/com/indice/erp/ai/task/`, existing Tasks owner services |
| Learning/KPI | `src/main/java/com/indice/erp/ai/learning/`, `src/main/java/com/indice/erp/hr/kpis/`, AI KPI controllers/services, generated `src/main/resources/ai/` |
| Files | `src/main/java/com/indice/erp/ai/files/`, `storage/ObjectStorageService`, `MinioObjectStorageService`, `StorageCommitCleanup`; `V293__ai_operational_file_staging.sql` |
| Owner extensions | Existing HR employee/announcement/asset/attendance/record/permission/incentive/payroll services, Projects/Processes/Tasks services and `billing/seats/SeatService` |
| MCP | `integrations/indice-mcp/src/` domain contracts/tools, delegated client/catalog/policy/HTTP, `chatGptFiles.ts`, instructions and tests |
| Consent UX | `react/src/app/BasicModules/Dashboard/Integrations/`, `react/src/app/Auth/AiOAuthAuthorizePage.tsx`, integration regressions |
| Operations/docs | Canonical MCP/evolution/delivery contracts, MCP README/env, deployment README/env/APPTEST compose, both Nginx configurations |
| Regression evidence | Focused tests under `src/test/java/com/indice/erp/` and MCP/React test directories |

No ORM, new authorization system, modal engine, table engine or module scaffold was introduced.

## Verification

Environment: Java 21.0.10, Maven 3.9.14, Node 24.18.0. MySQL 8 container
`indice-mysql-lupita-tests-20261005`, loopback port **13307**, isolated database `indice_test_db`.
Only synthetic tenants/accounts/files were used. External object storage was simulated in
owner integration tests; MinIO implementation and quota were also verified with focused tests.
The functional and production databases were not used.

| Gate | Result |
| --- | --- |
| Java production and test compilation | Passed |
| Final related backend suite | **253 passed, 0 failures/errors/skips** |
| Final PDF currency / file and payroll owner regressions | **26 passed**, after the final export adjustment |
| Final incomplete-request / excluded-document validation and attachment regressions | **8 passed**, after the final null guards |
| MCP TypeScript and full suite | **125 passed, 0 failures/skips** |
| Final instructions/file/attendance descriptor regressions | **18 passed** |
| React TypeScript and production build | Passed |
| React integrations, RH and Processes/Tasks flow regressions | **23 passed, 0 failures/skips** |
| Flyway isolated startup | V293 applied successfully; subsequent startup validates current schema |
| Migration version uniqueness | **2 passed**, included in backend total |
| Generated learning catalog `--check` | Passed |
| Both Nginx configurations | `nginx -t` passed in isolated containers without network |
| Runtime catalog / closed schema parity | **232 exact names**, 80 reads, 75 confirmed actions and 2 intake tools; no duplicates |
| Whitespace/diff checks | Passed |
| Production deployment, real ChatGPT APPTEST/text/voice acceptance | **N/A: not executed or authorized in this change** |

Backend coverage includes owner cycles, stale/foreign confirmations, compensation country,
full import rollback, capacity changes, native payroll/settled-payable lifecycle, attendance
history/locks/rests, process versions/run plans, source KPI authorization/paging, all seven
attachment owners, file tampering/expiry/replay, replacement rollback, cleanup, strict request
authority rejection, scope/revocation/OAuth, CSRF, quota and existing owner regressions.

MCP tests exercise real HTTP intake over 100 KB, exact confirmed registration, private binary
resources, old capability manifests, closed schemas, no automatic uncertain-write retries,
native ChatGPT file descriptors, private DNS/URL/size/cancellation rejection and redacted output.

Local logs/artifacts are ignored under `.run/`: `lupita-final-backend-tests.log`,
`lupita-final-mcp-tests.log`, `lupita-final-mcp-prompt-tests.log`,
`lupita-final-frontend-typecheck.log`, `lupita-final-frontend-build.log`,
`lupita-final-frontend-tests.log`, `lupita-final-payroll-export-tests.log`,
`lupita-final-file-validation-tests.log`. The normal Maven target was locked by existing local runtime;
verification used an ignored copy of the same POM/source roots with an isolated output directory.
No production POM change was needed.

### Reproduction

Set `TEST_DATASOURCE_URL`, `TEST_DATASOURCE_USERNAME` and `TEST_DATASOURCE_PASSWORD` to an isolated
test database, then run Maven with Java 21 and the focused test classes recorded above. Never
point those variables at the functional or production database. MCP: `npm test` in
`integrations/indice-mcp`. React: `npm run typecheck`, `npm run build` and the integration/RH/
Processes regression files. Catalog: `node scripts/generate-lupita-learning-catalog.mjs --check`.
Validate both mounted Nginx configs with the local web image and `nginx -t` without publishing ports.

## Resolved verification failures

An attachment test initially omitted its task's unit/business and process-required evidence flag;
the real Tasks owner correctly enforced scope and its configured completion policy. A personal
attendance fixture lacked stored module/tab grants; those grants were added to the fixture rather
than weakening authorization. The legacy catalog assertion was updated for newly permitted own
attendance reads. A test import and an obsolete payroll snapshot column were corrected.
The final related suite passed. These intermediate failures are not hidden deployment successes.

The initial restricted React build could not read a parent configuration directory through
esbuild. The approved retry completed without repository configuration changes. Vite retains
its existing warning about chunks above 600 kB; no build error remains. Bundle optimization is
outside this functional completion.

## Operational limits and remaining release acceptance

1. Follow `deployment/README.md`, the public security gate and `deployment/MCP_APPTEST_RUNBOOK.md`.
   Use an isolated APPTEST company/account and the real OAuth client. Do not use production PII.
2. Confirm discovery for allowed/denied roles/tabs, old consent, explicit new consents, refresh,
   revoked token/grant, removed membership, changed org scope and expired confirmation. Exercise
   read → resolve → preview → explicit approval → commit → original-key retry for both modules.
3. Exercise employee import/edit/termination; permission review/calendar projection; announcement
   audience; assets/history; records; attendance/rests; task organization/evidence/completion;
   project/process version/run; payroll approval/settled-paid status/export; both KPI sources.
4. Validate native file attachment from the real conversation using the
   [official `openai/fileParams` contract](https://developers.openai.com/plugins/reference).
   Configure `INDICE_CHATGPT_FILE_HOSTS` with **exact approved download hostnames actually observed**,
   never URLs/credentials/wildcards. The provider reference does not promise a stable hostname.
   Empty configuration fails closed for native URL intake; base64 intake remains available.
5. Confirm resource preview/download on the real ChatGPT client, renew consent for private files,
   and test expired file links, same-key retry, limits and declined confirmation. Private resources
   are MCP binary resources; no new widget or promise of client-side file persistence was added.
6. Text and voice are separate client acceptance cases. A verified text connection does not prove
   that the client's voice mode currently exposes tools. Voice must confirm verified results only.

File limits: employee 5 MB; asset photo 2.5 MB; other attachments/private downloads 10 MB;
format support additionally follows each owner. Temporary intake up to 15 minutes; registration
review up to five; cleaner retries expired deletion every minute. Native download deadline
30 seconds. Bulk imports max 100 employees, payroll previews max 500 employees, rest plans max
100 collaborators/250 total days and 62 dates per collaborator. Process task generation max
1,000 reviewed plans. Larger use cases require explicit supported batches, not truncated promises.

MinIO/quota service must be configured. If a post-commit physical deletion of an old/inline-staged
object fails, storage operations must reconcile the orphan; the business transaction and history
remain committed.

Rollback keeps versioned images and V293/history/audit, rejects incompatible pending confirmations
and restores the compatible backend/MCP/web together. No release, real OAuth connection, external
messages, repository push or production publication was performed by this implementation.
