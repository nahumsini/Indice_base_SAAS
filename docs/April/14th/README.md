# April 14 Update

Date: 2026-04-14

This folder documents the HR Control and public kiosk work completed on April 14, including the public-by-link kiosk flow, Control kiosk-link management, schedules-modal feedback improvements, and the kiosk success-toast sizing follow-up.

## Documents In This Folder

- `Control-Public-Kiosk-Update.md`

## Main Themes

- Attendance kiosk moved to a public route using a device-specific link.
- Backend support was added for public kiosk bootstrap, identify, and punch flows.
- Control now exposes kiosk public-link actions: copy, open, QR, and rotate.
- The schedules modal apply flow now gives clearer loading and success feedback.
- The kiosk success toast was kept compact and a desktop stretch bug was fixed after handoff.

## Repo Notes

- Public kiosk still requires an active employee access method such as `PIN` or `badge`; there is no universal seeded kiosk PIN.
- The top-level `Manage Kiosk` button currently opens the create-new kiosk dialog rather than editing the selected kiosk.
- Frontend build still emits the pre-existing large chunk warning.
