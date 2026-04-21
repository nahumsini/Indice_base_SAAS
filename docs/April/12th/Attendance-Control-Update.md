# Attendance And Control Update

Date: 2026-04-12

This note documents the Attendance and Control work completed for HR.

## Scope

- Aligned Attendance and Control around a shared employee context.
- Fixed attendance photo-date alignment between upload keys and stored events.
- Fixed control/calendar evidence lookup so photo-backed events are preferred.
- Added stronger check-in/check-out confirmation feedback.
- Added inline day evidence to the Control calendar view.
- Hardened print portal DOM host handling to avoid startup teardown errors.

## Main Behavioral Changes

### Shared employee context

- Attendance and Control now persist the selected employee using a shared local-storage key.
- Moving from Attendance to Control keeps the user on the same employee instead of silently switching context.

### Attendance evidence alignment

- Attendance uploads now send a local event timestamp from the browser.
- The upload presign request uses that same timestamp when building the attendance object key.
- The recorded attendance event also uses that same timestamp.
- This removes mismatches where a successful check-in/check-out could save its image under the wrong day path.

### Photo-backed event preference

- Daily-record and calendar photo lookups now prefer attendance events with a non-empty `photo_url`.
- This fixes cases where an earlier same-day `check_in` without evidence could hide a later `check_in` that actually had a stored image.

### Control tab visibility

- The Control calendar still supports the day-detail editor.
- In addition, the selected calendar day now shows its check-in/check-out evidence inline below the grid.
- This makes it easier to verify that attendance evidence actually projected into the daily record.

### Attendance success feedback

- Attendance success confirmation now uses a stronger success-toast trigger path.
- The toast is positioned prominently and retriggers cleanly on repeated check-in/check-out actions.

### Startup/error hardening

- The Business Diagnosis, Personal Performance, and Payroll print helpers were changed to reuse persistent hidden DOM hosts instead of removing host nodes during cleanup.
- This was done to reduce React `removeChild` / portal teardown instability during startup and route remounts.

## Backend Rules Updated

- `createPhotoUpload(...)` now resolves the attendance date from `event_timestamp` when available.
- `recordKioskEvent(...)` continues rebuilding the daily record projection after each successful operational event.
- Daily-record photo projection now orders same-day `check_in` and `check_out` evidence by:
  1. rows with a non-empty `photo_url`
  2. timestamp
  3. id

## Frontend Files Updated

- `react/src/app/BasicModules/HumanResources/Asistencia/Asistencia.tsx`
- `react/src/app/BasicModules/HumanResources/Control/Control.tsx`
- `react/src/app/components/KioskModal.tsx`
- `react/src/app/api/humanResources.ts`
- `react/src/app/BasicModules/Dashboard/BusinessProfile/BusinessDiagnosisPdf/businessDiagnosisPdf.tsx`
- `react/src/app/BasicModules/Dashboard/PersonalPerformance/PersonalPerformancePdf/personalPerformancePdf.tsx`
- `react/src/app/BasicModules/HumanResources/Payroll/PayrollRunPrintPortal.tsx`

## Backend Files Updated

- `src/main/java/com/indice/erp/hr/HrAttendanceService.java`
- `src/test/java/com/indice/erp/hr/HrAttendanceApiControllerTest.java`

## Verification Notes

- Live-data inspection confirmed photo-backed `check_in` and `check_out` rows were being written correctly for the tested employee/date.
- The Control tab now surfaces that evidence more directly.
- Attendance confirmations should now be visible after successful check-in/check-out flows.
