# Two-workstation development integration

Status: integration candidate; main update and database startup pending migration decision.

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
- Backend production and test sources compiled. Focused tests: 25 passed, one failed.
  The failure is MigrationVersionUniquenessTest: two different V300 migrations.
- Generated learning catalog consistency and git diff whitespace checks: passed.
- Flyway startup: not run; duplicate V300 prevents safe startup. No isolated test database
  was changed. Public release/UAT/deployment: N/A for this Git integration task.

## Pending migration decision

Both branches independently introduced V300: private_learning_progress and
scheduling_complementary_module_pilot. Scheduling also contains V301 through V303.
Source validation reports indicate both V300 variants were applied in isolated environments.
Repository rules prohibit silently changing an applied migration's identity.

Proposed exception, pending explicit owner authorization: retain scheduling V300-V303,
renumber only private_learning_progress to V304 without changing its SQL, and document the
split-lineage restriction. An existing database with learning V300 must not start this
combined candidate without a separately reviewed lineage reconciliation. Do not repair
checksums, edit history, reset a functional database or reverse applied schema automatically.
After resolution, rerun uniqueness and isolated Flyway startup before updating main.
