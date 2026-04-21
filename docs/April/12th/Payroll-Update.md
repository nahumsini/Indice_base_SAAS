# Payroll Update

Date: 2026-04-12

This note documents the Payroll work completed for HR.

## Scope

- Reworked payroll run-detail editing to avoid dialog/portal instability on `Save line`.
- Added explicit busy-state handling for payroll actions.
- Added visible progress/completion feedback for payroll saves and actions.
- Replaced the plain PDF export path with a designed print report.
- Improved the payroll PDF layout, especially the first page and `Top payouts`.
- Standardized run-creation period rules for weekly, biweekly, and monthly.
- Added a strict validation error when no employees match the selected pay frequency.

## Main Behavioral Changes

### Run detail editor stability

- The payroll run editor was moved away from the previous Radix modal/portal path into a simpler in-tree overlay structure.
- This change was made because `Save line` was triggering React reconciliation crashes around dialog/portal mutation paths.

### Save-line feedback

- `Save line` now has explicit operation-state handling.
- The payroll screen uses named busy states instead of one generic save flag.
- The action shows a saving overlay and completion confirmation instead of silently updating.

### Run creation rules

- `period_end_date` is now derived automatically from `pay_period + period_start_date`.

Rules:

- `weekly` = up to 7 inclusive days
- `biweekly` = up to 14 inclusive days
- `monthly` = selected start date through month end
- `weekly` and `biweekly` clamp to month end when fewer remaining days exist

This keeps the frontend and backend aligned on the same date logic.

### Pay-frequency validation

- Payroll run creation no longer silently falls back to employees from other pay frequencies.
- If there are no active employees configured for the selected pay frequency, the backend now returns:

`No active employees are configured for the selected pay frequency.`

This is the intended stricter behavior for run creation.

### Designed PDF export

- Payroll PDF export now uses a print-report document rendered from frontend data rather than the plain backend-generated PDF stream.
- The report includes:
  - hero/header section
  - executive summary
  - run signals
  - top payouts
  - employee ledger pages
  - adjustments and notes

### PDF layout fixes

- The first page was compacted so the cover content feels more intentional and print-efficient.
- `Top payouts` moved to a safer single-column structure.
- KPI/highlight cards on page one were reduced to a `2 x 2` layout to keep currency values inside the cards.
- Currency/value typography was tightened to reduce overlap and edge crowding.

## Backend Rules Updated

- Backend run creation normalizes the effective end date using the same weekly/biweekly/monthly logic as the form.
- Run creation now throws a validation error when no active employees match the selected pay frequency.
- Payroll run line creation now stores the selected run pay period snapshot on each line.

## Frontend Files Updated

- `react/src/app/BasicModules/HumanResources/Payroll/Payroll.tsx`
- `react/src/app/BasicModules/HumanResources/Payroll/PayrollRunPrintPortal.tsx`
- `react/src/app/BasicModules/HumanResources/Payroll/PayrollRunPdfDocument.tsx`
- `react/src/app/BasicModules/HumanResources/Payroll/payrollPdf.css`

## Backend Files Updated

- `src/main/java/com/indice/erp/hr/HrPayrollService.java`
- `src/test/java/com/indice/erp/hr/HrPayrollApiControllerTest.java`

## Verification Notes

- `HrPayrollApiControllerTest` passes with the new frequency validation path.
- The frontend still has an unrelated pre-existing typecheck issue in `Announcements.tsx`.
- Payroll PDF layout was tuned iteratively against the print-preview issues observed during weekly export testing.
