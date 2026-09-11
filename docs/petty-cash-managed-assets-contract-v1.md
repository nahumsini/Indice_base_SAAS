# Petty Cash managed asset collections

Status: approved product extension, requested 2026-09-10.
Owner: Funds. This extends external fund identity; it does not create Inventory assets,
valuations, expenses, deposits, budget consumption or accounting entries.

## Capture and API

The Owner step of fund creation and the existing-fund form accept an optional ordered
collection of managed assets. Add/remove actions remain in the same modal. Each row has
`type`, `name` (required, maximum 180 characters), and optional `reference` (maximum 120).
At most 50 rows are accepted. Types retain the existing codes: `REAL_ESTATE`, `VEHICLE`,
`VESSEL`, `MACHINERY`, `INVESTMENT_ACCOUNT`, `CURRENCY`, `SECURITIES`, `OTHER`.
Incomplete added rows block progression/saving; removing every row is valid. Final review
shows all rows. These are fund identity descriptors, without independent asset IDs.

Existing create/update endpoints accept `managedAssets`; responses return it. Explicit
`[]` clears current assets. The scalar `managedAssetType/Name/Reference` fields remain a
projection of the first row for compatibility. If an older client omits the array, its
scalar fields replace/remove the first row and additional rows remain intact. New clients
always send the collection and omit UI draft keys. Backend validation precedes mutations,
within the existing transactional use case, tenant scope, authorization and CSRF contract.

## Statement history and migration

V274 adds `managed_assets_json` to funds and `managed_assets_snapshot_json` to statements.
Existing fund scalars backfill each fund's collection. Existing statement scalars backfill
that statement's own collection, including empty lists. Historical records never inherit
current fund assets during backfill, API reads, preview or PDF generation.

Both service-created and scheduler-created cuts snapshot the complete fund collection.
Editing/removing current fund assets never rewrites previous snapshots. Existing monetary
calculations, balances, currencies, ownership, routes and permissions are preserved.
PDF uses a paginated asset table so large lists do not overflow fixed identity cards.
When a fund changes internal/external classification, the target asset collection becomes active
only in the new type stage. The prior statement keeps its own asset snapshot.

The migration is additive and forward-only. A local/runtime rollback can restore the prior
JAR without dropping the new columns; an older client continues seeing the first asset.
Production promotion follows `deployment/README.md` and is outside this local task.

## Verification

Regression covers multiple-row capture, incomplete rows, removing an intermediate row,
Back navigation, final review, legacy fund editing, explicit clearing, bounded collections,
API serialization without draft keys, and multipage PDF historical identity.
Isolated transactional database tests cover create/reload/update, legacy payloads and null
JSON compatibility, tenant isolation, nested request validation, service and monthly cut
snapshots, idempotent scheduling, and unchanged money/history. Also run the existing Petty
Cash and closeout suites, migration uniqueness, TypeScript validation and production build.
