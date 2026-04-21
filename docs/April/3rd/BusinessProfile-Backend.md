# Business Profile Backend

Date: 2026-04-03

This note documents the backend work currently implemented for the Business Profile module.

## Scope

- Added a session-protected Business Profile API under `/api/v1/dashboard/business-profile`.
- Added persistence for the profile header row and per-section answers.
- Added normalization, validation, and derived status logic in the service layer.
- Added controller and service tests for the main success and failure paths.

## API Endpoints

### `GET /api/v1/dashboard/business-profile`

- Requires an authenticated session.
- Reads the current company from `SessionAuthService.currentUser(session)`.
- Returns the latest Business Profile envelope for that company.
- If the company has no saved profile yet, the response still returns a draft envelope with default sections.

Example response shape:

```json
{
  "profile": {
    "id": 3,
    "company_id": 7,
    "version": 1,
    "status": "in_progress",
    "started_at": "2026-04-02 11:00:00",
    "completed_at": null
  },
  "sections": {
    "people": {
      "id": 11,
      "section_key": "people",
      "status": "completed",
      "completed_at": "2026-04-02 11:30:00",
      "data": {
        "ui_key": "personas",
        "answers": {
          "p1": 2,
          "p2": 4
        },
        "saved_at": "2026-04-02 11:30:00",
        "answered_count": 2,
        "question_count": 10
      }
    }
  }
}
```

### `PUT /api/v1/dashboard/business-profile`

- Requires an authenticated session.
- Accepts partial updates under `sections`.
- Creates the profile row on first save if it does not already exist.
- Upserts each submitted section into the answers table.
- Returns the fully normalized saved envelope after persistence.

Example request:

```json
{
  "sections": {
    "people": {
      "status": "completed",
      "completed_at": "2026-04-02 11:30:00",
      "data": {
        "ui_key": "personas",
        "question_count": 10,
        "answers": {
          "p1": 2,
          "p2": 4
        }
      }
    }
  }
}
```

## Authentication And Error Handling

- Missing session user returns `401 Unauthorized`.
- Validation failures return `400 Bad Request` with `{ "message": "..." }`.
- Unknown section keys are rejected.
- Invalid statuses are rejected.
- `data.answers` must be an object.
- Answer keys must not be blank.
- Answer values must be numeric and between `1` and `4`.
- `data.question_count` must be numeric and greater than zero.
- Date fields accept ISO date-time or `YYYY-MM-DD HH:MM:SS`.

## Supported Sections And Statuses

Sections:

- `people`
- `processes`
- `products`
- `finance`

Statuses:

- `draft`
- `in_progress`
- `completed`

## Service Rules

- Default `ui_key` values are:
  - `people -> personas`
  - `processes -> procesos`
  - `products -> productos`
  - `finance -> finanzas`
- Default `question_count` is `10`.
- `answered_count` is always recalculated from the stored `answers` object.
- `saved_at` is normalized during save even when the client does not send it.
- Section status is derived from progress when the client does not send one:
  - `draft` when answered count is `0`
  - `completed` when answered count is at least question count
  - `in_progress` otherwise
- `completed_at` is cleared for non-completed sections.
- For completed sections, `completed_at` is resolved from:
  1. request `completed_at`
  2. `data.saved_at`
  3. current server time
- Overall profile status is derived after section save:
  - `completed` only when all four sections exist and are completed
  - `in_progress` when any section has answers or a non-draft status
  - `draft` otherwise
- Overall profile `completed_at` becomes the latest completed section timestamp when the whole profile is complete.

## Persistence

Flyway migration: `src/main/resources/db/migration/V4__company_business_profiles.sql`

Tables:

- `company_business_profiles`
  - one profile header per company version
  - stores `company_id`, `version`, `status`, `started_at`, `completed_at`, `created_by`, `updated_by`
- `company_business_profile_answers`
  - stores one row per section for a profile
  - unique key on `(business_profile_id, section_key)`
  - JSON `data` column stores `ui_key`, `answers`, `saved_at`, `answered_count`, `question_count`, plus any extra section fields

## Main Backend Files

- `src/main/java/com/indice/erp/dashboard/businessprofile/BusinessProfileApiController.java`
- `src/main/java/com/indice/erp/dashboard/businessprofile/BusinessProfileService.java`
- `src/main/resources/db/migration/V4__company_business_profiles.sql`
- `src/test/java/com/indice/erp/dashboard/businessprofile/BusinessProfileApiControllerTest.java`
- `src/test/java/com/indice/erp/dashboard/businessprofile/BusinessProfileServiceTest.java`

## Test Coverage In Repo

- Controller test verifies unauthorized access for missing session.
- Controller test verifies authenticated `PUT` returns saved section data.
- Service test verifies default draft response when no profile exists.
- Service test verifies save normalization, JSON serialization, and derived counts/status values.
