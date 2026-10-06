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
