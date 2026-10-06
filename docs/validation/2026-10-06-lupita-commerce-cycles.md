# Lupita: Inventory, Sales and POS completion and deployment handoff

Date: 2026-10-06, America/Toronto.
Status: local implementation and verification complete; prepared for controlled APPTEST deployment.
Real client, merchant/hardware and public release acceptance have not been executed.

Delivery sources:

- [Approved completion contract and gap analysis](../lupita-commerce-delivery-contract-v1.md).
- [Operator workflow, including Mexico/Canada](../lupita-commerce-operating-workflow-v1.md).
- [Exact tools, owner boundaries, tabs and consent matrix](../lupita-commerce-tool-matrix-v1.md).
- [Canonical MCP rules](../indice-mcp-operating-system-v1.md),
  [public release gate](../indice-public-release-security-gate.md),
  [deployment/rollback](../../deployment/README.md) and
  [MCP APPTEST runbook](../../deployment/MCP_APPTEST_RUNBOOK.md).

## 1. Delivery and source identity

Branch: `codex/lupita-hr-processes-2026-10-05`.
Base HEAD: `d5c70e1cb5ca1daae2b27cf005c8b5b6e1df7b74`.
The candidate is the current uncommitted worktree, including the preceding RH/Processes delivery.
That HEAD alone does not contain this delivery. Review and commit the cohesive candidate before
building immutable release images. No push, production deployment or live preview restart was
performed by this change.

The extension adds **61 read/report tools and 83 confirmed actions**, each with preview and commit:
**227 new tools**. The complete SDK catalog is **459 tools = 141 reads + 158 action pairs + two
temporary file intake tools**, with zero duplicate names. Per-connection discovery remains filtered
by current capabilities; this count does not grant access to every operator.

The existing learning catalog now covers **34 tabs** in es-MX/en-CA: HR 10, Processes/Tasks 4,
CRM 8, Inventory 6 and POS 6. Guides use current authorized owner actions, not independent authority.

### Gaps closed

| Cycle | Implemented operational coverage |
| --- | --- |
| Inventory | Products, photographs, warehouses, organization assignment, balances/minimums, movement history, entry/exit/transfer/count and reversal of an eligible manual movement |
| Procurement | Providers, product links, supplier submissions, purchase draft revisions, request/approval/internal sent status, partial/full receipt, cancellation and invoice review into a pending Finance expense |
| Commercial Sales | Current customer/opportunity/quote cycle, quote-to-sale conversion, sale editing, stock review, collection review, delivery, cancellation, contracts, follow-up and commission rules/cuts/schedules |
| POS operation | Registers/destination policy, own shifts, cash movement, cash/transfer checkout, native terminal checkout/recovery, authenticated source claim/release, paginated ticket history, paid stock receipt and reversal |
| POS completion | Closing history and amounts, deferred settlement with received amount/variance, original tender returns, Square/Point original card return, refund/recheck and financial recovery |
| Files/reports | Five additional private attachment owners; post-collection supplementary evidence; ten closed CSV/PDF report types; current owner authorization and content integrity verification |

Creating a supplier expense does not pay it. A commission cut applies incentives once; payroll
payment remains with HR/Finance. Internal purchase sent status does not send email. Contracts are
operational records/attachments, not electronic signatures. These handoffs are part of the workflow.

## 2. Behavior and boundaries preserved

Authenticated company, active membership/subscription, entitlement, module/tab permission, role,
organization and object ownership remain enforced in the backend. OAuth consent is additional
permission; refresh does not add new grants. New action consents default to off. No client-supplied
company, role, user, merchant or entitlement becomes authority.

Database mutations use current owner use cases, immutable five-minute confirmation, deterministic
locking, receipt/audit and safe replay. Retried results revalidate current visibility. Terminal
operations commit an assistant reservation, invoke the existing provider outside SQL transactions
and then persist the result. Unknown outcomes require explicit recovery with the original identity;
the assistant does not retry financial requests automatically or manufacture approval.

Stock quantities retain three decimals, stock/catalog unit costs four and native payment/sale money
two. Piece quantities remain integral and services have no stock. Reserved stock, native currencies,
original stock cost, immutable movements, ticket tender and settlement accounting remain authoritative.
Legacy stock valuations can now retain the fractional precision previously rounded by storage.

Existing browser routes and API shapes remain compatible. Owner financial posting/period gates,
original supplier primary-document access, provider credentials, kiosk identities and historical
records remain in their established channels. No ORM, authorization system, modal engine or module
framework was introduced.

Physical returns are bounded by the existing full original tender workflow. Mixed/card-credit/wallet
and unsupported partial physical returns require the native Finance/owner path. A standalone partial
provider refund does not automatically return merchandise. Prior provider refunds and active/completed
physical returns exclude each other. Mexico Point requires verified MXN/original full amount and a
zero prior-refund baseline; Canada uses eligible Square configuration. LIVE activation is unchanged.

## 3. Changed files and ownership

| Area | Main paths |
| --- | --- |
| Delegated domain adapters | `src/main/java/com/indice/erp/ai/inventory/`, `inventorycatalog/`, `procurement/`, `salesworkflow/`, `commission/`, `pos/`, `posoperations/`, `terminal/` |
| Inventory and Sales owners | `src/main/java/com/indice/erp/sales/`, including Inventory/Sales/Commission assistant services, repository contracts and operational file service |
| Procurement/catalog owners | `src/main/java/com/indice/erp/pos/purchaseorder/assistant/`, existing PurchaseOrder, Provider and Discount owners, explicit organization context port |
| POS owners | `pos/assistant/`, `pos/checkout/`, `pos/shift/`, `pos/returns/`, `pos/settlement/`, `pos/cashclosing/`, `pos/receipt/`, `pos/terminal/`, `pos/square/`, `pos/mercadopago/` |
| Shared AI/file contracts | AI access/capability/confirmation/execution, `ai/files/`, `ai/query/AiCommerceRequestAdvice`, `storage/OperationalReportFormatter`, generated learning resources |
| MCP contracts/tools | `integrations/indice-mcp/src/` typed Inventory, Sales, Procurement, Commission, POS, Operations, Terminal and file/report contracts, client/catalog/instructions and tests |
| Frontend | Current `react/src/app/BasicModules/Dashboard/Integrations/` and `react/src/app/Auth/AiOAuthAuthorizePage.tsx` consent UX; current learning guides and integration regressions |
| Migrations | `src/main/resources/db/migration/V294__inventory_operational_precision.sql` through `V298__original_card_return_provider_identity.sql`; V293 staged-file dependency is in the preceding delivery |
| Deployment/docs | Both Compose files, `deployment/scripts/up-host-network.sh`, deployment env example, MCP/deployment READMEs, canonical MCP/evolution and domain completion contracts, workflow and matrix |
| Tests | Focused AI owner integrations, original Sales/POS/terminal/refund/settlement/Finance tests, private file/report validation, MCP protocol and React flow regressions |

These are responsibility groups, not an attribution of every pre-existing dirty file to this task.
The previous [RH/Processes evidence](2026-10-06-lupita-hr-processes-cycles.md) remains applicable.

## 4. Verification and evidence

Environment: Java 21.0.10, Maven 3.9.14, Node 24.18.0, isolated MySQL 8 container
`indice-mysql-lupita-tests-20261005`, database `indice_test_db`, loopback port **13307**.
Functional MySQL on 3307 and production databases were not used. Fixtures are synthetic. Merchant
gateways and private object storage in owner tests are simulated; no real merchant charges occurred.

| Gate | Final result | Local evidence |
| --- | --- | --- |
| Production/test Java compilation, selected related regression and executable JAR packaging | **299 passed, 0 failures/errors/skips; BUILD SUCCESS**, 11:41:10 -04:00 | `.run/lupita-commerce-release-candidate.log` |
| Focused original payment/refund/recovery gates before the final suite | **95 passed**, overlaps the final suite and is not an additional independent total | `.run/lupita-commerce-provider-recovery-gates.log` |
| MCP TypeScript and complete test suite | **143 passed, 0 failures/skips** | `.run/lupita-commerce-final-mcp.log` |
| Final MCP TypeScript rebuild | Passed | `.run/lupita-commerce-final-mcp-build.log` |
| React integration and native commerce flow regressions | **62 passed, 0 failures/skips** | `.run/lupita-commerce-final-frontend-regressions.log` |
| React TypeScript | Passed | `.run/lupita-commerce-frontend-typecheck.log` |
| React production build | Passed, 39.78 s | `.run/lupita-commerce-frontend-build.log` |
| Flyway isolated startup/validation | Schema at V298; **298 migrations validated** by final startup | Final backend log |
| Flyway version uniqueness | **2 passed** after all migrations were added | `.run/lupita-commerce-migration-uniqueness.log` |
| Actual MCP SDK discovery | **459 names, 141 reads, 158 confirmed actions, two intake tools, zero duplicates** | `.run/check-lupita-catalog.mjs` |
| Generated learning catalog | `node scripts/generate-lupita-learning-catalog.mjs --check` passed | Current generated resources and source guides |
| Base/APPTEST Compose and host-network script | Both `config --quiet` checks and `bash -n` passed; no services were started | Current Compose/env/script; synthetic required Stripe placeholders used only for parsing |
| Diff whitespace | `git diff --check` passed | Current worktree |
| VPS preflight/dry run/smoke, real OAuth/text/voice, physical terminal acceptance, public approval | **N/A: not executed**; mandatory acceptance before applicable activation | Release procedure below |

Compilation/package used an ignored `.run/lupita-test-pom.xml` mirror of the repository POM with
isolated source/output directories and Surefire working directory at the repository root. This
avoids overwriting the running local backend build and preserves relative migration contract tests.
The repository POM was not changed for this arrangement. Build release images through the normal
Dockerfiles; the local mirror and logs are review artifacts and are not release inputs.

Important verified cases:

- Current/foreign/stale permission and confirmation checks, bounded schemas, explicit consent,
  unchanged retry identities and original domain replays.
- Quote-to-sale conversion uses the persisted CAD quote (208.80), changes stock once, converts once
  and rejects a second conversion. Legacy financial approval does not imply a new collection.
- Receipts reject duplicate/over-received purchase lines; draft replacements preserve history.
  Four-decimal catalog cost survives persistence. Reserved stock and historical reversal costs hold.
- POS returns correct original tender settlement amounts. A deferred 100 deposit received as 98.50
  enters reconciliation once. Source checkout completes once; 315 tickets paginate across seven pages.
- Read-only preview actually runs outside an ambient write transaction against MySQL. Terminal,
  open-shift and refund inspections no longer issue `FOR UPDATE`; native execution retains its locks.
- Point pending proof leaves stock untouched. Confirmed native refund proof survives a deliberately
  failed stock restoration; retry completes stock with no additional provider call. REJECTED and
  NOT_SUBMITTED mark failed preparation safely and allow its cancellation without stock/money effects.
- Square/Point refund/return budgets, original identity, immutable ledger and Finance period gates;
  explicit lost-response recovery through the real MCP SDK.
- Private attachment purpose, scope, expiry, quota, replay and integrity. A same-length valid PDF
  replacement is rejected against the originally registered SHA-256. Supplementary payment evidence
  preserves an already approved collection. Report snapshots, row/byte limits and CSV formula safety.

Failures encountered during development were fixed and rerun: locking reads in pure previews,
Point fixture currency/status mismatch, different refund-key SQL collations, legacy error-message
compatibility and relative migration-test paths under the isolated POM. The final gates above have
no failures. Existing build advisories remain: large frontend chunks and existing Java deprecated/
unchecked API notices. Node's catalog generator reports its experimental TypeScript stripping warning.

### Local artifact

Executable JAR: `.run/lupita-maven/indice-erp-api-0.0.1-SNAPSHOT.jar`, **92,170,326 bytes**.
SHA-256: `8b6c13a99e4c4971a13da7a6888283042eea61640630934a8a1f6d5321ceb21b`.
Frontend output: `react/dist/`. MCP output: `integrations/indice-mcp/dist/`.
Release commit and immutable image digests: **N/A: not yet created**.

## 5. Controlled deployment sequence

1. Review the complete local candidate and record its committed source identity. Include its
   RH/Processes dependencies. Build backend, MCP and web images from that same commit using the
   [APPTEST runbook](../../deployment/MCP_APPTEST_RUNBOOK.md). Record all three immutable image IDs.
2. Verify database and MinIO backups, available deployment capacity and migration compatibility.
   Follow the existing deployment preflight and public security gate. Review V293–V298 together:
   staging, numeric precision, manual movement provenance, purchase revisions, invoice attachments
   and original card-provider identity. Do not edit an applied migration.
3. Use APPTEST's protected environment and isolated synthetic company/accounts. Configure OAuth
   issuer/resource/callback and HTTPS for APPTEST, loopback MCP and the AI profile as documented.
   Native ChatGPT intake requires exact observed approved hostnames in `INDICE_CHATGPT_FILE_HOSTS`;
   empty configuration fails closed. Configure the existing private document bucket, quota and cleanup.
4. Preserve existing encryption keys. Forward the current Square application/webhook credentials
   through protected values or their `_FILE` mounts. Square token protection uses its existing
   environment property or kiosk-key fallback, not an invented `_FILE` property. APPTEST callbacks
   remain APPTEST. Keep Square/Point LIVE and refund flags off until merchant/country/hardware acceptance.
5. Run the protected real-environment Compose validation, preflight and applicable `DEPLOY_DRY_RUN`
   procedure. Replace application containers through the documented deployment route, preserving
   MySQL/MinIO data and the previous compatible images. APPTEST and production routes/ports must not
   be mixed. Local Compose parsing performed here does not replace the VPS checks.
6. Execute the repository smoke tests and public MCP smoke procedure. Verify OAuth metadata,
   protected access and health/readiness. Liveness/readiness alone does not prove user authorization,
   database ownership or a successful ChatGPT connection.
7. Accept real OAuth PKCE, refresh/revoke, discovery, text and voice independently. Exercise allowed
   and denied company/tab/org scope, old consent and newly selected action consent. Run the operator
   workflow with synthetic products, purchases, quotes, sales, shifts, source orders, reports and
   all five commercial attachment destinations. Validate resource download in the real client.
8. With certified merchant/hardware, test Mexico Point and Canada Square separately: approval,
   refusal, pending outcome, lost-response recovery, original card return and stock recovery after
   confirmed money proof. Compare original native tickets, stock movements, ledger and cuts. Do not
   replace hardware acceptance with the mocked provider tests.
9. Record the release gate verdict. Enable only accepted capabilities and operator consents through
   the existing mechanisms. Monitor assistant reservations/replays, provider recovery, invoice/Finance
   handoffs, settlement variance, storage cleanup/quota and audit without logging credentials or files.

## 6. Rollback and remaining gates

Retain compatible previous backend/MCP/web images and use the existing rollback mechanism together.
Disable the new entry/capabilities or revoke expanded connections using existing controls when
necessary. Retain V293–V298, registered files, history, ledger, audit and durable financial recovery
identities. No down migrations or volume deletion. If the prior backend is schema-incompatible,
use the separately verified database recovery procedure before attempting that rollback.

Real client file/text/voice behavior, external merchant/hardware, protected VPS smoke, immutable
release provenance and the complete public security verdict remain **UNKNOWN** until evidence is
recorded. The local candidate is ready to enter that APPTEST procedure; it is not a production or
public publication approval. External messaging, legal signing, billing/distributor redesign and
unbounded partial physical returns are outside this approved commerce delivery.
