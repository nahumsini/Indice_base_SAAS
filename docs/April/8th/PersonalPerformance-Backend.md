# Personal Performance Backend

Date: 2026-04-08

This note documents the backend work implemented for the new user-scoped `Personal Performance` assessment.

## Scope

- Added a dedicated Spring backend module for Personal Performance.
- Kept the implementation separate from Business Profile.
- Made the API user-scoped through the current authenticated session.
- Added persistence with one profile table and one per-section answers table.
- Added controller and service tests following the existing Business Profile backend style.

## Product Rules Implemented

- This assessment is not company-scoped for ownership.
- The current logged-in user owns the data.
- The frontend does not need to send `user_id`.
- The backend infers both `user_id` and `company_id` from the current session user.
- No admin/raw-response endpoints were added in this task.

## Backend Package

- `src/main/java/com/indice/erp/dashboard/personalperformance`

Files:

- `PersonalPerformanceApiController.java`
- `PersonalPerformanceService.java`

## Migration

Flyway migration:

- `src/main/resources/db/migration/V12__user_personal_performance.sql`

Tables added:

- `user_personal_performance_profiles`
- `user_personal_performance_answers`

### `user_personal_performance_profiles`

Columns:

- `id`
- `user_id`
- `company_id`
- `version`
- `status`
- `started_at`
- `completed_at`
- `created_at`
- `updated_at`

Purpose:

- stores one Personal Performance profile instance/version for a user
- latest row is used for `GET /me`

### `user_personal_performance_answers`

Columns:

- `id`
- `personal_performance_profile_id`
- `section_key`
- `status`
- `completed_at`
- `data`
- `created_at`
- `updated_at`

Purpose:

- stores one row per section for the profile
- stores normalized JSON payload under `data`

## Sections

- `sleep_recovery`
- `nutrition_energy`
- `stress_clarity`
- `balance_sustainability`

## Statuses

- `draft`
- `in_progress`
- `completed`

## JSON Data Shape

Each section stores:

- `ui_key`
- `answers`
- `saved_at`
- `answered_count`
- `question_count`

Current default:

- `question_count = 10` for every section

## Endpoints

Base path:

- `/api/v1/dashboard/personal-performance`

Endpoints:

- `GET /api/v1/dashboard/personal-performance/me`
- `PUT /api/v1/dashboard/personal-performance/me`

### `GET /me`

- requires authenticated session
- returns `401` when session is missing
- loads the latest profile for the current user
- if no profile exists, returns a default draft envelope with all four sections

### `PUT /me`

- requires authenticated session
- returns `401` when session is missing
- accepts partial section updates
- creates the profile if it does not exist
- normalizes section JSON
- derives section status from answers if status is missing
- derives overall profile status from saved section completion
- upserts one row per section
- returns the normalized saved envelope

## Response Shape

- `profile`
  - `id`
  - `user_id`
  - `company_id`
  - `version`
  - `status`
  - `started_at`
  - `completed_at`
- `sections`
  - `sleep_recovery`
  - `nutrition_energy`
  - `stress_clarity`
  - `balance_sustainability`

Each section returns:

- `id`
- `section_key`
- `status`
- `completed_at`
- `data`

## Validation And Normalization

- unknown section keys are rejected
- invalid statuses are rejected
- `data.answers` must be an object
- answer keys must not be blank
- answer values must be numeric and between `1` and `4`
- `data.question_count` must be numeric and greater than zero
- date fields accept ISO date-time or `YYYY-MM-DD HH:MM:SS`
- missing `saved_at` is normalized to current server time
- missing `ui_key` defaults to the section key

## Derived Behavior

- section status becomes:
  - `draft` when no answers exist
  - `completed` when answered count reaches question count
  - `in_progress` otherwise
- overall profile status becomes:
  - `completed` only when all 4 sections are completed
  - `in_progress` when any section has progress
  - `draft` otherwise

## Tests Added

- `src/test/java/com/indice/erp/dashboard/personalperformance/PersonalPerformanceApiControllerTest.java`
- `src/test/java/com/indice/erp/dashboard/personalperformance/PersonalPerformanceServiceTest.java`

Verified with:

```bash
./mvnw -q -Dtest=PersonalPerformanceServiceTest,PersonalPerformanceApiControllerTest test
```

## Current Result

- Personal Performance backend persistence is implemented.
- The API is session-user scoped and ready for frontend integration.
- The module is intentionally separate from Business Profile for this MVP.
