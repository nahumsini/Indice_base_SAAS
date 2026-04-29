# Attendance Schedule Location Requirements

## Scope

Attendance check-in and check-out must use saved coordinates from the company setup instead of relying on manually typed addresses.

## Location Sources

- Business Structure locations are the normal company/business locations.
- Business Structure latitude, longitude, radius, coordinate source, and Google Maps URL must be persisted in the database on the business record.
- Business Structure business coordinates must also be synced into attendance locations so kiosk and attendance records can resolve a concrete attendance location.
- Contract site locations remain attendance locations and are used when an employee is actively assigned to that contract site.

## Schedule Modes

- Open schedule means the employee has no fixed start/end time and can record attendance at any active Business Structure location in the company profile.
- Strict schedule means the employee can record attendance only at the dedicated location.
- If an employee has an active contract site assignment for the date, that contract site is the dedicated location and takes priority over open/strict schedule mode.
- If there is no active contract site assignment, strict schedule dedicated location is resolved in this order:
  1. The schedule template selected location when location enforcement is configured.
  2. The employee's assigned business location from Business Structure.
- If an employee has no schedule rule for the day, the location policy defaults to strict behavior.

## Radius Validation

- The browser/device latitude and longitude must be inside the saved radius for the resolved location.
- Business Structure locations use their saved radius, defaulting to 100 meters when a radius is not supplied.
- Contract sites use their saved contract-site radius.

## Failure Behavior

- Open schedule must fail if no active Business Structure locations are configured.
- Strict schedule must fail if the employee has no assigned business or if that business has no saved Business Structure location.
- Contract site assignments must fail if the employee is not inside the assigned contract-site radius.
