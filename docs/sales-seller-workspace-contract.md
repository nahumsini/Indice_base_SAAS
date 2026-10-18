# Sales seller workspace

Approved product decision: 2026-10-18. Owner: Sales / Opportunities (`crm.leads`).

## Experience

`Modo vendedor / Seller mode` replaces the full-screen entry label and opens a specialized daily
Workspace View in the existing native browser fullscreen element. Daily work and Board use the
shared workspace navigation. The normal Kanban and its stage transitions remain available.
Escape exits native fullscreen; the daily view remains mounted so its ephemeral conversation draft
survives returning to the ordinary board during this module visit. Drafts are never stored as tab memory.
Queue filters use the scoped workspace memory engine. Selection stays stable during clock/filter refresh.
A different contact requires discarding dirty edits; pending/uncertain submissions block switching.

The queue excludes closed/on-hold opportunities, prioritizes overdue/today/unscheduled work, and
supports owner and contact/phone filtering. The center contains the current contact and script reader;
the side pane contains conversation notes, result, next action, and actual contact history. Panels use
the existing resizable primitives. Reader font size/speed are adjustable; scrolling starts only by
explicit action and pauses on note focus, block navigation, hiding the workspace, blur or tab hiding.
Phone, WhatsApp and email actions retain their existing external-client links. They do not report a
connected call, recorded audio, delivery or measured duration. Outcomes are seller-entered.

## Scripts

Company-owned scripts attach to an existing company flow, including Factory flow without editing
its protected stages. A script has a name, goal, optional suggested active stage and 1–20 ordered
text blocks. Text is rendered as React text; variables `contact`, `company`, `seller` are substituted
only for display and missing values remain visible. Maximum 200 script heads per flow, 40,000 total
text characters; each block allows 100 title / 6,000 body characters.

Create, edit, duplicate, preview, draft, publish and archive use the Sales Operational Workspace
Modal. Immutable revisions retain actor and creation time. Editing a draft preserves the published
revision. Compare-and-set versions reject stale writes. Archiving hides the script from new selections
and preserves history. An in-progress conversation retains its selected published version, including
when another user archives or replaces the script. Only previously published versions belonging to
the same company and flow can be recorded. There is no new role system; current Sales/lead access
continues to control this workspace and script management.

## Contact records and next actions

Company-owned, append-only `sales_call_interactions` stores one record per submitted attempt:
authenticated actor, opportunity/flow, outcome, notes, optional published script revision and follow-up.
Outcomes are `answered`, `no_answer`, `busy`, `wrong_number`, `information_requested`, `callback`.
They do not implicitly move a commercial stage, create a sale, change general opportunity notes or
alter money/KPIs. Only answered/information-requested/callback outcomes update last-contact time.

A single transaction locks the company/flow opportunity, checks an opaque current-record fingerprint,
updates the schedule through SalesService/OpportunitySchedule and appends the result. Existing
call reminder eligibility and timezone/DST rules remain authoritative. Follow-up requires a complete
date/time; explicit clear removes the previous schedule. No hidden midnight is introduced.
`Save and continue` advances only after server confirmation. Network-uncertain retries replay the
same command and key; payload/key reuse with different data is rejected. Conflict reload preserves
notes and requires review. History uses bounded cursor pages (50); daily actor/flow counts are computed
by the server using the company's date boundaries and UTC storage, not inferred from button clicks.

## Authorization, storage and release

Typed command endpoints live under `/api/v1/sales/opportunity-flow/{flowId}/seller`, inheriting the
existing sales capability, subscription/module and `crm.leads` route gates. Controllers authenticate
company/actor and require session CSRF on POST; repositories scope each read, lock and mutation by
company and validate referenced flow/opportunity/script ownership. Missing records do not disclose
foreign-tenant details. Safe reads do not mutate state. Domain errors expose safe machine codes.

V322 is additive and forward-only: script heads, immutable script revisions and immutable contact
records. Rollback runs the prior application with these tables retained. No external email/WhatsApp/
telephony provider, recording, automatic dialing, financial integration or permission grant is added.

## Verification

Focused Java tests exercise script publication/draft/version preservation, ownership, snapshots,
record retries, stale data, schedules, outcome semantics, authentication/CSRF and route classification.
Database tests use an isolated `indice_test_db`; migration startup and uniqueness are required.
Frontend runtime regressions cover queue ordering, scripts, translations, pending/retry/conflict
behavior; TypeScript/build and Kanban/next-action regressions remain required. Browser flow tests use
`react/tests/fixtures/sales-seller.html` with synthetic records and in-memory APIs. No business record
is submitted during visual QA of the functional application.

## Local implementation handoff — 2026-10-18

Changed files are the `Prospectos/seller/` workspace, its Kanban/flow-manager integration,
`SellerWorkspace{Controller,Dtos,Repository,Service}.java`, V322, focused Java/frontend tests,
the synthetic seller fixture, and this contract's links in the canonical frontend/backend documents.
Existing Kanban transitions, opportunity calculations, general notes, authorization gates and call
reminder rules are preserved. Production deployment: N/A; this handoff covers the local environment.

Validation completed: 29 backend tests, 89 frontend regressions, a subsequent 46-test focused UI
run, TypeScript, production frontend build and `git diff --check`. Database tests ran in a fresh
isolated MySQL database through V322, including concurrent idempotent submissions. Native fullscreen,
daily/board switching, modal access, script preview/publication, save-and-continue and draft-switch
confirmation were checked in the browser; mutations used synthetic in-memory fixture data. Mobile
layout and dark appearance were also inspected. The functional local backend starts with V322 and
serves the workspace. No unresolved test failures remain. The build retains its existing large-chunk
warning; no production deployment or external communication was performed.

Before first use, create and publish a script for the selected flow. Calling uses the device's phone
application and results are entered manually. Conversation drafts are ephemeral; leaving the module
or closing the browser does not persist an unfinished conversation. These are current product limits,
not claims of automatic telephony, recording or durable draft storage.
