# Shared processes and process runs

Status: approved product contract for the Processes and Tasks module.

This contract extends the existing process engine. A process remains the reusable definition and
`process_tasks` remains the operational task record used by Agenda, kiosks, audits and reports.

## Definition dimensions

- `distributionMode`: `individual` (exactly one task template) or `shared` (two or more templates).
- `activationMode`: `recurring` or `occasional`.
- `organizationMode`: `parallel`, `sequential` or `staged`.
- Every published edit creates a new immutable definition version. Existing runs and tasks keep the
  version from which they were created.
- A process has a coordinator, default unit/business and priority. A task template may override
  unit, business and priority.

## Task templates

Each template has a title, instructions, notes, one or more fixed assignees, stage, planned-day
offset, deadline offset and an evidence requirement. Multiple assignees produce one shared task;
any active assignee can complete it. All templates are required.

All tasks in a run are inserted immediately. Organization modes determine planned dates and stages,
but never lock future tasks. Dates are fixed when the run is created. If weekends are excluded,
planned and deadline offsets skip Saturday and Sunday; holidays are not considered.

## Runs

A run snapshots the process version, coordinator, reference and start date. Recurring runs use an
automatic date reference and remain generated through the existing 45-day window. Occasional runs
require a reference and default their start date to today. A normalized duplicate reference creates
a warning, but an intentional confirmation may create another run. An idempotency key prevents a
network retry or double click from creating duplicates.

Run status is derived from its tasks:

- `pending`: no task has started.
- `in_progress`: at least one task has started or closed and another is open.
- `finalized`: every task is completed.
- `finalized_with_incidents`: every task is resolved and at least one is cancelled.

Late tasks add an independent delay indicator. A run with an inactive configured assignee creates
that task unassigned, is marked as requiring attention and notifies its coordinator.

## Lifecycle and access

Pausing or soft-deleting a process prevents future recurring generation and removes it from the
occasional selector. Neither action changes tasks or runs that already exist. Anyone with write
access to the Processes and Tasks module may create and edit process definitions and runs; every
backend read and mutation remains scoped to the authenticated company.

Evidence-required tasks cannot be completed through any authenticated or kiosk completion path until
at least one active attachment exists. Existing task audit behavior is unchanged.

## Assignment display and kiosk dates

The membership identifier remains the authority for an assignment. Current collaborator labels in
the process selector, templates, runs, Agenda and task kiosks use the profile name, then the account
name, then their existing fallback. A stale task label cannot override a linked collaborator's
identity. This changes read projections only; stored assignment identifiers and historical records
are not rewritten. Legacy name-only assignment must resolve uniquely or require explicit selection.

The public task kiosk applies the same reference date to period and status filters. All periods
includes future assigned tasks and historical completions; Today, Tomorrow and Yesterday use their
respective dates. Organization and assignment authorization still come from the backend. Cancelled
tasks do not become pending when filtering. Definition edits retain the version rules above.
