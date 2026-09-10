# Payment Accounts KPI strip — local verification, 2026-09-10

## Scope and standard

The user clarified that the target is **Payment Accounts**, as shown in their screenshot.
Accounting Accounts is unchanged by this task. Local implementation; no deployment requested.
Consulted `indice-frontend-operating-system-v2.md`, section 14, and `KPI_TAB_STANDARD.md`.
This is an operational list strip, not an eight-card analytics tab.

## Behavior changed

- Use the existing `OperationalKpiArea`: inline metrics, native/preferred currency context,
  thin active/inactive distribution and one scope explanation.
- Metrics: active payment-account balance, scoped account count, active and inactive counts,
  and visible virtual Petty Cash fund count.
- Status metrics and distribution filter the table. Clicking the selected status returns to All.
  Sibling status counts keep the search/type base scope so other states remain discoverable.
- User filter changes reset pagination to page 1. Restoring navigation memory retains its page.
- One monetary aggregate uses the existing protected `PAYMENT_ACCOUNT_BALANCE` read contract,
  with explicit IDs and global preferred currency. The backend owns conversion and summation.
- Native amounts use ISO currency labels once; no raw cross-currency summation in the browser.
- Balance updates with unchanged IDs refetch. Old scope/currency responses are hidden and ignored.
- Loading and errors display unavailable, not a fabricated zero. Both account-load failure and
  aggregate failure have retry. Partial FX results disclose exclusions. An empty active scope
  has zero balance without issuing an unbounded request.

## Scope of the balance

The existing owner metric includes ACTIVE, non-deleted Treasury payment accounts and excludes
external managed fund accounts. The UI additionally excludes virtual Petty Cash rows from the
query; it never parses their IDs as real Treasury IDs or adds fund balances to the result.
The strip labels its value **Active balance** and explains that Petty Cash balances remain in
their module. An Inactive-only selection therefore has no active balance. This is not a total
of inactive balances, credit availability or company cash; no financial formula was changed.

## Behavior preserved and files

Account creation, editing, deletion, permissions, source ownership, native row balances, routes,
and filter-memory keys are unchanged. No financial records or backend files were modified.
Existing unrelated working-tree changes were preserved.

- `PaymentAccountsSummary.tsx`: standard strip, status interaction, currency/error presentation.
- `hooks/usePaymentAccountsBalance.ts`: scoped owner query and request lifecycle.
- `PaymentAccounts.tsx`: loading/retry state and filter-driven pagination reset.
- `PaymentAccountsTable.tsx`: optional pagination reset signal, preserving restored page state.
- Shared `OperationalKpiArea.tsx`: retain the 8px minimum height of the status distribution in
  its mobile column layout; previously flex shrink could collapse the bar. Desktop stays 8px.
- Finance `types.ts`, `es-MX.ts`, `en-CA.ts`: localized KPI labels and context.
- `payment-accounts-kpi-regression.test.mjs`, existing frontend-standard test and package script.
- Frontend Operating System: approved Payment Accounts strip contract.

## Verification

- Expenses frontend regression: **36 passed**, including six new KPI/pagination regressions.
- KPI frontend standard regression: **4 passed**.
- TypeScript and frontend production build: passed. Existing large-chunk advisory remains.
- Browser fixture imports actual filters, header, summary, currency context, aggregate hook and
  API client. Responses use synthetic data and intercepted read requests; no real account mutation.
- Tested status toggling and sibling counts, search scope, explicit aggregate IDs, preferred
  currency, same-ID balance refresh, error/retry, partial FX, empty scope and account-load error.
- Reviewed desktop 1440×1050, mobile 390×844 and dark mode, with no page errors or document
  horizontal overflow in the completed run. The strip retains its shared mobile horizontal scroller.
- Mobile browser assertion verifies the colored status segment retains at least 8px height.
- Initial fixture failures came from an overly broad API interception matching a JS module and
  an incorrect search locator; corrected fixture runs passed.
- Temporary browser artifacts: `/tmp/indice-payment-kpi-qa/`. The connected browser was unavailable;
  isolated Chrome was used. Its fixture listener is stopped after QA.
- Existing local frontend on 5174 serves the revised component; backend on 8082 remains running.

## Limits

Real authenticated aggregate responses/database persistence were not exercised by the synthetic
browser fixture. The existing backend query and access contracts were inspected, not changed.
Backend tests, migrations and production deployment: N/A for this task.
