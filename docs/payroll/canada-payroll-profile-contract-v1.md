# Canada fiscal payroll profiles and ordinary pay

Status: adopted for the local Canada payroll work authorized on 2026-10-25.
Owner: Human Resources / Payroll. This contract covers reviewed **ordinary periodic pay in 2026**;
it does not certify every Canadian employment standard, exceptional payment, employer levy or filing.

## Employee experience and owner boundary

**Colaboradores → Editar colaborador → Trabajo → Nómina fiscal**, with registration country `CA`,
shows the embedded **Datos fiscales de Canadá** section. It uses the existing employee wizard,
one dialog, one form and one final save. There is no second modal engine or nested form.
New employees can receive the fiscal profile after their employee record has been created.

Selectors cover all 13 provinces/territories, annual pay count, payment delay, TD1 claim modes,
pension status, contributory months, contribution exemptions and Ontario dependants. Exact declared
amounts remain bounded numeric inputs. Québec exposes its own additional withholding, QPIP and
employer health fund fields. Sections can be collapsed; invalid hidden controls are expanded/focused.
Copy is available in Spanish, English, French, Portuguese, Chinese and Korean.

The province is the **province of employment**, not an automatic copy of home province. The user
must determine it under the [CRA province-of-employment rules](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/set-up-new-employee/determine-province-employment.html).
The chosen province controls fiscal grouping and rules. No missing province defaults to Ontario.

Drafts survive step navigation and temporary country/treatment changes. A hidden draft is omitted
from save. Untouched, unavailable or read-only fiscal fields do not prevent an ordinary employee
edit; changed fiscal fields must be complete. Load failure offers retry. Closing with fiscal changes
offers keep/discard. Canada and Mexico drafts cannot be submitted together.

Changing country also revalidates contact information. A dial-code-only placeholder such as `+1`
is treated as empty for optional alternate/emergency phones and saved as an empty value; it cannot
block navigation or become a stored phone number. The required mobile still needs a valid number.
Explicitly clearing a phone does not restore its prior DOM fallback value.

`PUT /api/v1/hr/users/{employeeId}` accepts optional `canadaPayrollProfile` with `expectedRevision`,
UUID `requestId` and typed `profile`. The employee owner coordinates both saves in one transaction;
the Payroll owner enforces Payroll access, CONFIGURE, tenant and narrower operational scope, then
checks the resulting persisted `CA` / `fiscal_payroll` treatment. Failures roll back both records.
Browser CSRF remains required. The existing employee response shape is preserved.

`GET/PUT /api/v1/hr/payroll/canada/profiles/{employeeId}` is also an authenticated owner API.
The identifier is the `user_companies.id` exposed by `hr_users`. V364 stores append-only profile
versions with actor and effective date. A locked employee row and current-read revision check
prevent concurrent overwrite; exact request retries are idempotent. Stale versions return 409.
The declaration reference must not contain SIN or other unnecessary identity data.

## Dates, snapshots and accumulated contributions

The configured payment date is period end plus 0–31 days. It determines tax year and effective tax
tables and must match the intended payment. It is a scheduled date, not a bank-confirmed payment
ledger. A December work period may use a new-year declaration effective from that December;
approval checks that the resulting payment belongs to the declared tax year.

Profiles are selected by effective date at period start. Changes inside a work period require
separate reconciliation. The selected revision, inputs and rule references are retained in the
calculation snapshot. Explicit draft recalculation refreshes them; approval uses the reviewed
snapshot. Editing an employee does not recalculate approved/paid runs.

Annual opening balances are **this employer's current-year contributions before using Índice**,
not another employer's amounts. They include pensionable earnings, CPP/QPP, CPP2/QPP2, EI, QPIP
and employer QPIP. They are added to prior processed/approved/paid fiscal lines in the same tenant
and payment year. Current runs, operational runs and future payments are excluded. Registered
payroll before a nonzero opening cutoff blocks approval to avoid double counting. Legacy fiscal
rows without a reviewed profile also require reconciliation.

MySQL payment-date extraction uses `STR_TO_DATE` on the JSON string. An integration regression
covers December work paid in January, prior-year payment exclusion and cross-tenant exclusion;
direct `CAST(NULLIF(JSON_UNQUOTE(...),'null') AS DATE)` did not preserve the date under MySQL 8.4.

## Reviewed calculation scope

The implementation follows ordinary periodic remuneration, T4127 Option 1, using `BigDecimal`.
Supported annual counts are 12, 24, 26/27 and 52/53, checked against employee frequency.
Amounts use native CAD and HALF_UP cents, except the CPP/QPP period exemption, truncated to cents.

Official sources reviewed:

- [CRA T4127, January 2026](https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html).
- [CRA T4127, July 2026](https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jul/t4127-jul-payroll-deductions-formulas.html).
- [Revenu Québec TP-1015.F-V, 2026](https://www.revenuquebec.ca/documents/en/formulaires/tp/TP-1015.F-V%282026-01%29.pdf).
- [CRA T4001 employer guide](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4001/employers-guide-payroll-deductions-remittances.html).

V365 appends reviewed federal and provincial/territorial brackets and basic amounts. BC, NL and PE
also receive July-effective versions. Existing applied migrations and historical rules are retained.
No unreviewed year silently reuses 2026 parameters.

Ordinary calculations include:

- Federal tax, income-tested basic amount, employment amount, declared TD1 amounts, additional
  withholding and enhanced pension deductions. Federal/provincial tax outside Québec is rounded
  as one remittance; the provincial line receives the residual cent.
- Provincial/territorial tax for all 13 jurisdictions, including Ontario surtax, health premium and
  dependant reduction, BC reduction, Alberta adjustment, Manitoba income-tested basic amount and
  Yukon federal-style basic/employment amounts.
- CPP or QPP, second additional CPP2/QPP2, contributory-month proration and current-employer annual
  caps. Pension and insurance tax credits persist after contribution caps are reached.
- EI, reduced Québec EI, QPIP, matching employer pension and declared employer EI multiplier.
  Employer QPIP is independently rounded/capped; it is not rounded employee QPIP multiplied by 1.4.
- Québec federal abatement, provincial deduction for workers and separate provincial withholding.
  Registered-plan deductions and union dues have their respective federal/Québec treatment.
- Explicit vacation accrual and declared Québec health services fund rate. Accrual is not paid
  vacation; its default is zero, not a universal statutory 4%. The HSF rate is an employer-supplied
  parameter requiring employer-wide payroll/activity review, not an automatically verified rate.

Golden regressions include CRA appendix CPP/CPP2 transitions, Québec ordinary-pay arithmetic,
and Ontario CAD 1,800 biweekly: federal tax 137.35, provincial tax 76.49, CPP 99.09, EI 29.34,
net 1,457.73 with basic claims and no other deductions. Québec's published example with a fund
credit is tested without that optional credit, explicitly accounting for the difference.

## Approval and deliberate limits

`CA_REVIEW_REQUIRED` prevents fiscal approval, including MCP, when required inputs/rules are
missing, currency/frequency/year is inconsistent, snapshots are unreviewed, opening balances overlap,
vigencies cross the period, configured deductions exceed pay or a Québec/other-province contribution
transfer needs reconciliation. Québec requires an explicit employer health fund rate.

Overtime and positive manual earning adjustments (including bonuses and commissions) are held
until their specific labor/tax calculations are implemented. Other outstanding coverage includes
taxable/non-cash benefits with distinct pension/insurance bases, retroactive pay, termination pay,
vacation/holiday entitlement and pay, authorized reductions and special tax credits, nonresident/
special employment regimes, all employer provincial payroll taxes and workers' compensation, Québec
interprovince transfer reconciliation, irregular/changed payment dates, and T4/RL-1/remittance filing.
These must not be represented as solved by completing the profile or passing ordinary-case tests.
No automatic T4/RL-1 filing or CRA/Revenu Québec transmission is performed.

Operational payroll retains salary, attendance policy and explicit adjustments without automatic
Canadian taxes/contributions. No-payroll employees retain exclusion rules. Mexico retains its own
profile, calculations, INFONAVIT and approval rules. No functional employee fiscal amounts are
invented by this implementation.

## Implementation and verification

- `provider/ca/CanadaPayrollProfile*`: typed versions, owner API, scope, validation and snapshots.
- `CanadaContributions`, `CanadaIncomeTax`, `CanadaPayrollProvider`: ordinary calculations and holds.
- `HrPayrollService`, `PayrollCalculationEngine`, `PayrollFiscalAccumulatorService`: grouping,
  immutable review/approval, payment-year accumulation and treatment separation.
- `HrEmployeePayrollUpdateService`, `HrUserApiController`: atomic employee/profile save.
- Employee wizard hook/section, `CanadaPayrollProfileFields`, `canadaPayrollProfileCopy`,
  `payrollCanada.ts` and employee payload builder: embedded localized editing. Employee validation
  and DOM synchronization preserve optional blank phones during country changes.
- V364/V365: additive version storage and dated rules; migration uniqueness and Flyway startup tested.

Focused backend regressions use only the isolated MySQL `indice_test_db` on port 13327. Coverage
includes formulas, 13 jurisdictions, July changes, annual caps, payment-year boundaries, permissions,
CSRF, tenant/operational scope, revision conflicts/retries, actual transaction rollback, snapshots,
MCP approval holds, and fiscal/operational/excluded separation. Frontend regressions cover Canada
and Mexico visibility, validation, unified save, retry, step navigation, read-only access, mobile and
dark layout. TypeScript and a production Vite build are required.

Clean focused Maven regression: **137 tests, zero failures/errors/skips**. Backend packaging,
TypeScript, Vite build, Canada/Mexico browser flows and five employee save/column regressions passed.
Vite retains its existing large-chunk warning; it is not a compilation failure.

The local backend on 8083 applied V364/V365 and passed health checks after a private database
backup. The previous application artifact and configuration remain available for rollback; neither
database containers nor existing functional records were reset. Frontend 5175 uses this backend.
An authenticated browser smoke loaded the Canada owner API with HTTP 200, displayed 13 provinces
and Québec controls in the existing employee dialog, and retained one form. Temporary contact and
country edits used synthetic demo data and were discarded; no employee or payroll mutation was saved.

Production deployment, remote branch changes, live payroll approval/payment and tax filings: N/A.
