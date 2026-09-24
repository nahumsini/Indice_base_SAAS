# Expenses: filters, rendering and repeated-use validation

## Reproduction and correction

The reported route fails with React error 185. A deterministic regression reproduces an
unbounded update cycle when selecting Paid and Last month with a saved table sort while
internal-fund monetary aggregates are pending.

`useExpenseFundTotals` returned a new empty object on every render until the request completed.
That invalidated `ExpenseTable` sorting. With an active sort, sorting produced a new row array,
which rebuilt the print snapshot and updated the parent `Expenses` state. The parent rendered
the table again, repeating the cycle while the network request remained pending.

The hook now returns one frozen empty map during loading. Rows and print snapshots remain
stable until actual inputs or aggregate results change. The pending state still hides obsolete
totals, failed requests still expose retry, and successful totals still update monetary sorting.

The repeated-use review also reproduced two additional defects:

- An asynchronously restored page outside the filtered result (for example page 999 with
  one available page) remained invalid when the total page count had not changed. The existing
  clamping effect now also observes the current page, preserving valid restored pages.
- Obsolete fund/KPI requests were ignored on completion but continued over the network.
  The monetary API helpers now accept an optional abort signal, and their existing hooks and
  the fund-total hook pass it to the HTTP client and cancel on replacement or unmount.
  Cancelled annual fund queries stop before requesting subsequent 100-query batches.
  Cancellation prevents obsolete client work; it does not guarantee cancellation of computation
  already accepted by the backend.

## Files, responsibilities and architecture

- Modified `react/src/app/BasicModules/Expenses/hooks/useExpenseFundTotals.ts`: stable loading
  data and cancellation for the existing fund-aggregate hook; ownership remains intact.
- Modified `react/src/app/BasicModules/Expenses/Expenses/components/ExpenseTable.tsx`: clamp
  asynchronously restored out-of-range pages.
- Modified `react/src/app/BasicModules/shared/kpiMonetaryApi.ts`: propagate optional abort
  signals without changing endpoint paths, JSON payloads or existing callers.
- Added `react/tests/expenses-filter-render-regression.test.mjs`: exercises the real filters,
  table, grouping, sorting, selection hook and fund-total hook with deferred API responses and
  a parent print-snapshot state. Uses the repository's deterministic hook lifecycle helper;
  external I/O, workspace restoration and unrelated visual components are stubbed.
- Added `react/tests/kpi-monetary-request-lifecycle.test.mjs`: single/batch cancellation,
  equivalent queries, late responses, failed requests, retry and unmount.
- Modified `react/tests/expenses-fund-grouping-regression.test.mjs`: aborted annual batching.
- Added `react/tests/browser/expenses-soak.html` and `expenses-soak.tsx`: isolated browser
  entry mounting the real Expenses page, providers, router and React StrictMode with 1,200
  synthetic expenses. These fixtures are not imported by production entry points.
- Added `react/tests/expenses-filter-browser.mjs`: Chrome regression with intercepted APIs,
  latency, transient failure, repeated filters/sorts, selection, restoration and idle checks.
- Modified `react/package.json`: includes lifecycle regressions in `test:expenses` and adds
  `test:expenses-browser`.
- Added this validation record under `docs/validation`.

The active frontend folder structure is unchanged; `tests/browser` is test-only. There is no
new state system, component extraction or export boundary. Expenses continues to consume its
existing monetary owner, whose optional signal is backwards-compatible for other consumers.

## Behavior preserved

Period/status/unit filtering, saved sorting and valid pagination, native currencies, authoritative
server totals, payment history, API shapes, permissions, translations and persistence semantics
are unchanged. No backend or database files were changed; migrations/database tests are N/A.

## Verification

The three new regression tests failed on the original implementation because commits continued
while the monetary request was pending. All three passed after the correction:

1. Select Paid and Last month with a saved total sort; remain stable during loading, then
   update print order using the returned fund total.
2. Restore a paid historical view with date sorting; handle request failure and retry.
3. Change periods during loading; ignore the obsolete response and preserve current rows.

The extended deterministic suite also covers 100 repeated filter/sort/selection/pagination
cycles over 1,200 expenses with 200-row pages, empty results, clearing filters, asynchronous
page restoration and aborted fund requests. The invalid-page and missing-abort regressions
were observed failing before their respective fixes.

- `node --test tests/expenses-filter-render-regression.test.mjs` (from `react`): passed.
- `npm run test:expenses` (from `react`): passed.
- `npm run test:expenses-ui` (from `react`): passed (47 tests).
- `npm run test:finance-bulk` (from `react`): passed (17 tests).
- `npm run build` (from `react`): passed; Vite reports a bundle-size warning above 600 kB.
- `npm run typecheck` (from `react`): passed.
- `git diff --check`: passed.
- Broader affected-consumer regression run: **274 tests passed**, covering Expenses, payables,
  Budgets, Finance workspace memory/bulk actions, Petty Cash, Receivables, Sales KPIs, HR KPIs,
  payment-account KPIs and monetary request lifecycle:

  ```sh
  node --experimental-strip-types --test tests/expense*.test.mjs \
    tests/payable-capture-regression.test.mjs tests/budget*.test.mjs \
    tests/finance*.test.mjs tests/petty-cash*.test.mjs tests/receivable*.test.mjs \
    tests/sales-kpi-workspace.test.mjs tests/hr-kpi*.test.mjs \
    tests/payment-accounts-kpi-regression.test.mjs tests/kpi-monetary-request-lifecycle.test.mjs
  ```

- Full-page Chrome validation: **100 cycles passed**, covering all six period values and seven
  status values with repeated sorting, searches, data refreshes and unmount/remount. Also passed
  200-row selection, a simulated failed fund query with retry, URL/local-memory restoration on
  reload, and no additional requests or React commits once idle. Zero React/page errors.
- Extended Chrome validation: **20 further cycles passed**, adding unit/business/provider
  combinations, a simulated September-to-October rollover while the view remains mounted
  (focus refresh), and filter use at a 390-pixel mobile width. Zero React/page errors.
- The Chrome runs observed 628 and 169 aborted obsolete monetary requests respectively,
  confirming that cancellation reaches the browser's network layer. All API traffic used the
  local fixture; there were no unexpected API requests or real business mutations.

Browser runner prerequisites: an available Playwright toolchain and Chromium/Chrome. Run
`npm run test:expenses-browser` from `react`. An external installation can be supplied through
`INDICE_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs`; an existing Chrome binary
through `INDICE_CHROME_PATH`. `INDICE_SOAK_ITERATIONS` defaults to 100. The fixture server listens
only on `127.0.0.1:5189`, intercepts every API request and rejects external network requests.

## Limits and release status

Validation uses local synthetic expenses and controlled API responses, including the browser
run. The production session shown in the screenshot was not accessed. Repeated interactions
provide regression evidence, not a guarantee for every dataset or an hours-long memory-leak
profile. No deployment was performed; the live application requires a release containing
these corrections. The build retains Vite's bundle-size warning above 600 kB.
