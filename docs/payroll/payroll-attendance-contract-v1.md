# Payroll and Attendance Control — weekly workdays

Decision: 2026-10-25. Owner: Human Resources. The user explicitly retained automatic
deductions for missing attendance records; unresolved records do not introduce a new
approval block. This contract covers the weekly fallback and explicit draft recalculation.

## Source and precedence

- Control owns daily records, corrections, rest assignments and leave payroll treatment.
  Payroll reads `user_attendance_daily_records` by authenticated company, employee membership
  and inclusive run dates. A correction takes precedence over its stored system status.
- An active schedule assignment uses an active template in the same company. Its day rules
  determine expected dates/hours. Explicit work, absence or leave recorded by Control is
  retained even on a date otherwise classified as rest by the schedule.
- Without an assigned schedule, an employee's weekly day quantity does not imply Monday as
  their first working day. For a complete weekly run, recorded work/late/leave/absence dates
  count first; explicit rest dates are excluded. Remaining expected days use unrecorded dates,
  preferring the historical Monday-based fallback. Thus six records Sunday–Friday satisfy a
  six-day week, and an authorized midweek rest is not itself an absence.
- Explicit Control records are never erased to enforce the fallback quantity. Extra recorded
  work is retained. Extra authorized rest may reduce available working dates. This is not a
  new premium-pay or statutory rest-day formula.
- An uncovered expected day, including a `not_scheduled` system projection without a correction,
  remains `missing_attendance_days` and contributes to the automatic unpaid-attendance
  deduction. It does not become a confirmed `absence` record in Control. The distinction and
  warning are retained in Payroll. Pending/unrecognized states retain their existing treatment.
- Fixed salary uses the resolved control-day denominator and the existing capped deduction.
  Fiscal rules, rounding, pay-period dates and monetary ownership remain unchanged.

## Recalculate, review and freeze

- Creating a run reads current attendance. Explicit **Recalculate** on a draft now refreshes
  Control records and active schedules for that run's dates, then persists counts, amounts,
  warnings and daily evidence in the same existing transaction/run lock.
- Draft recalculation preserves the run's salary, hourly rate, workday-hours and workdays/week
  snapshots, organizational scope, currency, manual items and incentive items. Changing an
  employee's employment/pay configuration requires the existing regeneration workflow; it is
  not silently applied while refreshing attendance.
- Editing manual items and approving use the reviewed attendance snapshot. They retain its
  daily records instead of replacing them with an empty array. Legacy processed runs preserve
  their stored calculation. Approved/paid runs cannot be recalculated.
- The MCP recalculation preview uses the same refreshed inputs as execution, so its existing
  confirmation/version checks still compare the proposed financial outcome with execution.
- A correction made after calculation does not automatically rewrite a run. Before approval,
  the operator explicitly recalculates and reviews it. Approval does not add a new automatic
  refresh or a new stale-attendance gate in this change.

## Bounds and verification

This correction targets complete weekly runs with whole-day configurations. Other frequencies,
partial periods and legacy rounding of fractional weekly-day configurations are not redesigned.
No migration, endpoint, permission, financial status or frontend engine is added. Existing
tenant/scope checks, transition authorization, CSRF and immutable financial history remain.

Regression coverage exercises weekly 3/5/6/7-day counts, shifted working weeks, explicit rest,
confirmed absence, missing projections, assigned schedules, monetary deductions and Control
corrections → draft recalculation → approval using an isolated test database.
