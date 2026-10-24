# Company file library v1

Product decision: 2026-10-23. Owner: `com.indice.erp.files` and `react/src/app/SystemTools/Files`.

## Product scope

`/files` is an independent system tool, available from Dashboard → System tools → Files.
It stores company files in folders, with search, list/grid, multiple uploads and drag/drop,
compatible media/text previews, downloads, rename, move, recoverable trash and restore.
It has no integration with sales, invoices, employee documents or other business records.

Files start private. Sharing is restricted to current internal accounts of the authenticated
company (the HR directory's narrow `fileMembers` port). No public links, external recipients,
email messages or notifications are created. Known exited/inactive employees are excluded.
An internal account can use the tool without acquiring permissions to any other module.
Native subscription, session and commercial access guards remain in force.

## Authorization and hierarchy

Every operation checks session company membership, employee eligibility and company access.
Mutations use native CSRF plus the expected `files:<company>:<user>` binding, complete service
transactions, tenant-qualified SQL and company/membership locks. UUID entry IDs never imply access.
Files and folders have an owner, direct employee grants and inherited ancestor grants:

| Level | Capabilities |
| --- | --- |
| Consult | List, preview, download, inspect access |
| Collaborate | Consult plus add children and rename |
| Manage | Collaborate plus move, trash, restore and manage sharing |

Effective permission is the greatest applicable grant/ownership in the ancestry. Inherited access
cannot be removed from a child; change the parent grant. Owner rights remain. Administrator roles
do not automatically reveal other employees' private files. Revocation applies on the next request,
including private content streaming. A transfer already in progress cannot recall bytes delivered.
Moving requires management of the source and collaboration on the target. Moving to a new parent
updates inherited access. The move dialog explains this. Cycles and excessive nesting are rejected.

Trash is reversible, preserves all metadata/grants and continues to consume storage. Trashing a
folder hides descendants. Restoring it restores their inherited visibility. There is no permanent
purge in v1. An owner can restore their item to private root when its former parent is unavailable.

## Persistence and retry

V360 creates tenant-scoped entries, grants and metadata-only audit. No binary bodies in SQL.
Creation/upload IDs are client-generated UUIDs with an immutable request digest. Metadata edits
and sharing use server versions plus mutation ID/digest. Stale or changed retries return conflict;
UI retains drafts and prevents silent overwrite. Uploaded staging content is sealed under a new
immutable object key before verification and registration. Ready uploads return their original
metadata on retry, without replacing bytes. Network errors retain the selected File in memory for
explicit retry; account/company change clears state and aborts work. No files/drafts in localStorage.

## Storage and content

A dedicated private `indice-company-files` bucket reuses the existing storage provider and quota
owner. Reservations/commits use existing capacity only; this tool never purchases storage. First use initializes the already-included
allowance only when no storage-state row exists, without changing existing allowances or purchased
blocks. Capacity errors use a localized actionable message. Limits:
100 MiB/file, 20 files/UI batch, 10 recent pending uploads/user, 5,000 retained entries/company,
20 levels of ancestry, 100 direct grants/entry, 1,000 employee choices and 100 rows/page. Pending
metadata remains retryable; abandoned provider staging objects follow operational cleanup policy.
The Compose and host-network Nginx `/storage/` locations admit the same 100 MiB signed
PUT limit. General API (25 MiB) and MCP file intake (14 MiB) limits stay separate.

A new bounded 64 KiB streaming primitive supports single HTTP byte ranges for media up to 100 MiB.
Existing shared byte-array read/write limits remain 10 MiB. Content is session-authenticated with
no-store, nosniff, sandbox and same-origin resource headers; no signed read URLs are returned.
Known passive image/audio/video signatures are checked before preview. UTF-8 text is checked and
rendered as escaped React text, limited to the first 100 KiB. PDF, Office, archives, HTML, SVG and
unknown formats are opaque attachment downloads; they are never rendered as executable documents.
This format validation is not malware scanning. The tool does not make arbitrary files safe to run.

## Frontend acceptance and release

Reuse IndiceTitleBar, IndiceWorkspaceNavigation, filter/table/pagination engines and IndiceModalFrame.
Use localized copy, native company authorization revision, keyboard operation, 44px targets, mobile
stacking, dirty-close protection and explicit upload states. Scope/folder navigation is URL-based.

Verification: file service integration in isolated `indice_test_db`, HTTP content/ranges, storage
regression, upload/retry/version/draft frontend tests, TypeScript, production build and browser QA.
Rollback: restore the prior application artifact/source; retain the forward-only tables and private
objects. Do not down-migrate, reseed functional data, or discard uploaded files.

## Índice module presentation — 2026-10-23

The user approved adopting the canonical module presentation for Files. `IndiceModuleShell` owns
its blue workbar (module identity, Dashboard/favorites, scope navigation, top/left preference and
mobile scrolling). Existing `view=OWNED|SHARED|TRASH` URLs remain authoritative; this presentation
does not create a commercial module or alter file ACLs. Each scope uses a contextual IndiceTitleBar,
canonical grid/list view selector, search/select filter controls and table-attached pagination.
The Files identity reuses the existing original folder artwork, including its Dashboard shortcut.
Create/share/edit dialogs retain the native modal frame and dirty/conflict protections.
During upload, module tabs and cross-module callbacks stay blocked using the same owner busy guard;
`IndiceModuleTab.disabled` is an optional presentation extension with no default behavior change.
No backend, database, storage, billing, public-sharing or employee-access changes are part of this
presentation update. The UI uses accurate results counts, without inventing KPIs.
