# Attendance Control Operations Update

Date: May 4, 2026

## Summary

Expanded the Human Resources attendance control flow so HR can manage real operational attendance from the Control screen without breaking existing kiosk, schedule, and payroll assumptions.

## What Changed

- Added HR manual check-in and check-out events for missed punches.
- Kept manual status correction separate from real attendance punches.
- Blocked future attendance marking while allowing past-day corrections.
- Cleared stale HR corrections when a newer real attendance punch is recorded.
- Added compact Control dialog layout for status correction, manual punches, system registration, and evidence.
- Added loading bar feedback when switching Control calendar months.
- Reduced the Control loading bar minimum duration to one second.
- Added kiosk type handling for Business / Unit, Contract Site, and Head Office kiosks.
- Added kiosk deletion from Control.
- Added automatic five-digit employee PIN generation with HR visibility and regeneration.
- Hid PIN input in the public kiosk.
- Allowed public kiosks to resolve business locations from the employee scope when the kiosk is configured for all units/businesses.
- Updated schedule assignment to require start and end dates and keep assignments inside contract-site windows.
- Changed late handling so late check-ins still record attendance instead of being blocked by the grace period.

## Files Changed Or Involved

- `src/main/java/com/indice/erp/hr/attendance/HrAttendanceApiController.java`
- `src/main/java/com/indice/erp/hr/attendance/HrAttendanceService.java`
- `src/main/java/com/indice/erp/hr/attendance/policy/AttendanceEditPolicy.java`
- `react/src/app/api/humanResources.ts`
- `react/src/app/BasicModules/HumanResources/Control/Control.tsx`
- `react/src/app/BasicModules/HumanResources/Control/components/ControlCalendarDialogs.tsx`
- `react/src/app/BasicModules/HumanResources/Control/components/ControlDialogs.tsx`
- `react/src/app/BasicModules/HumanResources/Control/components/EmployeeAccessActions.tsx`
- `react/src/app/BasicModules/HumanResources/Control/components/ScheduleModal.tsx`
- `react/src/app/BasicModules/HumanResources/Control/components/kiosk/PublicKioskPage.tsx`
- `react/src/app/BasicModules/HumanResources/Employees/Employees.tsx`
- `react/src/app/components/EmployeeModal.tsx`

## Verification

Completed checks:

- `cd react && npm run typecheck`
- `./mvnw -q -DskipTests compile`
- `git diff --check`
