# Payroll calculation review — 2026-10-25

Scope: local backend review of earnings, attendance, employee deductions, taxes and employer
costs requested by the user. No production deployment, payroll approval or real-data recalculation.
The user's automatic missing-attendance deduction policy remains in force.

## Confirmed defects and corrections

1. **Hourly paid leave was paid twice.** Attendance already includes paid leave in `regularHours`;
   the engine paid that total and then added `paidLeaveDays * workdayHours` again. The engine now
   splits the paid total into `BASE_HOURLY` and `LEAVE_PAY`. Daily evidence determines the leave's
   scheduled hours, including variable-length days and explicit paid/unpaid overrides. Legacy
   records without daily evidence use a fallback bounded by the total paid regular hours.
   Example: eight worked hours plus six hours of paid leave at 100/hour paid 2,200 before;
   corrected gross/net operational pay is 1,400 (800 regular + 600 leave).
2. **Mexican ISR could become zero between cent-denominated brackets.** The equivalent monthly
   base retained eight decimals. A value between an upper limit and the next lower limit selected
   the last bracket, whose negative result was clamped to zero. The equivalent monthly base is
   now rounded to cents before lookup, with explicit rejection of unmatched brackets. A
   6,216.13 semimonthly base produced zero; it now produces 499.18 before subsidy under the
   existing monthly-proration method.
3. **Ordinary IMSS aggregates were incomplete.** V361 creates a new 2026 `SOCIAL_SECURITY`
   version, retaining v1 and all existing payroll snapshots. The ordinary worker aggregate becomes
   1.25% (medical pensioners .375% + cash benefits .25% + disability/life .625%), in addition to the
   separately represented worker CEAV 1.125%. The employer aggregate becomes 3.50% (1.05% + .70%
   + 1.75%), in addition to fixed UMA, excess, risk, retirement, CEAV, housing and childcare items.
   Legacy parameter names are retained for compatibility and their composition is documented
   in the migration. Sources: [LSS arts. 25, 107, 147, 168](https://www.imss.gob.mx/sites/all/statics/pdf/leyes/LSS.pdf),
   [IMSS SUA component descriptions](https://www.imss.gob.mx/sites/all/statics/sua/pdf/19_pago_global.pdf).
4. **Missing Mexican fiscal rules silently returned zero/default rates.** Fiscal calculations now
   require current ISR, UMA, social-security and RCV rules. Empty tax/RCV brackets, missing social
   parameters and invalid rates fail with a readable error. An unsupported future tax year cannot
   silently reuse 2026 constants. Operational payroll still bypasses fiscal calculation.
5. **Non-taxable earning flags were ignored by the common-base engine.** Current providers do
   not have a complete separate income-tax/social-security base contract. Positive fiscal
   earnings marked exempt or excluded from social security are now explicitly rejected instead
   of being taxed as ordinary salary. This is a containment boundary, not implementation of
   exempt benefits. Ordinary taxable bonuses, deductions and employer costs keep their behavior.

The monthly ISR brackets in V84 match the published
[SAT 2026 Annex 8, section B.V](https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/anexos/Anexo-8-RMF-2026_DOF-28122025.pdf).
The stored daily UMA values and their February transition match
[INEGI 2026](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/uma/uma2026.pdf).
These source checks do not certify the entire payroll implementation.

## Remaining fiscal coverage gaps

- **Employment subsidy:** Mexico does not yet apply the subsidy, monthly reconciliation or
  employee eligibility. The [2026 decree](https://sidofqa.segob.gob.mx/notas/docFuente/5777649)
  provides a monthly income threshold of 11,492.66 and a UMA-based subsidy, including a January
  transition. This requires effective-dated rules, eligibility and monthly accumulators; do not
  merely subtract a constant from each run. The Mexican provider now exposes a review warning.
- **SBC and employer facts:** Mexico derives a contribution base from current taxable pay and
  a minimum integration factor. It does not model each employee's registered SBC, seniority,
  minimum-wage exceptions or all contribution-day effects. Risk premium is a general parameter.
  Correcting the ordinary percentages does not resolve these base/eligibility limitations.
- **State payroll tax:** ISN uses one national default parameter (3%), without a state-specific
  effective rule/base. Its amount must not be represented as a verified state liability. The
  provider now warns about SBC, risk and ISN assumptions in the existing line inspector.
- **Periodic ISR and monthly reconciliation:** the existing engine prorates a monthly tariff;
  it has not been converted to the published seven/fifteen-day tables or a monthly adjustment
  workflow. The boundary fix preserves that existing method.
- **Overtime/rest-day premiums:** hourly overtime currently uses 1.5 for Brazil and 1.0 elsewhere;
  fixed-salary base compensation does not separately pay overtime. This review does not define
  the required country/journey premiums or exemptions. Fiscal lines with overtime now warn that
  review is necessary.
- **Other countries:** CA/US/BR/CO arithmetic regressions are run, but current legal tables,
  filing profiles, credits and jurisdiction-specific requirements are not certified by those
  tests. Their missing-rule fallbacks also need a separate country-by-country review.
- **Metadata:** the legacy `statutoryCompliance` flag identifies supported-provider calculations;
  it is not evidence that all eligibility and legal obligations above are implemented. The
  current generic-country approval guard is preserved. No new blanket approval ban was added.
- **Accounting display:** fixed salary remains a gross earning with a separate absence deduction;
  total cost remains the existing gross-plus-employer-cost measure. It is not a new accrual/net
  expense definition.

## Verification and files

`PayrollCalculationIntegrityIntegrationTest` uses the real migrated rule sets in a disposable
MySQL database, including the January/February UMA transition, new/old rule versions, ISR
boundary, paid/unpaid/legacy hourly leave, missing tables, invalid rates and employer/employee
separation. Provider unit tests retain explicitly synthetic rates; they do not stand in for
statutory acceptance. Additional service, attendance, approval, scope, incentive, accumulator,
snapshot and migration regressions are run with the same isolated database.

Changed owners: `PayrollCalculationEngine`, `MexicoPayrollProvider`. New forward migration:
`V361__payroll_mx_complete_ordinary_social_contributions.sql`. Tests: new calculation integration
and existing provider fixture/warning expectations. Documentation: this report, backend canonical
rules and the prior payroll review's now-resolved hourly-leave note.

Preserved: tenant/organizational authorization, API fields and routes, native currency,
rounding of persisted money, operational payroll, manual deductions, approved/paid history,
separation of duties and automatic missing-attendance deductions. Unrelated local work preserved.
Frontend changes: N/A; existing warnings/error rendering is reused. Deployment: N/A.

### Results

- Reproduction before correction: 16 integration cases, 12 expected failures demonstrating
  duplicate hourly pay, zero ISR at the boundary, incomplete IMSS and silent missing-rule fallback.
- Final run: **129 tests passed, 0 failures/errors/skips**, including 25 real-rule integration
  cases and Flyway version uniqueness. A provider fixture expectation that required no Mexican
  warnings was updated to require the newly explicit subsidy/ISN limitations.
- Isolated database: disposable `indice_test_db`, own container `indice-payroll-fiscal-tests`,
  local port 13327. Fresh startup through V360 and upgrade through V361 passed. The container
  was removed after verification. No tests ran against the functional database.
- Root backend compile and isolated executable package both passed. Existing deprecation and
  unchecked-operation compiler warnings remain. Logs: `/tmp/indice-payroll-fiscal-before.log`,
  `/tmp/indice-payroll-fiscal-final.log`, `/tmp/indice-payroll-fiscal-compile.log`,
  `/tmp/indice-payroll-fiscal-package.log`.
- Local activation: the existing API was running an older packaged JAR, not watched source.
  The tested package replaced it on port 8083 after verifying identical main sources/resources,
  preserving its arguments/environment and disabled demo bootstrap. Local database backup and
  previous JAR are retained privately in `/tmp/indice-payroll-fiscal-activation/`.
  V361 applied successfully to the functional local database; read-only verification confirmed
  the two corrected parameters. API health returned `ok`. Frontend remains on 5175.
- No real payroll run was recalculated, approved or paid. Existing drafts require explicit
  recalculation to pick up corrected amounts. Production, remote Git and main were not changed.
