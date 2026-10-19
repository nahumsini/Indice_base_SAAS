# Sales post-sale continuity contract

Adopted 2026-10-18. Owner: Sales. This contract extends the Frontend and Backend
Operating Systems for `/sales/after-sales` and `/api/v1/sales/post-sales/workspace`.

## Product decision

Post-sales has two primary views: Won (Ganadas) and Lost (Perdidas). A seller
continues owning delivery/service after the commercial sale. Scheduling a lost
prospect **only requests a seller review**; it never creates or reopens an
opportunity automatically. Explicit reactivation creates one linked opportunity,
preserving the original loss and its history.

## Sources and ownership

Won reads nondeleted CRM `sales_records`, excluding cancelled, canceled, rejected
and voided commercial records. This is operational continuity, not a new sales
ledger or payment classification. The original sale number, customer and seller
are retained. Lost reads nondeleted opportunities with canonical lifecycle LOST.
The existing Sales ledger, KPI calculations, payment, inventory and accounting
owners retain all authority; continuity never writes to those records.

A source appears immediately, without a write during reads, in the virtual default
flow. Its first saved follow-up creates one work record, unique by authenticated
company, source kind and source ID. The original seller is the initial responsible
person; an active membership in the same company is required for every saved work
record. Source eligibility and tenant ownership are checked again under a lock.

The previous customer portfolio, documents and legacy case history remain under
**Customer history**. Its follow-up shortcut for a sale opens this workspace.
Legacy cases are not destructively migrated and are not silently treated as new
operational work or recovery schedules.

## Won flows

The read-only starting flow is Pending → Coordination → Delivery/service → Customer
verification → Completed. A company can create up to ten active flows, with two to
twelve stages, localized user-authored labels and approved color tokens. Stage
identifiers are English and stable; `completed` is always last. Users can reorder
or rename stages. Stages currently referenced by work cannot be removed, and flows
with work cannot be archived. Archive never deletes history.

The follow-up modal selects flow, stage, responsible seller, next action, date and
notes. Cards support drag/drop and an accessible stage select; each column scrolls
independently. Pagination is server-side (50 default, 100 maximum), with aggregate
counts across the full filtered result. Column counts explicitly refer to the
current page. Search, selected view/flow, owner and page use the existing workspace
navigation memory; unsaved forms are not persisted as navigation state.

Won also offers **Board / Table**. The table compares customer/contact, sale reference,
service stage, responsible seller and next action with its date and urgency. Opening
the customer, next action or primary row action uses the same follow-up modal; call
and email links keep their existing behavior. Switching layout preserves filters,
the active flow and current server page without refetching or mutating a record.
`wonView` (`board` by default) and page size use the existing scoped navigation memory.
Lost offers its own **Cards / Table** selector while preserving manual recovery.

The table uses the shared operational table, resizable headers, action group and
pagination. Page sizes are 10/25/50/100, respecting this domain's existing API maximum
of 100 (200 is not offered). The server owns ordering across the entire filtered result;
no page-local sorting or second pagination layer misrepresents the full result.
An invalidated last page returns to the last valid server page. Column widths are
versioned browser presentation preferences; horizontal overflow stays inside the table.

## Table ordering

Both tables use the shared sortable headers with the Sales coral tone, visible active
direction and `aria-sort`. Clicking a new column starts ascending; clicking it again
switches direction and returns to page one. Won and Lost remember their column and
direction independently in the existing company/user-scoped workspace memory.

The existing workspace GET accepts optional `sort` and `direction` parameters. Omission
retains the previous `nextAction` / `asc` ordering and unchanged response DTO. Allowed
columns are `client`, `sale`, `stage`, `owner`, `nextAction`, and Lost-only `lossReason`;
directions are strictly `asc` / `desc`. Unsupported values return the existing 422
validation response after authentication and tab authorization. Tenant/owner/flow/search
filters, counts, permissions and page-size limits retain their existing meaning.

- Client sorts by displayed customer name, falling back to the opportunity title/reference.
- Sale/opportunity sorts by the reference shown in its cell; owner and loss reason sort
  by their displayed text under the database collation.
- Won stage sorts by each configured flow's stage position, including the initial flow.
  Lost recovery sorts Unscheduled → Scheduled → Paused → Recovered, reversed for descending.
- Next action sorts by its follow-up/review calendar date. Missing dates and blank text
  remain last in both directions. Source ID descending is the deterministic tie breaker.

Sorting executes in the tenant-scoped SQL query **before** LIMIT/OFFSET. SQL expressions
and directions are allow-listed; user-authored flow keys are bound values. Reads do not
modify a sale, work record, recovery state, reminder or financial result. A failed read
shows retry feedback instead of presenting old rows under a newly selected ordering.

## Lost review and reactivation

The lost table uses the same operational table and pagination primitives as Won.
It shows customer/contact, opportunity, recovery status, responsible seller, loss
reason, next action and review date. Paused and recovered records retain their own
labels and are never shown as completed sales or overdue work. Opening a row or
its next action opens the existing lost follow-up modal; it does not reactivate
the prospect. `lostView` and column widths are remembered independently from Won.
Layout switches preserve the filtered server page and perform no business writes.

The seller records the loss reason, review date, next action and notes, or pauses
review. Calendar shortcuts offer 7/15/30/60/90 days from the company's current date.
Dates are calendar dates in the company time zone, not invented call timestamps.

The scheduler discovers at most 100 due work IDs per batch and revalidates each
company, source, date, active recipient, Sales module and `crm.contracts` access.
It publishes one internal notification per work revision with a scoped deep link.
It catches overdue reviews after server downtime and never creates opportunities.
Changing, pausing or completing work invalidates prior reminders. Notification
receipts remain durable, including dismissed notices. No email, WhatsApp or SMS is
sent by this feature. The local backend must run for scheduled dispatch.

Manual recovery additionally requires `crm.leads`. It calls the existing Sales
opportunity owner inside the same transaction, copying contact/context into the
original commercial flow (or an explicitly selected API override), with zero
initial estimated revenue. The original flow must still accept new opportunities.
The new opportunity's custom fields link the lost opportunity and work record;
the work record stores the new opportunity ID and becomes recovered. The original
opportunity remains LOST. Following the link opens the existing opportunity detail.

## Security, persistence and retries

Every endpoint requires session authentication, Sales entitlement/module access,
`crm.contracts`, company-scoped object access and CSRF for mutations. Company and
actor come from the session, never payload authority. Recovery requires both tab
permissions, not an any-of permission check. Arbitrary foreign owner/flow/source
IDs cannot be adopted. No hard deletes are introduced.

Company then source locks serialize continuity mutations. Versions prevent stale
writes. Work mutations retain their last request UUID and payload hash; an exact
retry returns the stored result, a changed payload or obsolete revision conflicts.
After a later write, an old retry cannot create another operation. New flows retain
an immutable creation UUID/hash. Flow updates accept an identical already-applied
version retry. Recovery has one durable result per lost source, including parallel
requests. The frontend retains the same request during an uncertain network result
and disables edits until retry or explicit reload resolves it.

An append-only work event captures actor, stage/flow/owner, next action/date, notes,
loss reason and recovery result. The modal shows the latest 50 events. V323 adds
three Sales-owned tables without modifying historical financial migrations.

## Verification and rollback

Database tests run only against isolated `indice_test_db`. Cover tenant and owner
rejection, source read-only behavior, history, flow constraints, stale writes,
idempotent concurrent recovery, reminder time zones and notification permissions.
Controller tests cover authentication, both tab permissions and CSRF. Frontend
runtime tests cover date shortcuts, eligibility, guarded saves, uncertain retry
and explicit manual recovery. Browser fixtures use only synthetic in-memory data.

Application rollback uses the prior application artifact and retains the additive
V323 tables and event history. Never reverse or edit an applied migration. Existing
financial data and legacy portfolio behavior remain available on rollback.

## Implementation and local verification

- UI: `react/src/app/BasicModules/Sales/Postventa/Postventa.tsx`,
  `PostSalesPortfolio.tsx`, and `workspace/` (board, follow-up modal, flow modal,
  API contracts, calendar helpers and localized catalogs).
- Backend: `PostSaleWorkspaceController`, `PostSaleWorkspaceService`,
  `PostSaleWorkspaceRepository`, `PostSaleWorkspaceDtos`,
  `PostSaleReminderService`, `PostSaleReminderScheduler` under the Sales package.
- Schema: `V323__sales_post_sale_continuity.sql`.
- Tests: `PostSaleWorkspaceIntegrationTest`, `PostSaleWorkspaceControllerTest`,
  `react/tests/post-sale-continuity.test.mjs` and the isolated browser fixture
  `react/tests/fixtures/post-sales.html` / `post-sales.tsx`.

On 2026-10-18, the local verification passed 72 frontend checks and 54 backend
checks across the focused and relevant regression suites, including migration
uniqueness. TypeScript and Vite production build passed; Vite retained the existing
large-chunk advisory. Flyway startup passed in the isolated test database and the
local functional environment. Browser checks covered the real existing won/lost
records, responsive modal layout, navigation memory, synthetic flow creation,
explicit recovery, theme contrast, and retry after a committed response is lost.
No functional sale, loss, payment or inventory record was created or modified for
these checks. The new flows and mutations exercised in the browser fixture are
in-memory only. External deployment: N/A.

Won table extension, 2026-10-18: 73 focused/frontend regression checks passed, including
view restoration/switching, server pagination and page-size reset, invalid saved state,
follow-up actions, completed urgency and empty state. TypeScript and production build
passed. Browser verification covered the existing local workspace plus synthetic
30-sale pagination, modal opening, reload persistence and contained mobile overflow.
Backend/schema changes: N/A; no financial or operational records were modified.

Lost table extension, 2026-10-18: 76 focused/frontend regression checks passed,
including independent layout restoration, preserved recovery filters, server paging,
paused/recovered labels and opening the original lost record. TypeScript and the
production build passed with the existing bundle-size advisory. Browser checks
verified the local lost table, review modal, reload persistence and contained mobile
overflow. Backend/schema changes and business-record mutations: N/A.

Table ordering extension, 2026-10-18: 80 focused/frontend regression checks and
50 backend checks passed. Coverage includes independent saved sorting, page reset,
ordering before pagination, configured stages, null-last dates, deterministic ties,
tenant isolation, rejected sort input, and preserving an open follow-up modal after
a refresh failure. TypeScript and the production build passed; the existing Vite
bundle-size advisory remains. Browser checks covered synthetic multi-page sorting,
keyboard toggling, independent table preferences and reload persistence, followed
by the existing local records against the updated backend. Shared header arrows and
`aria-sort` were verified. No business records were changed. Schema changes and
external deployment: N/A. The isolated test database was stopped after validation;
the functional local backend and frontend remain running.
