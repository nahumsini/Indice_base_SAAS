# Independent training centre — local validation

## Authorized scope and behavior changed

The current product decision separates Training & content from Platform administration
so distributors can learn without entering the internal administrator. Implementation
is local on `codex/opportunity-flow-visibility-20261006`; no commit, push or deployment
was performed for this change. Existing opportunity-flow work remains intact.

- New authenticated `/training` workspace, with shared Índice identity/header, ERP return
  action, eight languages and the existing academy's four learning views.
- Independent entry in the ERP profile menu and link from the distributor portal.
- Training removed from the platform-admin tab union, navigation and embedded render.
- Explicit old training URLs redirect to `/training` before loading the old workspace's
  administration/portfolio context. Old saved admin navigation resets to Customers.
- Training and its legacy-entry redirects avoid mounting unrelated tenant-data providers.

## Behavior deliberately preserved

- Seven sessions, induction, sales methodology, exercises, progress, timed exams,
  resources, certification and public certificate verification.
- Existing backend ownership in `com.indice.erp.training`; no production backend changes.
- Distributor authorization remains `DistributorPortfolioAccessPolicy.requireDistributor`:
  eligible administrative role and exact active membership in an active DISTRIBUTOR company.
- Platform training retains the existing `PLATFORM_VIEW` gate. Only this authorized
  presentation retains the global learner summary; distributors do not receive it.
- The loader checks the existing backend before rendering. No portal URL parameter,
  denied-distributor fallback, role grant or platform-context lookup is introduced.
- Progress stays keyed by authenticated learner, program and version. Existing CSRF,
  assessment ownership, backend API shapes and persistence semantics are unchanged.
- Ordinary distributor staff and ordinary Índice company members gain no new permission.

## Files changed for this task

- `react/src/app/Training/TrainingPage.tsx`: independent learning shell.
- `react/src/app/Training/trainingAccess.ts`: protected loader, visibility-only discovery,
  and exact legacy URL mapping.
- `react/src/app/Training/translations/workspace.ts`: shell copy in eight locales.
- `react/src/app/routes.tsx`: dedicated route, existing auth-expiry handling, legacy redirects.
- `react/src/app/PlatformAdmin/PlatformAdminPage.tsx`: remove training tab; normalize old memory.
- `react/src/app/DistributorPortal/DistributorPortalPage.tsx`: independent localized link.
- `react/src/app/components/Header.tsx`: ERP profile-menu entry, without widening admin visibility.
- `react/src/main.tsx`: omit unrelated tenant-data providers for training and its legacy URLs.
- `react/package.json`: focused training commands; prior opportunity commands preserved.
- `react/tests/training-access-regression.test.mjs`: runtime access and navigation regression.
- `react/tests/training-workspace-regression.test.mjs`: same curriculum/progress from standalone shell.
- `react/tests/training-centre-browser.mjs`: real entrypoint/router with synthetic APIs.
- `react/tests/platform-admin-flow-regression.test.mjs`: revised commercial navigation order.
- `react/tests/investment-page-regression.test.mjs`: retain public provider-isolation regression.
- `src/test/java/com/indice/erp/training/TrainingProgramServiceTest.java`: existing backend authority,
  rejected reads, personal progress scope and platform-only summary regression.
- `docs/indice-frontend-operating-system-v2.md`: canonical independent-learning presentation contract.
- This validation record.

## Verification

- Focused training suite: **12 passed** (`cd react && npm run test:training`).
- Combined platform, distributor, training, investment, brand and auth regressions:
  **175 passed**, no failures. The existing `npm run test:platform-admin` also passed,
  including the **40-test** localization suite.
- Backend Mockito-only suites: **13 passed**, no failures:
  `./mvnw -Dtest=TrainingProgramServiceTest,DistributorPortfolioAccessPolicyTest test`.
  These use mocked JDBC, not the functional, test or production database.
- `cd react && npm run typecheck`: passed.
- `cd react && npm run build`: passed. Existing large-chunk warnings remain.
- `git diff --check`: passed.
- Browser: **8 scenarios passed** through the real application router, with synthetic
  sessions/API responses and non-local network blocked. Verified independent distributor
  loading, desktop/mobile/dark rendering, induction/certification/commercial views,
  CSRF-protected progress surviving reload, language switching, both legacy redirects,
  authorized platform summaries, and denied training/platform-admin access.

Browser command (Playwright may be provided outside the application dependency tree):

```sh
cd react
INDICE_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
INDICE_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
npm run test:training-browser
```

Screenshots inspected locally: `/tmp/indice-training-centre-desktop.png`,
`/tmp/indice-training-centre-mobile.png`, `/tmp/indice-training-centre-dark.png`.
Local `/training` returns the frontend successfully on port 5174. Authenticated data
still requires an eligible local session; browser tests did not impersonate a real account.

## Failures, remaining risks and handoff

- Final verification failures: none. Initial test-development failures were corrected
  (new files absent before implementation; harness dependency path, existing localized
  selectors and synthetic redirect-destination fixtures); the full browser rerun passed.
- Compiler/tool warnings: existing frontend chunk size and Java/Mockito deprecation/agent warnings.
- APPTEST/production validation: pending; not requested or performed this turn.
- Schema migration: N/A. Financial calculations, billing/Stripe, commercial account changes,
  invitation/user grants and production data mutations: N/A.
- A release still requires the normal `deployment/README.md` security/release/rollback gates
  and authenticated review of distributor access, real exams and certificate downloads.

Review URL: `http://127.0.0.1:5174/training`. Choose an eligible distributor company for the
distributor presentation, or an already-authorized platform viewer for the oversight view.
