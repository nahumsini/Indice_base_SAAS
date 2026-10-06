# Indice MCP Operating System V1

Status: canonical

Applies to: `integrations/indice-mcp`, `/api/v1/ai/**`, OAuth connections and every Indice tool exposed to an AI client.

The user-approved [Lupita evolution contract](indice-lupita-mcp-evolution-contract.md) defines the
coordinator, four specialist perspectives, target operations and explicitly staged autonomy changes.
Its delivery table distinguishes implemented tools from approved work that is still pending.
The approved [HR and Processes/Tasks completion contract](lupita-hr-processes-delivery-contract-v1.md)
extends that target as of 2026-10-05. Its delivery matrix governs the named additions below and
records locally completed owner cycles and the separate APPTEST release acceptance.
The user-approved [Inventory, Sales and POS completion contract](lupita-commerce-delivery-contract-v1.md)
extends the operational target as of 2026-10-06. Its delivery matrix records locally completed
owner cycles, with an [operating workflow](lupita-commerce-operating-workflow-v1.md),
[exact tool matrix](lupita-commerce-tool-matrix-v1.md) and
[verification/release handoff](validation/2026-10-06-lupita-commerce-cycles.md).
Named actions continue to require current owner access, explicit consent and immutable confirmation.
Real APPTEST and public release acceptance are separate from local implementation verification.

## 1. Purpose

The Indice MCP is a delegated business interface, not a database gateway and not a second business
application. It lets an authenticated person ask business questions and execute a small set of
bounded actions through the existing Indice domain owners.

The trust path is:

```text
ChatGPT or another MCP client
  -> OAuth-protected Streamable HTTP MCP
  -> /api/v1/ai/tools/**
  -> existing Indice domain services
  -> tenant-scoped persistence
```

The MCP process never reads or writes MySQL directly. Domain services remain authoritative for
money, inventory, tasks, status transitions, organizational scope and audit.

## 2. Authorization invariant

An OAuth scope is necessary but never sufficient. Every tool invocation must revalidate, in the
backend and using the current database state:

1. token validity, expiry and revocation;
2. active direct user-company membership;
3. active company and subscription access;
4. company module entitlement;
5. current user module assignment;
6. the exact tab permission required by the owner route;
7. commercial capability when the product enforces one;
8. unit, business, user and object ownership where the domain requires them.

The client cannot provide company, membership, role, entitlement or organizational authority.
Privileged roles do not remove tenant boundaries and do not make an unavailable company module
available.

Connection creation without an explicit scope selection grants the read scopes only. Action scopes
must always be selected explicitly. Existing stored connections keep exactly their stored scopes;
deployments never add new scopes to them.

The existing limit is five active AI connections per user and company, shared by manual and OAuth
connections. Reconnecting does not automatically revoke an earlier grant. OAuth checks capacity
before displaying consent and again before issuing a code, while token issuance retains its final
capacity check. A full account returns an actionable `connection_limit_reached` consent conflict;
a capacity race at token exchange returns `invalid_grant`, not a misleading transient `503`.
The owner chooses which unused connection to revoke. Refresh rotates the existing connection and
does not consume another slot. Never raise the limit or revoke other connections to hide this error.

## 3. Current tool authorization matrix

The closed MCP catalog contains 459 tools after the commerce completion: 141 reads, 158
preview/commit action pairs and two temporary file-intake tools. The tables below retain the
RH/Processes foundation; the [commerce matrix](lupita-commerce-tool-matrix-v1.md) extends it.
`Any(...)` means at least one current tab grant is required.
Every row also inherits the common invariant above.

The completion extension uses the same closed catalog and owner gates:

| Tools | Additional consent | Current owner boundary |
| --- | --- | --- |
| `get_my_attendance_calendar`, `get_my_attendance_events` | `hr.attendance:read` | RH Attendance tab; authenticated account only, no caller-selected identity/media/GPS |
| `get_hr_attendance_events` | `hr.control.read` | RH Control management role and current employee organization |
| `preview_assign_hr_rest_days`, `assign_hr_rest_days` | `hr.attendance.correct` | RH Control; all collaborators/dates validated before mutation, max 250 days |
| `list_hr_payroll_runs`, `get_hr_payroll_run` | `hr.payroll.read` | RH Payroll management role, organization, country and owner-calculated amounts |
| Prepare/adjust/recalculate/cancel payroll preview/commit pairs | `hr.payroll.prepare` | Same Payroll owner; pure preparation, complete transaction and immutable financial review |
| Approve payroll preview/commit pair | `hr.payroll.approve` | Same owner; current draft and native payable projection |
| Register payroll paid preview/commit pair | `hr.payroll.pay` | Same owner; existing settled payable required |
| `get_hr_kpis` | `hr.kpis:read` | RH KPI tab; each underlying source needs its own current tab permission; complete population or explicit unavailable/N/A |
| `list_projects`, `get_project` | `projects.read` | Processes Projects tab and current project visibility |
| Project create/update/complete/cancel/archive preview/commit pairs | `projects.manage` | Projects owner lifecycle, scope and retained task links |
| Process/collaborator/run/version reads | `processes.read` | Processes Processes tab and tenant/object scope |
| Process create/update/pause/archive preview/commit pairs | `processes.manage` | Processes owner; immutable published versions and authorized targets |
| Generate tasks/create occasional run preview/commit pairs | `processes.run` | Process Runs owner; reviewed version and all generated task plans |
| `stage_operational_file`, `stage_chatgpt_file` | `files.attach` plus exact destination write consent | Authorized object, reversible temporary intake; requires a separate named attachment preview and commit |
| `list_operational_files`, `get_operational_file` | `files.read` plus exact destination read consent | Current permitted object and active attachment; private contents only on explicit user request |
| `export_hr_payroll` | `files.read` plus `hr.payroll.read` | Payroll owner pure CSV/PDF export, no reconciliation or state mutation |
| Seven named attachment preview/commit pairs | `files.attach` plus exact owner write consent | Employees, announcements, assets, records, own/admin permissions or task evidence; same-owner registration and quota |

Exact tool names and schemas are the closed `indiceToolNameSchema` and domain contracts under
`integrations/indice-mcp/src`; the [delivery contract](lupita-hr-processes-delivery-contract-v1.md)
records acceptance and domain limits. These rows never authorize arbitrary API dispatch.

| Tool | OAuth scope | Owner module and tab permission | Risk and additional rule |
| --- | --- | --- | --- |
| `get_sales_today` | `sales.today:read` | `crm`; `crm.kpis` | Read; current organizational KPI scope |
| `get_business_snapshot` | `business.snapshot:read` | `kpis`; `kpis.kpis` | Read; backend-calculated executive aggregates |
| `get_attention_items` | `business.snapshot:read` | `kpis`; `kpis.kpis` | Read; derived from the authorized snapshot |
| `search_employees` | `hr.people:read` | `human_resources`; `human_resources.collaborators` | Read; HR service scope and redaction |
| `get_employee_overview` | `hr.people:read` | `human_resources`; `human_resources.collaborators` | Read; embedded tasks/attendance appear only when separately permitted |
| `get_attendance_exceptions` | `hr.attendance:read` | `human_resources`; `human_resources.attendance` | Read; no biometric, photo or coordinate data |
| `list_tasks` | `tasks.read` | `processes`; Any(`calendar`, `projects`, `processes`, `kpis`) | Read; task visibility remains user scoped |
| `get_task_detail` | `tasks.read` | `processes`; Any(`calendar`, `projects`, `processes`, `kpis`) | Read; object must be present in the actor's visible task set |
| `get_process_task_kpis` | `tasks.kpis:read` | `processes`; `processes.kpis` | Read; official versioned measurements, all Agenda filters, full cohort summary and paginated entity breakdown; preserve nullable N/A |
| `list_hr_schedules`, `get_hr_schedule`, `list_hr_locations`, `get_hr_location`, `list_hr_schedule_candidates`, `get_hr_attendance_calendar` | `hr.control.read` | `human_resources.control`; management role | Read; current HR scope, explicit assignment date/month, complete calendar and bounded cursor pages; no private media or physical biometric data |
| `preview_create_hr_schedule`, `create_hr_schedule`, `preview_update_hr_schedule`, `update_hr_schedule`, `preview_assign_hr_schedule`, `assign_hr_schedule` | `hr.control.manage` | `human_resources.control`; management role | Confirmed owner schedule rules, active assignments and date-range conflict checks |
| `preview_create_hr_location`, `create_hr_location`, `preview_update_hr_location`, `update_hr_location`, `preview_set_hr_allowed_locations`, `set_hr_allowed_locations`, `preview_assign_hr_work_site`, `assign_hr_work_site`, `preview_clear_hr_work_assignments`, `clear_hr_work_assignments` | `hr.control.manage` | `human_resources.control`; management role | Confirmed site/contract/organization; replaces complete permitted-location selection; date removal preserves remaining assignment ranges |
| `preview_correct_hr_attendance`, `correct_hr_attendance`, `preview_record_hr_attendance_event`, `record_hr_attendance_event` | `hr.attendance.correct` | `human_resources.control`; management role | Confirmed administrative correction/event, hire/future-date locks, event history and payroll projection; does not perform physical identification |
| `get_hr_asset_history` | `hr.assets.read` | `human_resources.assets`; management role | Current asset visibility; paginated assignment/status history with whitelisted names |
| `get_announcement_receipts` | `hr.announcements.receipts:read` | `human_resources.announcements`; management role | Current manageable announcement and recipient organization; cancelled deliveries excluded |
| `preview_terminate_employee`, `terminate_employee` | `hr.people.terminate` | `human_resources.collaborators`; management role | Separate confirmed employment termination, access inactivation and retained file; no settlement/payment |
| `preview_update_hr_asset`, `update_hr_asset`, `preview_reassign_hr_asset`, `reassign_hr_asset`, `preview_change_hr_asset_status`, `change_hr_asset_status` | `hr.assets.manage` | `human_resources.assets`; management role | Confirmed metadata/assignment/status; shared owner validators, retained responsibility/history |
| `preview_update_announcement`, `update_announcement` | `hr.announcements.manage` | `human_resources.announcements`; management role | Confirmed complete content/audience/state replacement and owner delivery synchronization |
| `preview_mark_announcement_read`, `mark_announcement_read`, `preview_mark_announcement_unread`, `mark_announcement_unread` | `hr.announcements.respond` | `human_resources.announcements`; readable role | Own authenticated membership only |
| `preview_create_hr_record`, `create_hr_record`, `preview_update_hr_record`, `update_hr_record` | `hr.records.manage` | `human_resources.records`; management role | Confirmed record/agreements/witnesses/status; preserves attachments and history |
| `list_my_hr_permissions`, `get_my_hr_permission` | `hr.permissions.self:read` | `human_resources.permissions`; readable role | Own current membership; attachment metadata only |
| `list_hr_permissions`, `get_hr_permission` | `hr.permissions.read` | `human_resources.permissions`; management role | Current tenant/organization scope and complete paginated query |
| `preview_create_my_hr_permission`, `create_my_hr_permission`, `preview_withdraw_my_hr_permission`, `withdraw_my_hr_permission` | `hr.permissions.request` | `human_resources.permissions`; readable role | Own pending request only; withdrawal uses existing owner pending-delete lifecycle and retained AI audit |
| `preview_approve_hr_permission`, `approve_hr_permission`, `preview_reject_hr_permission`, `reject_hr_permission` | `hr.permissions.review` | `human_resources.permissions`; management role | Current pending state/scope; existing attendance/payroll synchronization |
| `list_hr_incentives`, `get_hr_incentive` | `hr.incentives.read` | `human_resources.incentives`; management role | Authorized audience, actual native payroll applications, amounts/currencies/rates |
| `preview_create_hr_incentive`, `create_hr_incentive`, `preview_cancel_hr_incentive`, `cancel_hr_incentive` | `hr.incentives.manage` | `human_resources.incentives`; management role | Every payroll target/amount confirmed; currency/audience change rejects commit; pause preserves applied historical records |
| `preview_update_task_dependency`, `update_task_dependency` | `tasks.operate` | Existing task write gate | Same visible project, no self/cycles, bounded lag; project graph serialization and explicit removal |
| `get_sales_summary` | `sales.read` | Commercial: `crm.sales`; POS: Any(`pos.sale`, `pos.kpis`) | Read; includes only the channels currently allowed to the actor |
| `list_sales` | `sales.read` | Commercial: `crm.sales`; POS: Any(`pos.sale`, `pos.kpis`) | Read; includes only the channels currently allowed to the actor |
| `get_sale_detail` | `sales.read` | Source-specific: `crm.sales` or Any(`pos.sale`, `pos.kpis`) | Read; source permission is checked before lookup |
| `get_cash_status` | `pos.read` | `pos`; Any(`pos.cortes`, `pos.kpis`) | Read; POS organizational context required |
| `search_products` | `inventory.read` | Inventory: Any(`products`, `inventory`, `purchase-orders`); or CRM: Any(`quotes`, `sales`) | Read; catalog fields only |
| `get_product_detail` | `inventory.read` | Same catalog rule as `search_products` | Read; stock balances additionally require `inventory.inventory` |
| `get_inventory_summary` | `inventory.read` | `inventory`; `inventory.inventory` | Read; authoritative inventory domain only |
| `get_expense_summary` | `expenses.read` | `expenses`; Any(`expenses`, `kpis`) | Read; FinanceContext organizational scope |
| `list_expenses` | `expenses.read` | `expenses`; Any(`expenses`, `kpis`) | Read; FinanceContext organizational scope |
| `get_expense_detail` | `expenses.read` | `expenses`; Any(`expenses`, `kpis`) | Read; company and scope-owned expense only |
| `get_funds_status` | `petty_cash.read` | `petty_cash`; Any(`cash`, `control`, `statements`, `kpis`) | Read; kiosk credentials and tokens are excluded |
| `get_receivables_status` | `receivables.read` | `receivables`; Any(`credit-sales`, `accounts-receivable`, `payments`, `credit-customers`) | Read; FinanceContext organizational scope |
| `get_my_business_context` | `business.context:read` | `config_center`; `config_center.business-structure` | Read; active membership plus server-resolved company, assignment and organizational scope |
| `list_units_and_businesses` | `business.context:read` | `config_center`; `config_center.business-structure` | Read; active references only, restricted to the actor's current organizational scope and cursor paged |
| `list_payment_accounts` | `finance.references:read` | Expenses: `expenses.payment-accounts`; or CRM: `crm.sales`; FinanceContext required | Read; whitelisted account fields only, restricted to FinanceContext and cursor paged |
| `list_funds` | `petty_cash.read` | `petty_cash`; Any(`cash`, `control`, `statements`, `kpis`) | Read-only fund owner contract; cursor paged and excludes kiosk credentials, external-owner data and metadata |
| `search_customers` | `customers.read` | CRM: Any(`leads`, `contacts`, `quotes`, `sales`, `contracts`); or `pos.clientes` | Read; shared customer owner, tenant/scope SQL and cursor pagination |
| `search_providers` | `providers.read` | `expenses.providers` or `inventory.providers` | Read; shared Finance provider owner, server-derived organizational scope; no fiscal IDs, personal contact data or kiosk access |
| `list_warehouses` | `warehouses.read` | `inventory.inventory` or `crm.sales` | Read; tenant/scope SQL, cursor pagination; no stock movement |
| `search_budget_lines` | `budget_lines.read` | `expenses`; Any(`budgets`, `kpis`) | Read; FinanceContext, backend amounts, currency and cursor pagination |
| `search_accounting_accounts` | `accounting_accounts.read` | `expenses.accounting` | Read; FinanceContext, whitelisted account references and cursor pagination |
| `search_task_assignees` | `tasks.delegate` | `processes`; Any(`calendar`, `projects`, `processes`) write grant | Read; active task memberships in actor company/unit/business scope; no employee/user-ID substitution |
| `preview_update_task` | `tasks.update` | `processes`; Any(`calendar`, `projects`, `processes`) write grant | Preparation; task-owner visibility, before/after and current version |
| `update_task` | `tasks.update` | `processes`; Any(`calendar`, `projects`, `processes`) write grant | Confirmed partial update; reassignment also requires `tasks.delegate` |
| `preview_create_task` | `tasks.create` | `processes`; Any(`calendar`, `projects`, `processes`) | Preparation; persists only confirmation and audit |
| `create_task` | `tasks.create` | `processes`; Any(`calendar`, `projects`, `processes`) | Confirmed action; own task by default; another assignee also requires `tasks.delegate` |
| `preview_create_expense_draft` | `expenses.create` | `expenses`; `expenses.expenses` | Preparation; no payment or approval |
| `create_expense_draft` | `expenses.create` | `expenses`; `expenses.expenses` | Confirmed action; creates `DRAFT` only |
| `preview_register_fund_expense` | `petty_cash.expense:create` | `petty_cash`; `petty_cash.control` | Preparation; no global expense authorization |
| `register_fund_expense` | `petty_cash.expense:create` | `petty_cash`; `petty_cash.control` | Confirmed balance-impacting action |
| `preview_add_money_to_fund` | `petty_cash.deposit:create` | `petty_cash`; `petty_cash.control` | Preparation; exact source account required |
| `add_money_to_fund` | `petty_cash.deposit:create` | `petty_cash`; `petty_cash.control` | Confirmed Treasury-impacting action |

| `get_customer_detail` | `customers.read` | Same customer read gate as `search_customers` | Commercial contact fields only; no fiscal data |
| `list_opportunities`, `get_opportunity_detail`, `get_opportunity_pipeline` | `opportunities.read` | `crm.leads`, capability `sales` | Scoped rows/counts; configured flow positions and separate currency totals |
| `list_quotes`, `get_quote_detail` | `quotes.read` | `crm.quotes`, capability `sales` | Scoped quotes, ordered lines and owner totals |
| `search_commercial_assignees` | `commercial.references:read` | CRM: Any(`contacts`, `leads`, `quotes`), capability `sales` | Active scoped memberships; no account/employee-ID substitution |
| `preview_create_customer`, `create_customer` | `customers.create` | `crm.contacts`, capability `sales` | Confirmed shared customer creation |
| `preview_update_customer`, `update_customer` | `customers.update` | `crm.contacts`, capability `sales` | Confirmed partial edit/reassignment |
| `preview_create_opportunity`, `create_opportunity` | `opportunities.create` | `crm.leads`, capability `sales` | Confirmed creation linked to an authorized customer |
| `preview_update_opportunity`, `update_opportunity` | `opportunities.update` | `crm.leads`, capability `sales` | Confirmed partial edit, configured stage transition or reassignment |
| `preview_create_quote`, `create_quote` | `quotes.create` | `crm.quotes`, capability `sales` | Confirmed quote with backend line/total calculation |
| `preview_update_quote`, `update_quote` | `quotes.update` | `crm.quotes`, capability `sales` | Confirmed partial edit, commercial status or reassignment; sales conversion excluded |

### HR, learning and task operations extension

| Tool | OAuth scope | Owner module and tab permission | Risk and additional rule |
| --- | --- | --- | --- |
| `get_system_guide` | `learning.read` | Current authorized RH or Processes tab, including current subscription/module/owner access | Reviewed bilingual Modo aprendiz content; filter every tab and available action. No authorized module returns denied access. |
| `list_task_organization` | `tasks.read` | Same read rule as `list_tasks` | Active unit/business names in the Tasks assignment owner scope; no Configuration permission required |
| `list_hr_organization` | `hr.people.manage` | `human_resources.collaborators`, current management role | Read-only active destinations for employee changes, using RH organizational scope |
| `get_employee_file` | `hr.people.details:read` | `human_resources.collaborators`, current management role | Authorized employment/contact/compensation fields and document metadata; excludes legal IDs, health, banking and private file content |
| `list_hr_records`, `get_hr_record_detail` | `hr.records.read` | `human_resources.records`, current management role | Tenant/scoped owner reads, agreements/history and attachment metadata only |
| `list_hr_assets`, `get_hr_asset_detail` | `hr.assets.read` | `human_resources.assets`, current management role | Unit/responsible owner scope and typed asset fields; no photographs or private URLs |
| `list_announcements`, `get_announcement_detail` | `hr.announcements.read` | `human_resources.announcements`, current readable owner role | Management or personal audience visibility as appropriate; read does not publish scheduled messages |
| `list_announcement_audience` | `hr.announcements.manage` | `human_resources.announcements`, current management role | Read-only scoped recipient names; does not require employee-file or Configuration access |
| `preview_create_employee`, `create_employee`; `preview_update_employee`, `update_employee`; `preview_inactivate_employee`, `inactivate_employee` | `hr.people.manage` | `human_resources.collaborators`, current management role | Exact employment confirmation; create uses standard owner access and capacity; edits preserve current role; inactivation retains employment records and cannot target the operator |
| `preview_import_employees`, `import_employees` | `hr.people.import` | `human_resources.collaborators`, current management role | 1–100 reviewed typed rows, complete batch validation, seat capacity and atomic owner application |
| `preview_create_hr_asset`, `create_hr_asset` | `hr.assets.manage` | `human_resources.assets`, current management role | Owner normalization, unique code/serial, current unit/responsible and explicit currency for value |
| `preview_create_announcement`, `create_announcement` | `hr.announcements.manage` | `human_resources.announcements`, current management role | Draft by default; explicit published/scheduled states use owner delivery rules and confirmed audience |
| `preview_schedule_task`, `schedule_task`; `preview_add_task_follow_up`, `add_task_follow_up`; `preview_update_task_contribution`, `update_task_contribution`; `preview_complete_task`, `complete_task`; `preview_cancel_task`, `cancel_task` | `tasks.operate` | Same current write gate as `create_task` | Owner-visible task; own contribution only; evidence/team rules for completion; retains history |
| `preview_share_task`, `share_task` | `tasks.operate` plus `tasks.delegate` | Same current write gate as `create_task` | Confirms the complete team, names and additions/removals; retains the lead and validates every recipient |
| `preview_audit_task`, `audit_task` | `tasks.audit` | Same current write gate as `create_task` | Completed task, owner score 0–5 and audit side effects |

`tasks.organize` is additional explicit consent for selecting a unit/business during create/update;
it is not a standalone tool. New HR action scopes, `tasks.operate` and `tasks.audit` are never
read-only defaults. New read scopes are offered to new connections; stored grants and refresh
tokens retain their exact consent. HR writes use the existing management role/tab policy and do
not introduce a different permission engine.

Module and tab names in this matrix refer to canonical keys such as
`inventory.inventory` and `expenses.expenses`. Capability checks remain `sales`, `inventory`, `pos`,
`expenses`, `petty_cash`, `receivables`, `processes` or `kpis` as classified by the owning route.

## 4. Action protocol

Every currently delivered action uses an immutable two-step protocol:

1. a preview validates and normalizes the complete business request;
2. the backend stores a hashed, connection-bound confirmation with a maximum five-minute lifetime;
3. the user explicitly approves the displayed preview;
4. commit accepts only the confirmation token and an idempotency key;
5. one transaction consumes the confirmation, executes the owner service and records the result;
6. an identical retry returns the original result; a conflicting retry fails closed.

Commit must never accept replacement business fields. Confirmations are bound to the exact token,
tool, user, company and membership. Money or balance actions must be audited with a safe correlation
identifier and use the Finance/Treasury owner contract.

The Lupita target permits clear low-risk instructions without a second confirmation. This delivery
does not implement that new action protocol. Each future action must adopt and test it explicitly;
client instructions cannot bypass the previews required by current tools. Financial and bulk
operations retain explicit confirmation, audit, idempotency and their owner transactions.

### Task assignment and editing

`tasks.delegate` and `tasks.update` are explicit action consent scopes. Existing connections and
refresh grants keep their stored scopes; read-only defaults do not gain either permission. The
assignee resolver returns `userCompanyId`, display name and organizational labels from the Tasks
owner catalog, without email, HR details or raw user identifiers. Ambiguous names require a user
choice. A delegated creation requires `tasks.create` plus `tasks.delegate`; self creation still
requires only `tasks.create`. The preview binds the exact assignee and owner-derived organizational
scope. Commit revalidates active membership and assignment boundaries.

Editing accepts title, description, priority, due date, status, principal assignee and, with
`tasks.organize`, a requested unit/business. Omitted
fields remain unchanged; explicit clear flags remove description or due date. Reassignment replaces
the previous principal assignee while preserving other collaborators and the task's existing scope.
The Tasks owner still enforces completion/evidence rules and sends its normal notifications.
Organization changes revalidate actor, principal assignee, retained collaborators and linked
project scope. The separate confirmed operational tools add scheduling, follow-ups, contributions,
team sharing, completion, audit and cancellation. Same-project dependency/evidence writes and
project/process configuration now use their named owner contracts. Task-list management is
outside this approved delivery.

Update previews capture the owner task state. Commit locks the tenant-scoped task, compares that
state and rejects a stale preview before applying the partial patch. The confirmation consumption,
owner mutation, execution result and successful audit share one transaction. Retries return the
stored result only after current task visibility is rechecked. Legacy create confirmations and
execution rows remain readable; new draft/result data uses the existing JSON columns, without a
schema migration. Explicit creation drafts use the internal confirmation discriminator
`create_task_v2`; the public tool, execution and audit names remain `create_task`. Earlier releases
cannot consume those pending confirmations as self-assigned tasks after rollback. Legacy
`create_task` confirmations remain readable by this release. The MCP/backend/web catalog and
consent changes must be deployed together.

### Commercial workflow

The [commercial assistant contract](indice-mcp-commercial-contract-v1.md) owns the bounded
customers → opportunities → quotations delivery. New read and action consent is explicit at
connection creation; existing grants and refresh tokens retain their stored scopes. All six
commercial mutations keep the five-minute preview/confirm protocol. Sales owns validation,
flow transitions and calculations. AI owns connection binding, idempotency and the atomic action
audit. The existing generic action persistence is shared through `AiActionRepository`; Finance
keeps its compatibility class and unchanged action protocol. No new action tables or migrations.

## 5. Data minimization and result contracts

Tools expose business answers, not database rows. Stable tool outputs require explicit DTOs and
schemas. Generic maps are a compatibility boundary for the current V1 and must be replaced
incrementally; no new stable tool may introduce another untyped `Map<String, Object>` or
`Record<string, unknown>` result without an approved dynamic-data reason.

Responses must:

- use canonical English field names and localized human summaries;
- separate authoritative totals from paged items;
- disclose `returnedCount`, `totalCount`, `hasMore` and an opaque cursor when a list is bounded;
- compute totals in the backend over the complete authorized filter, never over a truncated page;
- redact credentials, tokens, object keys, private URLs, biometrics, precise coordinates, payroll,
  national identifiers and unrelated personal data;
- use stable machine-readable errors without backend bodies, SQL messages or stack traces.

The approved employment-file exception permits salary, pay period, salary type and hourly rate
only through `hr.people.details:read` and the exact current RH management gate. It does not change
the redaction of legacy overview tools or expose payroll runs. New employee/import preparations
require an explicit registration country; compensation currency is projected by the Payroll
owner. Existing files without a country report a null currency, and compensation changes require
the missing country rather than assuming it from locale. No fiscal/health/banking fields are added.

The approved operational completion also permits payroll lines, native currency calculations and
CSV/PDF through `hr.payroll.read`, plus separately consented prepare/approve/paid-registration
actions. Payroll owner authorization and country rules are authoritative. Paid registration
requires an already settled payable; it does not execute a payment. No legal/banking fields are
projected, exports do not reconcile or mutate the run, and assistant CSV protects formula cells.

`files.read` and `files.attach` are additional optional consents, off by default, never added by
refresh. Together with the exact domain read/write gate, they permit explicitly requested
operational attachment contents. Employee file intake/read supports resume, proof of address
and profile photo; national identity/birth certificates remain excluded. Health, banking,
biometric and unrelated material remain outside the assistant contract. Backend staging validates
format/MIME/size/hash, current object access, existing storage quota and token ownership. Registration
is immutable, confirmed, transactional and replay safe. No binary contents, signed URLs or object
keys enter confirmations, execution JSON or audit. Business work-site configuration coordinates
are permitted through the Control owner; recorded personal event GPS and media are still excluded.

Native ChatGPT intake declares `openai/fileParams` with the four official file properties and
downloads only HTTPS from operator-approved exact hosts, with public DNS pinned in TLS, no
redirects/credentials and bounded time/bytes. The URL and host file ID are never persisted.
Configuration and real-client acceptance are described in the delivery verification.

HR list tools use their owner SQL pages or fully authorized owner list, with a maximum of 100 rows,
complete filtered totals and an opaque `nextCursor` bound to user/company/membership, tool, filters
and page size. `nextPage` is explanatory compatibility metadata; clients continue with `cursor`
and unchanged filters/limit, omitting `page`. These are live pages, not a frozen data snapshot.
Employee, task and attendance-exception legacy queries now expose complete authorized totals and
opaque cursor continuation; other legacy query schemas and bounded lists retain their documented debt.
Legacy HR discovery and execution now repeat subscription/module/tab checks as well as the HR
owner role gate. Embedded task/attendance information in an employee overview additionally
requires its separate stored OAuth scope and current domain access; unavailable sources report
null counts with explicit availability rather than claiming an empty business population.

## 6. Tool discovery and conversational design

Tool names describe business intent, not CRUD. Inputs should prefer names, dates, folios and
business concepts. When an owner action ultimately needs an identifier, a read-only resolver must
let the model identify the exact authorized entity first and must return enough label/context for
human confirmation.

The first read-only resolver slice is delivered with typed contracts and opaque cursor pagination:

- `get_my_business_context`;
- `list_payment_accounts`;
- `list_funds`;
- `list_units_and_businesses`;

The operational resolver package is also delivered, with new separately consented read scopes:

- `search_customers`;
- `search_providers`;
- `list_warehouses`;
- `search_budget_lines`;
- `search_accounting_accounts`.

MCP initialization supplies Lupita behavioral instructions: priority, context, consequence,
recommendation and next action. It describes specialist perspectives without claiming to execute
independent agents. Neither these instructions nor an agent name confer module or commercial access.

Delegated HTTP discovery is capability-aware. On every MCP request, the server obtains the `v1`
manifest from `GET /api/v1/ai/access/capabilities`, validates it against its closed tool catalog and
enables only tools compatible with both the stored OAuth scopes and current Indice permissions.
The manifest is returned with `Cache-Control: no-store`; permission revocation therefore affects the
next request. Tool execution still repeats its owner authorization and never trusts discovery as an
enforcement boundary.

Within a single synchronous capability evaluation, repeated subscription, module, tab and entitlement
checks may reuse their result for the same authenticated actor. The evaluation memo must be cleared
in `finally`, isolated by thread and keyed by the full authenticated membership. It must not survive
into the next request, token verification or tool execution. This optimization does not introduce
a time-based permission or capability-manifest cache.

The local stdio development transport may register the complete catalog because it has no delegated
HTTP request context. It does not weaken backend authorization and is not the production ChatGPT
connection path.

## 7. Operations and public release

The MCP remains bound to loopback. A public deployment exposes only the exact HTTPS MCP route
through the reverse proxy and preserves the Authorization header. The public route requires a
bounded JSON body, rate limiting and no-store responses. Readiness must distinguish MCP process
liveness from backend authorization-service availability.

The dedicated HTTP capacity policy is fixed and version-reviewed, not client-configurable:

- Both supplied Nginx configurations use one shared `$server_name` bucket per environment:
  20 requests/second, burst 40 without queuing, and at most eight simultaneous MCP requests.
  Only the exact `/api/v1/ai/mcp` location consumes these quotas. Untrusted Host or forwarded-IP
  changes cannot rotate the key. Other APIs, OAuth metadata and private readiness are unaffected.
- The MCP process independently limits `/mcp` to 20 requests/second, burst 40, and eight in flight
  before authorization/body parsing. Slots release exactly once on completion or disconnection.
- After the backend validates each request's current delegated manifest, a connection has an
  independent 8 requests/second, burst 24 quota. Its in-memory SHA-256 token key is never logged,
  grants are never cached, and the quota map retains at most 1024 entries with 60-second idle
  expiry. A full map rejects new keys instead of evicting a live quota. This is not tenant authority.
- Capacity rejection returns JSON-RPC HTTP `429`, `Retry-After: 1`, `Cache-Control: no-store` and
  no OAuth-expiry challenge. Never automatically replay a write because of throttling.
- The manifest is validated **before** body consumption. Ordinary JSON is limited to 100 KiB;
  only a current manifest containing `stage_operational_file` selects the 14 MiB parser, and a body
  over 100 KiB must name that exact intake. Declared oversized bodies are rejected before reading;
  compressed JSON remains disallowed. Authentication errors before parsing have a null RPC ID.
- Nginx bounds body inactivity to 15 seconds; Node bounds header receipt to 15 seconds and whole
  request receipt to 30 seconds. These are not a new deadline or retry for an already received action.

This policy is capacity protection for the current single MCP process per environment, not a
distributed quota service or complete denial-of-service defense. Scaling replicas or changing the
proxy trust boundary requires a reviewed shared-capacity policy. Actual Nginx container regressions
and HTTP SDK tests verify rejection, recovery, privacy and unchanged permission/continuity behavior.

The runtime does not enable Express forwarded-IP trust. Authorization continues
to derive from the delegated bearer and current backend grants, never a forwarded
client address. The transitive `proxy-addr` package is pinned to patched `2.0.8`
for CVE-2026-90711; its mapped-IPv6 trust and unchanged no-proxy-trust behavior
have regressions. This dependency correction changes no tools, scopes or action protocol.

The MCP SDK is pinned to `1.31.0`, the minimum corrected 1.x version for
`GHSA-6qxp-vccf-f47h`/`CVE-2026-104850`. The affected OAuth-client credential forwarding is not
used by this delegated server; do not introduce unbound persisted OAuth-client credentials.
This patch does not replace the backend's token/resource validation or change consent.

### 7.1 Conversation continuity and bounded recovery

HTTP remains stateless: a new SDK server/transport processes each request. Conversation continuity
does not require keeping a user session in the MCP process. Never preserve availability by accepting
an expired token, sharing credentials, serving a stale permission manifest or widening consent.

- Explicit delegated reads (including read-only query/reference POST endpoints) may retry
  network/body failures, timeouts and HTTP `429`, `502`, `503`, `504`. The default is two total
  attempts with a 150 ms delay and a 5 s deadline per attempt, including body consumption.
- `INDICE_READ_ATTEMPTS` is bounded to 1–3; `INDICE_RETRY_DELAY_MS` to 0–1000 ms;
  `INDICE_HTTP_TIMEOUT_MS` to 1–30000 ms. A `Retry-After` beyond 1 s stops immediate recovery;
  it must not be ignored by retrying early. Caller cancellation stops recovery.
- Authentication/permission failures and unknown endpoints are not retried. Preview, commit,
  login and OAuth token exchange are never automatically replayed by the adapter. An uncertain
  write outcome must not be presented as success or retried with a new idempotency key.
- Unavailable or invalid capability manifests return HTTP `503`, never a successful empty catalog.
  A genuinely empty authorized manifest remains valid. Invalid authorization returns `401` with
  `WWW-Authenticate`; denied access returns `403`. Tool-level `401` also emits the MCP OAuth
  challenge in `_meta["mcp/www_authenticate"]`. HTTP tool descriptors publish their OAuth scope in
  `securitySchemes` and the SDK-supported `_meta.securitySchemes` compatibility field.
- Supported scopes derive from the closed tool-to-scope map and are contract-tested against
  Spring. New read scopes still require consent; metadata is not authorization.
- JSON stderr diagnostics contain a timestamp, server-generated request ID, known RPC method/tool,
  HTTP status, elapsed time, outcome, catalog count/fingerprint and per-backend-attempt status.
  The request ID is propagated to Spring. Never log tokens (including hashes), caller-supplied IDs,
  business arguments/results, response bodies, cookies or personal identifiers. A fingerprint
  describes only the sorted authorized tool names, not a person or token.
- Private `GET /healthz` proves process liveness. Private `GET /readyz` checks the backend public
  health contract within 1.5 s; this proves backend reachability, **not** database health, OAuth
  refresh or user-specific capability availability. Compose uses readiness; the host-network
  release script also verifies anonymous MCP `401`. Neither endpoint is added to the public proxy.
- Release acceptance additionally requires authenticated APPTEST continuity for 20–30 minutes,
  real refresh/revocation, an explicitly confirmed synthetic write and a separate check of the
  actual ChatGPT client/mode. Synthetic SDK tests cannot certify ChatGPT voice support or force
  that client to expose tools on every turn.

Operational steps and remaining release gates are in
[`deployment/MCP_APPTEST_RUNBOOK.md`](../deployment/MCP_APPTEST_RUNBOOK.md).

Production/catalog release requires all of the following:

- successful OAuth Authorization Code + PKCE, refresh and revocation from the real ChatGPT flow;
- tool discovery/annotation scan;
- negative multi-tenant, wrong-module, wrong-tab and wrong-organizational-scope tests;
- confirmed-action and idempotent-retry tests using synthetic APPTEST data;
- safe metrics for tool, latency, outcome and correlation without logging raw secrets or payloads;
- approved domain verification, privacy, terms and isolated reviewer account;
- documented rollback with the previous immutable images retained.

## 8. Change and verification discipline

Adding or changing a tool requires, in the same change:

1. one matrix entry and named domain owner;
2. an explicit input/output schema;
3. OAuth scope and exact module/tab policy;
4. tenant and narrower-scope negative tests;
5. redaction and error-contract tests;
6. action confirmation, idempotency, transaction and audit coverage when applicable;
7. TypeScript MCP tests, focused backend tests and relevant compilation;
8. APPTEST conversational evaluation before public enablement.

No high-risk action such as paying an expense, approving money, adjusting inventory, cancelling a
sale, changing permissions, running payroll or deleting business records may be added without a
separate approved domain decision and recovery tests.

## 9. Known bounded V1 debt

- generic business and finance result schemas remain dynamic;
- several legacy sales/product/finance lists still have limits without a cursor contract and
  filter in memory; employee/task/attendance lists now have bound opaque cursors and full counts; the
  eight paged reference lists expose opaque cursors (business context is a separate singleton); customer and warehouse count/row
  queries paginate in SQL, while the Finance reference lists still paginate after owner filtering;
- backend reachability is covered by readiness; an authenticated synthetic monitor and actual
  ChatGPT text/voice continuity still require APPTEST operational validation;
- the full ChatGPT APPTEST and reviewer checklist remains incomplete;
- `docs/indice-mcp-local-mvp.md` is historical and its migration/test counts must not be used as
  current release evidence.

These items define the next MCP foundation blocks. They do not authorize additional write actions.
