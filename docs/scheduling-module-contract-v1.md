# Agenda and events — complementary module pilot

Status: implementation contract for the current local pilot; not a production release approval.

## Ownership and access

`scheduling` is a complementary, company-owned module with real tab scopes: `calendar`,
`reservations`, `clients`, `events`, `indicators`, and `configuration`. Registration does not grant an
entitlement, change an existing subscription, publish commercial prices, or grant platform access.
Configuration and the master-client directory require a company administrator. Other operators see only their own staff records;
administrators operate the company workspace. All commands revalidate company, actor and objects.
Configuration/event administration never grants a distributor platform-administrator authority.

Frontend lives in `react/src/app/ComplementaryModules/Scheduling`; backend in `scheduling`.
Reuse IndiceModuleShell, routed workspace memory, shared title/filter/table/modal primitives,
eight supported locales, neutral light/dark surfaces and coral identity (`#FF6B5E`) like Sales.
Colored identity emojis accompany the module/tab titles; action buttons retain Lucide icons.
Use graphite on the light coral CTA, soft coral title bars, module-colored modal headers/footers,
and coral focus treatment on the shared 44px filters. This private ERP identity does not overwrite
saved public business colors or the product-wide blue chrome. Reservation status badges retain
their semantic colors.
Daily navigation is Agenda/reservations → Events → Clients → Indicators. Calendar and Reservations
are one visible workspace with Calendar/Table views, not separate daily tabs. Services,
Team/availability and Public agenda are title-bar actions opening native modals; Configuration
is no longer a visible module tab. Backend tab scopes remain independent and unchanged.
The unified agenda reads through an already-authorized calendar or reservations scope; mutation
requires reservations, and setup actions require configuration. Configuration-only administrators
can open setup without fetching an unauthorized calendar. No visual union creates a permission.
`/scheduling/calendar` is canonical. Old `/reservations` links redirect to it with Table selected,
retaining dates, status and explicit view; `/configuration` returns to the unified title-bar actions.
Remembered tab aliases also resolve to the unified agenda. Modals are transient, not persisted.
Title-bar actions follow the shared permission-aware limit of three direct actions. With full
access, New request, Team/availability and Public agenda are direct; Services and Refresh remain
available through Actions. For fewer eligible actions the same priority and permissions apply.
The white shared filter card keeps dates adjacent, then Status and Collaborator; an unsupported
search is omitted. Table-only archived records use More filters with active-value disclosure.
Clear restores the factory month and empty staff/status/archive filters, resets pagination,
and closes secondary filters without replacing the Calendar/Table view. Timezone stays visible
as data context below the filter card.
Setup journey is Service → Team/availability → Publication → Request → Confirmation → Attendance.
The pilot learning companion uses the existing scoped learning-progress hook only to remember
expansion. It is an eight-locale compact instruction guide, not a completed/applied-operation
counter; full context journeys must use real owner evidence in a later slice.
The unified Agenda/reservations workspace supports Calendar/Table views with period, collaborator and status
filters. The native presentation-only calendar supports day/week/month and custom ranges up to 42
days, using the browser timezone explicitly shown in the filter bar. It includes reservations and
events across all company agendas for administrators; operators remain restricted to their own
staff. Calendar reads return totals and disclose truncation above 2,000 records per category;
the reservation table remains paginated. The title bar exposes Services and Team/availability
as separate operational-workspace modals for selecting/configuring records. Create/edit replaces
the workspace with the existing standard-form modal, never a nested dialog. Saving returns to the
list, refreshes agenda options, and preserves the underlying period/collaborator/view context.
Public agenda is one operational-workspace modal with a live preview, publication/appearance,
the saved public link and personalized staff links. Sharing uses saved publication, never an
unsaved alias; changing appearance does not remove existing sharing functionality.
Recurrent events and external calendar synchronization remain outside this pilot. The operational
extension below adds split weekly hours, unavailable dates and service eligibility per staff member.

## Pilot behavior

Services define duration, buffer and minimum notice. Staff reference active company memberships,
not an arbitrary email supplied by a visitor. Weekly availability is explicit and fail-closed.
Events use one host and a bounded capacity. Requests contain consented minimal contact information.
Public requests and event registrations remain REQUESTED until an authorized operator confirms.
They do not guarantee a slot or seat. Confirmation rechecks time, collisions and capacity inside
a transaction. No email verification or external email delivery is claimed in this pilot.
No automatic meeting provider, checkout, Stripe mutation, public CRM write, entitlement, or ERP signup.

Booking states: REQUESTED → CONFIRMED → COMPLETED | NO_SHOW; REQUESTED/CONFIRMED → CANCELLED.
Future REQUESTED/CONFIRMED reservations can be paused (PAUSED), releasing the slot or event seat.
The prior status is retained; resume rechecks the current staff, service, time, availability,
resource collisions and event capacity before restoring it. A paused event identity remains
deduplicated. Pause/resume, like cancellation, require a reason and optimistic version.
Administrators can reassign future individual REQUESTED/CONFIRMED/PAUSED sessions to another
active company member with valid availability. Event registrations retain the event host;
historical attendance cannot be reassigned. The snapshotted duration/buffer is preserved, and
the existing cross-company resource mutex prevents collisions. Former inactive staff do not
trap existing company bookings. Staff receive private inbox notices; contact participants manually.
Remove is a soft archive (`archived_at`), not a physical deletion: active bookings become CANCELLED,
terminal status/attendance stays unchanged, and audit evidence is retained. Operational lists
exclude archives by default; the table can include them explicitly. Historical metrics retain
them. Archived bookings cannot be reactivated or mutated by ordinary status commands.
Terminal records are retained. Completion/no-show requires a past start. Cancellation needs a reason.
Bookings snapshot duration/buffer; later service changes do not rewrite confirmed appointments.
Cancellation and request review are private in this slice; public self-service management links are
deferred until a verified-email ownership mechanism is delivered. Duplicate public actions use
the Kiosk Engine's payload-bound idempotency. Exact duplicate event requests are also deduplicated.
Internal capture uses a company/actor-scoped request key and payload fingerprint in the same
transaction. Event cancellation atomically cancels pending/confirmed/paused registrations with a reason,
unpublishes the event and keeps both event and registration history. Completed/no-show history is
not rewritten. A cancelled registration can be requested again. An event with active participants
cannot be silently rescheduled; cancel it and create a new event. Contact participants manually.

## Public boundary

One configurable page per company, globally unique lowercase alias, title and description.
Public appearance supports business name, action/header hex colors, request-button text, and
cards/compact layout. Copy is rendered as text, never HTML; arbitrary CSS, scripts, images and
external URLs are not accepted. Foreground contrast is computed from the selected colors.
Omitting appearance in an older page request preserves the saved theme. Saving configuration
does not activate the public adapter or grant an entitlement.
`/book/{alias}` resolves only an explicitly published page to its protected public-channel token.
The alias is a discoverable public address, not a credential or company authority.
The page exposes only published services, staff names and events; never user emails, reservations,
participant lists, consulting details or internal notes. Tenant is resolved by the Engine registry.
Owner `SCHEDULING`, type `booking_page`; adapter enforces active company entitlement in every action.
Public reads/captures reuse Engine CSRF, rate limiting, idempotency, lifecycle and audit.
Public adapter is disabled by default through `kiosk.engine.adapter.scheduling.enabled`.
Pause publication revokes Engine sessions without deleting history. Tokens remain encrypted at rest.
Current locking reads recheck publication, entitlement and resource occupancy even inside the
Engine's outer REPEATABLE_READ transaction. Do not replace that atomic transaction with a separate
request transaction: Engine idempotency and owner persistence must commit or roll back together.

### Endpoint inventory

| Surface | Trust/classification | Limits and audit |
| --- | --- | --- |
| `GET /api/v1/public/scheduling/{alias}` | Public address resolution; published page, active entitlement and commercial lifecycle; no visitor-supplied tenant authority | Engine BOOTSTRAP bucket per network, 120/5 min, stable alias-resolution bucket; no-store response; generic unavailable errors |
| `GET /api/v2/kiosks/public/{token}/bootstrap` | Existing Engine public-link registry, owner SCHEDULING/type booking_page, commercial lifecycle; published configuration only | Existing BOOTSTRAP rate limit; session CSRF; no attendee data |
| `POST .../actions/scheduling.slots.read@1` | Existing Engine CSRF and validated public capability, company/objects from definition | QUERY limit 120/min; boolean busy data only; Engine audit policy |
| `POST .../actions/scheduling.reservation.request@1` | Existing Engine CSRF, payload-bound idempotency, published-page/entitlement recheck; consented minimal contacts | MUTATION limit 30/min; REVIEW_REQUIRED; sensitive-data descriptor; Engine sanitized audit plus scheduling entity/action audit; generic acknowledgement without existing attendee reference/status |
| `GET /api/v1/scheduling/...` | Session, company entitlement, user module assignment and real tab scopes; private contact reads administrator/company or operator/own staff | Date ranges ≤366 days, reservation pagination 10–200; events bounded to 500 with upcoming events prioritized |
| `GET /api/v1/scheduling/calendar-grid`, `/staff-options` | Same private guards; calendar OR reservations scope; collaborator must belong to the company and the authorized operator | Grid ≤43 UTC days to allow 42 local days across DST, 2,000 reservation/event rows per category plus totals; no public exposure |
| `GET /api/v1/scheduling/clients` | Scheduling entitlement/assignment, clients tab, company administrator; delegates the read-only Sales master-client owner contract | Tenant-scoped nondeleted contacts only, escaped search ≤180, pagination 10–200; no CRM mutation, financial data or Sales permission grant |
| `GET /api/v1/scheduling/booking-clients` | Scheduling reservations tab and administrator plus native Sales/contacts authority | Tenant-scoped owner search, 25 contacts per page; no inferred email association |
| `GET /api/v1/scheduling/reservations/{id}`, `/{id}/history`, `/events/{id}/participants` | Session/module, calendar OR reservations tab and company/own-staff object scope | Private details; history limited to 100; participant pagination excludes archived records |
| `POST /api/v1/scheduling/reservations/{id}/assignment`, `/management` | Same session/module/reservations/object checks plus CSRF; assignment requires administrator, management allows own-staff operator | Transaction, optimistic version, current availability/resource checks; reasoned audit with previous/next staff IDs; no hard delete |
| `POST /api/v1/scheduling/reservations/{id}/reschedule` | Session/module/reservations/object checks and CSRF; company entitlement rechecked in transaction | Version and reason required; individual active reservations only; current resource availability and old/new instant audit |
| `POST/PUT /api/v1/scheduling/...` | Same session/module/tab/object checks plus CSRF; configuration and event administration restricted to company administrators | Company transaction, optimistic version checks, append-only scheduling business audit; private request idempotency |

The alias/Engine token are public-channel addresses, not a participant login. A public sender cannot
inspect registrations, attendance or existing email-associated state. Personal information stays
in private owner records; browser workspace memory contains only dates, status, page and column widths.
The shared consultant mutex uses a pseudonymous email hash, not an anonymous identity guarantee.

## Availability owner contracts

The Scheduling owner exposes a boolean busy-window check. Consulting exposes its own boolean check.
Both use a shared, hashed consultant-resource mutex before committing confirmed sessions; no
consumer writes another owner's tables. Internal cross-company busy checks return only a boolean
for a verified staff identity and never expose another company's records. This deliberate resource
boundary prevents a consultant being double-booked in two companies. Existing consulting entitlement,
price, request, notification and appointment payload semantics are preserved.

## Master-client owner contract

Sales remains the sole owner of `sales_contacts`. The Clients tab now composes the exact existing
Sales `Contactos`, `SalesCrmProvider` and `SalesDataStateBoundary`, as an owner-authorized embedded
workspace. Forms, columns, filters, fiscal/relationship details, imports and commands remain Sales
behavior, data and APIs; no Scheduling-specific client table, editor, payload or mutation endpoint
is introduced. Its Sales-scoped operating memory is shared with the original client workspace.
In addition to Scheduling's administrator/clients access, embedding requires an unlocked native
`crm` module and the existing `crm.contacts` permission. Without those, display an explicit access
message and do not mount/fetch the Sales workspace. Scheduling never grants a Sales entitlement
or mutation authority. All owner endpoint checks and narrower object scopes remain enforced.

The narrow `SalesClientDirectoryService` and `/scheduling/clients` endpoint remain
compatible for existing consumers: company/contact names, email, phone and status. Its directory read cannot write clients, opportunities or financial state. The explicitly authorized private creation extension below is a separate Sales-owned command. Public contact submissions do not create
or silently associate a master client by unverified email. Client commands in the embedded UI
run only through the existing authorized Sales workflow, not through Scheduling authority.

## Metrics and rollout

Metrics use persisted scheduling records and UTC instants interpreted in the chosen timezone.
Counts are bounded to an explicit date scope. Attendance = completed/(completed+no-show), excluding
future, cancelled and unclassified records; no eligible observations is unavailable, not zero.
Default indicators include the previous and next 30 days, with an explicit editable scope.
Count drilldowns preserve the period and status and are exposed only with reservation-tab access.
No proposal/revenue conversion is inferred without an explicit CRM owner integration.
Pilot first: isolated Flyway startup, tenant A/B, no-auth/CSRF/tab, concurrent overlap/capacity,
idempotency, public minimization, UI keyboard/mobile/dark/localization, typecheck/build.
Then APPTEST and authorized user acceptance before any production rollout.

## Activation and outstanding release work

V301 adds pause/soft-archive state, reasoned reassignment audit and public appearance. It creates
no grants, billing changes, public activation, or rewritten reservation history.

V300 registers the complementary pilot and its owned tables only. Activation is explicit through
the existing company entitlement and user access workflows; no functional/production grants have
been inserted by this change. Public booking additionally requires
`kiosk.engine.adapter.scheduling.enabled=true` and the existing registry/session/audit flags,
an active commercial lifecycle and explicit page publication. Turning the adapter off is the
public-access rollback; disabling the module/entitlement also fails closed without deleting data.

No changes to Stripe, consulting monthly benefits, invitation/email delivery, external calendar
providers or global prospect/CRM records. Email verification, verified participant self-service,
webinar streaming and automatic CRM attribution remain future owner integrations. Events accept
a plain-text location or meeting link; no video service is provisioned. Deployment/public-release
gates still apply.

## Approved operational extension — 2026-10-08 (implemented 2026-10-09)

The user approved implementation after the module review. This local branch completes operational
flows; it does not declare the module released, deploy it, or create live access grants.

- Internal capture exposes the same eligible published future events as the public catalog.
  The four steps are selection, time, contacts and final review. Internal capture uses the native
  wizard stepper and a stable modal footer; back retains data and sending happens only after review.
- A private Sales client picker requires administrator, Scheduling reservations, native `crm`
  and `crm.contacts`. Selection explicitly links a tenant-owned contact and prefills its fields;
  editing those fields clears the link, and consent must still be captured. Anonymous submissions
  cannot supply `clientId`. There is no inferred email match or write to the master contact.
- Staff support up to 28 nonoverlapping weekly windows, 366 explicitly unavailable dates, and
  a tenant-validated service selection. Empty service selection preserves the former all-services
  behavior. Old staff requests that omit the new lists preserve saved configuration. Minimum
  notice may be zero; booking still requires a future start and current availability.
- Individual REQUESTED/CONFIRMED/PAUSED reservations can be rescheduled with a reason and current
  version. Status, reference, contact, duration and buffer snapshots remain intact. The backend
  rechecks staff/service eligibility, availability and occupancy; audit retains old/new instants.
  A paused reservation stays paused. Event participants cannot individually change the event time.
- Event details, publication, location and capacity can change with active participants; capacity
  cannot fall below confirmed attendance. Host/time/duration remain locked while active participants
  exist. Private participants are paginated through calendar/reservations permission and host scope.
- Private reservation details include the captured phone and recent audit (maximum 100 entries).
  KPI links reset collaborator/page filters and explicitly include archives to match their totals.
- `MeetingBusyWindowService` adds a boolean occupancy boundary for validated user identity. Agenda,
  Consulting and Meetings share the existing hashed resource mutex. Meetings retain their explicit
  internal overlap policy; confirmed appointments/events cannot be overridden through that policy.
  Read-only previews avoid locking reads; mutations retain current locking reads.
- `HrSchedulingAvailabilityService` supplies only a tenant-scoped unavailable-date boolean for
  approved leave while HR entitlement is active. Leave type/reason never leaves HR. Half-day leave
  conservatively blocks the date because HR has no morning/afternoon interval authority. Existing
  bookings are not silently cancelled when a leave is approved later.
- Staff inbox notices cover requests and changed reservations. Confirmed appointments within the
  next 24 hours get a best-effort reminder. Delivery rechecks active membership, entitlement and
  reservations permission; durable owner receipts prevent retries from reviving dismissed notices.
  The scheduler checks 100 candidates per cycle with a cursor, defaults to 60000 ms, and uses
  `app.scheduling.reminder-initial-delay-ms` / `app.scheduling.reminder-delay-ms`. The global inbox
  receives generic localized labels and an authorized reservation-ID link, never attendee details.
  These are internal notices, not participant email/SMS delivery.
- Private calendar downloads contain one UTC event, stable identity/version and status; requests
  are tentative and pauses/cancellations are cancelled. The serializer follows
  [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545), including UTF-8 folding and escaped text.
  Export does not synchronize external calendars or send invitations.

V307 adds operational configuration/link/audit fields. V308 adds a composite reservation key and
durable notification receipts. Both are forward-only. Rollback retains their additive schema and
data. Disable the pilot through existing access/public-adapter gates before reverting application
code: older staff editors cannot safely preserve the new split-hours configuration. Restore a
compatible version before permitting configuration writes. No rollback drops business history.
Commercial inclusion without an extra module charge follows
the named exception in the billing architecture; actual publication still requires its release gates.

## Local verification and handoff — 2026-10-09

Scope: `codex/agenda-juntas-operacion`, based on `25fd637a`. Application changes are in
`react/src/app/ComplementaryModules/Scheduling`, `MinutesControl`, the shared calendar serializer
and notification copy; backend changes are in Scheduling/Meetings and their explicit Sales, HR,
Processes and Consulting owner boundaries. V307/V308 and the frontend, backend, modal and billing
contracts accompany those changes. No dependency, deployment configuration or live grant changed.

Verified locally:

- `Scheduling*Test,Meeting*Test,MigrationVersionUniquenessTest`: 76 passed, none skipped. This
  includes tenant/permission/CSRF rejection, conflict and retry behavior, rescheduling, resource
  occupancy, HR leave, client links, notification deduplication, agreement follow-up and task links.
- `Consulting*Test,OperationalNotificationSyncServiceTest`: 12 passed, none skipped. Backend
  compilation passed. The existing Consulting MVC fixture needed mocks for the global learning
  advice dependencies; its four tests then passed without changing production controller behavior.
- Flyway startup/validation applied V307 and V308 only to the isolated `indice_test_db` container.
  Functional and production databases were not migrated.
- The calendar-export, Scheduling and Meeting node suites: 20 passed. Notification UI: 3 passed.
- TypeScript and the production Vite build passed. Existing large-chunk warnings remain nonblocking.
  The final build returned exit code 0 with stderr separated from PowerShell error handling.
- Both browser suites passed against synthetic API fixtures in real Chrome: private/public Agenda,
  Meetings and agreement flows, eight locales, tab permissions, mobile/dark presentation, wizard
  Back/review, custom public appearance, modal discard protection, addenda and native task linking.
  Backend integration tests independently verify persistence and authorization; these browser runs
  are not a deployed full-stack acceptance test.
- `git diff --check` passed. Screenshots and command logs remain ignored local artifacts in `.run`.

Preserved behavior includes existing routes and lifecycle statuses, tenant isolation, native
authorization, original minutes, reservation snapshots and Consulting commercial benefits. The
read-only Consulting availability boundary no longer asks MySQL for a write lock; mutation locking
remains intact. Forms retain drafts on recoverable failures and warn before discarding changes.

Release acceptance/deployment: N/A for this local implementation. Remaining work is APPTEST and
authorized acceptance before publication, plus the explicitly deferred external integrations above.
Internal reminders are best effort; HR half-days conservatively block their date, and exports do
not synchronize calendars. Commercial inclusion is documented without changing live subscriptions.


## Operational presentation refinement — 2026-10-19

The daily tab order groups scheduling work first: Agenda/reservations → Events → Clients →
Indicators. Existing route IDs, independent backend tab scopes, setup modals and the Sales-owned
Clients workspace remain unchanged. Coral title bars, white filter cards and subtle semantic
status colors use the shared frontend system; public-page branding is unaffected.

Events offers Cards/Table views with search (title, description, host), period (all/upcoming/past),
publication/cancellation status and host. The existing authorized owner read returns at most 500
records; the UI explicitly discloses that filters, sorting, counts and pagination apply to that
loaded set. It does not claim an unbounded search. Both views share scoped workspace memory,
filters and pagination. The shared table supports deterministic ascending/descending sorting
before pagination and resizable columns. Participants remains direct; edit, copy public link and
cancel use the row Actions menu with the same permissions and one-frame owner modals.

Calendar cells preview at most three combined reservations/events in chronological order. The
remaining count opens the selected day's complete loaded activity list, including events, without
silently removing records or changing the existing truncation warning. Date-range arrows retain
custom-range length. The selected range is visible, and an edited range is not misrepresented as
a preset. Indicators retain server counts, formulas and permission-aware drilldowns.


## Browser compatibility and short-screen verification (2026-10-19)

Private event columns satisfy the shared table definition, use its `alignment` property and name
each resize separator with the localized column label. The calendar period label uses ordinary
Intl formatting without `formatRange`; a single date is shown once. Restoring event sorting uses
an own-property check compatible with the existing ES2020 target and rejects prototype keys.

On reduced-height screens, the Agenda booking wizard and native editor forms keep header/footer
inside the viewport and scroll their own body. Secondary header guidance remains available to
screen readers while compact presentation frees space for the fields. Phone wizard actions share
a row, including the back/continue/review steps. The canonical coral modal, controls, calendar and
table sliders remain in use. This is owner-scoped presentation, with no change to the shared
modal engine, request policy, permissions, API or persistence.

`test:scheduling` verifies the calendar labels in all eight locales and restored sort state with
newer built-ins unavailable. `test:scheduling-browser` covers desktop and 320x360, 360x740,
390x844 and 844x390 phone viewports, including complete reservation submission with synthetic
HTTP, reachable wizard/editor footers, day/week/month, contained horizontal scrolling, event
cards/table, eight locales, permission filtering and dark mode. Set `INDICE_SCHEDULING_TEST_PORT`
when another fixture already uses the default test port. Browser testing uses synthetic data and
does not certify a physical phone or real external delivery.


## Employee, Inventory service and guided booking integration — 2026-10-21

The approved Agenda extension keeps the existing coral module, shared modal frame, calendar/table
sliders, independent permissions, company boundaries, reservation lifecycle and historical snapshots.
It supersedes the earlier restriction on explicit **private** client creation only. Public booking
still cannot select or create a Sales client and never links an unverified email automatically.

- `/members` now delegates to the HR-owned `HrSchedulingDirectoryService`: active work profiles,
  active company memberships and no termination date. It exposes only user identity and display
  name. New team setup selects these real employees and does not create or invite a user. Existing
  staff without an HR profile stay compatible; a known inactive/terminated employee is not bookable.
  Operators retain their own-staff scope and administrators retain company configuration access.
- `GET /inventory-services?search=&page=1` is an administrator/configuration projection through
  Inventory-owned `SchedulingServiceCatalog`, scoped by company and nondeleted `SERVICE` type.
  Pages contain 25 records with an escaped name/SKU search, totals and active status. No prices,
  stock, employee private details or additional module grants are exposed. Active services can be
  added to Agenda and retain `productId`; one product has at most one company Agenda configuration.
  Legacy independent services remain editable. Linked inactive/deleted/retyped products stop being
  offered or booked. Agenda owns only booking name/description, duration, notice, break and hours;
  it never writes the Inventory product.
- Service hours support up to 28 nonoverlapping weekly windows. Empty hours retain all eligible
  staff hours. The owner intersects service windows with employee windows in the employee's zone,
  including DST validation, blocked dates and existing cross-module resource checks. Staff can set
  a 0–120 minute break; the larger service/staff break is snapshotted on new individual requests.
  Existing confirmed appointments retain their original duration/buffer. Adjacent sessions are
  blocked by the snapshotted break. Updating configuration does not rewrite appointment history.
- Public setup now returns company name, a generated nonconflicting alias and booking readiness.
  The modal selects a page title, Cards/Compact presentation, a colour and publication; brand/link
  are prepared automatically. Legacy titles, aliases, descriptions and saved theme remain intact.
  Save keeps the modal open with confirmation and saved-version links, using the returned version
  on subsequent saves. Publishing requires an active service/employee pair with weekly hours or
  an upcoming published event. Public adapter flags, entitlement, registry, sessions, rate limits,
  idempotency, audit and lifecycle gates remain mandatory. Setup does not silently publish a page.
- `POST /booking-clients` uses Scheduling reservations + administrator + CSRF and native CRM/contacts
  authority. `SchedulingClientCaptureService` owns a company/actor/key fingerprint receipt; the
  Sales-owned explicit `createForScheduling` port delegates native contact creation to `SalesService`.
  It requires consent and a valid name/email, supports safe retries and returns the selected master
  client. No new contact table, inferred association, external notification or automatic booking is
  introduced. Creation uses one inline form, then fills the booking wizard; capture continues only
  after the normal reservation review/consent. Public code never mounts the client picker.
- Native editors and private capture guard against a changed authorization revision, keep drafts on
  recoverable errors, disable inputs while saving and explain invalid hours or unavailable sources.
  Setup errors offer permitted service/team configuration actions instead of a dead end. Translation
  coverage includes all eight locales. Phone bodies scroll within the native modal and retain the
  visible footer; table/calendar horizontal navigation remains contained.

V341 is additive: nullable service-product identity, service weekly windows, staff break and private
client retry receipts. It backfills no clients, employees, permissions, prices or publication.
Verification uses a disposable MySQL database and synthetic HTTP/browser data, never functional
business mutations. Local activation retains a private pre-migration backup and previous runtime;
rollback restores application processes without reversing Flyway history. Public access rollback
remains the existing scheduling adapter flag. No production rollout is included.
