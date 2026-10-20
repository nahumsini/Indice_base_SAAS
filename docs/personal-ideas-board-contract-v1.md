# Complementary personal ideas board v1

Approved 2026-10-20: expose the existing creative canvas as an independent complementary pilot.

## Ownership and bounded reuse

- Registry slug `ideas_board`, native route `/ideas-board/canvas`, tab `ideas_board.canvas`.
- The module owns one private board per authenticated user and active company. It does not
  expose team sharing, campaign generation or real-time collaboration. The approved extension
  below adds an independent system-map draft and immutable named project snapshots.
- The Sales-owned DOM/SVG canvas, minimap, DTOs, validation and save queue are explicitly exported
  as a bounded technical canvas contract. Sales retains its campaign and Funneling ownership.
- The frontend accepts a stable `IdeasBoardApi` port. The default preserves the original Sales
  endpoint; the complementary owner injects `/api/v1/ideas-board`. Switching the resource remounts
  the editor, history and autosave queue. Authorization revision also remounts the owner page.
- Server controllers choose a fixed `IdeasBoardScope` enum. Requests cannot choose tables,
  buckets, modules or actor prefixes. The enum is the complete allowlist, not a dynamic framework.
- Existing Sales routes, actor keys, payloads, tables, permissions, photos, validation and retry
  semantics remain compatible. No existing boards or photos are copied or linked.

## Data and security

| Resource | Classification and boundary |
| --- | --- |
| `personal_idea_boards` | User-owned within company; composite company/user primary key |
| `personal_idea_assets` | User-owned within company; company/user/asset key and board FK |
| `personal_idea_board_audit` | Append-only operational metadata; no text or photo payload |
| Private photo bucket | `app.storage.minio.bucket-ideas-board`, default `indice-ideas-board` |

All repository lookups include company and user. Writes lock active membership and the current
company entitlement, require the native CSRF token, module assignment and tab access. Root bypass
of user assignment does not bypass company entitlement. Public demo sessions cannot access boards.
The actor header is a stale-context guard (`ideas_board:company:user`), never an authority source.
Photo keys are `ideas-board/company/user/UUID`, metered under `IDEAS_BOARD`; no public URLs.
Photo GET requires the same session/owner permissions and returns no-store/nosniff responses.

Native limits remain: 100 nodes, 200 arrows, 4,000 characters per note, 160 per arrow label,
512 KiB document, 50 retained photo assets, 5 MiB per PNG/JPEG/WebP and bounded dimensions.
Removing a photo node does not delete the retained asset or reclaim its storage quota; lifecycle
cleanup and team sharing are outside this pilot. Failed writes retain the draft; retry uses the
same mutation ID. CAS conflicts never overwrite newer content. Camera-only changes may recover
against unchanged content; true content conflicts require explicit reload/discard.

## UI and discovery

Use native IndiceModuleShell, branded emoji, module-tab permissions, dashboard complementary
slider and FavoritesBar. Reuse all canvas actions, keyboard controls, private photo upload,
zoom/pan, expanded view, lower-right interactive minimap and responsive/dark styling.
Existing six language catalogues cover eight regional locales. No new canvas framework.

Registry V335 classifies the module as an assignable complementary pilot. It does not grant
company/user access, change subscriptions or create prices. Activation uses normal entitlement,
module assignment and explicit tab permission. Local activation is limited to the requested demo
company; production pricing and rollout remain unapproved.

## Verification and rollback

Focused tests cover independent namespaces and versions, tenant/user/photo isolation,
CSRF and permission denials, bounded validation, private metering and old Sales regressions.
Frontend checks cover route/catalog/access, injected API port and the shared canvas interactions.
Browser fixtures use synthetic records only, including mobile and dark mode.

Deployment remains local: retain the previous immutable runtime and a private database backup.
Schema is additive and forward-only. Disable the module or roll back application classes if
necessary; do not reverse the applied migration or delete user boards. Photos require configured
private object storage. There is no offline guarantee or simultaneous-edit merge feature.


## Adopted diagnostic system and projects extension — 2026-10-20

Product authorization adds two native tabs: `/ideas-board/projects` (Mis proyectos) and
`/ideas-board/system` (Tablero Índice). All three views alias the existing `ideas_board.canvas`
personal permission. The backend enforces that scope for every new endpoint; no additional
entitlements, companies or user grants are created.

The system map is an independent private draft, arranged clockwise: People upper left, Processes
upper right, Products lower right, Finance lower left. A person may have a private photo and name.
Other elements have a category-specific icon and name; finance offers statement names without
calculating or posting financial values. The user fills the map manually during a diagnosis.
No automatic linking to company diagnosis, HR, products, accounting or task records is implied.
Every element can connect to any other element in any area; self-links, dangling endpoints and
duplicate directed links are rejected. Nodes remain inside their owning area while moved.
Area focus, full-system view, pointer/touch pan/pinch/zoom, keyboard controls, history, private photos,
connection labels and minimap follow native DOM/SVG patterns. Up to 25 elements per area, 100 total,
200 arrows, 120 characters per element name. The four-area viewport permits zoom 0.08–2; the
original freeform canvas retains its 0.25–2 range.

### Data classification and API

- `personal_system_boards`: user-owned within company, keyed by company/user; JSON document, CAS
  version, last mutation ID and digest. `GET/PUT /api/v1/ideas-board/system`.
- `personal_idea_projects`: immutable user-owned snapshots within company; company/user/UUID key,
  name, kind FREEFORM or SYSTEM, full typed content, counts, digest and creation time.
- `personal_idea_workspace_audit`: append-only operational metadata; counts, actor scope, event and
  optional project ID. No names, document text or photo content.
- `GET /api/v1/ideas-board/projects?q=&page=&pageSize=`: escaped literal name search, scoped count
  and pagination (default 12, maximum 50). `GET /projects/{id}` consults a snapshot.
- `PUT /projects/{id}` creates an immutable named snapshot. A client-generated UUID makes uncertain
  retries idempotent; changed content under an existing ID returns conflict. Maximum 200 snapshots
  per user/company. There is no update/delete or project-based operational mutation in this version.

Named snapshots do not overwrite drafts. Consultation renders a local camera only; zooming or
dragging cannot change the snapshot, current draft or business data. The Save project dialog keeps
the same ID and payload after uncertain failure. Lists abort stale requests on tab/search changes.
All module-local state remounts on authorization revision. System history/autosave uses a stable
API adapter; metadata (category/icon) participates in conflict comparison. A remote icon change
is a true content conflict, even when its visible name is unchanged. Sales/default freeform
comparisons are preserved. Optional minimap bounds/regions are decorative owner inputs only.

The existing private personal photo library is reused within this same module/actor, with its
existing 50-asset, 5 MiB and quota rules. Snapshot validation exports only read-only technical
geometry/UUID/arrow/private-photo validation from the existing canvas service. Every complete
workspace mutation locks active membership and entitlement, validates CSRF and actor context,
validates document shape and image ownership, then commits the whole draft/snapshot and audit.
Validation is separate from any Sales campaign ownership.

V336 is additive and grants no access. Roll back application classes or disable the module, retaining
V336 tables and snapshots. Reverting to the older application hides the new tabs but preserves data.
Verification uses isolated MySQL, native browser fixtures, original Sales canvas regression and
read-only checks of the actual local app; it does not populate functional diagnosis/projects.


## Adopted personal element formatting — 2026-10-20

Mi pizarra and Tablero Índice allow per-element text size (8–96 px), text/fill/outline colors
(native color picker), outline width (0–12 px), transparent fill, bold, italic and underline. Seven
allowlisted local font stacks cover system, sans, serif, monospace, rounded, handwriting and display.
This is a narrowly approved typography exception for user-authored canvas content; application
chrome retains canonical typography. No remote fonts, arbitrary CSS, HTML or styling URLs.

Selection exposes eight edge/corner resize handles with 44 px screen-space targets, pointer/touch
drag, and keyboard arrow resizing (2 px, Shift 10 px). Width and height are independent, including
images; numeric dimensions are an accessible alternative. Personal bounds are 40–1000 px wide and
40–800 px high. System elements additionally remain inside their owning quadrant. Images support
contain, cover and stretch; connections and minimap geometry follow resized elements.

The optional typed node `appearance` object carries the complete allowlisted style. When absent
it is omitted from JSON and older boards retain their presentation. Validation rejects incomplete
styles, non-hex colors, unknown font/image-fit tokens, and invalid/non-finite numbers. JSON storage
needs no new migration. Complete drafts and immutable project snapshots preserve appearance and
dimensions. Format-only changes participate in autosave conflict comparison and history. Read-only
consultation renders the saved format without resize handles or mutation controls.

The complementary owner explicitly enables customizable controls. Sales Funneling keeps its
original controls, API fields/omission, minimum 120×80 px geometry and rejects non-null appearance;
no Sales data or campaign workflow is migrated. Security, private ownership, quotas, CAS/retry and
permissions stay as defined above. Code rollback must retain support for already saved appearance
and sub-120×80 personal geometry; keep stored JSON and project snapshots, not a destructive reset.

Verification includes isolated persistence for all seven fonts and saved snapshots, legacy Sales
shape/retry regressions, native editor and mobile/landscape actions, image stretching, independent
edge drag, keyboard resize, history/duplication, reload and read-only project previews.
