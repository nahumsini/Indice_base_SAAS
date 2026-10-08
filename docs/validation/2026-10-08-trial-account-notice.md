# Regional trial account notice and CI follow-up

Date: 2026-10-08. Branch: `codex/regional-trial-payments-20261008`.
Scope: payment discoverability and generated Learning catalog repair, following
[the regional payment increment](2026-10-08-regional-trial-payments.md).
No deployment, catalog publication, provider request, public enablement or real charge.

## Behavior changed

- The primary Dashboard exposes a Billing-owned notice for the authenticated owner of an
  unconverted regional trial: original deadline, display-only remaining days/last-day label
  and navigation to native `/billing`. The six operational Dashboard sections remain intact.
- A server-denied `trial_expired` session can show owner-confirmed localized recovery, explaining
  retained records and verified-payment reactivation. Other restrictions and unavailable owner
  context keep the existing native subscription recovery. A blocked ERP has one workspace.
- Payment-disabled active/expired states are explicit. Saved method and pending setup use a
  review action, never claim payment or silently enroll another method. Eight ERP locales,
  native controls, keyboard navigation, mobile wrapping and neutral-dark styles are preserved.
- User/company/authorization-revision changes invalidate the notice snapshot. Late responses
  cannot revive a prior scope. Errors discard data; focus/visible-minute refresh permits retry.
  Embedded Dashboard panes render no duplicate account notice.
- The native billing CI command now includes the existing public-entry/regional-payment tests
  and the new notice regressions.

## Behavior deliberately preserved

Backend authentication/owner/delegated-context enforcement, original absolute deadline,
commercial deny/recovery, paid-invoice conversion, all pricing/tax/money rules, native routes,
unchecked mandate, CSRF, legacy/delegated account workspaces, released basic module access,
Learning lessons/progress and rollout flags. No new API, schema, entitlement or authorization
system. Countdown is not access authority and performs no payment mutation.

## Generated catalog repair

Remote run `37854303646` for preceding commit `a2ca2532` failed the Learning `--check` gate.
The provided generator reviewed 67 bilingual chapters in 12 modules. Regeneration changed
only `sourceDigest` in `src/main/resources/ai/learning-catalog-v1.json`; catalog version, chapters,
content, evidence actions and `docs/learning-function-coverage.md` are unchanged. The new notice
is an account entry outside the operational module/tab learning curriculum, not a progress action.
The gate remains enabled and passes against the current owner source files.

## Verification

- All frontend regression commands used by `.github/workflows/ci.yml`: **907 tests passed,
  zero failed/skipped**, plus the script-based phone validation. Full log:
  `/tmp/indice-trial-notice-ci-frontend-20261008.log`.
- Additional Workbar Layout **5** and Global Product Identity **6** regressions passed.
- Focused billing **49** and Dashboard **18** tests passed (included in the 907, not additive).
- TypeScript `npm run typecheck`: passed. `npm run build`: passed; existing large-chunk warning
  remains, with no new build error.
- `LearningCatalogServiceTest`: **1 passed**, backend main/test compilation passed. Unit test
  uses mocked owners, no database connection. Isolated `TEST_DATASOURCE_URL` was explicitly
  supplied. No migration/domain backend change; full backend/Flyway rerun locally: **N/A** for
  this UI/resource-only increment. Prior full bounded backend evidence remains in the linked
  increment report; remote CI on the new commit is a separate check.
- New native component/API-client browser harness passed six scenario groups: countdown/keyboard
  native CTA; saved/pending review; exact expiry/payment-disabled recovery; historical/converted/
  non-owner/delegated/error/focus behavior; late company response; 390px dark and French layouts.
  No payment mutations or external requests; the native client session revalidation after denied
  owner reads is included. Existing regional billing browser harness also passed its three groups.
- Initial new-browser harness runs failed due to test-only language initialization on reload and
  an unstubbed native `/auth/me` revalidation after 403. Fixtures were corrected and the final
  rerun passed; production behavior was not changed to suppress these native checks.
- Generator `--check` and `git diff --check`: passed.
- Screenshots inspected: `/tmp/indice-trial-notice-desktop-20261008.png`,
  `/tmp/indice-trial-notice-mobile-dark-20261008.png`.

## Files changed

Billing `TrialAccountNotice.tsx`, `trialAccountPresentation.ts`, `translations/trialAccount.ts`;
Dashboard `MainDashboard.tsx` account slot; `App.tsx` composition/recovery/blocked-pane guard;
notice unit/browser regressions; `react/package.json` billing suite; generated Learning JSON;
Frontend Operating System, customer-entry contract and this validation record.
Marketing repository and unrelated work: untouched. Schema changes: **N/A**.

## Remaining release limits

The regional cohort remains gated off by default. Real Stripe TEST conversion/cancellation/
failure/authentication certification, APPTEST real-session acceptance, published/verified regional
catalog, public security/legal/tax gates and remaining coordination decisions are still required.
This follow-up certifies neither real payment nor launch readiness. Outbound reminders, regional
add-ons and uncertain-provider reconciliation remain pending under the customer-entry owner contract.
