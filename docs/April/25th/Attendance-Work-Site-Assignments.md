# HR Attendance Work Site Assignments

Date: April 25, 2026

## Summary

An HR employee can now have multiple eligible attendance locations, while the system keeps one assigned work site for any specific day or contract period. Attendance validation checks the work site assignment for the punch date first, so an employee who is eligible to work from many places can only register attendance at the site assigned for that day.

This answers the business rule:

- Eligible locations: the employee's possible attendance locations.
- Assigned work site: the single location that should validate attendance on a given date.
- Work hours: HR sets start and end time directly while assigning the site; the app creates or reuses the needed schedule behind the scenes.
- If no work-site assignment is assigned for the date, the system continues using the existing schedule/template location rules.
- New employees are not automatically assigned to any schedule. HR must explicitly assign work before they appear as scheduled.
- New work can only be assigned to employees who are free for the selected date.
- Busy employees are hidden from assignment lists. HR must remove/end the existing shift before assigning new work.

## Kiosk Duration

Kiosk devices are not limited to a fixed number of days. A kiosk public link remains usable while the kiosk device is active and its public token has not been rotated.

There are short session limits inside the kiosk flow:

- Public kiosk identification token TTL defaults to 120 seconds.
- Public kiosk inactivity timeout defaults to 60 seconds.
- These are configurable through `APP_HR_KIOSK_IDENTIFICATION_TOKEN_TTL_SECONDS` and `APP_HR_KIOSK_INACTIVITY_TIMEOUT_SECONDS`.

## Database

Added migration `V20__hr_employee_work_sites.sql`.

New tables:

- `hr_employee_allowed_locations`
  - Stores all active/inactive locations an employee may use for attendance.
  - Keeps one row per company, employee, and location.

- `hr_employee_work_site_assignments`
  - Stores the work-site assignment history by effective date range.
  - The service rejects overlapping active assignments before inserting the new one, so HR must remove/end the existing shift first.
  - No new migration was added for schedule matching. Schedule assignment continues to use the existing `hr_employee_schedule_assignments` table.

## Backend

Added HR attendance APIs:

- `PUT /api/v1/hr/attendance/employees/{employeeId}/allowed-locations`
  - Replaces the employee's allowed attendance locations.

- `POST /api/v1/hr/attendance/work-site-assignments/bulk`
  - Assigns one work site to one or more employees for an effective date range.
  - Optionally accepts `template_id` and writes the schedule through the existing schedule assignment flow.
  - Automatically ensures the assigned work site is also included in the employee's eligible locations.
  - Rejects a schedule if it enforces a different attendance location than the assigned work site.

- `POST /api/v1/hr/attendance/work-assignments/clear`
  - Clears the active schedule/work-site assignment for one employee from the selected date.
  - Used before assigning a new work site when the employee already has an active shift.

Updated attendance responses:

- Control overview now returns `allowed_locations` and `active_work_site` per employee.
- Employee calendar now returns `active_work_site` per day.
- Kiosk event responses include the work-site assignment used for validation.

Updated validation:

- Removed the legacy automatic default schedule assignment from employee create/update and attendance profile setup.
- Work-site and schedule assignment no longer silently replace overlapping active work.
- A new assignment is rejected if the employee already has attendance activity in the selected date range.
- A new assignment is rejected if the employee already has an active schedule or work-site assignment in the selected date range.
- Inactive locations cannot be assigned.
- Public kiosk punches validate the punch location against the assigned work site for the event date.
- Internal kiosk events use the same work-site validation.
- Check-in, check-out, break-out, and break-in are blocked if the event location does not match the assigned work site for that day.
- When a work-site assignment exists, its location is the attendance location authority for that day, so the old workplace cannot be used to punch.
- Schedule location enforcement is skipped when a work-site assignment exists, because the assigned work site replaces the schedule's location restriction.

## Frontend

Updated HR Control:

- Added an `Assign work site` action for the selected employee.
- Moved shift removal into View Schedule so HR removes work from the exact employee/date row after checking the site and time.
- Simplified the work-site assignment dialog so HR only chooses location, dates, start time, and end time.
- The schedule template is created or reused behind the scenes, so users do not need to choose a separate schedule dropdown.
- Schedule and work-site assignment lists now hide employees who are already busy for the selected date.
- Set Schedule now loads free employees through a paginated candidate API instead of rendering every employee at once.
- Set Schedule now opens from a clean `Default Schedule` using `08:00` to `17:00`, instead of inheriting the selected employee's old template hours.
- View Schedule now uses plain-language buttons: `Sites`, `Employees at site`, and `One employee`.
- `Sites` shows one card per site with total working employees and shift-time counts for the selected date.
- `Employees at site` loads only after HR selects a site, then shows the employees working at that site for that date.
- `One employee` lets HR select one employee and choose any start/end date range, including one specific day.
- Removing a shift from View Schedule now removes only the selected date; longer schedule/work-site ranges are split so future dates stay assigned.
- HR Control save/update API actions now use the shared loading overlay plus success and failure toasts; the initial Control page load uses the normal skeleton to avoid a quick overlay flash.
- Daily Attendance now has a visible employee search and status filter so HR can quickly select an employee before assigning work site or access settings.
- Employee attendance rows now show the assigned site.
- The selected employee summary now shows `Assigned site: ...`.
- View Schedule now shows working employees for the selected site/date and avoids loading all rows by default.
- View Schedule includes a per-row `Remove` action for scheduled employees with no attendance already recorded for the selected date.
- The Control header buttons and selected employee action buttons now use responsive layouts: two-column grid on small widths, wrapped inline rows on larger screens.
- Legacy default schedule labels are displayed as `Default Schedule` instead of `Spring Default Schedule`.

Updated API client types:

- Added allowed-location payloads.
- Added work-site assignment payload and response types.
- Added `active_work_site` to control/calendar models.

Location registration fix:

- `+ Add` can add and save newly entered location rows without being blocked by unchanged legacy rows that have missing unit/business data.
- Save still persists new/edited registration rows and reports success after reload.

## Theme

Dark/light theme fixes were applied to:

- Register locations modal.
- Set schedules modal.
- Attendance day detail modal.
- Kiosk QR dialog.
- Public kiosk page.
- Access profile dialog.
- Face enrollment modal.
- Attendance records dialog.
- Permission request dialog.
- Payroll preferences dialog.
- Kiosk manager dialog.
- Kiosk device dialog.
- View Schedule modal.

The HR popup surfaces now use explicit dark backgrounds, dark borders, and light text in dark mode while keeping white/light surfaces in light mode.

Regression fix:

- App dark mode now also toggles `.dark` on `html` and `body`, not only the React root. This is required because Radix dialogs render in portals under `document.body`.
- HR Control action buttons such as View schedules, Kiosks, Edit access profile, and Assign work site now have explicit dark button backgrounds and borders.

## Files Changed Or Involved

- `src/main/resources/db/migration/V20__hr_employee_work_sites.sql`
- `src/main/java/com/indice/erp/hr/HrAttendanceApiController.java`
- `src/main/java/com/indice/erp/hr/HrAttendanceService.java`
- `src/main/java/com/indice/erp/hr/HrEmployeeService.java`
- `react/src/app/App.tsx`
- `react/src/app/api/endpoints.ts`
- `react/src/app/api/humanResources.ts`
- `react/src/app/BasicModules/HumanResources/Control/Control.tsx`
- `react/src/app/BasicModules/HumanResources/Control/components/ControlAttendanceWidgets.tsx`
- `react/src/app/BasicModules/HumanResources/Control/components/ControlDialogs.tsx`
- `react/src/app/BasicModules/HumanResources/Control/components/ControlCalendarDialogs.tsx`
- `react/src/app/BasicModules/HumanResources/Control/components/EmployeeAccessActions.tsx`
- `react/src/app/BasicModules/HumanResources/Control/components/FaceEnrollmentModal.tsx`
- `react/src/app/BasicModules/HumanResources/Control/components/LocationRegistrationModal.tsx`
- `react/src/app/BasicModules/HumanResources/Control/components/ScheduleModal.tsx`
- `react/src/app/BasicModules/HumanResources/Control/components/ScheduleOverviewModal.tsx`
- `react/src/app/BasicModules/HumanResources/Control/components/kiosk/PublicKioskPage.tsx`
- `react/src/app/BasicModules/HumanResources/Attendance/AttendancePage.tsx`
- `react/src/app/BasicModules/HumanResources/Permissions/components/CreatePermissionModal.tsx`
- `react/src/app/BasicModules/HumanResources/Payroll/Payroll.tsx`

## Verification

Run results:

- Backend compile: `./mvnw -q -DskipTests compile` passed.
- Diff whitespace check: `git diff --check` passed.
- Frontend typecheck still fails because of existing KPI module issues unrelated to this work:
  - `react/src/app/BasicModules/Kpis/Kpis.tsx` conflicts with `KPIs.tsx` by file casing.
  - `KPIForm` is missing the required `onNavigate` prop in the existing KPI screen.
