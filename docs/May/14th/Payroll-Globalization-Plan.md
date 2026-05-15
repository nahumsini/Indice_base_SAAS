# Payroll Globalization Plan

Date: 2026-05-14

## Goal

Design the payroll implementation needed to support every country that this repository currently treats as supported in HR user profiles, while replacing the current country-specific shortcuts with a backend-driven, auditable payroll model.

## What "supported countries" means in this repo today

There are currently three different support layers:

| Layer | Current scope | Source in repo | Problem |
| --- | --- | --- | --- |
| HR user `registration_country` validation | `AR`, `BR`, `CA`, `CL`, `CO`, `ES`, `MX`, `PE`, `US` | `HrUserService.normalizeCountryCode(...)` | This is the broadest backend-supported country set. |
| Payroll UI jurisdiction model | `MX`, `CO`, `US`, `BR`, `CA_STANDARD`, `CA_QUEBEC` | `react/.../Payroll/config/payrollJurisdictions.ts` | Frontend payroll only models 5 countries, with Canada split into 2 packs. |
| Payroll backend engine | Mexico-shaped percentage fields and generic line items | `src/main/java/com/indice/erp/hr/payroll/HrPayrollService.java` | Statutory logic is not country-pack based and cannot safely cover all supported countries. |

## Target scope

End-state payroll support should cover:

- Argentina (`AR`)
- Brazil (`BR`)
- Canada (`CA`) with Quebec as a first-class subdivision pack
- Chile (`CL`)
- Colombia (`CO`)
- Spain (`ES`)
- Mexico (`MX`)
- Peru (`PE`)
- United States (`US`) with state-level overrides

## Current-state findings

- The backend payroll engine calculates attendance-driven earnings, then applies one set of percentage fields from `payroll_preferences`.
- The payroll frontend contains hardcoded statutory percentages for Canada, Quebec, USA, Brazil, and Colombia.
- That split is unsafe because payroll rules live in two places and approved runs cannot be reproduced from one authoritative rule source.
- The current run model allows grouping by `single`, `unit`, or `business`, but not by legal entity, country, subdivision, or currency.
- The `hr_users` runtime view already exposes `registration_country`, `state_province`, pay period, salary type, hourly rate, and business/unit linkage, which is enough to seed a normalized payroll profile layer.

## Non-negotiable design decisions

1. Statutory payroll rules must move fully to the backend.
2. One payroll run must never mix legal entities, countries, subdivisions, currencies, or pay schedules.
3. Approved payroll runs must be immutable snapshots of worker inputs, attendance inputs, and the exact rule version used.
4. Country rules must be effective-dated data and strategy objects, not frontend math constants.
5. The frontend should become a presentation and workflow layer for previewing, editing approved adjustment inputs, and exporting results.

## Target architecture

### Main bounded areas

| Area | Responsibility | Notes |
| --- | --- | --- |
| Payroll catalog | Supported countries, subdivisions, currencies, effective rule versions | New source of truth for country packs |
| Legal entity payroll profile | Tax registrations, reporting currency, default pay calendar, statutory defaults | New concept; can be backed by `businesses` initially if needed |
| Worker payroll profile | Country assignment, subdivision, tax identifiers, compensation mode, contribution settings | Derived from `hr_users` plus explicit payroll-only settings |
| Payroll input aggregation | Attendance, leave, contracts, salary, hourly rate, manual adjustments | Uses existing attendance tables as inputs only |
| Payroll calculation engine | Gross, deductions, employer cost, net, component breakdowns | Strategy per country pack |
| Payroll run lifecycle | Preview, calculate, approve, pay, cancel, export, audit | Extends current run flow |
| Payroll export/audit | CSV, PDF, payslip, accounting journal, change trace | Reuses current export entry points but with richer data |

### Recommended backend package split

- `com.indice.erp.hr.payroll.catalog`
- `com.indice.erp.hr.payroll.entities`
- `com.indice.erp.hr.payroll.workers`
- `com.indice.erp.hr.payroll.inputs`
- `com.indice.erp.hr.payroll.engine`
- `com.indice.erp.hr.payroll.engine.country`
- `com.indice.erp.hr.payroll.runs`
- `com.indice.erp.hr.payroll.exports`
- `com.indice.erp.hr.payroll.audit`

## Proposed data model

### Keep and extend

- `payroll_runs`
- `payroll_run_lines`
- `payroll_run_line_items`

### Replace or demote

- `payroll_preferences`
  - Keep only as a transitional company default table.
  - Move statutory fields out of it because country packs cannot share one percentage set.

### New tables

| Table | Purpose |
| --- | --- |
| `payroll_supported_countries` | Canonical supported country and subdivision catalog |
| `payroll_rule_versions` | Effective-dated rule pack versions per country/subdivision |
| `payroll_legal_entities` | Payroll reporting scope, registration country, currency |
| `payroll_legal_entity_registrations` | Tax and social security registrations |
| `payroll_worker_profiles` | Worker-level payroll settings and identifiers |
| `payroll_worker_compensation_items` | Recurring earnings and deductions outside attendance |
| `payroll_run_rule_snapshots` | The exact rule version used for each run |
| `payroll_run_input_snapshots` | Frozen worker and attendance source values |
| `payroll_run_events` | Audit trail for calculate, approve, cancel, pay |
| `payroll_exports` | Generated export metadata and reproducibility pointers |

## Runtime flow

1. Resolve the worker's legal entity, country, subdivision, currency, and pay calendar.
2. Load the effective payroll rule pack for the period end date.
3. Aggregate attendance, leave, contract, salary, hourly rate, and recurring payroll inputs.
4. Produce a preview with componentized earnings, deductions, employer obligations, and validations.
5. Persist a draft run with frozen input snapshots and rule-version snapshots.
6. Allow limited manual adjustments with full audit.
7. Approve the run and lock recalculation to explicit re-open flows only.
8. Export payslips, summary CSV, PDF, and accounting journal using run snapshots only.

## API direction

The proposed contract lives in:

- `docs/May/14th/payroll-global-openapi.yaml`

Key API changes:

- Add a payroll country catalog endpoint.
- Add legal-entity payroll profile endpoints.
- Add worker payroll profile endpoints.
- Add a `runs/preview` endpoint so calculation can be validated before draft creation.
- Preserve the current run lifecycle endpoints, but scope them by legal entity, country, subdivision, and currency.

## Frontend direction

### Remove from React

- Hardcoded statutory percentages in `Payroll.tsx`
- Frontend-only country math
- Any fallback that silently treats unknown countries as Mexico

### Keep in React

- Run filters and workflow
- Run editor for non-statutory adjustments
- Read-only breakdown tables driven by backend component codes
- Export triggers and preview screens

## Country rollout strategy

### Wave 1

- Mexico
- Canada standard
- Canada Quebec
- United States
- Colombia
- Brazil

Reason:

- These already have payroll-specific UI concepts or labels in the repo and are the shortest path to removing frontend-only statutory calculations.

### Wave 2

- Argentina
- Chile
- Spain
- Peru

Reason:

- These countries are accepted in HR profiles today but do not yet have payroll-specific UI or backend country packs.

## Suggested implementation phases

### Phase 0: Scope alignment

- Freeze the canonical supported payroll country set to the 9 backend-validated HR countries.
- Define whether `businesses` temporarily act as payroll legal entities or whether a new legal-entity abstraction is introduced immediately.
- Decide the first required subdivision rules:
  - Canada province
  - USA state

### Phase 1: Schema foundation

- Add country catalog, legal entity profile, worker payroll profile, and rule-version tables.
- Add run snapshot tables before changing calculation logic.
- Backfill worker payroll profiles from `hr_users`.
- Backfill country and subdivision from `registration_country` and `state_province`.

### Phase 2: Backend rule engine

- Introduce a `PayrollCountryPack` strategy interface.
- Implement country-pack resolution by legal entity + worker + period.
- Move all statutory calculation logic out of React and into backend preview services.
- Keep current payroll run endpoints working behind the new engine where possible.

### Phase 3: Preview-first API

- Ship `POST /api/v1/hr/payroll/runs/preview`.
- Return worker breakdown components, warnings, and blocking validations.
- Reject mixed-country, mixed-currency, or mixed-subdivision runs.

### Phase 4: Run lifecycle migration

- Create runs from approved previews.
- Store immutable input snapshots and rule snapshots.
- Limit editable fields after draft creation to approved adjustment categories only.
- Rebuild CSV and PDF export from snapshot data.

### Phase 5: Frontend migration

- Replace frontend payroll math with backend preview payload rendering.
- Convert jurisdiction labels to backend catalog responses.
- Add worker payroll profile setup screens.
- Add legal entity payroll configuration screens.

### Phase 6: Country rollout and QA

- Enable Wave 1 countries first.
- Run regression on current payroll flows.
- Enable Wave 2 after rule pack and export parity is verified.

## Validation and testing strategy

### Required automated coverage

- Country pack resolution by worker country and subdivision
- Run rejection when workers span countries or currencies
- Preview reproducibility from fixed rule versions
- Immutable approved-run snapshots
- Manual adjustment audit events
- Export consistency across CSV, PDF, and on-screen totals

### Gherkin artifacts

- `docs/May/14th/payroll-supported-countries.feature`
- `docs/May/14th/payroll-run-lifecycle.feature`

## Key risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Frontend and backend both calculate payroll | Divergent totals | Make backend preview the only authority |
| Mixed-country grouping survives migration | Invalid compliance output | Enforce run-scope validation before draft creation |
| Effective-dated rules are not snapshotted | Approved runs drift over time | Persist run rule snapshots and input snapshots |
| Legal-entity model is skipped | Tax reporting ambiguity | Introduce `legal_entity_id` early, even if backed by `business_id` first |
| Unsupported countries silently default to MX | Incorrect payroll | Remove fallback logic and return validation errors instead |

## Recommended implementation order

1. Build the new backend catalog, profile, and preview model.
2. Migrate the frontend to consume preview breakdowns instead of computing statutory amounts.
3. Ship Wave 1 country packs.
4. Ship legal-entity-aware exports and approval locking.
5. Ship Wave 2 country packs.

## Definition of done

- Every backend-supported HR country resolves to a payroll country pack.
- Canada Quebec and USA state rules are handled explicitly.
- Approved runs store immutable inputs and immutable rule versions.
- The frontend no longer hardcodes statutory percentages.
- Exports are generated from persisted run snapshots, not transient calculations.
