# Loading Overlay Scroll Lock

Date: May 4, 2026

## Summary

Updated the shared loading overlay so the page behind it no longer scrolls while a backend-driven action is in progress.

## What Changed

- Added document scroll locking to `LoadingBarOverlay`.
- Preserves the user's current scroll position while the overlay is visible.
- Restores the original scroll position when loading finishes.
- Handles multiple simultaneous overlays with a shared lock counter.
- Added `overscroll-contain` to reduce background movement on touch/trackpad scroll.

## Files Changed Or Involved

- `react/src/app/components/LoadingBarOverlay.tsx`

## Verification

Completed checks:

- `cd react && npm run typecheck`
- `git diff --check`
