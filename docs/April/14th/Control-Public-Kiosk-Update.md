# Control And Public Kiosk Update

Date: 2026-04-14

This note documents the HR Control, public kiosk, and schedules-modal work completed for April 14.

## Scope

- Moved kiosk attendance into a public route driven by a kiosk-device token.
- Added backend support for public kiosk bootstrap, employee identification, and attendance punch submission.
- Added kiosk public-link management inside Control.
- Simplified the kiosk experience to the approved v1 identify-first flow.
- Improved schedules-modal selection and save feedback.
- Fixed the kiosk success toast so it stays compact on desktop instead of stretching vertically.

## Main Behavioral Changes

### Public-by-link kiosk

- Kiosk is now available from `GET /kiosk/:deviceToken` in React.
- The kiosk no longer depends on being launched from the authenticated HR Attendance tab.
- Device and location context come from the public kiosk token instead of user-selected form inputs.

### Simplified kiosk flow

- The public kiosk now follows the approved v1 sequence:
  - identify employee first
  - prefer `PIN`
  - allow `badge` when configured
  - support only `check_in` and `check_out`
  - auto-reset after a successful punch
  - reset after inactivity timeout
- The old public-kiosk friction points were removed:
  - employee list
  - device selector
  - location selector
  - photo requirement
  - face auth
  - breaks
  - manual override

### Public kiosk authentication

- Public identify validates a configured employee access method such as `PIN` or `badge`.
- A successful identify call returns a short-lived signed identification token.
- Public punch consumes that identification token and records the final `check_in` or `check_out`.
- Unsupported public actions are rejected by the backend.
- There is no seeded global kiosk PIN; kiosk usage depends on actual employee access-method configuration.

### Control kiosk management

- Control remains the admin/configuration surface for attendance operations.
- The selected kiosk device now exposes:
  - public link display
  - copy link
  - open kiosk
  - show QR
  - rotate public link
- Calendar layout was tightened by removing the extra inline selected-day detail block under the grid, while preserving the day-detail editing path.

### Schedules modal improvements

- The top-right filter row layout was corrected.
- Collaborator rows now support full-row selection while keeping the checkbox interaction.
- Selected collaborators visually highlight.
- Applying schedules now:
  - shows a loading overlay
  - closes the modal first
  - reloads Control data
  - shows success feedback
  - refreshes selected employee/template state
- Applying a schedule assignment still does not create attendance punch records.

### Kiosk success-toast follow-up

- The kiosk success message uses the shared `SuccessToast` component with a kiosk-specific top-center placement.
- A desktop bug was found after handoff: the kiosk override cleared the base `bottom-*` classes but not the responsive `sm:bottom-*` and `sm:right-*` classes.
- That left the fixed toast with both `top` and `bottom` anchors on desktop, causing the oversized vertical panel.
- The kiosk override was updated to also clear the responsive bottom/right anchors, keeping the toast compact.

## Backend Rules Updated

- `hr_kiosk_devices` now stores a `public_access_token`.
- Added public kiosk endpoints:
  - `GET /api/v1/hr/attendance/public-kiosk/{deviceToken}/bootstrap`
  - `POST /api/v1/hr/attendance/public-kiosk/{deviceToken}/identify`
  - `POST /api/v1/hr/attendance/public-kiosk/{deviceToken}/punch`
- Added admin endpoint:
  - `POST /api/v1/hr/attendance/kiosk-devices/{kioskDeviceId}/rotate-public-access-token`
- Public bootstrap resolves kiosk device, linked location, available auth methods, and inactivity timeout from the token context.
- Public identify records an `auth_attempt` event and returns the short-lived identification token.
- Public punch enforces the kiosk device/location context from that token and only accepts operational punch types.

## Frontend Files Updated

- `react/src/app/routes.tsx`
- `react/src/app/BasicModules/HumanResources/Kiosk/Kiosk.tsx`
- `react/src/app/BasicModules/HumanResources/Control/Control.tsx`
- `react/src/app/components/HorariosModal.tsx`
- `react/src/app/api/endpoints.ts`
- `react/src/app/api/humanResources.ts`
- `react/package.json`
- `react/package-lock.json`

## Backend Files Updated

- `src/main/java/com/indice/erp/hr/HrAttendanceApiController.java`
- `src/main/java/com/indice/erp/hr/HrAttendanceService.java`
- `src/main/resources/application.properties`
- `src/main/resources/db/migration/V18__hr_kiosk_public_access.sql`
- `src/test/java/com/indice/erp/hr/HrAttendanceApiControllerTest.java`

## Verification Notes

- Static checks completed during the implementation window:
  - `cd react && npm run typecheck`
  - `cd react && npm run build`
  - `./mvnw -q -Dtest=HrAttendanceApiControllerTest test`
- Local browser validation covered:
  - Control public-link actions
  - public kiosk loading without standard login
  - invalid credential retry behavior
  - valid identify
  - `check_in`
  - `check_out`
  - auto-reset
  - schedules apply feedback
- After the toast follow-up fix, `cd react && npm run typecheck` passed again.

## Local Data Notes

- For public kiosk testing, employees must have an active kiosk-compatible access method configured.
- On the validated local DB used during development, a manual `PIN` was created for `Second Empleado` with value `1234`.
- That `PIN` is not seeded by migration and should not be assumed to exist in another local database.

## Follow-up / Open Notes

- If users report that a kiosk PIN does not work, first verify employee access-method configuration before treating it as a kiosk UI bug.
- The top `Manage Kiosk` button currently opens the create-new kiosk dialog. The codebase also has an edit path for kiosk devices, but that is not what the top button launches today.
- React still reports the existing large chunk warning during build.
