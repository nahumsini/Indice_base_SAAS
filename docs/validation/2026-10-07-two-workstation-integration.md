# Two-workstation development integration

Status: combined development revision verified for the owner-requested main publication
on 2026-10-08; no runtime deployment is included.

Integrated origin/main `ff33941f`, learning/finance MCP `4f0368dc`, and the other
workstation's continuation `cf1c9ea5` on `codex/continuacion-integrada-2026-10-07`.
Both source branches and their commit history are preserved. Git merged without conflicts.
No deployment or functional database mutation was performed.

## Integration correction

The learning catalog generator rejected the newly active meeting and scheduling tabs.
Added nine bilingual owner-grounded chapters and included both owners in catalog source
tracking. Regenerated the catalog and coverage matrix. These chapters declare understanding
only; no new MCP mutation tools, permissions, entitlements or automatic completion were added.

Files changed by this correction: curriculum.ts, learning-progress-runtime.test.mjs,
generate-lupita-learning-catalog.mjs, learning-catalog-v1.json and learning-function-coverage.md.
The remaining file changes come from the two source branches.

## Verification

- Frontend focused regressions: 65 passed; learning regressions after correction: 12 passed.
- Frontend TypeScript: passed, including recheck after the catalog correction.
- Frontend Vite build: passed, including rebuild after the correction, with chunk-size warnings.
  Initial sandbox-only build failed on restricted directory access; elevated retry passed.
- MCP build and suite: 158 passed.
- Backend production and test sources compiled. Final focused tests: 27 passed, no failures
  or skips, including migration uniqueness and learning catalog filtering. The initial duplicate
  V300 failure is resolved by the accepted migration decision below.
- Isolated database suite: 66 passed, no failures or skips (finance workflow 20, application
  startup 1, learning progress 3, meetings 23, scheduling 19).
- Generated learning catalog consistency and git diff whitespace checks: passed.
- Flyway startup: passed against a newly created MySQL 8.0.46 instance, container
  `indice-main-integration-tests-20261008`, loopback port 13309, database `indice_test_db`.
  Confirmed empty before migration; Flyway applied 244 migrations through V304 from the
  adopted baseline. V299-V304 history entries are successful and failed-migration count is zero.
  The test container is stopped after validation, with its isolated data retained.
  Public release/UAT/deployment: N/A for this Git integration task.

## Accepted migration decision

Both branches independently introduced V300: private_learning_progress and
scheduling_complementary_module_pilot. Scheduling also contains V301 through V303.
Source validation reports indicate both V300 variants were applied in isolated environments.
Repository rules prohibit silently changing an applied migration's identity.

The owner requested publication of the combination on 2026-10-08 after the proposed
resolution was explained. The [bounded decision](../decisions/2026-10-08-learning-migration-integration.md)
retains scheduling V300-V303 and renumbers only private_learning_progress to V304 without
changing its SQL. Git blob identity is unchanged (`f2ab10762f623fb18ee1c4945d9c6aed66325d59`).
An existing database with learning V300 must not start this
combined candidate without a separately reviewed lineage reconciliation. Do not repair
checksums, edit history, reset a functional database or reverse applied schema automatically.
Uniqueness and isolated Flyway startup passed before updating main. Existing functional
databases and the previous source branches remain unchanged.

Local verification logs (ignored): `.run/main-integration-unit-tests.log` and
`.run/main-integration-database-tests.log`.
