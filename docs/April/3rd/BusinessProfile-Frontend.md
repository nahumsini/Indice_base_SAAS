# Business Profile Frontend

Date: 2026-04-03

This note documents the frontend work currently implemented for the Business Profile module.

## Scope

- Added the Business Profile tab to the dashboard module flow.
- Added a typed API client for Business Profile load and save.
- Added a four-pillar diagnosis experience with progress tracking and dirty-state handling.
- Added score calculation and PDF preview/export support for the diagnosis report.

## Entry Points

- Dashboard tab id: `business-profile`
- Main screen: `react/src/app/BasicModules/Dashboard/BusinessProfile/BusinessProfile.tsx`
- API client: `react/src/app/api/HomePanel/BusinessProfile/businessProfile.ts`
- Dashboard tab registration: `react/src/app/BasicModules/Dashboard/PanelInicial.tsx`

## Frontend API Integration

The frontend uses the same backend endpoint for both load and save:

- `GET /api/v1/dashboard/business-profile`
- `PUT /api/v1/dashboard/business-profile`

Typed response model:

- `profile`
- `sections.people`
- `sections.processes`
- `sections.products`
- `sections.finance`

Typed save payload:

- `sections` is partial, so the UI only sends changed sections.
- Each section may send:
  - `status`
  - `completed_at`
  - `data`

## Business Profile Screen Behavior

- The UI is split into four pillars:
  - `people`
  - `processes`
  - `products`
  - `finance`
- Each pillar reads its questions from translated diagnosis copy in the language context.
- On mount, the screen loads the saved Business Profile from the backend.
- The response is converted into local UI state with:
  - section id
  - section status
  - completion timestamp
  - question count
  - `ui_key`
  - normalized answers
- If the load fails, the screen falls back to an empty draft state and shows an error message.

## Answer Mapping

- Backend answer values are `1` to `4`.
- Frontend answer indexes are `0` to `3`.
- The screen converts backend keys into local numeric question indexes.
- Save converts local answers back into backend keys using section prefixes:
  - `people -> p1, p2, ...`
  - `processes -> pr1, pr2, ...`
  - `products -> prod1, prod2, ...`
  - `finance -> fin1, fin2, ...`

## Save And Draft Handling

- The screen keeps both current state and baseline state.
- Dirty checking is section-based and also used for the global save bar.
- Only changed sections are added to the save payload.
- Section status is derived in the UI before save:
  - `draft` when no answers exist
  - `completed` when answered count reaches question count
  - `in_progress` otherwise
- Discard resets current state back to the last saved baseline.
- Restarting a pillar clears its answers and `completedAt`.
- Save uses a minimum loading overlay duration of `2500ms` so the progress feedback is visible.
- After a successful save:
  - the server response becomes the new baseline
  - success feedback is shown
  - the active question flow closes back to the overview

## Progress And UX Flow

- The screen calculates per-pillar answered counts and total progress.
- Pillar CTA text changes between start, continue, review, and do again based on progress and dirty state.
- The current question index resumes from the next unanswered item when reopening an incomplete pillar.
- Unsaved changes keep extra bottom spacing so the save bar does not overlap the content.

## Reporting

- A score report is built from the current answers in `businessDiagnosisScoring.ts`.
- Option values map to score points:
  - `1 -> 25`
  - `2 -> 50`
  - `3 -> 75`
  - `4 -> 100`
- Maturity levels are:
  - `Chaos`
  - `Survival`
  - `Organized`
  - `Scalable`
  - `Pro Company`
- The user can open a Business Diagnosis PDF preview from the screen.
- Generated report ids use the prefix `IDX-BD`.

## Main Frontend Files

- `react/src/app/api/HomePanel/BusinessProfile/businessProfile.ts`
- `react/src/app/BasicModules/Dashboard/BusinessProfile/BusinessProfile.tsx`
- `react/src/app/BasicModules/Dashboard/BusinessProfile/businessDiagnosisScoring.ts`
- `react/src/app/BasicModules/Dashboard/BusinessProfile/BusinessDiagnosisPdfDocument.tsx`
- `react/src/app/BasicModules/Dashboard/PanelInicial.tsx`

## Current User-Facing Result

- Business Profile is available as a dedicated dashboard tab.
- Users can answer diagnosis questions across four business pillars.
- Saved work reloads from the backend and can be resumed.
- Changes can be discarded or saved selectively.
- The current answers can be turned into a scored PDF diagnosis report.
