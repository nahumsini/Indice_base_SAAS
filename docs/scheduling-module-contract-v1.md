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
Daily navigation is Agenda/reservations → Clients → Events → Indicators. Calendar and Reservations
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
Recurrent events, staff exceptions/holidays and external calendar sync are not claimed.

## Pilot behavior

Services define duration, buffer and minimum notice. Staff reference active company memberships,
not an arbitrary email supplied by a visitor. Weekly availability is explicit and fail-closed.
Events use one host and a bounded capacity. Requests contain consented minimal contact information.
Public requests and event registrations remain REQUESTED until an authorized operator confirms.
They do not guarantee a slot or seat. Confirmation rechecks time, collisions and capacity inside
a transaction. No email verification or external email delivery is claimed in this pilot.
No automatic meeting provider, checkout, Stripe mutation, CRM write, entitlement, or ERP signup.

Booking states: REQUESTED → CONFIRMED → COMPLETED | NO_SHOW; REQUESTED/CONFIRMED → CANCELLED.
Future REQUESTED/CONFIRMED reservations can be paused (PAUSED), releasing the slot or event seat.
The prior status is retained; resume rechecks the current staff, service, time, availability,
resource collisions and event capacity before restoring it. A paused event identity remains
deduplicated. Pause/resume, like cancellation, require a reason and optimistic version.
Administrators can reassign future individual REQUESTED/CONFIRMED/PAUSED sessions to another
active company member with valid availability. Event registrations retain the event host;
historical attendance cannot be reassigned. The snapshotted duration/buffer is preserved, and
the existing cross-company resource mutex prevents collisions. Former inactive staff do not
trap existing company bookings. No notification is inferred; contact participants manually.
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
| `POST /api/v1/scheduling/reservations/{id}/assignment`, `/management` | Same session/module/reservations/object checks plus CSRF; assignment requires administrator, management allows own-staff operator | Transaction, optimistic version, current availability/resource checks; reasoned audit with previous/next staff IDs; no hard delete |
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

The narrow read-only `SalesClientDirectoryService` and `/scheduling/clients` endpoint remain
compatible for existing consumers: company/contact names, email, phone and status. That contract
cannot write clients, opportunities or financial state. Public contact submissions do not create
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

No changes to Stripe, prices, consulting monthly benefits, invitation/email delivery, external
calendar providers or global prospect/CRM records. Email verification, reminders, verified
participant self-service, webinar streaming/meeting links and CRM attribution remain future owner
integrations, not hidden placeholders. All deployment/public-release gates still apply.
