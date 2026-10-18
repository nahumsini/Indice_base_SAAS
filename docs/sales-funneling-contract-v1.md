# Sales Funneling planning workspace

Status: local implementation, 2026-10-17. Owner: Sales (`crm`).

## Purpose and boundary

`/sales/funneling` helps users outline campaign objectives, audiences, channels, ordered stages,
planned actions and success measures. It is a planning tool, independent of the operational
opportunity pipeline. Saving or defining a plan never creates contacts, leads, sales, tasks,
Mailing campaigns or email deliveries. No scheduler or execution port consumes these records.
Existing Sales, Mailing, Email and opportunity-flow behavior remains unchanged.

The user-authorized capability is available to authenticated company members explicitly granted
the native `crm.funneling` tab and CRM module. The tab permits reading and editing this planning
workspace; it grants no authority in other Sales tabs. There is no migration granting permissions
to existing customers. Public demo sessions are denied. Browser mutations require session CSRF.
The local synthetic review company may receive this one tab grant separately.

## Plan lifecycle and estimates

Plans contain a name, optional objective/audience/notes, a main channel and 2–12 ordered stages.
Each stage has a required name and optional action, measurement description and target people.
Targets refer to the same cohort: whole numbers from 0 to 10,000,000, non-increasing across known
stages. Missing targets mean unknown, never zero. There are no money calculations.

- `DRAFT`: ideas may remain incomplete.
- `PLANNED`: objective, audience and every stage's action, measurement and target are complete.
  The visible label is “Definido”; it does not imply launch, approval or actual results.
- `ARCHIVED`: retained and searchable; users can restore it by changing its status.

All states remain editable with optimistic version checks. Duplication opens an independent draft
with a new stable UUID and version zero; only Save creates it. It does not copy audit identity.
The backend derives estimated conversion as final target / entry target × 100, rounded half-up
to two decimals. Any unknown stage or zero entry target produces null. The editor's live estimate
uses the same formula for unsaved planning only. Every projection is labeled as estimated.

Saved plans also expose `stageEstimates`, aligned one-to-one with `stages`. Each item contains
`estimatedAdvance`: current target / immediately preceding target × 100, rounded half-up to
two decimals by the backend. The first stage, either missing adjacent target, or a zero preceding
target produces null. A current target of zero with a positive preceding target produces 0%.
Unknown stages are never bridged to calculate a transition. This is an additive read projection;
the saved stage/input shape and persistence remain unchanged.

## Persistence and API

Forward-only migration V319 introduces company-owned `sales_funnels` and append-only
`sales_funnel_audit`. Stage configuration is an ordered, validated JSON snapshot, bounded by
the DTO. Archived plans are retained; no delete endpoint exists. The audit stores actor, version,
status and timestamp without copying audience or note text.

Authenticated endpoints under `/api/v1/sales/funnels`:

- `GET /`: tenant-scoped list, search by name/objective, status, page/size, name/update sorting.
- `GET /{id}`: tenant-scoped plan and calculated estimate.
- `PUT /{id}`: atomic create/update using a stable UUID and expected `version`; version zero creates.

Lists are capped at 200 per page; stage counts, text and numeric bounds are validated server-side.
Sorting is allowlisted and search wildcards are escaped. Company and actor come from the current
session. Mutations lock the tenant and recheck module availability before writing the plan and
audit in one transaction. Lost-response retries and concurrent stale saves return 409 without
duplicating records or overwriting newer work. The editor retains input and directs users to
reopen the latest saved plan; it does not silently retry under a new identity.

## UI/UX

Use the canonical Sales coral shell, title/filter/table engine, resizable columns, pagination and
scoped workspace memory. The editor is an **Operational Workspace Modal**: ordered stage
configuration beside a live funnel preview. Small screens stack both panels with internal scroll;
the shared header/footer remain accessible. Stage movement has keyboard-accessible up/down
buttons. Removing a stage only changes the unsaved form. Closing a dirty editor replaces it with
the shared **Confirmation Modal**, with a return-to-edit action. Saving blocks repeated submits,
editing and dismissal. Light/dark and all eight supported locales follow the shared components.

The title bar offers **List / Funnel** through `IndiceWorkspaceNavigation` (`views`, coral).
Both views share the same tenant-scoped search, status filter, page and page size. The selected
view is normalized and remembered with the existing workspace hook, with explicit `?view=funnel`
taking precedence on navigation. Plan selection remains transient and is revalidated against the
current filtered page; it never stores fetched records or authority in navigation memory.

The Funnel view selects among plans on the current page and retains the shared pagination for
the full result. Clicking a plan name in the list opens that plan's diagram. Ordered, tapered
stage buttons display target people; connectors display the server's adjacent estimates. Widths
are deliberately schematic and explicitly labeled as not representing quantities. The header
shows entry/final targets and overall estimated conversion. Selecting a stage shows its action,
measurement, target and preceding-stage context, with access to the existing plan editor.
Stage selection resets when changing plans or loading a new saved version. Unknown values remain
visibly undefined; estimates are never presented as measured results. Native stage buttons and
the shared view selector support keyboard interaction. The diagram and detail stack on small
screens and use the existing light/dark and localization systems.

## Verification

`FunnelIntegrationTest` covers persistence, estimate rounding/unknowns, optimistic concurrency,
archive/restore, tenant isolation, validation, escaped filters, session/CSRF/tab/module gates and
absence of Mailing/opportunity side effects. Run only against `indice_test_db`.
`sales-funneling-flow.test.mjs` covers draft completeness, targets, conversion, stage reordering,
independent duplicates and navigation boundaries. Run with Node's `--experimental-strip-types`.
Also run migration uniqueness, frontend typecheck/build and the existing Sales UI/workflow suites.
Local browser acceptance covers create/save/reload/edit/duplicate, incomplete-plan validation,
stage ordering, dirty-close, archive/restore and responsive/dark display.

Production rollout, automatic campaign execution and measured campaign analytics: out of scope.

## Local acceptance evidence — 2026-10-17

- Backend: 10 Funnel integration cases, 11 route-classifier cases, 2 permission-catalog cases and
  2 migration uniqueness cases passed. Integration tests used only `indice_test_db`.
- Frontend: 7 Funneling flow cases, 34 Sales UI cases and 30 existing Sales workflow cases passed.
  TypeScript validation and the production build passed; the existing bundle-size warning is
  unrelated to this planning capability.
- Functional startup on backend 8083 applied V319 successfully, with no pending/failed migration.
  The local frontend remains at `http://127.0.0.1:5175/sales/funneling`.
- Browser: created a defined synthetic plan with targets 500 → 125 → 40 → 20 (4% estimated),
  duplicated it, archived/restored the copy and changed its final target to 25 (5%). The original
  retained its 4% estimate. Both records survived reload. Incomplete plans and increasing targets
  were rejected; add/remove/reorder, dirty-close/return-to-edit and empty-search states worked.
- Responsive acceptance: 391 CSS-pixel viewport, no document overflow; shared modal content,
  preview and footer remained accessible in dark mode. The viewport and light theme were restored.
  No console errors were present in the final review tab.
- Proof: `/tmp/indice-funneling-editor.png`, `/tmp/indice-funneling-list.png` and
  `/tmp/indice-funneling-mobile-dark.png` on this workstation.

Changed implementation areas: `react/src/app/BasicModules/Sales/Funneling/`, Sales navigation,
locale tab labels and native tab scope; `src/main/java/com/indice/erp/sales/funneling/`, permission
catalog/classifier and V319; focused tests and this domain contract. Existing Mailing/Email work
was preserved. Deployment/rollback action: N/A (local development only).

## Graphical view acceptance — 2026-10-17

- Delivered the title-bar List/Funnel selector, selection from the current page, tapered stage
  diagram, adjacent estimates, stage detail and access to the existing editor. View choice survives
  reload; the explicit URL is `http://127.0.0.1:5175/sales/funneling?view=funnel`.
- Changed files for this extension: `Funneling.tsx`, new `FunnelView.tsx`, `funnelModel.ts`,
  `funnelCopy.ts`, `FunnelContracts.java`, `FunnelService.java`, `FunnelRepository.java`, the two
  focused Funneling test files and this contract. All frontend files are under the existing
  `react/src/app/BasicModules/Sales/Funneling/` directory; backend files remain in
  `src/main/java/com/indice/erp/sales/funneling/`.
- Preserved routes, permissions, plan lifecycle, saved input shape, list sorting/pagination,
  optimistic concurrency and editor behavior. Email/Mailing implementation is unchanged by this
  extension. Schema changes and deployment: N/A.
- Validation passed: 12 backend integration tests against **only `indice_test_db`**, 10 Funneling
  frontend cases, 34 Sales UI cases, 30 Sales workflow cases, TypeScript and production build.
  The initial UI suite caught typography outside the module standard; the styles were corrected
  and the suite passed. The existing Vite chunk-size warning remains; no unresolved test failures.
- Browser acceptance: list-to-diagram navigation, plan/stage selection, keyboard navigation,
  filtered selection fallback, empty search, edit/save refresh and reload persistence. The defined
  demo displays 500 → 125 → 40 → 20, transitions 25% / 32% / 50%, and overall 4%. Temporarily
  changing the draft's second target to unknown and final target to zero correctly displayed
  unknown adjacent estimates and a valid final 0%; its original 125/25 targets were restored.
- Mobile review at 391 CSS pixels showed no horizontal document overflow, accessible stage
  controls and the editor opening from the stacked detail panel. Dark mode was verified; viewport
  and light theme were restored. The final review tab reported no console errors.
- Screenshot evidence on this workstation: `/tmp/indice-funnel-view-desktop.png` and
  `/tmp/indice-funnel-view-mobile-dark.png`.
- Limitations: widths are schematic and figures remain planning hypotheses. No campaign execution
  or measured analytics is introduced. The selector shows the current page; shared pagination
  reaches the remaining filtered plans.
