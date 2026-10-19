# Multikiosk attendance investigation — 2026-10-19

Status: cause identified; focused candidate validation passed; not deployed. This report does
not replace production acceptance or authorize a release.

## Report and evidence

The owner reported that the personal Human Resources tool in Multikiosk rejects
attendance after photo capture and GPS acquisition with the generic message
`Revisa la información enviada.` The owner confirmed that the configuration is
correct. No attendance configuration or real attendance record was changed during
this investigation.

Read-only production audit inspection confirmed failed personal attendance actions
while other attendance actions succeeded. Historical failure records retain the
exception class, not the specific validation reason. They cannot establish whether
the rejection was due to photo storage, date, location, or another validation.
The owner's fresh retry at 20:00:16 UTC produced a location-radius rejection in
`HrAttendanceLocationResolverSupport.validateLocationRadius`. Read-only policy checks
confirmed an effective open schedule for that day, no required schedule location,
no active contractual site assignment, and global radius enforcement disabled.
The personal punch path ignored that server-owned schedule and unconditionally
required a company-site radius. The configuration was not the cause.

A bounded exception diagnostic supplied the fixed classification and source frame.
It was stopped and its temporary raw files removed. No biometric data, coordinates,
credentials, or session tokens are retained in this report.

## Confirmed defects and candidate

Personal punches now resolve the linked employee's effective schedule and site
assignment through RH's existing location policy. Open schedules retain their
configured behavior; explicitly restricted schedules and active contractual sites
remain restrictive. Users without an effective schedule or site retain the existing
company-site rule. Client-supplied policy fields have no authority. Personal event
storage, daily projection, photo/GPS validation, and session ownership are preserved.

Before this correction, three isolated regressions reproduced both directions of
the discrepancy: an authorized open-schedule punch was rejected, while an explicit
schedule site and a contractual site were ignored in favor of another company site.

The location resolver previously chose the nearest allowed site's center and then
checked that site's radius. With different radii, it could reject a device that
was outside that smaller radius but inside another allowed site's radius.

The candidate chooses the nearest containing site from the existing authorized
set. Explicit location selection remains strict and cannot fall back to another
site. Empty, unauthorized, inactive, or out-of-radius choices remain rejected.
This second defect is reproduced in isolation; it is separate from the confirmed
open-schedule discrepancy in the owner's production attempt.

Known location rejections now have typed reasons and fixed public recovery messages
under `ATTENDANCE_LOCATION_*`. The public handler logs the fixed code only; it does
not log coordinates, identity, session tokens, payloads, or internal exception text.
Unknown errors retain the existing generic response. Six base translations clarify
that the device has obtained GPS rather than declaring the location approved.

Changed areas:

- `HrAttendanceSelfKioskEventUseCases`, `HrAttendanceLocationResolverSupport`, and the domain validation exception.
- `KioskPublicV2ExceptionHandler` and its controller regression tests.
- Attendance location and personal-punch integration regressions.
- Kiosk GPS status translations and the canonical kiosk contract.

Preserved: routes, tenant and actor authority, owner policy and allowed-site sources, photo upload
validation, explicit-site restrictions, check-in/check-out persistence, and public
response envelope. Schema changes: N/A. Production configuration changes: N/A.

## Verification

- The new resolver regression fails on the unchanged release code: one of four
  cases rejects a device inside an allowed radius. All four pass with the candidate.
- 97 focused backend and owner regression tests pass, with no failures, errors,
  or skips. These include public exception mapping, scope checks, permission sync,
  real personal check-in/check-out persistence and daily projection, missing photo,
  inactive location, outside-radius rejection, open schedules, contractual sites,
  explicit schedule sites, expired assignments, and untrusted client policy fields.
  Eight existing RH first-run flows also pass, including personal attendance and
  the existing open/strict schedule and work-site behavior.
- Database tests use a new disposable local MySQL database, with synthetic records
  and mocked object storage only. They do not use functional, APPTEST, or production
  databases. Fresh Flyway startup succeeds.
- 81 frontend kiosk regressions pass; TypeScript and production frontend build pass.
  The build retains its existing large-chunk warning.
- `git diff --check` passes.

An initial test fixture tried to mock a final dependency record and failed before
testing the resolver. The fixture now constructs that record; subsequent runs pass.
The baseline regression failure above is intentional evidence of the fixed defect.

## Remaining work

Complete candidate verification and the release checks, then verify the owner's
real production flow after activation. No release, agent-generated real punch,
customer notification, or production incident resolution is claimed. Any deployment must independently
follow the current release and rollback requirements.
