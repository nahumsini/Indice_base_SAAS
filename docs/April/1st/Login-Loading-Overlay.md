# Login Loading Overlay

Date: 2026-04-01

This note captures the login loading flow that was added in the latest frontend commit.

## Commit Reference

- `c2a1edf` - `css chanegs & loading component integrated with login page`

## What Was Added

- A reusable loading overlay component was added in `react/src/app/components/LoadingBarOverlay.tsx`.
- The login page now uses that shared component instead of handling loading feedback inline.
- The loading flow starts as soon as the user clicks the login button.
- The overlay stays visible until the backend login response returns.
- A minimum display duration of `2.5 seconds` is enforced so the transition feels stable.

## Current Login Flow

1. User enters email and password.
2. User clicks `Login`.
3. `isSubmitting` becomes `true`.
4. The loading overlay is shown immediately.
5. `authApi.login(...)` runs.
6. `runWithMinimumDuration(...)` keeps the overlay visible for at least `2500ms`.
7. On success, the app navigates to `/dashboard`.
8. On failure, the overlay closes after the minimum duration and the error message is shown.

## Files Involved

- `react/src/app/Auth/LoginPage.tsx`
- `react/src/app/components/LoadingBarOverlay.tsx`

## UI Direction

- The loader uses a centered white card layout.
- The background uses a dark translucent overlay with blur.
- The loading indicator is a simple spinning circle.
- The design is reusable so the same component can be used in other backend-driven actions later.
