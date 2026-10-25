# Mexico payroll treatment review — 2026-10-25

Scope: verify the employee classification through local payroll generation, recalculation,
assistant preparation, approval, payable creation and fiscal accumulators. No production release
or real payroll recalculation/approval/payment. No new tax rates or fiscal eligibility policy.

## Verified behavior

| Employee classification | New runs | Calculation | Fiscal accumulation |
| --- | --- | --- | --- |
| `fiscal_payroll` | Included | Salary/incidences/adjustments plus the configured country provider | Included for eligible historical statuses |
| `operational_payroll` | Included | Salary/incidences/adjustments without automatic fiscal deductions or employer contributions | Excluded |
| `no_payroll` | Excluded | No payroll obligation | Excluded |

Employee creation already defaults to operational payroll and exposes all three classifications.
Fiscal and operational employees can share a country/currency/frequency run; treatment is per
employee line. Fiscal withholding is not selected merely because the currency is MXN.

Read-only local verification found Coordinador Norte and Operador Sur configured as
`operational_payroll`, country MX, six weekly workdays. Their classifications were not changed.

The generation snapshot is deliberate: changing an employee's profile does not silently rewrite
an existing run. Use an explicit draft line adjustment or regenerate open runs. Approved/paid
runs remain immutable. The user's automatic missing-attendance deductions remain unchanged.

## Confirmed defects corrected

- **Empty profile classification activated fiscal calculation.** SQL now resolves blank/whitespace
  employee treatment to operational payroll, matching employee creation and V187. The legacy
  normalization for stored run records is preserved; no historical backfill or migration.
- **Excluded draft lines still contributed money.** `no_payroll` previously reached the operational
  calculator and retained earnings/net in run totals despite having no payment route. It now
  produces `EXCLUDED_NO_PAYROLL`, zero monetary totals, no computed items and an explicit warning.
  Salary and attendance evidence are preserved for review and deliberate re-inclusion.
- **A contradictory fiscal flag could override operational treatment on recalculation.** The
  explicit snapshotted treatment now determines both fiscal inclusion and payment route for
  draft recalculation/approval and assistant preparation.
- Exclusion rejects nonzero manual/incentive adjustments instead of silently discarding or paying
  them. Resolve those adjustments first. Approval integrity also rejects legacy excluded lines
  carrying monetary amounts, fiscal inclusion or an active payment route.

The standard fiscal/operational flow already separated automatic tax items and fiscal accumulators;
regressions verify this through approval and payable creation. Classification does not constitute
complete fiscal compliance: the subsidy, SBC, state-tax and other limitations in the
[calculation review](payroll-calculation-review-2026-10-25.md) remain applicable.
The legacy run-level `statutory_compliance` summary still means no unsupported-country lines;
use the explicit line treatment for fiscal/operational classification.

## Changes and verification

- Owners: `HrPayrollService`, `PayrollCalculationEngine`.
- Regression: `HrPayrollTreatmentIntegrationTest` with synthetic Mexican employees and real
  migrated rules. Tests cover generation, fiscal↔operational changes without duplicated taxes,
  exclusion/re-inclusion, assistant preview parity, payable exclusion, blank defaults, profile
  snapshot preservation, contradictory flags, and legacy approval integrity.
- Canonical backend document updated with treatment invariants.
- Frontend/API routes/permissions: preserved; frontend changes N/A. New schema changes: N/A.
- All tests use disposable MySQL container `indice-payroll-treatment-tests`, port 13327,
  `indice_test_db`; never the functional or production database.
- Before correction: 7 integration tests, 4 expected failures reproduced the defects. An initial
  test compilation typo in an accumulator accessor was corrected before the reproduction run.
- Focused corrected run: 8 tests passed, zero failures/errors/skips. Logs:
  `/tmp/indice-payroll-treatment-before.log`, `/tmp/indice-payroll-treatment-focused.log`.
- Wider regression: **136 tests passed, zero failures/errors/skips**, including calculation,
  attendance, weekly workdays, authorization/scope, API, fiscal accumulators, snapshots, incentives,
  approval integrity and payroll accounting closeout. Log:
  `/tmp/indice-payroll-treatment-regression.log`. Java compilation and executable packaging passed;
  existing deprecation/unchecked-operation and Mockito agent warnings remain.
- Local activation: API restarted successfully on 8083 with the tested package; frontend remains
  on 5175. The previously running API already included another local board change. Binary comparison
  verified that only `HrPayrollService` (and its nested classes) and `PayrollCalculationEngine`
  differ in application runtime content, preserving that work. Main source/resources matched the
  isolated build. Health returned `ok`; no new migration or real payroll action was performed.
  Previous JAR/config reference and private database backup:
  `/tmp/indice-payroll-treatment-activation/`. Restart invalidated the browser's local session;
  sign in again if needed. No production changes.

Unrelated local work is preserved. Remote Git, main and production are outside this task.
