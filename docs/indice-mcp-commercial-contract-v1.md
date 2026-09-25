# Commercial assistant contract v1

Owner: Sales/CRM. Delegated interface: MCP and `/api/v1/ai/tools/commercial/{tool}`.
Canonical parent: [MCP Operating System](indice-mcp-operating-system-v1.md).
Scope: customers → opportunities → quotations, approved for APPTEST delivery. Implementation
availability must be checked against the deployed revision; this document is not deployment evidence.

## Authorization and ownership

Every endpoint authenticates the delegated bearer and rechecks live module, tab, entitlement and
organizational scope. Customer writes require `crm.contacts`, opportunities `crm.leads`, quotes
`crm.quotes`; all require capability `sales`. Customer reads retain the existing shared CRM/POS
permission. Commercial assignee search requires at least one of those CRM tabs. Scopes are listed
in the canonical matrix; old tokens and refresh grants never gain permissions by deployment.

Customers use `sales_contacts`, the existing shared Sales/POS entity. Opportunity scope follows
its unit/business. Quote scope follows its linked opportunity, with the contact as fallback only
when unlinked, matching the Sales owner contract. Linked references must separately be visible,
active where required and from the same tenant. Quote and opportunity must identify the same
customer. Row queries, counts and aggregates all apply tenant and organizational predicates.

Clients never submit company, user, role, unit or business authority. Assignee identifiers are
`userCompanyId` values resolved from active commercial memberships in the actor's scope. New
customers inherit the selected assignee's organization; new opportunities inherit the customer;
quotes inherit commercial scope through their links. Reassignment preserves existing organization.
Missing organizational scope fails closed. Duplicate names require user disambiguation.

## Tools and business fields

Nineteen additional tools: seven reads and six preview/commit pairs. Inputs and responses use typed
DTOs and closed Zod schemas. Camel-case input fields follow the delegated HTTP contract.

- Customers: detail; create/edit name, contact person, phone, email, source, active/inactive status,
  responsible person and notes. Fiscal identifiers, fiscal profiles and arbitrary metadata excluded.
- Opportunities: list/detail, configured pipeline; create/edit name, customer, source, active/inactive
  status, responsible person, estimated value/currency, configured flow/stage, close date, next action
  and notes. Won/lost uses the owner flow engine and its global terminal synchronization; a closed
  opportunity cannot be reopened by changing its stage.
- Quotes: list/detail; create/edit customer/opportunity, responsible person, currency, ordered lines,
  expiration, notes, terms and commercial status. Supported writable statuses: `draft`, `sent`,
  `viewed`, `negotiation`, `approved`, `rejected`, `expired`. Existing `closed_won` quotes remain
  readable; generating a sale and setting its closed-won effect stays in the Sales conversion use
  case. A quote already linked to a sale permits notes, terms and assignment through MCP; commercial
  corrections use the Sales workflow.
- Each supplied quote line includes positive quantity, nonnegative unit price, explicit tax rate
  and optional discount. Both percentages range from 0 to 100. Up to 100 ordered lines and two
  decimal places for persisted numeric inputs. Product IDs are tenant-owned, active commercial
  catalog references; product/quote currencies must match. Free-description lines are supported.
  No invented exchange rates. The existing Sales formula calculates each line, rounded to the
  persisted two decimal places with HALF_UP, then sums persisted lines. Client totals are rejected.

Omitted fields are preserved. `clearFields` explicitly clears only supported optional fields.
Supplying `items` replaces the complete ordered quote line list via the existing owner operation;
omitting it preserves existing lines and their metadata. Read pages have at most 50 rows, full
scoped count, `hasMore` and an opaque cursor bound to scope and filters. Pipeline selects a real
configured `flowId` or the default, reads that flow's positions and groups totals by stage and
currency. It never initializes business rows during a read or preview.

`sent` records the user's requested status; it does not send a message. No tool in this delivery
creates sales, invoices, payments, stock movements or outbound customer communications. It does
not manage flows, delete records, expose fiscal/customer metadata or implement multiagent execution.

## Confirmation, concurrency and retries

All writes retain explicit approval of the displayed before/after preview. Confirmation expires
in five minutes and binds action, exact access token, user, membership and company. Commit accepts
only `confirmationToken` and `idempotencyKey`. Reusing the same key/confirmation returns the
original result after rechecking current visibility. Another confirmation with that key conflicts.

Execution uses a transaction at READ_COMMITTED, locks the target and quote lines, checks the
snapshot and referenced customers, opportunities, products, assignees and flow configuration, then
calls Sales. A changed snapshot returns 409 before business mutation. Confirmation consumption,
owner writes, execution result and successful audit commit together or roll back together. Audit
records only kind/id/outcome/correlation, without duplicating customer contacts or free-text notes.
The protected confirmation stores the exact normalized draft required to apply the approved edit.

MCP retries only whitelisted reads. It never automatically retries a preview or uncertain commit.
After a lost response the client must preserve the original token/key and explicitly retry that
same attempt. A stale preview requires a new preview and a new approval.

## Verification and release

Regression coverage includes the real synthetic MySQL journey, owner calculations and terminal
transitions, partial edit preservation, scoped rows/counts/references, stale snapshots, inactive
assignees, expiry, mismatched tool/token, live permission loss and idempotency. MCP tests exercise
SDK discovery, consent metadata, strict schemas, delegated HTTP payloads, response validation and
bounded read retry. Frontend tests cover opt-in action consent and Spanish/English labels.

No schema migration. Old releases cannot consume these new action names and therefore fail closed
on pending confirmations after rollback. Deploy backend, MCP and web together to APPTEST following
[deployment instructions](../deployment/README.md); retain prior images and verified backups.
A real OAuth conversation on the deployed APPTEST revision remains required before production.
