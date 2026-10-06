# Lupita: HR and Processes/Tasks operational completion

Status: approved cycles implemented locally on 2026-10-06; real APPTEST acceptance is a release gate.
Parent: [MCP Operating System](indice-mcp-operating-system-v1.md).

This decision extends the earlier Lupita read-only restrictions for HR permissions, records,
incentives, payroll and process/project configuration. It authorizes named, delegated owner
operations with explicit action consent and immutable confirmation, not arbitrary endpoint access.
Existing tenant, entitlement, tab, role, object scope, retention and financial invariants remain.

## Delivery matrix

| Area | Target cycle | Current delivery |
| --- | --- | --- |
| Guides | Reviewed module/tab purpose, prerequisites, steps, effects, real navigation and available MCP actions | Delivered for the 10 RH and 4 Processes/Tasks tabs in es-MX/en-CA, generated from existing Modo aprendiz; other ERP modules pending |
| Employees | Authorized file, create/update/import, documents, inactivation/termination | Employment/contact/compensation, country/currency, create/edit/import/inactivate/terminate and confirmed operational documents delivered; legacy overview redaction retained |
| Control/attendance | Schedules, allowed sites, corrections and calendars | Administrative schedules/sites, assign/clear, allowed sites, corrections/events, monthly calendars, candidate resolver, bulk rests and own calendar/event reads delivered; physical identity remains in its channel |
| Announcements | Draft/edit/publish/schedule, scoped audience, attachments and receipts | Scoped lifecycle, audience resolver, own read/unread, administrative receipts and confirmed private attachments delivered |
| HR assets | Read/create/edit/assign/reassign/status/history/photos | Scoped lifecycle, paginated history and confirmed photos delivered |
| Records/permissions/incentives | Authorized lifecycle, attachments and history | Records/agreements/witnesses/status/history; own request/withdrawal and administrative review with attachments; incentives/native payroll applications/pause delivered |
| Payroll | Read/prepare/adjust/recalculate/approve/register settled payment/cancel/export | Full owner cycle, explicit separate consent, country rules, pure previews and CSV/PDF delivered; paid registration requires an already settled payable |
| Tasks | Organization, team, schedule, follow-up, contribution, dependencies, evidence, completion/audit/cancel | Full authorized cycle including same-project acyclic dependencies and confirmed evidence delivered; evidence-required completion stays in Tasks owner |
| Projects/processes | Configure, task links, immutable versions, runs and owner lifecycle | Project create/edit/complete/cancel/archive; process create/edit/pause/archive/generate and occasional runs delivered; run state follows its tasks |
| KPIs | Approved definitions, complete filters, source permissions and N/A | Processes/Tasks versioned measurements and RH measurements delivered; complete population and paginated details, no summaries from truncated pages |
| Imports/attachments | Staged validation, immutable review and atomic registration | Employee batches (1–100), native ChatGPT/base64 file intake, quota, seven owner registrations, private reads and expiry cleanup delivered |

## Local delivery: completed operational cycles

The RH/Processes delivery contains 232 tools: 80 reads/resolvers, 150 preview/commit steps for 75 actions,
and two reversible temporary file-intake tools.
The subsequent [commerce completion](lupita-commerce-delivery-contract-v1.md) extends the complete
catalog to 459 tools. In the merged release lineage, temporary staging is V299, not the incoming
branch's unpublished V293; see the [integration decision](decisions/2026-10-06-lupita-admin-integration.md).
Every new write retains the five-minute confirmation protocol,
current consent, domain owner transaction and retry identity. The approved functional cycles in
both modules are implemented locally. Real APPTEST text/voice acceptance is still required before
release; this statement does not claim deployment or client certification.

HR preparation/result contracts are explicit records and Zod schemas. Dynamic maps are limited
to the existing owner APIs and established confirmation/execution JSON persistence. HR audit
events retain action/counts and correlation IDs rather than copied compensation/contact data.
Operational file contents require additional optional `files.read`; uploads require `files.attach`
and exact domain consent. They are off by default and never gained through refresh. Employee
documents support resume, proof of address and profile photo. National identity/birth certificates,
health, banking and biometric material remain excluded; keys and signed URLs are never returned.

The lifecycle extension separates personal permission/announcement responses from administrative
review. Termination, permission review and attendance correction have distinct explicit action
scopes. Incentive previews show every target and the owner-calculated native payroll amount, currency
and exchange rate; a changed payroll country/audience rejects confirmation. Applied incentive
records remain historical when an incentive is paused.

Administrative attendance uses the existing Control tab and owner validators. Monthly calendar
reads do not sign or expose attendance photos. Schedule/site edits and assignment changes are
rechecked under the confirmed transaction; a changed template or site requires another preview.
The existing assignment-range editor now preserves the employee's tenant-resolved account ID when
inserting a remaining range. Status correction and manual events retain the owner event history,
hire-date/future-date restrictions and payroll projection. Real kiosk identity stays in its channel.

Process KPI output carries definition version, date bounds, full cohort summary, activity and
continuation for the requested breakdown. Ratios/medians remain nullable when samples are missing.
The MCP does not recompute measurements from returned pages.

Employee create/import writes now acquire the existing Seat owner state lock throughout their
transaction, sharing serialization with invitations and activations. Read-only preparation checks
capacity without expiring or reserving seats. A capacity change rejects the whole confirmed batch
and rolls back confirmation consumption. This closes the previously unlocked HR capacity check
without changing plan limits, invitations, default access roles or company billing configuration.

Employee and task queries report full authorized totals and continuation. The guide filters current
module/tab/role access and reports only currently available tools; learning progress, certifications,
automatic training completion and other ERP guides are not implemented.

Validation evidence and exact local limits are recorded in
[the cycle verification](validation/2026-10-06-lupita-hr-processes-cycles.md).
The earlier foundation report is a historical intermediate result.

## File, financial and process boundaries

File intake validates the owner-supported passive format, MIME, length and SHA-256; reserves the
existing quota; and binds temporary storage to token/company/user/membership and exact target.
Registration rechecks current access, locks the target and rechecks the immutable metadata/content.
Confirmation consumption, owner attachment registration, quota/result/audit commit together.
Failed transactions preserve the old employee document; physical replacement deletion occurs
after successful commit. Unconfirmed files expire within 15 minutes and the cleaner retries
expired storage deletion, retaining registered business files. Limits: employee 5 MB, asset
photo 2.5 MB, other attachments/private downloads 10 MB. No automatic write retries.

Native `stage_chatgpt_file` follows the
[official file-input descriptor](https://developers.openai.com/plugins/reference): it declares all
four supported file properties and `openai/fileParams`. Exact download hosts must be approved
and configured in APPTEST. HTTPS/public DNS/pinned TLS, no redirects or forwarded credentials,
30-second deadlines and bounded bytes protect intake. Empty configuration fails closed only for
native URL intake. MCP output is a standard private binary resource; real ChatGPT rendering and
download acceptance remain part of the release test.

Payroll uses BigDecimal, explicit country/native currency rules and the existing owner engine.
Preparation is pure, adjustments preserve native incentive metadata, and stale financial data
requires a new review. Approval projects the existing payable; registering paid status checks
settlement already owned by Expenses. CSV/PDF do not reconcile or modify a run. CSV includes
currency and protects spreadsheet formula strings; ordinary ERP export behavior stays unchanged.

Processes publish immutable versions and review every generated task plan before execution.
Projects retain task links and follow their owner's close/cancel/archive rules. No new independent
run lifecycle or autonomous specialist agents are invented. Current guide discovery advertises
only actions permitted by consent and current module/tab/role scope.

## Action and release rules

- Every new capability has a named domain owner, typed input/output, exact scope and current tab policy.
- All current and newly delivered writes use five-minute immutable previews and explicit approval.
- Old connections and refresh grants never gain additional consent. In particular, `tasks.organize`
  is required for an explicitly selected task unit/business; `tasks.delegate` remains required for
  changing its lead. Reference IDs express requested targets; the backend resolves and validates
  their company, hierarchy, active state and actor/recipient access before preview and commit.
- Retained collaborators and project links must remain valid when moving task scope. Changes do
  not rewrite employee organization or process versions.
- Pending extended task confirmations use versioned internal discriminators so an older rollback
  cannot partially apply an approved organization change.
- Retries return a saved result only after current result access is rechecked. Stale preparations
  require a new preview; audit and owner mutations commit atomically.
- Evidence-required completion uses the task owner. Payroll approval/payment, administrative
  attendance corrections, termination and bulk operations retain their own authorization and
  side effects. Financial status labels do not fabricate money movement.
- Full closure requires focused negative/owner regressions, compilation, MCP discovery and consent
  verification, real isolated APPTEST OAuth conversations, refresh/revocation and retry acceptance.
  Local implementation is not a declaration of deployment or client/mode certification.

No production release is requested by this implementation instruction. Deployment follows
[the existing runbook](../deployment/MCP_APPTEST_RUNBOOK.md), with preserved rollback artifacts.
