# POS Restaurant Order Ecosystem v1

Status: approved implementation contract

Owner: Point of Sale

## Invariant

The Point of Sale module owns the restaurant order. Kiosk Engine owns the access channel. Waiter,
table/order-center, kitchen, and checkout surfaces are projections over the same tenant-scoped
restaurant order and never copy it into independent operational records.

## Experiences

| Kiosk type | Purpose | Access |
|---|---|---|
| `waiter_station` | Open tables, capture items, send rounds, serve, request check | Controlled employee PIN |
| `table_order_center` | Coordinate rooms, tables, assignments, delays, and checks | Controlled employee PIN |
| `kitchen_display` | Receive routed items and advance preparation | Controlled employee PIN |

Every definition belongs to exactly one restaurant ecosystem and one company. An ecosystem owns
its unit, business, warehouse, settlement cash register, areas, tables, kitchen routing, and kiosk
bindings. Cross-company or incompatible organizational bindings fail closed.

## State machines

Restaurant order:

`OPEN -> IN_SERVICE -> READY_FOR_CHECKOUT -> CLAIMED_FOR_CHECKOUT -> CLOSED`

`paid_at` and the linked POS ticket prove settlement when the order closes; there is no separately
observable half-closed payment state.

`CHECK_REQUESTED`, `PAID`, `CANCELLED`, item cancellation/voiding, and the corresponding privileged
commands are reserved lifecycle extensions. They are not exposed by the first-release UI.

Restaurant item:

`DRAFT -> SENT -> ACKNOWLEDGED -> PREPARING -> READY -> SERVED`

The kitchen display intentionally exposes the simpler operational flow
`SENT -> PREPARING -> READY`. `ACKNOWLEDGED` remains a compatible persisted state for in-flight or
external integrations, is projected into the visible preparation column, and may advance directly
to `READY`.

An item may transition to `CANCELLED` before preparation or `VOIDED` afterwards through an
authorized, audited command. Kitchen never changes price, tax, discount, payment, tenant, or scope.
Every item also stores the order guest number assigned by the waiter. The guest number must exist
inside the authoritative `guest_count` of the active order and remains visible in waiter and kitchen
projections without changing checkout totals or inventory behavior.

Table:

`AVAILABLE -> OCCUPIED -> CHECK_REQUESTED -> CHECKOUT -> AVAILABLE`

`CLEANING` and `BLOCKED` are explicit operational states and are not inferred from display copy.

## Settlement shift boundary

Every restaurant order belongs to the exact settlement-register shift that was operational when
the table opened. Waiter, table/order-center, kitchen, sellable-stock reservations, and POS
checkout-queue projections expose only that shift. Mutations also require the same current shift;
an old URL or delayed request cannot reactivate a command from a previous cut.

Closing the cash-register shift removes its tables, commands, kitchen rounds, ready items, and
checkout claims from the live operational projection. Opening a new shift therefore starts with a
clean dining room and kitchen board. This is a lifecycle boundary, not a hard deletion: orders,
items, rounds, statuses, timing, events, and linked tickets from the prior shift remain available
through ecosystem traceability and audit records.

## Floor plan

The waiter station renders the dining room from persisted table coordinates on a twelve-column
grid. Each table has an immutable internal code plus an editable display name, capacity, position,
and one of the canonical shapes `ROUND`, `SQUARE`, or `RECTANGLE`. Shape and position are display
metadata; they never replace table identity or break an active order binding.

Floor-plan mutation is a controlled kiosk capability restricted to authorized supervisor,
manager, owner, administrator, or root roles within the kiosk's tenant and organizational scope.
The client submits the complete visible area with optimistic versions. The backend rejects missing
or foreign tables, duplicate names in one area, overlaps, invalid dimensions, and capacity below an
active guest count. A successful transaction increments table versions and appends one ecosystem
trace event.

## Checkout handoff

The checkout request carries a typed `restaurantOrderId` independent from `preticketId`. Claiming
is atomic per company, settlement register, and cashier. Checkout validates the claimed order and
its line snapshots, creates the normal POS ticket and inventory movements, then links `ticket_id`
and closes the restaurant order in the same transaction. Cancelling the POS cart releases the
claim. Existing self-service preticket behavior remains unchanged.

## Traceability

Append-only events provide this chain:

`ecosystem -> kiosk definition -> kiosk session -> employee -> table -> order -> round -> item -> kitchen station -> settlement register/shift -> POS ticket -> payment`

Mutable operational records use optimistic versions. Orders, order items, rounds, events, tickets,
and payments are never hard-deleted. Public payloads expose only the minimum safe context after
controlled authentication.

## First release boundary

The first release includes administration of the three definitions, areas/tables, waiter capture,
kitchen progression, order-center visibility, check request, POS claim/release/checkout, presence,
ecosystem traceability, and one persisted floor-plan canvas shared by waiter and order-center
stations for table position, shape, display name, and capacity. Editing remains role-gated and is
never exposed to the kitchen display. Reservations, delivery, table-side payment, printer routing, architectural
walls, multi-floor CAD drawing, and free-form decorative objects remain outside this contract.

The waiter workspace keeps the complete command visible beside the floor plan. Product capture is
an Indice Operational Workspace Modal with POS coral hierarchy, large touch targets, guest
selection, quantity, search, categories, and sellable-stock filtering. It does not replace the
command pane with an embedded catalog and does not introduce a nested modal.

The same `waiter_station` definition is also the mobile waiter surface; it is not a parallel kiosk
type. On wide touch terminals it keeps the shared floor plan and command in a balanced split view.
On a phone it exposes explicit `Mesas` and `Comanda` panes, switches to the command after a table is
touched, and retains the same product-capture modal. The public link identifies the station while
the employee PIN identifies the waiter. Orders opened by the waiter are assigned immediately;
orders opened by the hostess remain unassigned until the first waiter mutation. Every waiter item,
round, served transition, and check request refreshes the responsible waiter projection while the
append-only event preserves the actor of each individual action. Waiter identity is projected into
both the table map and the captain/order-center monitor.

The kitchen display groups routed items by authoritative order round and preparation status rather
than rendering one disconnected card per item. Each touch card keeps table, round, guest,
quantities, modifiers, notes, station timing, and order identity visible. Its single stage action
advances every included item in one transaction while retaining one append-only trace event per
item. Oldest rounds remain first and urgency is derived from the persisted round send time.

## Hostess assignment and captain monitoring

The table/order center is the captain's kitchen and service monitor, hostess table-assignment
surface, and operational checkout handoff. It shares the same persisted floor plan as the waiter
station. An authenticated employee may select an available table, enter its guest count, and open
the same tenant- and shift-scoped restaurant order used by waiter, kitchen, and checkout. Floor-plan
editing remains separately role-gated.

Every open order projects the visible kitchen stages `SENT -> PREPARING -> READY`, served and draft
counts, authoritative rounds, and two timing layers. Kitchen-round chronometers continue to derive
from each persisted `sent_at`. The customer-journey timeline derives from persisted order
milestones: table assignment (`created_at`), first item capture (`first_item_at`), first round sent
(`first_round_sent_at`), first kitchen preparation (`kitchen_started_at`), the first point at which
all submitted kitchen work is ready (`kitchen_ready_at`), the first point at which all active items
are served (`served_at`), and check request (`check_requested_at`). These milestone columns are an
operational projection; append-only events remain the authoritative detailed history for rounds,
retries, and later service activity.

The workspace synchronizes data at most every five seconds while visible chronometers tick locally
every second. Completed stage durations use the persisted start and end milestones; only the current
incomplete stage uses the local clock. Reloading a browser therefore never resets or fabricates a
service duration.

The monitor prioritizes ready-to-serve orders first, then delayed and oldest active orders. Its
default visual SLA is attention after eight minutes and delay after fifteen minutes. These
thresholds affect color, sorting, and alerts only; they never mutate an order or kitchen item.
Kitchen remains the only first-release surface that advances preparation. The captain can still use
the existing audited check-request command to hand a completed table to its settlement register.
