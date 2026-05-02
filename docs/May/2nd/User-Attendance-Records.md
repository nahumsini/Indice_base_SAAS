# User Attendance Records

Date: May 2, 2026

## Summary

Separated self-service attendance from HR employee records.

User attendance now records against the signed-in platform user instead of creating or depending on a linked HR employee profile. Employee records stay focused on HR profile, assignment, compensation, contract, and documents. System access and invitations are handled outside the employee form.

## What Changed

- Added dedicated user attendance event storage.
- Added dedicated user attendance daily record storage.
- Migrated legacy linked employee attendance into the new user attendance tables when an employee has a linked user account.
- Updated self attendance dashboard responses to identify the record as `subject_type = 'user'`.
- Updated self attendance calendar responses to load user daily records.
- Updated self attendance kiosk event recording to append user attendance events.
- Updated self attendance corrections to write correction events and rebuild user daily records.
- Updated self attendance photo uploads to store images under a user-attendance object path.
- Kept employee attendance flows on the existing employee attendance tables.
- Removed automatic employee provisioning for unlinked platform users in self attendance.
- Removed employee portal access and invitation management from employee create/update.
- Removed portal access from employee details responses.
- Updated frontend attendance copy from employee/collaborator wording to user-focused wording for the self attendance screen.
- Added Unit and Business selectors to the self attendance recorder.
- Stored selected Unit and Business context in the attendance event metadata while still validating against the device coordinates.
- Updated frontend API types to support user attendance response fields and Business Structure location fields.
- Updated first-run integration coverage around user attendance, attendance corrections, payroll flows, and location fixtures.

## Database

Added migration:

- `V28__user_attendance_records.sql`

New tables:

- `hr_user_attendance_events`
  - Stores user-based attendance events by company, user, date, location, event kind, auth method, result status, notes, and metadata.
  - Links to `users`, `user_companies`, `hr_attendance_locations`, and `hr_kiosk_devices`.
  - Keeps migration metadata when rows are copied from linked employee attendance.

- `hr_user_attendance_daily_records`
  - Stores the projected daily status for a user and attendance date.
  - Tracks system status, corrected status, correction metadata, first check-in, last check-out, first/last locations, minutes late, and notes.
  - Keeps one daily record per company, user, and attendance date.

Migration behavior:

- Copies linked employee attendance events from `hr_attendance_events` into `hr_user_attendance_events`.
- Copies linked employee daily records from `hr_attendance_daily_records` into `hr_user_attendance_daily_records`.
- Uses `hr_employee_portal_access.linked_user_id` as the bridge for legacy linked employee data.
- Adds `migrated_from_employee_id` metadata to copied user attendance events.

## Backend

Updated HR Attendance:

- `selfDashboard` now builds a user dashboard from the authenticated user.
- `selfCalendar` now loads user daily records instead of resolving an employee calendar.
- `createSelfPhotoUpload` now creates user attendance photo upload keys.
- `recordSelfKioskEvent` now writes user attendance events.
- `updateSelfDailyRecord` now writes user correction events and rebuilds user daily projections.
- User attendance location validation checks active Business Structure attendance locations for the company.
- User attendance responses include `subject_type`, `user_id`, and `user_company_id`.
- Linked employee lookup remains available where an employee ID is explicitly required.

Updated HR Employees:

- Employee create no longer reads portal access payloads.
- Employee update no longer reads portal access payloads.
- Employee details no longer include an `access` section.
- Portal invitation creation and pending invitation syncing were removed from employee persistence.
- Employee form data now stays limited to employee profile, organization assignment, compensation, contract, and documents.

## Frontend

Updated Attendance page:

- Changed self attendance labels from employee/collaborator language to user language.
- Loads Business Structure units and businesses.
- Requires users to choose Unit and Business before recording attendance.
- Sends selected Unit and Business metadata with the self attendance event.
- Keeps coordinate validation based on the browser/device latitude and longitude.
- Supports `subject_type`, `user_id`, and `user_company_id` in attendance dashboard data.
- Supports unit/business fields on attendance locations.

Updated Employees page and modal:

- Removed the Permissions step from the employee modal.
- Removed access role, invitation status, linked account, and invite-on-save fields.
- Updated copy to clarify that system access is managed from Users.
- Stopped sending employee access payloads when creating or updating employees.
- Stopped expecting an `access` object in employee details.

## Files Changed Or Involved

- `src/main/resources/db/migration/V28__user_attendance_records.sql`
- `src/main/java/com/indice/erp/hr/attendance/AttendanceModels.java`
- `src/main/java/com/indice/erp/hr/attendance/HrAttendanceService.java`
- `src/main/java/com/indice/erp/hr/employees/HrEmployeeService.java`
- `react/src/app/api/humanResources.ts`
- `react/src/app/BasicModules/HumanResources/Attendance/AttendancePage.tsx`
- `react/src/app/BasicModules/HumanResources/Employees/Employees.tsx`
- `react/src/app/components/EmployeeModal.tsx`
- `src/test/java/com/indice/erp/hr/HrAttendanceServiceTest.java`
- `src/test/java/com/indice/erp/hr/HrEmployeeApiControllerTest.java`
- `src/test/java/com/indice/erp/hr/HrEmployeeServiceTest.java`
- `src/test/java/com/indice/erp/hr/HrFirstRunIntegrationTest.java`

## Verification

Not run for this documentation-only update.

Recommended checks before merging the implementation:

- `./mvnw test -Dtest=HrEmployeeApiControllerTest,HrEmployeeServiceTest,HrAttendanceServiceTest,HrFirstRunIntegrationTest`
- `./mvnw -q -DskipTests compile`
- `cd react && npm run typecheck`
- `git diff --check`
