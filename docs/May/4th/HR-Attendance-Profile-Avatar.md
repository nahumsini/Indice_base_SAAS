# HR Attendance Profile Avatar

Date: May 4, 2026

## Summary

Reused the Home Panel profile photo in the Human Resources self-attendance user card.

The attendance evidence photo remains separate. The profile avatar is now used only as the identity image for the signed-in platform user.

## What Changed

- Added `avatar_url` to the self-attendance dashboard user payload.
- Loaded the avatar from `user_profiles`, preferring a signed object-storage URL when `avatar_object_key` is present.
- Kept legacy `avatar_url` as a fallback.
- Updated the Attendance UI to render the profile avatar instead of the generic user icon when available.

## Files Changed Or Involved

- `src/main/java/com/indice/erp/hr/attendance/AttendanceModels.java`
- `src/main/java/com/indice/erp/hr/attendance/HrAttendanceService.java`
- `react/src/app/api/humanResources.ts`
- `react/src/app/BasicModules/HumanResources/Attendance/AttendancePage.tsx`

## Verification

Completed checks:

- `cd react && npm run typecheck`
- `./mvnw -q -DskipTests compile`
- `./mvnw -Dtest=HrFirstRunIntegrationTest#attendanceSelfEndpointsUseUserRecordsWithoutProvisioningEmployees test`
- `git diff --check`
