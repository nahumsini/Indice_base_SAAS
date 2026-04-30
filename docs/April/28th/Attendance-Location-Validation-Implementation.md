# Attendance Location Validation Implementation

Date: April 28, 2026

## Summary

Implemented saved-coordinate attendance validation for Business Structure locations and schedule location rules.

The system now saves latitude, longitude, radius, coordinate source, and Google Maps URL for Business Structure business locations. Those coordinates are also synced into attendance locations so kiosk and attendance events can validate against a real saved location.

## What Changed

- Added Business Structure coordinate fields for each business location.
- Added a coordinate picker that supports Google Maps links and browser current location.
- Added backend coordinate extraction for Google Maps links.
- Persisted Business Structure coordinates in the `businesses` table.
- Synced Business Structure coordinates into `hr_attendance_locations`.
- Marked synced Business Structure attendance locations with `managed_source = 'business_structure'`.
- Marked manually created contract-site attendance locations with `managed_source = 'contract_site'`.
- Updated attendance validation to use saved lat/lng/radius instead of manually typed addresses.
- Contract site assignment takes priority when an employee is actively assigned to a contract site.
- Open schedule allows check-in at any active Business Structure location in the company profile.
- Strict schedule allows check-in only at the employee's dedicated location.
- If strict schedule has an enforced schedule location, that location is used first.
- If strict schedule has no enforced location, the employee's assigned Business Structure business location is used.
- If no schedule rule exists for the day, location validation defaults to strict behavior.

## Database

Added migrations:

- `V24__business_structure_attendance_locations.sql`
- `V25__business_structure_location_backfill.sql`

New/updated columns:

- `businesses.latitude`
- `businesses.longitude`
- `businesses.radius_meters`
- `businesses.coordinate_source`
- `businesses.google_maps_url`
- `hr_attendance_locations.managed_source`

## Frontend

Updated Business Structure setup so users can save exact coordinates for business locations.

Updated schedule UI wording so open and strict schedule modes are clear:

- Open: employee can check in from any saved Business Structure location.
- Strict: employee must check in from the dedicated location.

## Backend

Updated Config Center to save and sync Business Structure location coordinates.

Updated HR Attendance to resolve the validation location in this order:

1. Active contract site assignment.
2. Open schedule: any active Business Structure location.
3. Strict schedule with enforced location: selected schedule location.
4. Strict schedule without enforced location: employee assigned Business Structure location.

## Verification

Passed:

- `./mvnw test -Dtest=ConfigCenterServiceTest,ConfigCenterApiControllerTest,GoogleMapsCoordinateExtractorTest,HrAttendanceApiControllerTest,HrFirstRunIntegrationTest#openScheduleAllowsAnyBusinessStructureLocationButStrictUsesEmployeeBusiness`
- `npm run typecheck`
- `npm run build`
- `git diff --check`

Note:

- Full `./mvnw test` still has older unrelated `HrFirstRunIntegrationTest` failures caused by fixed seed assumptions and historical kiosk event dates. The focused tests for this location-validation work pass.
