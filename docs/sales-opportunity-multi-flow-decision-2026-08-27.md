# Sales Opportunity Multi-Flow Decision

Status: Approved and implemented on 2026-08-27.

## Decision

Opportunity workflows are a tenant-owned catalogue. Every company always has the immutable
factory workflow and may create additional selectable workflows. A custom workflow must contain
at least one open stage and the protected technical terminal stages `won` and `lost`.

Each opportunity owns one independent stage position per workflow. Creating a workflow initializes
all open opportunities at that workflow's first open stage. Selecting another workflow changes the
Kanban, stage filters, probability, and stage controls to that workflow's stored positions; returning
to a previous workflow restores its prior positions.

`OPEN`, `WON`, and `LOST` are opportunity lifecycle states, not workflow-local sales statuses.
Closing an opportunity as `WON` or `LOST` in any workflow synchronizes the corresponding protected
terminal position in every active workflow. A workflow switch cannot reopen a terminal opportunity.

## Ownership boundaries

- Workflow selection and position changes do not copy, move, or delete opportunity attachments,
  quotes, contracts, notes, tasks, ownership, or related sale records.
- Payment, inventory, delivery, invoice, and other operational sale statuses remain owned by their
  existing sales domains and are not derived from the selected opportunity workflow.
- Tenant scope and management authorization are enforced by the backend. Frontend checks are only
  user-experience controls.
- Position changes and terminal synchronization execute in the same database transaction as the
  opportunity mutation and append an audit-history row.

## Compatibility

The existing single company flow is migrated to a selectable custom workflow and remains the
company default. Companies without a prior customization use the factory workflow as their default.
The legacy `stage` and `probability_percent` columns remain as a compatibility projection of the most
recently mutated position; per-workflow position records are authoritative for workflow rendering.
