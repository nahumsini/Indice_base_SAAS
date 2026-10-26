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

The title bar offers **My ideas / List / Funnel / Content generation** through `IndiceWorkspaceNavigation` (`views`,
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

- **My ideas / List / Funnel / Content generation** reuse shared workspace memory, filters and pagination. Existing
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


### External AI content guide — 2026-10-19

**Prepare for AI** includes **Content guide for your AI** in the existing shared campaign
workspace. Users choose a content type, format, purpose of the piece and an opening hook.
Each choice can remain `AUTO`, explicitly delegated to the user's external AI. The catalog has
15 content types, 9 formats, 15 purposes and 12 starter hook templates, plus a custom hook.
Short video groups Reels/TikTok/Shorts as formats without manufacturing a platform/channel.
A topic is optional. The piece purpose must support the campaign goal; it does not replace it.

The optional root `contentGuide` has an explicit bounded DTO: `contentType`, `format`,
`pieceGoal`, `hook`, `customHook` (1,000 characters), `topic` (500), `variation` and
`variationCount` (2–5). `NONE` exports one proposal per piece regardless of the stored count;
`HOOKS` requests different openings, `FORMATS` adapts the same idea including its base format,
and `COMBINATIONS` varies type/format/hook while retaining the piece purpose. Variants do not
multiply calendar frequency or alter audience, offer, campaign goal, journey stages or targets.
The external model must identify channel/format mismatches and suggest compatible adaptations
separately. Empty custom hooks delegate to the AI; inactive custom text is excluded from export.

V332 adds nullable `sales_funnels.content_guide_json`. Existing campaigns need no backfill.
Omitting/nulling the guide preserves a saved guide for older clients; an explicit full AUTO object
resets the choices. Campaign, guide and audit use the same transaction, tenant scope, tab/module
permissions, CSRF and optimistic version. The audit retains metadata only. Duplication copies
the guide independently; reopens restore it. No new routes or AI-provider connections are added.
Copy, UTF-8 download and standard print/PDF receive the same prompt from the current draft.
The saved AI response remains excluded, and prompts request factual hooks without invented
results/testimonials. New labels, templates and instructions cover all eight supported locales.

The existing coral modal and sliders are preserved. In this workspace only, compact viewports
scroll the body while keeping shared header/footer actions visible, including landscape above
767px wide. Light/dark text and phone control sizes follow the existing components.

Acceptance: 27 FunnelIntegrationTest cases plus 2 migration uniqueness cases passed in a fresh,
dedicated `indice_test_db` container, removed after testing. The functional database was not used
for integration tests. 97 frontend regressions passed; TypeScript and production build passed
(existing large-chunk warning retained). The browser fixture checked manual choices, live prompt,
clipboard/download equality, save/reopen, retained custom text, dark mode and footer visibility at
390×844, 320×568, 844×390 and 390×400. `react/tests/campaign-content-guide-browser.mjs` is the
repeatable synthetic browser check. Physical iOS/Android keyboard behavior and visual print/PDF
pagination remain unverified; print-content equality is covered by regression tests.

Local API 8083 reports V332 SUCCESS, pending=0, failed=0. Authenticated read-only Funneling
acceptance returned 200 with the additive guide projection. No existing campaigns were changed.
Only the tested Funneling contract/repository/service classes and V332 were overlaid onto the
previous immutable runtime; all other active module classes/configuration were retained.
Rollback retains the additive column and restores the previous application artifact. Older
servers cannot be used to edit enriched guides during rollback. Commit/push/production: N/A.


### Complete campaign flow verification — 2026-10-19

Initial capture now requires a nonblank title and idea before entering **Configure campaign**;
this does not save or manufacture stages. In the shared editor, validation errors are shown and
focused inside the active panel. Invalid stage names/actions/measures and inconsistent targets
open their actual stage, with advanced fields revealed when needed. The same target validator
locates the problem and protects saving; limits, nullable targets and cohort ordering are unchanged.
Network failures retain the complete campaign/guide draft and support retry; stale versions keep
the existing reload requirement. Busy saves continue to prevent repeat submission, editing and exit.

On stacked/mobile layouts, panel selection, stage selection and workspace reopening bring the
requested editor into view after the portal mounts. A non-input container receives focus, keeping
the phone keyboard closed until the user chooses an input. The schematic funnel, existing tab
navigation, coral theme and shared footer remain in place. Form text uses explicit light/dark
foregrounds. The prompt preview scrolls internally and stays at most 20rem high rather than growing
thousands of pixels; export actions wrap within narrow panels.

A copy result belongs to its exact prompt. Editing that prompt hides the previous copied notice;
out-of-order clipboard promises cannot replace the latest result or move focus to a newer draft.
When the Clipboard API is absent or denied, the current read-only prompt is focused and fully
selected for manual copy, with the existing localized explanation. Copy, download and print still
consume the same builder; no AI calls or publishing are introduced.

Acceptance: 104 frontend cases passed across campaign workshop, Funneling flow, Sales UI/workflow/
navigation and document export. TypeScript and production build passed (existing chunk-size
warning retained). `react/tests/campaign-funneling-journey-browser.mjs` exercises a new campaign
at 1440×1000, 390×844 (dark), 320×568 and 844×390: empty capture validation, campaign selectors,
stage targets, preset/custom hooks, hidden invalid-target recovery, clipboard success/failure,
UTF-8 export equality, network-save retry, duplicate-submit blocking, saved reopen, reload and
independent duplication. Reload uses session-scoped synthetic fixture records, never functional
business records. The prior content-guide browser regression also passed at four phone sizes.

Authenticated functional UI acceptance at 390×844 opened a new unsaved campaign, selected a hook,
copied the exact prompt and discarded the draft. Business requests were blocked; workspace-memory
and analytics writes were simulated only in that test browser. Existing campaigns were untouched.
The functional frontend on port 5175 serves these changes; API/schema are unchanged (the previously
validated V332 contract remains active). No backend restart, production deployment, commit or push.
Physical iOS/Android keyboard and PDF visual pagination remain unverified. Browser screenshots and
an end-user validation report are saved in this task's outputs; build/test logs stay in task work.


### Clear campaign prompt deliverables — 2026-10-19

The external-AI prompt now requests five beginner-friendly sections: campaign summary, a short
calendar, complete content pieces, simple measures and a pre-launch checklist. Calendar rows use
piece IDs (P1/P2) to connect dates, channel/format, stage, topic and next action with developed hooks,
copy/scripts and preparation materials. Reviews and adaptations reuse their piece ID without
multiplying base-piece workload. Existing journey names, actions, content, targets, channels and
manual guide choices remain authoritative context; suggested changes are listed separately.

Only missing essential offer/audience/action/channel/next-step facts trigger up to five questions
and a wait for answers. Confirmed facts and delegated AUTO choices are not asked again. Optional
missing details do not block a draft: no dates means relative days; no period means a proposed
7-day pilot respecting known capacity, or up to 3 base pieces when capacity is also unknown.
Unknown capacity within a known period suggests up to 3 pieces suited to resources. All such
assumptions are proposals to confirm, not facts or scheduling authority. Paid-channel calendars
cover preparation, proposed launch and review rather than inventing daily posts.

Pieces include finished opening hooks, usable copy/scripts, next-step invitations and available
materials. Short-video cards ask for simple scenes; carousels get slide ideas and accompanying
copy; Search gets native ad copy rather than unrelated video/social content. Unconfirmed facts,
contacts, evidence or promises are flagged or left as placeholders. Meta no longer forces two
variants: kind and number come exclusively from the guide, including NONE. Legacy SOCIAL plans
receive organic-copy guidance without manufacturing workshop data or adding paid channels.

The prompt prioritizes 2–3 useful measures, each with counting method, manual/tool source, review
time and a practical decision. Configured stage measures/targets remain separate from actual
results, which stay pending when absent. Percentages use comparable real cohorts and periods;
a zero/unknown denominator is unavailable, never zero percent or a fabricated result. The final
checklist covers materials, confirmed copy/facts, contact link, response owner and first review,
with one step possible today. Budget notes stay planning context; provider policies/specifications
must still be verified before publication. Nothing is sent to an AI or published automatically.

Changed production code is confined to `campaignPrompt.ts`; stable instruction keys and all eight
locale variants are maintained. UI, sliders, save contracts, permissions, schema and API are
unchanged. Copy/download/print continue to consume exactly the same generated prompt, exclude
pasted AI responses and private plan identity, and keep reference data separated from instructions.

Acceptance: 113 frontend cases passed, including five-section structure, minimal/incomplete ideas,
period/capacity combinations, resource/budget preservation, simple metrics and unknown results,
variant counts, selected-only channels, legacy SOCIAL, all eight locales and safe context/export.
TypeScript and production build passed (existing large-chunk warning retained). The full synthetic
browser journey passed desktop 1440×1000, dark 390×844, 320×568 and landscape 844×390 with the
new output; the final copy/download/reopen and four-mobile-size guide regression also passed.
The functional frontend on 5175 serves the updated instructions. No business records were changed.
These checks validate prompt construction and export, not the quality/compliance of responses from
every external AI model; no external model was invoked. Physical-phone/PDF-pagination limits of
the previous acceptance remain. Backend/database checks, restart and production deployment: N/A.


### Private creative ideas board — 2026-10-19

The user-authorized **My ideas** view now starts with a large freeform idea board. It is a
Sales-owned creative canvas, not a second operational table or global navigation/modal framework.
The native title, view pills, existing campaign cards, filters, pagination, campaign workspace and
AI prompt remain available; saved campaigns sit below the board. This board does not automatically
create a campaign, alter stages or invoke an AI.

One private board belongs to the authenticated **user and company**. Native `crm` module and
`crm.funneling` tab checks apply to every read, photo and mutation; public demo is denied.
Mutation requests require session CSRF and an expected actor header. The latter only detects stale
UI context; it never grants authority or selects an owner. Tenant/user IDs come from the session.
Changing authorization context remounts the board; queued old-context changes cannot write into the
new company. There is no sharing or collaborative editing grant in this version.

Typed endpoints at `/api/v1/sales/funnels/ideas-board`:

- GET returns the caller's content/version/actor key, or an empty version-zero document without
  creating a database row.
- PUT accepts a bounded document, expected version and stable mutation UUID. Owner membership is
  locked, company mutation availability rechecked, and content plus metadata-only audit saved in
  one transaction. The last identical mutation can be retried after a lost response; stale or
  incompatible retries return 409 without overwriting newer content.
- POST `/assets/{uuid}` accepts bounded raw PNG/JPEG/WebP bytes, an encoded filename and actor
  header. It checks type, image headers/dimensions, owner, size and quota before registration.
  Object storage uses the private Sales documents bucket and immutable company/user paths. The
  existing `CompanyStorageMeter` reserves/commits capacity; failed transactions attempt private
  object cleanup. Same UUID/content/name/type retries reuse the existing registered asset.
- GET `/assets/{uuid}` serves only that user's current-company asset, with no-store, nosniff and a
  validated image MIME. No remote URL import, public URL persistence or SVG upload is supported.

V333 adds owner-keyed board, photo metadata and metadata-only revision audit tables. No grants,
existing campaign changes or initial board rows are introduced. Limits: 100 nodes, 200 directional
connections, 4,000 characters per node, 160 per arrow label, 512 KiB document JSON; 50 retained
photo assets, 5 MiB each, at most 8,192 pixels per side and 24 megapixels. Removing a node removes
its incident arrows from the current document; assets and revision metadata are retained for undo
and existing retention rules. No hard-delete endpoint exists.

Notes, plain text, rectangles/circles, color, captions, photos, resizing and directional arrows
are editable. Click/tap empty space opens the shared Standard Form Modal; node double-click or
Edit reopens it. Mobile and compact landscape editors keep header/footer actions visible and
scroll the body. Scoped pointer gestures implement node dragging, panning and two-finger zoom;
wheel controls affect only the board. Fit, zoom and expanded workspace controls remain available.
Native DOM/SVG keeps the feature inside React without a graph/state/modal dependency. Keyboard
Enter/edit, arrows/move, scoped undo/redo and Delete/remove do not intercept text entry.

Completed edits use a serialized autosave queue with latest-change coalescing, stable retry identity
and a visible saved/saving/error state. Local history retains 50 steps. A content conflict keeps this
window's draft and requires explicit confirmation before opening the saved version. Unload warns
about unsaved/failed work; browser memory is not an offline durable store. Switching views keeps
the board mounted. Text is rendered as text, never HTML. All eight supported locales are covered.

Acceptance: 121 frontend regressions and TypeScript/build passed, including 8 new model/queue
cases. 12 board integration cases plus 27 existing funnel cases and 2 migration uniqueness cases
passed in a fresh disposable `indice_test_db`; no functional data was used for those tests.
Synthetic browser checks cover desktop, dark mode, mobile 390x844 / 320x568 / 844x390, capture and
visible footer actions, moving/resizing, shapes/colors, linked arrows, undo/redo, photo picker/drop,
save/reload, network/lost-response retry, explicit conflict recovery, touch drag and pinch zoom.
The full campaign and guide regressions also passed at their existing desktop/mobile sizes.
Physical iOS/Android keyboard behavior and collaborative editing are not certified. Photo provider
I/O/quota contracts are mocked in integration tests; the local service uses the existing private
MinIO provider. This is local acceptance, not production release certification.

Local API 8083 starts successfully with V333. Authenticated read-only acceptance returns 200 for
both existing campaigns and the private board. Frontend 5175 serves the board. Activation overlays
only tested IdeasBoard classes and V333 onto a copy of the previous immutable runtime; the prior
artifact/configuration is retained. Rollback restores the previous application and retains these
additive tables/assets. No campaigns, boards or photos were created during functional acceptance.
Production deployment, commit and push: N/A.


### Dedicated content generation view — 2026-10-19

The product owner requested a **Content generation** view alongside My ideas, List and Funnel to
surface the existing combination/hook engine directly. The view selects an existing campaign on
the current filtered page, summarizes its objective/audience/offer, and displays the same
`CampaignContentGuide` and live `CampaignPromptTools` used by Prepare for AI. The user can choose
content type, format, piece purpose, opening hook, topic and controlled variants; copy/download/
print the same current prompt; and retain a pasted AI response in an existing workshop campaign.
No model is invoked or campaign delivered by entering this view. The private board stays in
My ideas and remains mounted across view changes.

This is an additive frontend entry to the existing campaign-owned `contentGuide` and workshop
`aiResponse`; no API, schema, permission, prompt-generation rules or automatic execution authority
are changed. Native CRM/Funneling access remains mandatory. Explicit Save uses the original UUID,
expected version and the current complete campaign input, preserving stages, targets, objective,
audience, offer and lifecycle. Legacy campaigns keep their null workshop and exact existing
stages/targets; the view does not manufacture a workshop to store responses. Opening or copying a
prompt alone does not save or add stages. Creating/configuring a campaign from this view returns
to the selected saved campaign in Content generation.

Local dirty state protects campaign selection, view changes, search/status/pagination, refresh and
creation/configuration actions through the shared Confirmation Modal. Cancel keeps all input;
explicit discard performs the captured destination. Busy saves reject duplicate submits and
navigation through these controls. Native unload warns while dirty/busy. Network errors retain
input and permit retry; 409 retains the draft, blocks overwrite, and offers explicit reload with
discard confirmation. Clean external version updates rebase; dirty external updates become a
conflict. Authorization changes clear the editor, and late responses cannot update an unmounted
context. This is browser-memory editing, not a durable offline draft or global router blocker.

The native coral view selector, filters, pagination and shared components are preserved. The guide
and prompt appear together on wide screens and stack on smaller screens. Export controls wrap;
the prompt has bounded internal scroll, and a sticky wrapping save area uses 44px controls. Eight
locale variants include concrete conflict/recovery copy. Workspace navigation memory accepts
`view=content` under the existing user/company CRM/Funneling scope and continues to store only
navigation state, never content drafts.

Acceptance: 129 focused Sales/campaign/board/frontend regressions passed, including 8 new
content-generation hook/model cases. TypeScript and production build passed (existing chunk-size
warning retained). Synthetic browser checks passed desktop 1500x1100 and mobile 390x844, 320x568,
844x390: direct view/reload, live combinations/hooks, copy/download equality, response retention,
save/reopen, network retry, dirty switch/cancel, conflict/reload, legacy boundaries and campaign
creation returning to the same view. Existing complete campaign and private-board browser journeys
also passed their desktop/mobile and touch checks. Physical mobile keyboards remain unverified.
Frontend 5175 serves the new view; no functional campaign writes or external AI calls were used
for acceptance. Backend tests/restart/migration, production deployment, commit/push: N/A.


### Board minimap and action verification — 2026-10-19

The private board now includes an interactive lower-right minimap, outside the transformed world.
It displays existing nodes by shape/color, connections and a blue rectangle for the current view;
it does not copy text, create records, load thumbnails or change the content model. Geometry
includes negative/distant nodes and the current viewport. Pointer/touch navigation uses a frozen
projection during each drag, with one committed camera change on release. Resize observers keep
both canvas and minimap dimensions correct in expanded, normal and compact layouts. Click/drag
recenters the camera at the same zoom; keyboard arrows pan and Enter centers the ideas. Input is
scoped to the minimap and cannot create a note or trigger the canvas's edit/delete shortcuts.

Keyboard Enter in Connect mode now chooses the target rather than opening its text editor.
Focused arrows can open their label editor with Enter or remove that arrow with Delete; this no
longer acts on a previously selected node. Lost pointer capture finalizes a pending gesture.
Existing notes/text/shape/photo, editing, duplication, resizing, removal, incident arrows,
undo/redo, fit/zoom and expanded controls retain their behavior.

Autosave now distinguishes a real idea conflict from another window changing only its camera.
After a 409, one authenticated current-board read may rebase a request only when the actor still
matches, the version advanced, and the remote ideas are identical to either this queue's last
acknowledged ideas or its exact requested ideas. Comparison includes node IDs, order, text,
positions, size, shape/color, asset IDs and connections/labels; only viewport and property-key order
are ignored. A new mutation identity uses the current expected version; another conflict is
blocked, never forced or retried in a loop. Network failure after rebase preserves that mutation's
identity for uncertain retries. Native server ownership/CSRF/version checks remain authoritative.
Different idea edits are never automatically merged or overwritten.

A conflict's **Check saved changes** action reads again and can resume only if the same actor's
saved ideas already equal the unchanged local draft. It retains the draft/history and preserves
this window's camera. Other content/actor changes leave the conflict intact, with the existing
explicit discard/reload action. Superseded queue notifications cannot set the current queue's
state. Effect replay during a local UI refresh retains an unsaved queue/history rather than
replacing the local board with a fetched snapshot. None of these changes remove unload warnings
or implement durable offline/collaborative editing.

Acceptance: 141 frontend regressions passed, including 12 new minimap/save/hook cases. TypeScript
and production build passed (pre-existing chunk-size warning retained). A new synthetic browser
suite checks each action type, editing/color, duplicate/remove/undo/redo, keyboard connections,
arrow label/delete, incident-arrow recovery, map placement/projection, click/drag/keyboard and
touch camera movement, no unintended note creation, viewport-only recovery and genuine conflict
retention/reload. Desktop 1450x1050 and mobile 390x844 / 320x568 / 844x390 passed, including a
44px minimap target, light/dark, expanded/normal and camera reload. The previous photo picker/drop,
resize, touch/pinch, history and saved-campaign board regression also passed. No uncaught browser
errors occurred. Physical mobile keyboards remain unverified. Local frontend 5175 serves the
change; functional user boards/photos were not modified for acceptance. Backend/API/schema/
permission changes or restart, production deployment, commit/push: N/A.


### Idea board visual and interaction polish — 2026-10-19

The owner-approved presentation keeps the existing native Sales coral shell and board model.
A compact identity header and semantic saved/saving/error states distinguish board status from
editing. The tool rail groups creation, connection/pan and photos; a contextual strip exposes
edit/duplicate/remove for the selected item with localized tool guidance. Canvas history and
zoom/fit controls live together in the footer. The minimap remains lower right with its original
geometry and camera contract. Existing note colors/shapes, photo frames, connection labels and
selected outlines receive cohesive styling; color swatches show a check on the current choice.

The empty board offers first-note and photo entry points using the same native editor/upload
paths. Those actions stop canvas pointer/keyboard propagation, avoiding unintended notes.
Toolbar targets remain at least 44px in compact layouts; the resize handle remains 44 screen
pixels across zoom levels. Expanded view resets inherited workspace margins so it fills its
intended bounds. Compact-height empty states retain a reachable first-note action beside the
minimap. Dots retain a minimum visual spacing when zoomed out. All new guidance is localized
through the existing six-language/eight-locale dictionary. Light/dark and reduced-motion styles
remain local to this surface; no new framework or modal/state engine is introduced.

Affected production files: IdeasBoard.tsx, ideasBoard.css and ideasBoardCopy.ts. API, backend,
schema, company/user permissions, board autosave/conflict protection and campaign/content
generation ownership are unchanged. Verification uses synthetic in-memory browser records;
functional boards, photos and campaigns were not changed.

Acceptance: 141 relevant frontend regressions passed; TypeScript and production build passed
with the existing large-chunk warning. Existing action/minimap and full board browser flows
passed desktop and 390x844 / 320x568 / 844x390 layouts, including photos, arrows, resizing,
history, touch/pinch, errors/conflicts, saved campaigns and dark mode. Additional visual checks
verified empty-state keyboard creation produces exactly one saved note, 44px controls/resize
handles, full expanded bounds and compact start actions. No uncaught browser errors occurred.
Local frontend 5175 serves the change. Physical mobile keyboards remain unverified. Backend
tests/restart/migrations, production deployment, commit/push: N/A.

### Content calendar and suggested editorial plan — 2026-10-19

The owner requests a **Content calendar** view for reels, stories, posts and ads, with a simple
question-driven suggested plan. This is the fifth native view, `?view=calendar`. The existing
campaign remains the business owner; its calendar is shared within the authorized company, unlike
the private My ideas board. The campaign selector and pagination use the current filtered page.
Calendar edits do not change the campaign brief, stages, estimates, content guide or idea board.

The view supplies:

- Month, week and chronological agenda; small screens use the readable agenda presentation.
- Date navigation, today, content-state filtering and undated ideas.
- Editable title, channel, format, content purpose, date, optional time, preparation brief, call
  to action, optional owner text and material/publication URL.
- `REEL`, `STORY`, `CAROUSEL`, `POST`, `META_AD` and `SEARCH_AD`; Instagram/Facebook support the
  social formats and Google Search requires `SEARCH_AD`.
- `IDEA`, `PLANNED`, `READY`, `PUBLISHED`, `CANCELLED`. Published is explicitly a manual record.
  Saved entries are retained; cancelling and restoring are supported instead of hard deletion.
- Local ISO calendar dates and optional `HH:mm`, with an explicit persisted IANA time zone.
  Changing the zone retains the written local times. Dates range from 2000 through 2100;
  impossible dates/times and daylight-saving gaps are rejected. This is not a timed delivery job.
- At most 200 entries per campaign, including cancelled entries, and a 512 KiB document bound.

**Suggested content** preloads the campaign goal and offer/topic, then asks for goal, channels,
formats, start date, 1–8 weeks, publishing weekdays and a reference hour. Capacity means one piece
per selected day, rotating across selected channels and compatible formats. The proposal uses
attraction, explanation/trust, action and retention purposes, and includes a preparation brief.
It does not invent prices, results or testimonials. Suggestions are deterministic guidance,
not output from an invoked AI model or a performance forecast. The user reviews/selects pieces
before appending them; no existing content is replaced. Each piece remains editable.

**Apply to my calendar** updates the visible local draft; **Save calendar** persists it.
Native campaign/view/filter/refresh navigation guards dirty drafts, and unload warns while dirty.
This is not durable offline storage or a universal router navigation blocker. Network failures
retain the draft and request identity; conflicts retain the draft and block overwrite until the
user explicitly reloads. Session/company revision remounts the owner view. View/period/filter
preferences use existing scoped workspace memory, never a second content store.

The existing AI prompt exporter can include the ordered, non-cancelled calendar and its time zone.
Copy, text download and print use the same prompt. It is a reference for an external AI; it neither
publishes to Meta/Google nor executes prompts, creates ads, sends messages or changes sales KPIs.

#### API and persistence

`GET/PUT /api/v1/sales/funnels/{id}/content-calendar` reuses the native session, `crm` entitlement,
`crm.funneling` permission, demo denial and mutation CSRF boundary. The backend resolves the company
from the actor and validates the parent funnel in that company. PUT additionally requires
`X-Content-Calendar-Actor` to match the current authenticated company/user snapshot.

V334 introduces `sales_content_calendars`, keyed by `(company_id, funnel_id)` and referencing the
tenant-owned parent, plus metadata-only `sales_content_calendar_audit`. Typed contracts validate
all enums, bounds, entry UUID uniqueness, dates and channel/format pairs. Reads create no records.
The complete save is transactional under the existing company mutation lock, with expected
version and a stable mutation UUID/content digest. An exact immediate retry returns the saved
document; stale or changed reuse conflicts. Persisted entry IDs must remain in subsequent saves.
The independent version prevents calendar saves from overwriting other campaign editors.

#### Research used for the product adaptation

Primary references reviewed on 2026-10-19:

- [Meta: Facebook and Instagram Reels ads](https://www.facebook.com/business/ads/facebook-instagram-reels-ads):
  format-appropriate vertical creative and deliberate variations.
- [Meta for Business: scheduling with Business Suite](https://www.youtube.com/watch?v=PQjvbXyMhkM):
  planning/scheduling content as an editorial workflow.
- [Google Ads: campaign creation steps](https://support.google.com/google-ads/answer/10498850):
  objective, campaign type, audience, creative and destination decisions.
- [Google Ads: campaign objectives](https://support.google.com/google-ads/answer/7450050?hl=en-GB):
  objective-led campaign configuration.

The application adapts these ideas into goal → channel/format → cadence → preparation → review.
It does not claim that a fixed publishing hour/frequency is universally optimal, or that an
editorial date activates an ad. Final platform setup, budgets and publication remain external.

#### Verification and local handoff

- 63 focused frontend tests passed: calendar dates, capacity, formats, localized suggestions,
  dirty navigation, retry identity, conflict handling and existing campaign/content behavior.
- 36 backend tests passed: seven calendar integration cases, 27 funnel regressions and two
  migration-uniqueness checks. MySQL was isolated at `127.0.0.1:13329/indice_test_db`; Flyway
  initialized through V334. No tests used the functional or production database.
- Synthetic Chrome browser flows passed creation, save/reload, suggestions, append/selection,
  campaign isolation, week navigation across months, editing, AI copy/download equality,
  uncertain retries and explicit conflict recovery. The previous Content generation browser
  regression also passed. Layout checks covered 1500x1100, 390x844, 320x568 and 844x390,
  light/dark, bounded modals and 44px actions, with no uncaught browser errors.
- TypeScript and production build passed; the existing large-chunk warning remains.
- Local API 8083 uses the new calendar classes and V334; frontend 5175 serves the new view.
  The prior runtime and a private local SQL backup were retained outside the repository.
  The original runtime configuration, mail settings and all other compiled modules were preserved.
  Local startup and protected-endpoint checks passed. Restart invalidated the browser's prior
  local session, so the user's real-account calendar still requires a fresh login to view.
  No functional campaign/calendar records were created for verification.

Production files changed: Funneling.tsx, funnelModel.ts, CampaignPromptTools.tsx, the
`Funneling/calendar/` components/model/copy/API/hook, FunnelController.java, the four
ContentCalendar backend classes, and V334. Supporting changes cover the canonical frontend
extension, this domain contract, the synthetic campaign fixture and calendar unit/browser/backend
tests. Existing APIs, permissions, campaign calculations, private-board persistence, translations
and operational sales flows remain preserved. New content is localized for the eight supported
locales using the six language catalogs.

Remaining limits: manual editorial planning, 200 retained entries per campaign, no remote
publication/scheduler/AI call, and no durable offline draft. Physical mobile keyboards and real
Meta/Google publishing are outside this verification. Production deployment and commit/push: N/A.
Application rollback restores the prior local classes; retain V334 and its data as forward-only
additive schema. Do not restore the SQL backup over newer work as a routine rollback.


### Content generation workspace polish — 2026-10-19

The owner-authorized UI refinement keeps the existing Content generation route/view, campaign
selection, complete versioned save payload and prompt-generation rules. The native Sales coral
vocabulary now distinguishes campaign context, the content/hook combination and the prompt.
Three localized step controls focus/scroll their section without changing the campaign or
writing data. Context shows objective, audience and product/service, with truthful pending
values and a Configure campaign entry. “Context ready” refers only to those displayed fields.

The existing campaign-owned guide gains an opt-in compact presentation for this workspace.
Actual choices remain native selects; a selected predefined hook appears as a template, not
a fabricated finished hook. Supporting explanations use an optional native disclosure; topic
capture allows multiline text up to the same 500-character limit. A compact summary preserves
AUTO delegation and variants. The standard guide in campaign modals retains its presentation.

Prompt tools reuse the same current prompt, clipboard fallback, text download and standard
print document. A scoped workspace presentation emphasizes Copy, gives exports separate
controls, and styles truthful copy success/error states. Editing the combination removes stale
copy feedback. Denied clipboard access still selects the full current prompt for manual copy.
The optional AI response remains editable and saves in the original workshop; legacy null
workshops keep their existing boundary. The sticky Save footer uses the coral primary style,
visible unsaved/saving/saved feedback and original explicit-save/conflict protection.

Content-only campaign filters use a native details disclosure around the original Sales filter
bar and guarded callbacks. The disclosure has independent local open state: clearing a filter
keeps it open and preserves input focus; active filters remain labeled when collapsed. It
starts expanded when mounted with active criteria. Native filters, pagination, board, calendar,
other views and dirty-navigation protection retain their ownership. Content search/context copy
uses “campaign” consistently. New copy is localized in all six languages/eight supported locales.

Changed production files: CampaignContentGeneration.tsx, CampaignContentGuide.tsx,
CampaignPromptTools.tsx, contentGenerationCopy.ts, contentGuideCopy.ts, contentGeneration.css
and the bounded Funneling.tsx filter wrapper. Shared modal/filter/print engines, backend/API,
schema, company/user authorization and campaign prompt instructions are unchanged.

Acceptance: 141 relevant frontend regressions, TypeScript and production build passed; the
existing large-chunk build warning remains. The complete Content generation browser flow
passed with live hooks, copy/download equality, response persistence, save/reopen/reload,
network retry, duplicate-save protection, dirty cancellation, 409 recovery, legacy stages and
creation returning to the same view. The standard campaign guide/modal flow also passed,
including 390x400 compact-keyboard-height coverage. Dedicated UI checks verified missing
context, filter open/clear/focus behavior, guarded dirty filtering, all three step jumps, help,
clipboard rejection/manual selection, current copy feedback and a standard print popup with
the latest content. Desktop and 390x844 / 320x568 / 844x390 mobile layouts passed containment,
44px export/save targets, visible save actions and dark mode without uncaught browser errors.

All acceptance writes used isolated synthetic browser/session data; functional user campaigns
and boards were not modified. Local frontend 5175 serves the current workspace. Physical
mobile keyboards/printers remain unverified. Backend tests/restart/migrations, production
deployment, commit/push: N/A.


## Campaign workspace and company library — adopted 2026-10-23

The owner approved reorganization into **Campaigns / Content / Calendar** using the existing
`IndiceWorkspaceNavigation` sections, coral Sales title bar and native modal engine. The standard
title bar keeps Company information, Refresh and Create campaign direct. Cards/Table are views
inside Campaigns; the visual customer journey remains campaign detail. Historical `view=ideas`,
`list` and `funnel` URLs and stored state remain valid. Content and Calendar show one selected
campaign context strip. Changing campaigns returns through the campaign directory with its native
filters and pagination, preserving reachability beyond the current page. Editors no longer show
the campaign directory pagination. Existing draft/conflict and navigation guards remain active.

The private Funneling ideas board remains mounted, user/company scoped and explicitly opened from
Campaigns; hiding it does not throw away its save queue or unsaved recovery state. Nothing is moved
from this private board into the company library. No opportunity, publication, ad account or model
execution is introduced by reorganizing the workspace.

Content keeps a compact campaign summary and explicit company reference selection. Variants,
full AI instructions and optional pasted response are disclosed on demand. Copy, download and
print still use the same complete prompt, including an explicitly selected company snapshot.
Calendar day buttons open a native Operational Workspace Modal listing that day's entries;
creation/editing replaces the day modal rather than nesting dialogs. A small-screen monthly grid
opens the same day view. Manual publication state, calendar version, filters, time zone and existing
entry editor remain unchanged.

### Ownership, access and persistence

`/api/v1/sales/company-library` is authenticated, company-owned and requires the native CRM module
and `crm.funneling` tab for every operation. Public demo sessions are denied; writes require native
session CSRF, the actor key issued by the read response, an active membership and a current module
mutation entitlement, serialized on the company. No permission grants or roles are created.
Authorized Funneling editors may maintain this new shared planning information; this does not
permit editing the corporate identity, inventory or other Sales tabs.

One profile per company holds bounded business description, offer, differentiation, usual audience,
service region/contact, communication style, guidance and up to three hex colors. The company name
and main logo are a narrow read projection of their existing company owner: `companies.name` and
`ConfigCenterService.getCompanyLogo`. This is not another owner or editor of the global logo.
No company settings root or employee, fiscal, billing or access data is returned.

V354 introduces `sales_brand_profiles`, `sales_brand_assets`, `sales_funnel_brand_contexts` and
metadata-only `sales_brand_audit`. Profile and campaign-reference saves have separate optimistic
versions, stable mutation UUIDs and input hashes for exact lost-response retries. Existing campaign
DTOs, versions, stage estimates, guides and briefs are unchanged. Selection captures an independent
text/asset-metadata snapshot: editing company details later does not rewrite a prior selection.
New selection requires the current profile version, at most ten unique owned assets and the
campaign's company ownership. An archived asset can only be retained if already selected there.

### Private materials

The new owner uses the existing `ObjectStorageService` and `CompanyStorageMeter` with the private
Sales documents bucket; no normal file body is stored in MySQL. Upload allocates a stable UUID and
server-chosen tenant staging key, reserves quota and signs an exact-length upload for five minutes.
Registration is creator-bound, validates metadata, copies to a new immutable server-only key,
validates the copied bytes and commits quota against that final object. Failed transactions clean
the copy; committed registration cleans staging. Repeating registration or a completed upload
returns the existing asset, without duplicating the quota or accepting replacement content.

First-release formats: PNG/JPG, PDF and UTF-8 TXT, at most 5 MiB per file. The existing Email
`MailFilePolicy` is reused only as a bounded binary-validation primitive, with an owner allowlist;
this grants no Email/Mailing authority. Existing active/encrypted/form PDF exclusions apply.
There are at most thirty active/recent pending assets and one hundred retained registered assets
per company, checked again under lock at registration/restore. Pending rows are never downloadable.
Archive/restore is recoverable and does not delete bytes, release retained quota or break historical
campaign references. Downloads reauthorize the company/tab and use attachment disposition,
`no-store`, `nosniff` and sandbox headers. No raw storage key or signed download URL is returned.

A copied prompt includes selected business details and material names/types, never private object
keys, download capabilities or file bodies. The UI explains that users must attach those files to
their chosen AI themselves. Material download links are available on the selected-context card.
There is no automatic external transmission and no new MCP tool, OAuth scope, image-generation
promise or publication capability. Native ChatGPT/Lupita visual acceptance from the earlier Phase 0
remains pending. Inventory product/photo selection through its owner contract is a later extension;
this release's offer is a descriptive planning field and never reads inventory without its permission.

### Rollback

Retain the additive V354 tables and immutable application backups. Previous application versions
ignore the new library and independent snapshots. No destructive down migration, automatic seed,
corporate logo rewrite or historical campaign conversion is required.


## Guided company information and separated logos — adopted 2026-10-23

The owner approved mixed selectors and short free-text questions inside the existing company
library workspace. Business starts with industry, offering type, short description and customer
segments. Native disclosure reveals named offer tags, customer need, up to three differentiators,
service modes, reach and contact channels, with optional supporting text. Brand has up to two
communication tones, address style, language, up to three colors and optional preferred words,
communication notes and exclusions. No choice is preselected or inferred from older text.
Original description/offer/difference/audience/region/contact/voice/guidance remain intact and
editable; questions add a bounded typed `answers` object in the existing profile/snapshot JSON.
Missing answers from old profiles and snapshots normalize to empty optional values. Canonical
option codes are validated server-side; duplicate arrays, unrecognized codes, overlong tags and
excess choices fail atomically. Profile versions/retry IDs, selected-context versions and tenant,
CSRF, entitlement/tab checks retain their prior ownership and lifecycle.

Brand shows the main company logo from the existing read projection and an explicit optional
preference to use it as campaign reference when company information is selected. This preference
is text planning context, not an automatic image attachment or new global-logo editor. Dedicated
LOGO_VARIANT assets are shown separately from general Materials, also in campaign selection.
PNG/JPG variants may be classified Light/Dark/Horizontal/Symbol/Other and previewed privately
on light and dark backgrounds. Preview reuses the authorized attachment download and a bounded,
short-lived browser blob URL revoked on cleanup; it does not publish or sign a new capability.
General materials support Photo/Document/Reference categories. Optional upload descriptions and
logo variant metadata are part of upload retry identity and captured with selected asset metadata.
They do not affect existing assets or earlier snapshots. V355 adds only two bounded metadata
columns with empty defaults. Applied migrations, storage validation, quota, archive/restore and
download authorization remain unchanged. Logos reject non-image content before allocation.

The modal retains native sections and replacement discard confirmation. Profile answers persist
only through Save information; uploaded files are saved immediately through their explicit upload
action. Pending upload descriptions receive the same close/unload protection. Labels/options cover
all eight native locales. Mobile wraps choices and stacks fields without horizontal overflow.
Rollback retains V355 and its metadata, restores the previous package/source, and never drops data.


## 2026-10-26 — Direct content production prompt

The Content view requests the selected finished advertising piece, using campaign/brand facts as reference. Static images, carousels and static stories request final visual assets; when the external tool cannot render, it supplies a production-ready image prompt with exact copy. Video/Reel/Live requests recording-ready scripts and scenes; polls and threads request finished text. Explicit guide choices and variant count remain authoritative. No calendar, budget, metrics or stage-by-stage campaign is requested in this view. Campaign workshop and calendar exports retain their existing campaign-planning output. Copy/download/print share the same current generated text; external tools receive no automatic file attachments, publishing authority or account access. Existing saved choices, AI responses, brand snapshots, optimistic versions and tenant boundaries are unchanged.


## 2026-10-26 — Selected-format-only content instructions

Content prompts include only the selected format's production instructions. AUTO delegates a single coherent format without listing a catalog. Variants retain the selected format and requested count; this presentation supersedes cross-format directions inside Content prompts. No saved guide values are converted. Campaign/workshop and calendar prompts retain their existing planning behavior. Copy, download and print continue sharing the current prompt and reference boundaries.


## 2026-10-26 — Campaign card presentation

Campaign cards use a compact coral identity, semantic lifecycle badge, clear title and at most two lines of distinct idea copy. An idea identical to the title is not repeated. Confirmed offer and audience appear only when present; channel chips retain their existing meaning. A bounded footer keeps Review and labeled Duplicate available with 44 px targets. Cards adapt to one/two/three columns without changing list scope, sorting, pagination, selection, permissions, saving or duplicate behavior. No campaign is modified by this presentation.


## 2026-10-26 — Direct content entry from campaign cards

Each campaign card exposes Create content, opening the existing Content view with that exact visible campaign selected. It uses the owner's navigation guard and existing view state; scope, pagination, search, lifecycle, saved content choices and persistence remain unchanged. Review and Duplicate remain available; navigation neither creates nor saves a campaign. Labels cover all supported languages.


## 2026-10-26 — Saved content signals on campaign cards

Cards show the saved content guide format; absent or AUTO format is visibly undecided. A separate saved-AI-response indicator derives only from non-whitespace workshop.aiResponse. It describes stored text, not approved artwork, publication or campaign completion. No generated response text is exposed on the card. Legacy plans remain without a saved response until their existing contract supports one. Cards use localized labels and semantic icon/text in light/dark mode, preserving navigation and persistence.
