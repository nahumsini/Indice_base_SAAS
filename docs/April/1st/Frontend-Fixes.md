# Frontend Fixes

Date: 2026-04-01

This note captures the current frontend updates in git.

## Scope

- 10 frontend files changed
- 189 insertions
- 152 deletions

## Main Updates

- Responsive layout fixes were added across the dashboard pages.
- Cards, headers, forms, tables, and modal actions now adapt better on small screens.
- Buttons now use full-width mobile layouts in many places.
- Tables now use minimum widths where needed so horizontal scrolling works cleanly.

## Behavioral Changes

- `PanelInicial` now defaults to the `profile` sub-tab instead of `business-profile`.
- The fallback component in `PanelInicial` now opens `Profile`.
- `FavoritesBar` now pins a fixed core module flow first:
  - `home-panel`
  - `human-resources`
  - `processes-tasks`
  - `expenses`
  - `petty-cash`
- Extra favorite modules are still shown after the pinned modules, without duplicates.
- Dashboard module merging now sorts by fallback module order first, then by title.

## Files Updated

- `react/src/app/BasicModules/Dashboard/Billing/Billing.tsx`
- `react/src/app/BasicModules/Dashboard/BusinessProfile/BusinessProfile.tsx`
- `react/src/app/BasicModules/Dashboard/BusinessStructure/BusinessStructure.tsx`
- `react/src/app/BasicModules/Dashboard/BusinessStructure/components/BusinessIdentitySection.tsx`
- `react/src/app/BasicModules/Dashboard/BusinessStructure/components/UnitsSection.tsx`
- `react/src/app/BasicModules/Dashboard/PanelInicial.tsx`
- `react/src/app/BasicModules/Dashboard/Profile/Profile.tsx`
- `react/src/app/BasicModules/Dashboard/Users/Users.tsx`
- `react/src/app/components/FavoritesBar.tsx`
- `react/src/app/config/moduleCatalog.ts`

## Short Summary

- Most of the work is responsive UI cleanup.
- The main functional updates are the new default `profile` tab and the new favorites/module ordering flow.
