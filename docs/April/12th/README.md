# April 12 Update

Date: 2026-04-12

This folder documents the attendance/control stabilization work and the payroll run-creation, editor, and PDF export updates completed around this delivery window.

## Documents In This Folder

- `Attendance-Control-Update.md`
- `Payroll-Update.md`

## Main Themes

- Attendance and Control were aligned around the same employee/date context.
- Attendance evidence projection was fixed so photo-backed events surface correctly.
- Attendance check-in/check-out confirmations were made more visible.
- Payroll run detail editing was stabilized after modal reconciliation errors.
- Payroll export moved to a designed print report instead of the plain backend PDF.
- Payroll run creation now enforces standard weekly/biweekly/monthly period behavior.
- Payroll run creation now returns a clear validation error when no employees match the selected pay frequency.

## Repo Note

Frontend typecheck still has a pre-existing unrelated failure in `Announcements.tsx`. The work documented here was implemented and verified separately from that existing issue.
