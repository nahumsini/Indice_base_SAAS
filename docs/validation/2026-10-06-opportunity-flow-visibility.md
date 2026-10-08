# Opportunity flow visibility — local UI validation

Date: 2026-10-06
Status: implemented locally; not published or deployed to APPTEST/production.
Branch: `codex/opportunity-flow-visibility-20261006`

## Scope and preserved behavior

The owner approved the visibility improvements after a read-only investigation confirmed that
reassigned opportunities were retained in their destination workflow, while the workspace still
displayed the empty factory workflow. This is a frontend navigation/feedback change, not a data
repair or a change to the authoritative assignment contract.

- Reuse `useWorkspaceNavigationMemory` under the existing `sales` / `prospects` entry; add only the
  safe `flowId` view choice. Company/user isolation, durable persistence, offline cache, CSRF and
  URL precedence remain owned by the existing workspace mechanism.
- Wait for the authorized catalogue before restoring. A stale/removed workflow falls back to a
  currently available workflow and resets dependent stage/page state. A catalogue load failure
  does not overwrite the remembered workflow with the temporary factory fallback.
- Use the existing loading state while restoration is pending, rather than rendering an unscoped
  list or offering creation before the selected workflow is known.
- Display fresh assignment counts from the already loaded owner-visible records, before optional
  search/period filters. Show unavailable counts during loading/failure, not misleading zeroes.
- Explain an empty assigned workflow and provide view-only links to other nonempty workflows.
- Display a dismissible reassignment notice only after the existing save returns a changed,
  authoritative destination. Pending/failed saves do not claim success. A destination link changes
  only the workspace view; the source view is not switched automatically during reassignment.
- Clear filters without resetting the workflow or column preferences.
- Preserve routes, permissions, API shapes, saved company default, authoritative assignment,
  lifecycle/terminal rules, commercial calculations and records/attachments/quotes.

Backend changes, schema migrations, production writes, Stripe changes and deployment: N/A.

## Files changed

- `react/src/app/BasicModules/Sales/Prospectos/Prospectos.tsx`
- `react/src/app/BasicModules/Sales/Prospectos/components/ProspectosHeader.tsx`
- `react/src/app/BasicModules/Sales/Prospectos/components/OpportunityFlowFeedback.tsx`
- `react/src/app/BasicModules/Sales/Prospectos/utils/prospectosFlowWorkspace.ts`
- `react/src/app/BasicModules/Sales/Prospectos/translations/prospectosTranslations.ts`
- `react/tests/opportunity-flow-workspace.test.mjs`
- `react/tests/opportunity-flows-browser.mjs`
- `react/tests/browser/opportunity-flows.html`
- `react/tests/browser/opportunity-flows.tsx`
- `react/package.json` (test commands only; no dependency changes)
- `docs/sales-opportunity-multi-flow-decision-2026-08-27.md`
- This validation record.

## Verification

Focused regression suite: **75 passed, 0 failures** across opportunity flow workspace, Sales
workflow, Sales frontend standard, Sales KPI workspace and shared navigation memory tests.
The new helper/locale tests also run through the existing `test:sales-workflow` command.

The real `Prospectos` page was mounted in a synthetic, intercepted-HTTP browser fixture using the
existing CRM, language, currency and memory providers. All non-local network requests were blocked;
there was no connection to a functional or production database. Browser checks passed for:

1. Empty factory scope, nonempty destination links and fresh counts.
2. Tab return, reload and slow memory restoration without an empty-default overwrite or creation
   in the wrong default during restoration.
3. Catalogue failure preserving the previous selection and retry recovery.
4. Failed/pending reassignment with no false success; successful reassignment preserving record
   identity and offering a destination link without an automatic workspace switch.
5. Clear filters preserving the workflow; an explicit URL overriding remembered selection.
6. Keyboard opening, Escape and focus return through the existing Select primitive.
7. User/company isolation.
8. Owner-restricted counts excluding another owner's opportunities.
9. Mobile bounds and an unavailable remembered workflow normalizing to the current catalogue.

The new feedback was visually inspected on desktop and 390px mobile layouts, in light/dark mode.
Its view/dismiss actions have 44px minimum touch targets. New copy covers all eight supported
locales. Screenshot evidence contains synthetic data only and is temporary, outside the repository.

`npm run typecheck` and `npm run build` passed. The build retains the existing non-blocking large
chunk warning; dependency/architecture changes to address it are outside this UI task.
`git diff --check` passed.

## Corrections during validation and remaining risks

- The initial red test intentionally preceded the new helper implementation.
- The standard regression caught `font-semibold` in the new feedback; it was corrected to the
  approved `font-medium`, without weakening the test.
- TypeScript caught the loader using the sale-record copy instead of the Sales module copy. It
  now uses the existing module translation hook; no casts or compiler exceptions were introduced.
- The initial browser fixture changed scope before its preceding asynchronous workflow selection
  completed, and its monetary route mock used the wrong path. The fixture now waits for confirmed
  selection and intercepts the existing batch route; the final run has no unexpected requests or
  browser errors.
- Local verification is not authenticated production acceptance. APPTEST/production deployment and
  the owner's final review remain pending; production business data was not mutated by this work.
