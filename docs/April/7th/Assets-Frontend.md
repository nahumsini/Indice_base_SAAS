# Assets Frontend

Date: 2026-04-07

This note documents the frontend work currently in place for the Human Resources > Assets module.

## Scope

- Added an Assets screen under Human Resources with a table-based asset view.
- Added local UI flows for creating an asset, viewing details, moving an asset to maintenance, and marking it into custody/resguardo.
- Added column visibility controls, filters, and dark/light theme support in the frontend.
- Kept translations frontend-only.
- Current screen still uses local/mock data and is not yet wired to the new Spring backend API.

## Main Frontend Behavior

- Lists company assets in a table.
- Supports search filtering.
- Supports filters for:
  - asset type
  - status
  - unit
- Supports user-selected visible columns in the table.
- Supports opening an add-asset dialog.
- Supports viewing asset details in a quick modal/alert flow.
- Supports moving an asset to maintenance.
- Supports deactivate flow that currently moves the item to custody/resguardo in local UI state.
- Reassign action is still a placeholder in the current frontend.

## Current Data Handling

- Asset rows are currently derived from frontend mock data.
- New asset creation updates local component state only.
- Maintenance and deactivate actions update local component state only.
- No backend fetch/save integration is in place yet for the Assets screen.

## Current Fields In UI

- `id`
- `assetType`
- `name`
- `model`
- `serialNumber`
- `responsible`
- `unit`
- `status`
- `assignedDate`
- `value`
- `notes`

## Frontend Files

- `react/src/app/BasicModules/HumanResources/Assets/Assets.tsx`
- `react/src/app/BasicModules/HumanResources/Assets/AddNewAssests.tsx`
- `react/src/app/BasicModules/HumanResources/Assets/AssetColumnsModal.tsx`
- `react/src/app/BasicModules/HumanResources/Assets/useAssetsPortalTheme.ts`
- `react/src/app/BasicModules/HumanResources/HRLanguage.ts`

## Current Frontend Result

- The Assets UI is visually functional.
- Users can work with assets in the browser using local state.
- The module already has the interaction model the backend needs to support.
- Backend integration is the remaining step for real persistence and server-driven pagination/filtering.
