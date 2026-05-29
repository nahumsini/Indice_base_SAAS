# Consolidated Migration Baseline Audit - 2026-05-29

## Scope

Created a new fresh-schema Flyway baseline:

- `src/main/resources/db/migration/B60__spring_backend_consolidated_baseline.sql`

The baseline consolidates the committed Spring-owned schema and seed/reference data through `V60`.

No backend startup, Flyway migrate, DB reset, or DB repair was run during the baseline generation work. The existing backend process from earlier troubleshooting was stopped before migration files were edited.

## Source Chain Included

The new baseline includes these sources in order:

1. `B40__spring_backend_baseline_after_hr_user_rewire.sql`
2. `V41__backfill_home_panel_users_as_hr_profiles.sql`
3. `V42__protect_user_identity_and_history_integrity.sql`
4. `V43__process_task_agenda_enrichment.sql`
5. `V44__process_task_project_rollup_index.sql`
6. `V45__process_task_process_rollup_index.sql`
7. `V46__processes_relationship_normalization.sql`
8. `V47__process_task_attachments.sql`
9. `V48__process_engine_generation_controls.sql`
10. `V49__harden_home_panel_hr_profile_sequences.sql`
11. `V50__hr_permissions_backend_foundation.sql`
12. `V51__hr_announcements_security_indexes.sql`
13. `V52__hr_announcements_full_flow.sql`
14. `V53__notification_inbox_dismissals.sql`
15. `V54__process_task_kiosks.sql`
16. `V55__password_reset_tokens.sql`
17. `V56__sales_crm_backend_foundation.sql`
18. `V57__sales_contacts_fiscal_profile.sql`
19. `V58__user_invitations_scope_assignments.sql`
20. `V59__user_tab_permissions.sql`
21. `V60__seed_missing_basic_modules.sql`

## Not Copied Directly

- `B1__spring_backend_baseline.sql`
- `B22__spring_backend_baseline.sql`
- `V2` through `V39`

Reason: `B40__spring_backend_baseline_after_hr_user_rewire.sql` is already the committed cumulative baseline through `V39`, after the HR user rewiring. Copying `B1`, `B22`, and every pre-`V40` migration directly into `B60` would duplicate old intermediate schema states and create avoidable conflicts.

## Protections Added

The new `B60` file starts with an empty-schema guard:

- It counts application tables in the current schema.
- It ignores `flyway_schema_history`.
- If any application table already exists, it raises SQLSTATE `45000`.

This prevents accidental execution against an existing application schema.

## Static Audit Findings

- Existing baseline files found: `B1`, `B22`, `B40`.
- New latest baseline: `B60`.
- Current normal migration ceiling: `V60`.
- Next normal migration should be `V61__...`.
- Existing cross-prefix version overlap found: `B22` and `V22`. This already existed and was not introduced by this work.
- No exact duplicate `B` or exact duplicate `V` version files were found.
- Destructive statements exist in the source chain as historical cleanup logic, mostly temporary table cleanup and duplicate-data cleanup:
  - `V41`
  - `V42`
  - `V49`
- The consolidated baseline contains all committed seed/reference inserts from the included source chain. It does not dump accidental local runtime rows from the local database.

## Verification Performed

Static verification only:

- Confirmed backend process on `8082` was stopped before edits.
- Confirmed generated baseline contains 21 source sections.
- Confirmed source markers include `B40` and every migration from `V41` through `V60`.
- Confirmed the empty-schema guard exists in `B60`.
- Confirmed migration README now points to `B60` and `V61`.

No backend startup was run after the baseline file was created.
No Flyway migrate was run after the baseline file was created.
No database write was performed after the baseline file was created.

## Review Before Execution

Before allowing this to touch any database:

1. Review `B60__spring_backend_consolidated_baseline.sql`.
2. Confirm `B60` is the intended latest baseline.
3. Confirm old migrations should remain for history until a separate cleanup/archive decision.
4. Validate on a disposable database only.
5. Only after disposable validation should this be considered safe for team adoption.
