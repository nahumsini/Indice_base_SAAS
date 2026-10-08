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
