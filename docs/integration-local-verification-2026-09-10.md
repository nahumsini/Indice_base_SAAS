# Local integration verification — 2026-09-10

## Integrated sources

Local branch: `integration/2026-09-10-latest`.

| Source | Verified commit | Included work |
| --- | --- | --- |
| `origin/main` | `be0d481c60dd42c168dfb299225dc1658d2ecbbb` | Current shared development baseline |
| `release/2026-09-10-finance` | `fb5f862d5e904538d4bedbdc4e4b1c64dc9eff11` | Expense corrections, budget obligations, payment actions, modal/KPI work and release records |
| `origin/feature/provider-portal-laptop-20260909` | `4362fa1f5684e74d4839820cf53983e592349a95` | Six pending commits: provider procurement, PIN replacement, proposal taxes and employee kiosks |
| `origin/codex/indice-email-branding` | `1b6aa2009d8b0e27bea0273215ac1317fe40bb6d` | Pending OTP email presentation improvement |

The provider branch was integrated in merge `0ff81f1f`; OTP branding was integrated in
`f6fb0266`. All four source commits are ancestors of the integration branch. A final remote
fetch found no additional changes. Earlier branches whose patches are already incorporated
were not replayed. This is local source integration; it is not a new production release.

## Integration corrections

- Retained the released `V269__budget_expense_occurrences.sql` byte for byte. Its SHA-256 is
  `9e172b6e7701cc1efc783ad082135b486b40e97d2a1584f8e2906a1c4d4c5e8d`.
- Renamed the incoming procurement migration from V269 to the next available version, V272,
  without changing its SQL. V270 and V271 are independent kiosk audit identity migrations.
- Updated `SpecificPosPurchaseOrderTest` to supply the current expense response contract and
  model the order read before locking, the read after locking and the post-receipt refresh.
  The concurrent receipt protection and full-receipt financial handoff remain covered.
- Updated the task workspace regression to recognize the new agenda toolbar, list and board.
  Existing capability, scope and mutation assertions remain in place.
- Aligned the new route-sales workspace with the existing Sales typography contract: medium
  weight for operational titles/actions/values and sentence-case labels. No sales logic was
  changed by this correction.

The first verification exposed a stale purchase-order fixture, an outdated task UI assertion
and typography violations in the incoming route-sales UI. Each was corrected and the affected
checks rerun successfully.

## Verification

- Java 21: focused backend tests passed (40 tests), then the complete backend suite passed
  (2,314 tests, zero failures, errors or skips).
- Flyway uniqueness validation and application startup passed on a new, isolated MySQL 8.0
  test database at port 13321. Schema reached V272 with no pending or failed migrations.
- TypeScript validation and the production frontend build passed, including a final rerun
  after the route-sales typography correction.
- All frontend regression commands listed in `.github/workflows/ci.yml` passed, including
  auth, expenses, budgets, petty cash, bulk actions, kiosks, HR, tasks, sales, POS, billing,
  distributor portal, platform administration, printing and the direct runtime test groups.
  Horizontal-scroll and integrations regression suites also passed.
- `git diff --check` passed. Frontend dependency manifests did not change; verification reused
  the installed dependencies from the primary workspace.

Raw local test logs use `/tmp/indice-integration-20260910-*.log`. Tests did not use the
functional or production database. The frontend build retains a non-blocking large-chunk
warning; compiler warnings include existing deprecated test mocks and unchecked operations.
Interactive browser acceptance and deployment artifact checks were not performed in this
local merge task.

## Next deployment and other checkouts

The public release remains documented in
[`deployment/releases/2026.09.10.1.md`](../deployment/releases/2026.09.10.1.md).
Its selective schema includes the budget V269 but not main's V266–V268. Before deploying this
full development line, rehearse those pending lower-numbered migrations and V270–V272 on an
isolated copy of that schema, following [`deployment/README.md`](../deployment/README.md).
A fresh database startup is not evidence that this specific production upgrade has passed.
Do not rewrite migration history or disable validation to conceal the difference.

Any other workstation that already applied the incoming procurement SQL under V269 must
inspect its own Flyway history before starting this combined branch. Its V269 identity differs
from the released budget migration. Preserve its data and use a reviewed migration plan;
do not replace checksums, run `repair` blindly or reset the functional database.

The original finance branch remains available as the local source checkpoint. Production,
GitHub main and the functional database were not mutated by this integration task.
