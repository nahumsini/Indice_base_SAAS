# Personal Performance Frontend

Date: 2026-04-08

This note documents the frontend scope and status for the new `Personal Performance` assessment.

## Scope For This Task

- Backend APIs and persistence were the implementation target.
- No React frontend code was changed in this task.
- This document captures the expected frontend integration work and backend contract for the UI.

## Product Shape Expected By Frontend

- This is a user-scoped assessment for the logged-in user.
- It should behave similarly to the current Business Diagnosis flow.
- It should present 4 section cards.
- Each section has 10 questions.
- Total assessment size is 40 questions.
- Each question uses 4 answer options.

## Sections

- `sleep_recovery`
- `nutrition_energy`
- `stress_clarity`
- `balance_sustainability`

## Recommended Answer Prefixes

- `sr1` to `sr10`
- `ne1` to `ne10`
- `sc1` to `sc10`
- `bs1` to `bs10`

## Score Mapping Used By UI

- option `1` = `25`
- option `2` = `50`
- option `3` = `75`
- option `4` = `100`

For this MVP, score calculation remains a frontend concern. The backend stores normalized answers and progress state.

## Backend Contract For Frontend

Base path:

- `/api/v1/dashboard/personal-performance`

Endpoints:

- `GET /api/v1/dashboard/personal-performance/me`
- `PUT /api/v1/dashboard/personal-performance/me`

Frontend does not send:

- `user_id`
- `company_id`

Those are inferred from the session by the backend.

## Response Shape Available To Frontend

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

Each section contains:

- `id`
- `section_key`
- `status`
- `completed_at`
- `data`
  - `ui_key`
  - `answers`
  - `saved_at`
  - `answered_count`
  - `question_count`

## Save Pattern Expected

- frontend can send partial `sections` payloads
- each section may send:
  - `status`
  - `completed_at`
  - `data`
- backend will normalize missing values and return the saved envelope

## Frontend Work Still Pending

- add a dedicated Personal Performance screen in the dashboard/home panel flow
- add a typed API client for `GET /me` and `PUT /me`
- map local UI question indexes to answer keys like `sr1`, `ne1`, `sc1`, `bs1`
- load saved draft state from backend on mount
- support save/discard behavior like Business Diagnosis
- show section progress and completion state from backend response
- optionally add print/report flow for Personal Performance later

## Current Frontend Result

- There is no new committed frontend implementation for Personal Performance yet.
- The backend contract is now ready for the UI to integrate against.
- The intended frontend pattern is the existing Business Diagnosis flow, adapted to the four Personal Performance sections.
