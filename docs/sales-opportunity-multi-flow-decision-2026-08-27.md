# Sales Opportunity Multi-Flow Decision

Status: Superseded in part by the authoritative-assignment decision implemented on 2026-09-30.

## Decision

Opportunity workflows are a tenant-owned catalogue. Every company always has the immutable
factory workflow and may create additional selectable workflows. A custom workflow must contain
at least one open stage and the protected technical terminal stages `won` and `lost`.

Each opportunity has exactly one authoritative active workflow assignment. The Opportunities table
exposes that assignment as an editable Sales flow column. Selecting a workflow for the workspace
limits the table, metrics, filters, agenda, and Kanban to opportunities assigned to that workflow.
Creating a workflow does not copy existing opportunities into it.

### Workspace visibility feedback (2026-10-06)

The selected workflow is a safe view scope, not a company-default mutation. It is restored through
the existing user-and-company-scoped workspace navigation memory; an explicit `flow` URL parameter
wins over remembered state. Restoration waits for the authorized catalogue, validates the workflow
identifier, and resets dependent stage/page state when the remembered workflow is unavailable.
Clearing search filters does not change the selected workflow.

The selector displays current assignment counts from the already loaded, owner-visible records,
before search/period filters. These transient navigation counts are not monetary KPIs, are not saved
as workspace state, and are unavailable while records are loading or a load failed. An empty assigned
workflow explains that other workflows may still contain opportunities and offers view-only links.
Only a successful backend-confirmed reassignment displays the saved destination and a link to view
it. It does not automatically change the current workflow, delete/copy an opportunity, or alter the
company default. Pending and failed saves never display success feedback.

Reassigning an open opportunity is an explicit transactional mutation. The destination workflow is
validated as active and tenant-owned, the opportunity starts in the destination's first open stage,
and the compatibility `stage` and `probability_percent` projection is updated in the same transaction.
Existing position rows in other workflows are retained as historical compatibility data, but they are
not rendered and are not authoritative.

`OPEN`, `WON`, and `LOST` are opportunity lifecycle states, not workflow-local sales statuses.
Closing an opportunity as `WON` or `LOST` updates the protected terminal position in its assigned
workflow. Reassigning a terminal opportunity maps it to the equivalent protected terminal stage in
the destination workflow and cannot reopen it.

## Ownership boundaries

- Workflow selection and position changes do not copy, move, or delete opportunity attachments,
  quotes, contracts, notes, tasks, ownership, or related sale records.
- Payment, inventory, delivery, invoice, and other operational sale statuses remain owned by their
  existing sales domains and are not derived from the selected opportunity workflow.
- Tenant scope and management authorization are enforced by the backend. Frontend checks are only
  user-experience controls.
- Assignment and position changes execute in the same database transaction as the opportunity
  mutation and append an audit-history row containing the source and destination workflow context.

## Compatibility

The existing single company flow is migrated to a selectable custom workflow and remains the
company default. Companies without a prior customization use the factory workflow as their default.
Existing opportunities are assigned to their company's active default workflow during migration.
The `assigned_flow_id` column is the authoritative workflow relation and is protected by a composite
tenant foreign key. The legacy `stage` and `probability_percent` columns remain a compatibility
projection of the assigned workflow position.

## Flow administration and retirement (2026-10-23)

The catalogue and visual stage editor use one compact native Sales modal. The selected view is
labeled separately from the company default. Factory stages remain immutable and can be copied
into a new company flow; duplication never copies opportunities or their position counts. Scripts
are opened from their own flow card. Editing names, order, token colors and probabilities remains
company configuration. Dirty changes require explicit discard; submissions block duplicate actions.

Personal stage colors are a separate presentation preference, with a broad swatch palette and
validated six-digit hex values. They use the existing workspace-state owner under `sales` /
`opportunity-colors-{flowId}`, scoped to the authenticated company/user and actor-bound on each
request. Explicit saves last until changed; cancel does not persist drafts. Private colors decorate
Kanban, stage choices, table/agenda badges and distribution indicators without changing the shared
stage token, probability, ordering, status or permission. The factory may be personally recolored.

Deleting a custom flow retires its active catalogue head. No opportunities, stage history, scripts,
revisions, attachments, notes, ownership or related business records are hard-deleted. A two-step
review explicitly chooses an active same-company destination and maps each populated OPEN stage
to an OPEN destination. WON/LOST map to equivalent terminal stages and cannot reopen. Reassignment
uses the destination stage's probability, updates the authoritative assignment and compatibility
projection, and appends FLOW_RETIRED position history. Retiring a company default makes its chosen
destination the default; ordinary view selection still never changes that default.

The backend rechecks the review fingerprint and acquires the same factory-head serialization lock
as existing flow/stage/assignment writes. Factory retirement is rejected. A transactional revision
receipt binds a command UUID to its request digest and response; retries replay that receipt and
cannot repeat movement or reuse the UUID with different content. Up to 5,000 live opportunities
can move in one retirement; larger flows must first use ordinary reassignment. Inactive heads and
historical positions remain for audit, including already soft-deleted opportunities. Retired flow
keys remain reserved, so a new flow with the same display name receives a new key. This is additive
application behavior with no schema migration; application rollback retains the inactive heads and
receipts. No public release or production data mutation is implied by local validation.
