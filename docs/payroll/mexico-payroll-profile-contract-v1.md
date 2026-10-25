# Mexico payroll profiles and housing-credit withholding

Status: adopted for the local Mexico payroll work authorized on 2026-10-25.
Owner: Human Resources / Payroll. This is an incremental contract, not a declaration of complete
Mexican payroll, state-tax, or CFDI coverage.

## Employee inputs and authority

The payroll owner stores effective-dated versions of contractual daily salary, registered IMSS SBC,
salary basis, minimum-wage zone, employer registration, risk premium, work state, documented ISN
rate, and the INFONAVIT retention notice. An ISN rate entered by an authorized administrator is
an employer-supplied parameter; it is not an automatically verified package for that state.
Employees exposes these records inside **Edit collaborator → Work → Compensation**, only when
the employee's registration country is `MX` and treatment is `fiscal_payroll`. The payroll employee
breakdown retains its standalone editor. Both use the same controlled field component.

### Embedded employee edit (2026-10-25)

The employee editor remains the existing four-step wizard, with one form and one final save.
Fiscal drafts survive step navigation and temporary changes of country/treatment; hidden fiscal
drafts are omitted from the final request. Closing with fiscal changes offers keep/discard.
An untouched or inaccessible profile does not prevent editing ordinary employee details. Once
fiscal inputs are changed, they must be complete before advancing or saving. Missing access/loading
failures are visible, with retry; they never grant configuration permission or silently write a profile.

`PUT /api/v1/hr/users/{employeeId}` accepts an optional `mexicoPayrollProfile` object with
`expectedRevision`, `requestId`, and the existing typed `profile`. `HrEmployeePayrollUpdateService`
coordinates employee and fiscal persistence in one transaction, retaining the original response
shape. It checks Collaborators access, delegates Payroll authorization/scope/version validation to
the profile owner, and verifies the resulting normalized employee country/treatment before commit.
Any validation, scope, permission or revision failure rolls back both records; a stale profile returns
409. Revision and request-ID checks use current locked reads, including when the employee transaction
started reading before another writer committed. Browser CSRF and capability checks still apply to the employee route. Exact profile retries
retain their request ID, and untouched profiles append no version. This extension does not change
the create-employee endpoint, document follow-up uploads, tax formulas, schema or approved runs.

Regression coverage: `employee-mexico-profile-browser.mjs`,
`HrEmployeePayrollUpdateIntegrationTest`, and `HrEmployeePayrollUpdateControllerTest` cover
visibility, draft preservation, validation, unified payload/retries, access, tenant isolation, and
actual transaction rollback. The existing standalone-profile browser flow remains covered.

Validation for this integration: 27 focused Java tests passed (unified save/controller, profile
controller, and fiscal/operational payroll regression); the two profile browser flows and five
employee-save/column tests passed. TypeScript, Vite production build and backend packaging passed.
Vite retains its existing large-chunk warning. No schema change or production deployment.
The integrated local screen at port 5175 was also checked against backend 8083 using the synthetic
Mexico fiscal employee: profile GET succeeded, the editor contained one dialog/form, and no
employee or fiscal data was mutated. Implementation files are the employee wizard/JobStep,
`useEmployeeMexicoPayrollProfile`, `EmployeeMexicoPayrollSection`, shared `MexicoPayrollProfileFields`,
the employee payload builder, `HrUserApiController`, `HrEmployeePayrollUpdateService`, and the
profile owner's current-read revision checks. Schema/deployment changes: N/A.

### Guided entry (2026-10-25)

The standalone profile remains a **Standard Form Modal** using the shared aqua HR frame;
the embedded editor uses the employee wizard's existing frame without a nested modal/form. Grouped salary,
state-tax and credit sections progressively disclose only the inputs needed for each selection.
Selectors cover the registered premium versus an IMSS class average, state, salary basis, wage
zone, documented state-tax choice, active credit notice, notice modality, notice end, housing
insurance and legacy percentage-credit status. Exact salary/SBC, registration and credit identifiers,
notice references and individually documented amounts remain editable and bounded.

Class premiums come from [LSS 73–74](https://www.imss.gob.mx/sites/all/statics/pdf/leyes/LSS.pdf).
Choosing a class is explicit; the UI never infers it from the employee's role or an existing numeric
match. The registered-premium path accepts the precise employer value from 0.5% to 15%.

The dated general ISN entry aids currently cover **Nuevo León and Quintana Roo, 2026 only**:
[Nuevo León, article 157](https://www.hcnl.gob.mx/trabajo_legislativo/leyes/leyes/ley_de_hacienda_del_estado_de_nuevo_leon/)
and [Quintana Roo, article 6](https://documentos.congresoqroo.gob.mx/leyes/L167-XVIII-20251216-L1820251216190-Ley-del-Impuesto-sobre-N%C3%B3minas.pdf).
These opt-in choices fill the employer-supplied rate/reference and expose their official source;
they do not certify tax bases, exemptions, incentives, special regimes or complete state coverage.
Other states, dates and documented exceptions use the custom rate/reference path. Switching state
or effective year clears the prior tax selection so it cannot silently carry into another context.
Saved custom values and references are preserved exactly on load, including rates matching a
general choice; matching a rate alone never replaces the employer's document.

Switching credit modality clears the amount to avoid interpreting pesos as a percentage or factor.
Labels and limits follow the selected units. Housing insurance requires an explicit choice after
enabling a notice: no insurance or the amount on the notice, with the existing backend bound of
1,000 MXN. No assumed standard insurance amount is inserted. A dated end requires a date on or
after the start; an open end stores null. Identifiers retain leading zeros. API shapes, permissions,
versioning, idempotent retries, calculation ownership and payroll-treatment separation are unchanged.

`GET/PUT /api/v1/hr/payroll/mexico/profiles/{employeeId}` uses the authenticated tenant, Payroll tab
access, and HR operational scope. Mutation additionally requires Payroll CONFIGURE and browser
CSRF. The employee identifier denotes `user_companies.id`, exposed by the `hr_users` view.
The version store references the underlying table, not the view.

Updates append a version and record the actor. A locked employee row serializes revisions.
`expectedRevision` rejects concurrent overwrites; `requestId` permits exact retries. No delete
or historical-overwrite endpoint exists. Credit numbers and notice references are private payroll
data and must not be logged or exported to unrelated modules.

The effective profile and revision are included in calculation inputs. Approval and line adjustments
reuse the reviewed snapshot. Explicit draft recalculation refreshes it. A period crossing a profile
change requires review; approved/paid records are not recalculated by changing the profile.

## Separation of payroll treatments

- Fiscal MX lines consume the Mexican profile and statutory rules.
- Operational lines retain salary, attendance reductions and explicit adjustments, without automatic
  ISR, IMSS, INFONAVIT credit withholding, or employer contributions.
- No-payroll lines retain the existing exclusion and zero-payment rules.

Saving a standalone fiscal profile does not change the employee's treatment, salary, attendance or
existing runs. The embedded employee edit saves explicitly entered employee changes together with
the fiscal version; switching to operational/no-payroll omits the fiscal draft and preserves prior versions.
Automatic deductions for missing attendance remain the user's selected policy. Their fiscal
contribution consequences require separate reconciliation before approval.

## Registered ordinary calculations

With a dated profile, ordinary IMSS uses the registered SBC and calendar days in the period,
with the geographic minimum and 25-UMA ceiling checked. Employer risk uses the registered
premium. The employer absorbs the worker quota for minimum-wage workers (LSS 36); it is not
silently forgiven. The first CEAV band distinguishes one minimum wage from UMA bands.
No-pay salary does not suppress the provider entirely. Absence/incapacity cases remain unapproved
pending their branch-specific contribution rules. An estimated employee retention cannot consume
more than the salary remaining after ISR.
Periods containing a hire/termination date, profile changes, or annual parameter boundaries are
held for separate day/effective-date reconciliation; fiscal currency must be MXN. These checks do
not change historical approved payroll or operational payroll.
Hourly compensation is held until proportional paid rest is implemented. Recorded work on Sunday,
a scheduled rest day or an ordinary mandatory federal holiday is held for premium/exemption
calculation, following [LFT 69–75](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf).
The calendar recognizes fixed dates, moved Mondays and the six-year October presidential transfer;
it does not claim coverage of election days, local or contractual additional holidays.

Existing monthly-equivalent ISR calculation is retained. This change does **not** implement
the employment subsidy, actual-payment-month accumulation, annual adjustment or extraordinary
earning exemptions. Cases needing those calculations cannot be approved through UI or MCP.

## INFONAVIT credit

The employer's 5% contribution and the employee's credit repayment are distinct items.
The notice supplies modality, amount/factor, credit number, reference, start/end dates and applicable
housing insurance. The supported arithmetic follows the
[official January 2026 guide](https://portalmx.infonavit.org.mx/wps/wcm/connect/3849bacf-4041-461a-924a-2dafdf9097a0/Modalidades_calculo_amortizaciones_2022.pdf?MOD=AJPERES):

- Fixed monthly pesos: monthly amount × 2 ÷ actual bimonth days × applicable calendar days.
- UMI factor: round factor × dated UMI to monthly cents, then use the fixed-monthly calculation.
- Percentage: registered SBC × notice percentage × applicable days.

Fixed/UMI allocation uses differences of cumulative rounded cents, so weekly partitions sum to
the same bimonth amount. Housing insurance is retained once on bimonth close, or the notice's
last date. Notice changes inside a period require reconciliation rather than silently selecting
the last value. Legacy percentage credits before February 1998 require the special reduction
table and opening-bimonth SBC; they are explicitly held for review.

Following [INFONAVIT criterion 01/2025](https://portalmx.infonavit.org.mx/wps/wcm/connect/918ec749-d625-4c01-802c-90c86ad8cbea/Criterios_normativos_de_Recaudacion_Fiscal.pdf?MOD=AJPERES),
fixed/UMI nominal installments are not reduced merely because of unpaid absences. Actual retention
is limited by paid salary, remaining net and the 20% minimum-wage constraint when applicable.
The nominal amount and retained amount remain auditable. The difference is neither an automatic
future employee debt nor an extra employer contribution.
Nominal installments use HALF_UP cents. Legal withholding caps are rounded downward to cents so
retention cannot exceed the cap (20% of 2,205.28 permits at most 441.05).

## Approval and remaining coverage

`MX_REVIEW_REQUIRED` means a calculation is an estimate with unresolved inputs/rules. Approval,
including MCP preparation, rejects such fiscal lines. The same applies to legacy MX snapshots
without a reviewed profile. Completing a profile does not erase other blockers. Operational runs
remain approvable under their existing permissions and financial-integrity checks.

Still pending in the broader Mexico closure: payment-date ledger, subsidy/monthly and annual
reconciliation, integrated salary derivation/variable averaging, incapacity/absence contribution
branches, overtime/rest/holiday premiums and exemptions, benefits/PTU/termination, other statutory
retentions, full 32-state ISN bases/exemptions/returns, and CFDI/PAC issuance/cancellation.
These are tracked in the [coverage audit](mexico-payroll-coverage-audit-2026-10-25.md).
Stored employee parameters and successful ordinary-case tests must not be described as 100% coverage.

## Receipt status

No Mexican PAC integration is active. Fiscal-profile configuration, the employee breakdown, browser
printouts and backend PDF exports identify the document as an internal, unstamped receipt.
Approval/payment are operational statuses and do not create a CFDI UUID, certification or tax-stamp
status. A future PAC owner must replace this explicit pending state only with verified issuance.

## Verification and local activation

Backend coverage includes official INFONAVIT arithmetic, weekly/bimonth reconciliation, retention
caps, registered SBC/calendar days, minimum-wage worker quotas, company/operational scope,
CONFIGURE authority, CSRF, optimistic conflicts, exact retries, immutable approval snapshots,
missing/partial profiles and employment periods, UI/MCP approval rejection, and fiscal/operational/
excluded payroll separation. Tests use the isolated `indice-mx-profile-test` database on port 13327.

Frontend validation includes TypeScript/build and browser flows for saving/retrying/reopening the
profile, changing credit modality, unsaved edits, mobile layout, unstamped printing, and payroll
preparation/review/approval. No synthetic test approved or paid a real functional payroll.

V362 and V363 are forward-only and were applied after a private local database backup. The local
application uses frontend 5175/backend 8083. Functional employee inputs are not fabricated: enter
the real registered SBC and credit notice, then explicitly recalculate editable drafts.
Production deployment, PAC credentials, CFDI issuance and production payroll mutations: N/A.

Final local verification on 2026-10-25: 121 focused backend tests, zero failures/errors/skips;
Maven package, migration uniqueness/startup, TypeScript and production frontend build passed.
Both browser regressions passed. The build retains the repository's existing large-chunk warning.
The runtime started on 8083 at schema V363 with no startup errors; synthetic local login and
read-only profile requests for both demo employees returned HTTP 200. No real employee fiscal
values, notices, payroll approvals, payments or historical snapshots were changed by the smoke test.

## Implementation map

- `hr/payroll/provider/mx/MexicoPayrollProfile*`: typed input validation, append-only storage,
  authenticated owner API, and scoped dated calculation snapshots.
- `MexicoHousingCreditCalculator`, `MexicoLaborCalendar`, `MexicoPayrollInputs`,
  `MexicoPayrollProvider`: housing math, premium-case detection, profile interpretation and
  ordinary statutory calculation/approval issues.
- `HrPayrollService`, `PayrollCalculationContext`, `PayrollCalculationEngine`: owner integration,
  immutable reviewed inputs, UI/MCP guards and explicit internal PDF status.
- `V362__payroll_mexico_profile_versions.sql`,
  `V363__payroll_mexico_2026_worker_protection_parameters.sql`: additive schema and dated parameters.
- Frontend `api/payrollMexico.ts`, `MexicoPayrollProfileDialog`, `mexicoPayrollProfileCopy`,
  Employees, Payroll/workspace/inspector, `PayrollRunPdfDocument`, and payroll translations:
  employee entry, review navigation, six-language profile/receipt copy, and internal printing.
- Guided-entry files: `MexicoPayrollProfileDialog.tsx`, `mexicoPayrollProfileChoices.ts`,
  `mexicoPayrollProfileGuidanceCopy.ts`, `mexicoPayrollProfileCopy.ts`, and
  `react/tests/payroll-mexico-profile-browser.mjs`. This contract records the choice boundaries
  and their official sources. The new strings are supplied in Spanish, English, French,
  Portuguese, Chinese and Korean. Other local work remains outside this change.
- Backend Mexico/profile/treatment tests and frontend `payroll-mexico-profile-browser.mjs` /
  `payroll-approval-browser.mjs` cover the affected flows. Existing unrelated local board work is
  preserved and outside this change's validation scope.

Guided-entry handoff: browser regression covers state/year invalidation, custom rates and exact
five-decimal premiums surviving save/reopen, six-decimal factor entry, class selection, credit modality unit changes,
insurance and date limits, failed-save retry with the same request ID, unsaved edits, read-only
access, desktop/mobile/dark appearance and internal fiscal receipts. Browser regression,
TypeScript, production frontend build and whitespace checks passed on 2026-10-25. Screenshots
were reviewed in desktop, mobile and dark mode; the build retains its existing large-chunk warning.
The local collaborators route returned HTTP 200 on port 5175. Backend/schema/deployment changes
for guided entry: N/A. No functional employee data was changed by the synthetic browser regression.
