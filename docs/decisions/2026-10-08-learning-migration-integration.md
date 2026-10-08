# Learning migration identity for the combined development branch

Status: accepted for the owner-requested integration into main on 2026-10-08.

The owner requested publication of the combined branch after being informed of the two
different V300 migrations and the proposed learning V304 resolution. This decision is the
bounded exception for that integration; it does not change the general applied-migration rule.

## Canonical sequence

- V300: scheduling_complementary_module_pilot, preserved.
- V301: scheduling_workspace_and_public_appearance, preserved.
- V302: meeting_control_complementary_pilot, preserved.
- V303: meeting_workflows_and_series, preserved.
- V304: private_learning_progress, renamed from the learning branch's V300.

The learning SQL is byte-for-byte unchanged; only its filename/version changes. Existing
main ended at V299. The two source branches remain in Git history. No released baseline,
existing V1-V299 migration, functional database or Flyway history is edited by this change.

## Existing databases and rollback

An existing database with the scheduling V300-V303 lineage can apply learning V304 forward.
A database at V299 can apply the whole sequence forward. Fresh isolated startup must pass
before publication of the combined code.

A database that already applied the learning branch's V300 has a different lineage and must
not be started with this combined revision without separately reviewed reconciliation. Do
not automatically repair checksums, relabel history, reset functional data or replay learning
table creation. Keep that database and its source revision until reconciliation is approved.
Fresh test startup does not certify such an existing database or production acceptance.

Application rollback preserves the additive schema, learning progress and audit records.
This is a Git integration decision, not authorization to deploy or mutate a functional database.
