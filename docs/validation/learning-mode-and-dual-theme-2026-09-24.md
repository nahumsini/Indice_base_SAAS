# Learning preferences, English guidance and dual-workspace theme

## Scope and findings

- Global Learning mode was stored only in localStorage. The existing logout cleanup removed it, causing the next login to restore the first-entry default.
- The theme hook read storage only at mount; existing secondary workspaces did not receive theme changes.
- The simple module guide and journey navigation contained Spanish-only labels. Six module-specific catalogues also lacked English content. The translated HR guide omitted its module journey/navigation callbacks.

## Changes

- Global active/visible/stage preferences use the existing authenticated, company/user-scoped workspace-state API under `system/learning-mode`, without expiration. Existing browser preferences migrate when no account preference exists.
- Guidance stays inactive while preferences load. Read failures do not overwrite remote state with defaults. Modal saves await confirmation, preserve drafts on failure and support retry. Cancelled failed drafts cannot leak into later progress saves.
- Writes serialize and merge against confirmed state. User/company changes invalidate obsolete loads and queued writes. Mounted secondary panes receive confirmed preference updates through storage events.
- The existing storage hook has an opt-in synchronization mode, used only for the application theme. New panes read without writing a default; changes propagate between documents and listeners are removed on unmount.
- Shared navigation/controls support English. Expenses, Petty Cash, Receivables, KPIs, POS and Inventory supply owner-defined English workflow overviews. Existing detailed Spanish catalogues remain intact. HR’s translated guide can navigate its permitted areas.

## Preserved behavior

Authentication cleanup, CSRF enforcement, tenant scoping, API response shapes, all operational permissions/actions, the six-stage Dashboard, the shared modal engine, POS’s guide-free sales terminal and existing navigation-state retention remain unchanged. Turning Learning mode off does not reset its stage or selected business case. Existing local per-module progress/case storage is unchanged.

## Validation

- Focused Learning mode regression: 22 passing tests.
- Workspace-state service: 6 passing tests, including exact non-expiring scope and retained 90-day retention elsewhere; mocked JdbcTemplate, no functional/production database.
- Browser fixture uses actual React hooks, modal, module guides and Dashboard with synthetic API responses. Covers opt-out across logout, failed save/retry/cancel, sequential edits, user/company isolation, stale loads, failed reads, disabled localStorage, English (US and Canada) navigation, preservation of understood stages across locale changes, invalid remote state protection and 30 repeated theme changes across an iframe. Final browser run passed all scenarios with zero page errors.
- TypeScript validation and production build passed. The full frontend suite passed 836/836 tests. Vite retains its existing large-chunk warning; there are no compile errors.

## Files changed for this task

- `react/src/app/hooks/useLearningModePreferences.ts`, `useLocalStorageState.ts`, `App.tsx` and `components/Header.tsx`.
- `react/src/app/learningMode/`: preference validation, settings copy, modal save lifecycle, shared English overview presentation and journey navigation.
- Module entry points and owner-scoped `operationalGuidance/*LearningEnglish.ts` catalogues in Expenses, PettyCash, Receivables, Kpis, PointOfSale and Inventory; HR’s translated guide wrapper.
- `UserWorkspaceStateService.java` and its focused service test; only the new learning preference retention exception is part of this task. Existing Expenses column changes are preserved.
- Frontend regression scripts, isolated browser fixture, package test commands and the two frontend learning contracts.

## Limitations and release

English workflow overviews are complete per stage but do not yet reproduce every detailed Spanish tool story. HR retains its translated general guide; the Spanish employee checklist remains a separate existing experience. Per-module progress and the selected case retain their pre-existing local storage lifecycle; this change persists the global active/visible/stage preference.

Schema changes: N/A. Production deployment: not performed for this change. Prior Expenses deployment and existing dirty work were preserved.
