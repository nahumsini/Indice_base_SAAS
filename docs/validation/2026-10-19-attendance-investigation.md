# Multikiosk attendance investigation — 2026-10-19

Status: deployed in production; post-activation checks and five-minute observation passed.
The owner's real attendance retry remains pending. See the [activation record](2026-10-19-attendance-activation.md).

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
- Reviewed bilingual RH learning chapters and their generated catalog, explaining
  the effective location policy and the difference between GPS acquisition and approval.

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
- 35 learning regressions and a fresh TypeScript check pass. The learning catalog
  owner-digest check initially detected the changed attendance owner; the affected
  chapters were reviewed, versioned, regenerated and the check now passes.
- All 16 deployment recovery regressions pass after reclaiming only unmounted,
  regenerable dependency directories. The first remote preflight correctly stopped
  below its minimum free-disk threshold. No business data, backups or runtime images
  were removed. A superseded preflight was stopped before backend tests to validate
  the final catalog-bearing candidate instead; its disposable database was removed.

An initial test fixture tried to mock a final dependency record and failed before
testing the resolver. The fixture now constructs that record; subsequent runs pass.
The baseline regression failure above is intentional evidence of the fixed defect.
A learning-copy draft initially exceeded the existing three-step chapter contract;
its regression rejected it. The wording now fits the three existing steps, and all
35 learning tests pass without changing that contract.

## Remaining work

Verify the owner's real attendance flow after activation. No agent-generated real punch or customer notification was performed.
Automated verification does not establish acceptance of the physical photo/GPS flow.

## Prepared production candidate

- Application source: `aaa23d66ac735b271605ee5632f2b16dae4c4b55`, pushed as
  `fix/multikiosk-attendance-20261019`. The original dirty workspace remains intact.
- CI: https://github.com/nahumsini/Indice_base_SAAS/actions/runs/39317963496 (PASS).
- Full preflight with the real protected production environment passed. The isolated
  backend suite completed 3,714 tests: zero failures/errors and one existing optional
  skip. Its disposable MySQL container and volume were removed.
- Immutable backend: `indice-erp-backend:aaa23d66ac73`,
  `sha256:20b5d655820781a6fb1e7ad9d7a73ecdca883caa3a20064537e26c45faaa5c42`.
- Immutable web: `indice-erp-web:aaa23d66ac73`,
  `sha256:c123b5c9a7287d3fe90c0b28f46580096fe44bac4407a4ea3de9d5c171961648`.
- Source and both images have zero secret findings. Web has no HIGH/CRITICAL
  dependency findings. Backend retains the same two conditional Spring MVC findings
  assessed in the prior release; the XSLT/Spring SSE rendering preconditions remain
  absent, dependencies are unchanged, and `MvcViewExposureRegressionTest` passes.
  These findings are triaged, not claimed patched.
- A fresh SQL/object/environment backup was verified at
  `/root/indice-attendance-release-20261019/backups/production-20261019T201920Z`.
  All checksums and both archive integrity checks pass.
- The exact production dry run passed without replacing containers. The prepared
  environment changes only backend/web image references. Schema V331 and all
  provider settings remain unchanged; the current `3df8e17dd380` backend is compatible
  recovery, with its existing web/MCP/MinIO containers retained by the release wrapper.
- Private evidence is under `/root/indice-attendance-release-20261019`. Only unused
  regenerable build cache and unmounted dependency directories were reclaimed for
  capacity; no runtime image, database/object volume, or backup was removed.

The owner separately authorized this exact attendance hotfix while retaining the
historical Stripe TEST-key revocation as pending. The [new bounded decision](../decisions/2026-10-19-attendance-hotfix-stripe-deferral.md)
does not reopen the prior expired exception or resolve the finding. Activation and
remaining acceptance are recorded in the linked deployment report.
