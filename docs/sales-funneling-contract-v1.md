# Sales Funneling planning workspace

Status: local implementation, updated 2026-10-18. Owner: Sales (`crm`).

## Purpose and boundary

`/sales/funneling` helps beginners save campaign ideas and optionally outline objectives,
audiences, channels, ordered stages, planned actions and success measures. It is a planning tool, independent of the operational
opportunity pipeline. Saving or defining a plan never creates contacts, leads, sales, tasks,
Mailing campaigns or email deliveries. No scheduler or execution port consumes these records.
Existing Sales, Mailing, Email and opportunity-flow behavior remains unchanged.

The user-authorized capability is available to authenticated company members explicitly granted
the native `crm.funneling` tab and CRM module. The tab permits reading and editing this planning
workspace; it grants no authority in other Sales tabs. There is no migration granting permissions
to existing customers. Public demo sessions are denied. Browser mutations require session CSRF.
The local synthetic review company may receive this one tab grant separately.

## Plan lifecycle and estimates

Legacy plans contain a name, optional objective/audience/notes, a main channel and 2–12 ordered stages.
Each stage has a required name and optional action, content to prepare (up to 1,000 characters), measurement description and target people.
Targets refer to the same cohort: whole numbers from 0 to 10,000,000, non-increasing across known
stages. Missing targets mean unknown, never zero. There are no money calculations.

- `DRAFT`: ideas may remain incomplete.
- `PLANNED` for legacy plans: objective, audience and every stage's action and measurement are complete.
  Numeric targets are optional for both legacy and workshop plans.
  The visible label is “Definido”; it does not imply launch, approval or actual results.
- `ARCHIVED`: retained and searchable; users can restore it by changing its status.

All states remain editable with optimistic version checks. Duplication opens an independent draft
with a new stable UUID and version zero; only Save creates it. It does not copy audit identity.
The backend derives estimated conversion as final target / entry target × 100, rounded half-up
to two decimals. Any unknown stage or zero entry target produces null. The local preview helper uses the same formula for unsaved planning only; saved figures come from the backend. Every projection is labeled as estimated.

Saved plans also expose `stageEstimates`, aligned one-to-one with `stages`. Each item contains
`estimatedAdvance`: current target / immediately preceding target × 100, rounded half-up to
two decimals by the backend. The first stage, either missing adjacent target, or a zero preceding
target produces null. A current target of zero with a positive preceding target produces 0%.
Unknown stages are never bridged to calculate a transition. This is an additive read projection;
it does not change targets or stage order.

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

The title bar offers **My ideas / List / Funnel** through `IndiceWorkspaceNavigation` (`views`,
coral). Views share the same tenant-scoped search, status filter, page and page size. View memory
uses the existing workspace hook, with explicit `?view=funnel` taking precedence. Plan selection
is transient and revalidated against the current filtered page; no fetched records or authority
are persisted in navigation memory. Clicking an idea or list name selects its diagram. Shared
pagination reaches the full result set.

The shared tapered diagram is schematic and labeled accordingly. Known targets and saved adjacent
estimates are shown without substituting missing values with zero. Clicking a stage opens the same
workspace at that stage. Its action, preparation content and success measure appear together.
Stage selection resets when changing records or saved versions. Buttons and selectors are keyboard
accessible; the diagram/editor stack on small screens.

## Campaign workshop — 2026-10-18

The single primary entry is **Create campaign**. A title and plain-language idea suffice to save
a `DRAFT`; **Configure campaign** expands to the unified workspace without saving or losing input.
Existing records open directly there. Stage, campaign and prompt panels share one draft while the
visual journey stays beside them on desktop. Initial capture remains a Standard Form Modal; the
editor is an Operational Workspace, not a gated wizard or separate advanced tool.

Goal, channels, destination, audience type, stage action and preparation content use selectors;
custom choices preserve free text. Stage names, measures, optional numeric targets and add/remove/
reorder controls live in an expandable section. Untouched ideas retain zero saved stages: the
diagram clearly identifies its suggestion. Editing a suggested stage or choosing **Use this
journey** adopts the complete 2–12-stage journey. One stage remains invalid. Legacy plans use the
same stage editor and prompt while retaining their main channel, custom objective/audience and
numbers; opening them does not manufacture or convert a campaign brief.

The additive nullable `workshop` DTO stores the idea, offer, location, goal, selected channels,
materials, destination and detail, timing, budget note, pasted AI response and deferred suggestion
IDs. All strings and enum collections have server-side bounds; repeated enum values are rejected.
Channels are `ORGANIC`, `META_ADS`, `GOOGLE_SEARCH`; goals distinguish awareness, inquiries,
appointments, purchases, quotation requests and renewals; the undecided choice is explicit. The budget is a planning note,
not a monetary total, bid or spending instruction. No credentials or ad-account authority is stored.

For workshop plans, `PLANNED` means the idea, offer, objective, audience, goal, at least one channel
and destination type are defined. It neither requires numerical guesses nor means ready to publish.
Missing supporting details still generate suggestions. All other lifecycle, optimistic version,
target-order and authorization rules above remain in effect. A legacy client omitting `workshop`
preserves an existing brief and is validated against it; omission cannot erase it or bypass readiness.

V324 adds company-owned `sales_funnel_briefs`, keyed by company and funnel with a composite foreign
key. Stable fields have explicit columns; bounded enum collections use JSON. The existing plan,
optional brief and audit write share one transaction. Reads join using both company and funnel ID.
Search also matches idea text. Existing routes, legacy records and numeric projections are preserved. Rollback uses the previous application artifact and retains this additive table;
do not reverse or edit the migration. The old application does not consume the new brief.

### Recommendations and output

Recommendations are deterministic rules, not generated AI advice. Missing context, materials,
timing and budget notes generate up to three contextual suggestions with defer/restore controls.
The proposed journey depends on the selected goal (awareness, inquiries, appointments, purchases,
quotation requests or renewals), channel, destination and available video. All suggested numeric
targets remain null. A Search landing-page reminder and WhatsApp response-owner reminder appear
in relevant stages.

Changing goal, channels or destination on a configured journey preserves existing stages and
opens a comparison of current/proposed stages, content and targets. **Keep my stages** dismisses
it; **Apply proposed journey** explicitly replaces the unsaved stages and targets. Nothing
persisted changes until Save. Proposals never silently overwrite historical/custom stages.

**Prepare for AI** builds a localized prompt from the current shared draft, including stage content.
It explicitly asks the model to use the configured journey and list suggested adjustments separately. Copy, UTF-8 text download and
print/save-PDF use the same text through the shared standard-document engine. Instructions reflect
only selected channels: organic content, Facebook/Instagram ad planning, and Google Search ad
planning. They request a content plan, message/creative ideas, next action, measurements and
explicit open questions, without inventing prices, testimonials or performance figures. Context
is clearly separated from instructions. The saved AI response is not fed back as instructions.
No model is invoked and no prompt is transmitted automatically. Users may paste an external
model's answer as editable plain text (20,000 characters) and save it with the plan.

### Workshop interaction contract

- **My ideas / List / Funnel** reuse shared workspace memory, filters and pagination. Existing
  saved preferences remain valid; new sessions default to My ideas.
- **Create campaign** is the only entry for new work. Capture expands into the shared Operational
  Workspace. There is no separate advanced-funnel creation or nested prompt modal.
- Stage, campaign and AI prompt panels edit/export one draft. Copy/download/print share exactly
  the same text; pasted AI responses remain plain text and are excluded from exported instructions.
- Dirty-close and stage removal replace the workspace with the existing Confirmation Modal;
  cancellation returns to the unchanged draft. Reorder carries the complete stage including content.
- Busy saves block edits, repeated submission and dismissal. Errors preserve input; 409 requires
  reopening the latest version. Access-context changes clear open workspaces.

### Unified journey persistence — 2026-10-18

V325 expands the campaign-goal check to `QUOTES` and `RENEWALS`. Applied V324 is unchanged.
Stage `content` is an optional, bounded field in the existing ordered JSON; old JSON remains readable.
The new editor normalizes missing content to an explicit empty string. If saved stages already
contain content, a stale client omitting any content field receives 409 instead of dropping it.
Explicit empty strings can clear content. Content validation and version failures are atomic.

The backend retains tenant scope, CSRF, tab/module gates, route shapes and transactional writes.
Legacy `PLANNED` targets become optional; required objective, audience, action and measure stay.
Known target ordering, range checks and server estimates are unchanged. No CRM, Mailing, Email,
financial or ad-provider execution is introduced.

Rollback retains the additive schema. Preserve the immutable previous application artifact.
Do not use an older application to edit newly enriched journeys during rollback: older servers
cannot enforce the new content compatibility guard.

### Unified workspace acceptance — 2026-10-18

- 21 `FunnelIntegrationTest` cases and 2 migration uniqueness cases passed in an isolated build
  against **only `indice_test_db`**. This includes stage content, QUOTES/RENEWALS, null targets,
  old JSON preservation, stale-client rejection, content length, atomic clearing, tenant isolation,
  CSRF, optimistic versions and absence of cross-module effects.
- 91 frontend cases passed across campaign workshop, Funneling flow, Sales UI/workflow/navigation
  and shared document regressions. TypeScript and the production build passed. Existing Vite
  large-chunk warnings remain. An initial shared-output compilation failed in unrelated Messaging
  classes; a clean isolated build compiled successfully without modifying that work.
- Synthetic browser fixture: new idea, selectors, live suggestions, stage customization, decline/
  apply replacement, defined save without numeric targets, save failure/retry, reopen with saved
  AI response, legacy editing with 1,000→200→100 targets, and copy/download from the same draft.
  The final 4,145-character download exactly matched the copied prompt. No functional business
  records were used for these UI tests.
- Dark/mobile review at 390 CSS pixels: document width 390, modal about 374, no horizontal
  overflow and accessible footer controls. Viewport and theme restored. PDF visual pagination
  remains unverified; shared document/export-content regressions passed (prior print-window
  inspection was blocked by browser blob-URL policy).
- Functional backend 8083 applied V325 and reported zero pending/failed migrations. Its new
  immutable artifact overlays only the tested Funneling package and V325 onto the previous
  runtime; unrelated local modules retain their existing runtime versions. Previous artifact
  preserved for rollback. Authenticated functional-browser acceptance still needs local sign-in.
- Changed areas: native Funneling workspace/model/prompt/locales; FunnelContracts and FunnelService;
  V325; focused tests and synthetic fixture; this contract and canonical frontend adoption.
  Other local work preserved. Commit/push and production deployment: N/A.
- Evidence: `/tmp/indice-unified-campaign-workspace.png` and
  `/tmp/indice-unified-campaign-mobile-dark.png` on this workstation.

### Workshop acceptance evidence — 2026-10-18

- Backend: 17 `FunnelIntegrationTest` cases and 2 migration uniqueness cases passed. Flyway
  startup, brief persistence/search, incomplete/defined plans, legacy-client preservation,
  tenant isolation, optimistic versions, DTO limits, CSRF and absence of cross-module side
  effects were checked against **only `indice_test_db`**.
- Frontend: 83 cases passed across `campaign-workshop`, `sales-funneling-flow`,
  `sales-frontend-standard-regression`, `sales-workflow-regression`, `sales-navigation-flow`
  and `document-print-standard-regression`. TypeScript and production build passed. The existing
  bundle-size warning remains; no unresolved test failures.
- Browser testing used the isolated in-memory fixture, not functional business mutations:
  minimal idea capture, five-question navigation, three selected channels, applying a journey,
  editing notes, saving a pasted response and a defined plan, and generating/copying/downloading
  the resulting prompt. The downloaded UTF-8 text contained the same 3,932-character prompt.
- The print action opened the standard document window. Browser security prevented inspecting
  its blob URL; visual PDF pagination remains unverified. The shared document regression and
  equality of prompt/export content passed. No alternate browser access was attempted.
- Mobile at 390 CSS pixels had document width 390 and modal width 374, with no horizontal
  overflow. Dark/light presentation and accessible footer actions were reviewed; the temporary
  viewport and fixture theme were restored. Final fixture console had no warnings/errors.
- Local backend 8083 successfully applied V324 and started from an immutable compiled artifact;
  the previous artifact was retained for rollback. Restart expired the browser session, so
  authenticated functional UI acceptance requires signing in again. No production rollout.
- Screenshots on this workstation: `/tmp/indice-campaign-workshop.png` and
  `/tmp/indice-campaign-mobile-dark.png` (synthetic fixture).

Changed areas: native `Sales/Funneling` components/model/prompt/locales, the three backend
Funneling contract/repository/service files, V324, focused integration/frontend tests and fixture,
this owner contract and its canonical frontend adoption paragraph. Existing local Postventa and
other unrelated work was preserved. No commit or push was performed for this extension.

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
