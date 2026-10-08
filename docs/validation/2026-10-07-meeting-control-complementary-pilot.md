# Control de juntas — complementary local pilot

Date: 2026-10-07. Scope: implement an independent ERP meeting-control module, inspired by
the Root development register. Local pilot only; not a commercial release or deployment approval.

## Behavior changed

- Activated the existing `control_minutas` complementary registry identity and `minutes-control`
  route, replacing its runtime mock entry without creating a competing module framework.
- Native corporate-blue 📝 identity, configurable workbar, localized title/filter bars, eight
  languages, calendar/table presentation, native table engine and single-frame modal workflows.
- Juntas: plan council, working or project meetings; select an active company owner and
  participants; retain agenda, location/link, UTC times and original IANA timezone. Record minutes
  and decisions, then start, conclude or cancel with retained evidence and audit history.
- Acuerdos: capture a meeting-linked agreement, active participant assignee and due date;
  complete with resolution or cancel with reason. Filters include period, responsible and status;
  backend pagination/sorting and scoped presentation memory are used, not local business mocks.
- Indicadores: eight backend-calculated counts with period filters, source/formula context and
  permission-aware drilldowns. Awaiting closure, missing minutes and overdue agreements link
  to their exact exception predicates rather than a broader approximation.
- Independent native module/tab permissions, authenticated-company and record ownership,
  CSRF mutations, transactional entitlement rechecks, create replay keys/payload fingerprints,
  optimistic versions and append-only history. Agreements-only access cannot read minutes.
- New forward-only V302 creates owned persistence and marks the existing module assignable
  as `pilot`. It grants no company entitlement, user assignment or billing price. The established
  synthetic local bootstrap alone enables it for Empresa Demo Spring.

## Behavior deliberately preserved

Root platform administration and its development register remain separate and unchanged by this
slice. No Root records were copied. Existing Scheduling, shared Sales client ownership, public
booking, authentication/authorization frameworks, configurable workbar and native routes retain
their contracts. The old mock files are dormant, not a second production implementation.

No business hard-delete endpoint, automatic email, public meeting page, recurrence, attachment,
calendar-provider sync or conversion to Processes tasks was introduced. Agreement reassignment
is not part of this pilot. Cancellation preserves records, minutes, agreements and audit.

Existing unrelated dirty work was retained. No branch manipulation, staging, commit, push,
APPTEST/production deployment, Stripe configuration or real-customer data mutation was performed.

## Files changed in this module slice

- `src/main/java/com/indice/erp/meetings/`: typed contracts, controller, access boundary,
  transactional service, tenant-scoped repository and safe exception mapping.
- `src/main/resources/db/migration/V302__meeting_control_complementary_pilot.sql`.
- `src/main/java/com/indice/erp/access/tab/TabPermissionRouteClassifier.java`,
  `billing/subscription/ModuleEntitlementInterceptor.java`,
  `configcenter/users/ConfigCenterTabPermissionCatalog.java`.
- `react/src/app/ComplementaryModules/MinutesControl/`: runtime entry, three operational tabs,
  editors/detail/guide/list primitives, typed API, translations and date-scope utilities.
- `react/src/app/App.tsx`, `config/moduleCatalog.ts`, `context/LanguageContext.tsx`,
  `access/tabScopeCatalog.ts`, `components/frontend-os/IndiceModuleShell.tsx`.
- `src/test/java/com/indice/erp/meetings/` and existing route-classifier/tab-catalog tests.
- `react/tests/meeting-control-regression.test.mjs`, `meeting-control-browser.mjs`,
  `browser/meeting-control.tsx`, `browser/meeting-control.html`; `react/package.json` test scripts.
- [Owner contract](../meeting-control-module-contract-v1.md), canonical frontend/backend documents,
  complementary access registry standard, local-development guide and this report.

Shared files also contain earlier work; this list identifies meeting extensions, not ownership
of every working-tree diff. Existing global-header and route changes were not rewritten.

## Verification

| Check | Result |
| --- | --- |
| Focused Java suite, compilation included | PASS: 37 tests, zero failures/errors/skips |
| Real MySQL meeting integration tests | PASS: 10 tests, isolated `indice_test_db` on loopback 13307 |
| Flyway fresh isolated startup through V302 and migration uniqueness | PASS |
| Selected frontend regressions | PASS: 98 tests, zero failures/skips |
| TypeScript `npm run typecheck --prefix react` | PASS |
| Production bundle `npm run build --prefix react` | PASS; existing large-chunk advisory |
| Synthetic isolated Chrome meeting flow | PASS |
| Real local ERP/API/browser smoke | PASS; no meeting business mutations |
| Native local backend startup/Flyway | PASS: V302 applied, zero pending/failed migrations |
| `git diff --check` | PASS |
| Full repository test suite | N/A; focused and adjacent suites were run |
| Release security gate, deployment and release rollback | N/A; local pilot only |

Java selection: `MeetingAccessServiceTest`, `MeetingIntegrationTest`,
`TabPermissionRouteClassifierTest`, `ConfigCenterTabPermissionCatalogTest`,
`MigrationVersionUniquenessTest`, `ModuleAccessServiceTest`, `SchedulingAccessServiceTest`.
Database JUnit tests used only the disposable isolated test database, never the functional local.
Coverage includes authentication/entitlement/CSRF denial, tenant and object isolation, independent
tab revocation, active-member/assignee rules, lifecycle/evidence guards, stale versions, concurrent
idempotent retries, metric/list agreement, timezone, filters, pagination and allowlisted sorting.

Selected frontend command:

```sh
cd react
node --test tests/meeting-control-regression.test.mjs \
  tests/scheduling-module-regression.test.mjs \
  tests/platform-admin-flow-regression.test.mjs \
  tests/users-access-regression.test.mjs \
  tests/workbar-layout-preference-regression.test.mjs
```

`npm run test:meeting-control-browser --prefix react` used isolated Chrome and synthetic API
fixtures to exercise actual components/router: create retry reuses request key and CSRF,
calendar/table/filter/sort, minutes/lifecycle, agreements/resolution, exact KPI drilldown, discard
confirmation without nested dialogs, eight locales, independent tabs, top/left workbar, dark mode
and 320/390/768/1280px layouts. No Root API call or browser exception occurred.

The separate native smoke used the real ERP on `127.0.0.1:5175`, backend 8083, its Vite proxy,
synthetic local login, actual sessions and seven meeting read endpoints. The complementary module
was unlocked; calendar, create form/cancel, Acuerdos and all eight indicators loaded. Desktop and
mobile screenshots were inspected. No meeting API failures or JavaScript errors occurred, and
no meeting/agreement was created in the functional database.

## Failures encountered and resolved

Incremental compile checks caught a malformed JSX delimiter, generic table inference, an
unsupported disclosure prop and Java compound `var`; each was corrected before final validation.
Early browser assertions used an outdated column locator and the label “Juntas planeadas” instead
of the actual localized “Juntas programadas”; corrected selectors passed without changing product
behavior. An initial direct catalog smoke omitted its existing required CSRF header and correctly
received 403; using the rotated session token succeeded. The unexposed `/actuator/health` returned
404; actual auth/API readiness and successful startup were verified instead. No unresolved test
failure remains in the selected checks. Existing bundle/deprecation advisories are not addressed
by this feature.

## Local handoff and remaining risks

- Open `http://127.0.0.1:5175/minutes-control/meetings`, or Dashboard → complementary modules →
  Control de juntas. Use the documented synthetic Empresa Demo Spring login if prompted.
- Frontend 5175 and restarted backend 8083 remain available. Persistent functional database:
  `indice_modules_local`, container `indice-mysql-modules-local`, volume
  `indice-modules-local-data`. The original 5174/8082/database stack was left intact.
- The new functional workspace has no seeded meetings or agreements; empty states and zero
  indicators are expected. Browser fixture records are not real local business records.
- Other environments and companies still require explicit entitlements, assignments and release
  gates. Public release, commercial pricing, integrations and production scale/load were not tested.
- Calendar/member/choice/history bounds are intentional and surfaced; this is not an unbounded
  export. No tenant data is persisted in browser form drafts or copied from Root.
- Local stop/restart instructions: [parallel ERP](../local-development.md#erp-paralelo-con-historial-limpio).
  Schema is forward-only; do not edit V302 or repair applied history. No rollback or business-data
  deletion was performed. The disposable test container may be stopped independently of the
  persistent functional stack.
