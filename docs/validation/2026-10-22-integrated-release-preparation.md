# Integrated local work and ordered release preparation — 2026-10-22

Status at preparation close (2026-10-22T13:46Z): TECHNICALLY PREPARED / BLOCKED BY ACTIVE HISTORICAL TEST KEY.
Application activation has not run on APPTEST or production.
The owner requests current local work in `main`, followed by APPTEST and then App.

Subsequently, the owner explicitly authorized this release with Stripe revocation
pending. Ordered APPTEST and App activation and observation completed successfully;
see the [activation report](2026-10-22-integrated-release-activation.md) for current
status. The remainder of this document records the earlier preparation state.

## Source and integration

Application candidate: `8c451b5612d07c1e4dfe291d72439838d68a5380`.
It was published to `origin/main` before either remote activation.
The continuation branch is `codex/continuacion-20261022`; it is published from the
same final repository revision as `main`. Application images retain the candidate
revision above; subsequent commits contain browser fixtures and this release evidence only.

The dirty workspace was backed up outside the repository before integration. Its 199
new/changed files were captured in `01cff403`, preserving Agenda, Mail/Sales and Meetings,
their domain contracts, tests and synthetic screenshots. Integration fixes complete the
bilingual meeting-room chapter and add the new regression files to the existing CI commands.
The original working directory was proven byte-identical to that saved snapshot before
advancing its Git index; no uncommitted work was discarded.

After `git fetch origin --prune`, current feature/deployment branches were already included
in `main`, as established by the [previous lineage audit](2026-10-21-branch-integration.md).
All five other worktrees that still exist are clean. Historical backups, patch-equivalent
release branches and deliberately restricted recovery variants remain preserved; merging
the latter would remove current behavior. No newer uncommitted work was found there.

Subsequent browser-fixture corrections change tests only. Application source, dependencies,
migrations and deployment scripts remain byte-identical to the candidate above.
The complete application file inventory is the Git comparison `033191ea..8c451b56`.

## Behavior changed and retained

- Agenda: compact team directory, guided collaborator/service capture, Inventory-linked
  or standalone services, explicit charge conditions, personalized public editor and the
  four-step internal request flow, including review, stable retries and availability recovery.
- Meetings: selected-day consultation, guided planning and a native meeting-room workspace
  with explicit minutes saving, draft/conflict protection and existing attendance/voting owners.
- Mail and Sales: shared rich editor/templates, private account signatures and stricter
  content/attachment handling, retaining explicit sending and existing recipient authority.
- English/Spanish learning catalogue covers 87 chapters in 16 modules.
- Tenant ownership, server permissions, session/CSRF boundaries, routes, historical data,
  existing entitlements and the billing catalogue remain authoritative and are preserved.
- No provider activation, real email, payment, price publication or permission grant is
  part of verification. Database mutation tests run only on disposable `indice_test_db`.

## Environment and schema boundaries

APPTEST starts at V331; App starts at V339. Candidate startup reaches V346.
APPTEST therefore requires V332–V346; production requires V340–V346. Applied migrations
are not edited, renumbered or repaired. The new V345/V346 changes are additive.

Each target retains its own protected environment, database, object store, host ports and
Nginx mount. The encryption keys and provider configuration are preserved independently.
Protected preparation and evidence: `/root/indice-release-20261022` on the VPS and
`/private/tmp/indice-release-20261022` on the workstation. Secrets and business records
are excluded from this repository report.

Both targets have independent SQL/object/configuration backups, SHA-256 manifests and
successful archive integrity checks. Isolated restore/upgrade and compatible recovery
rehearsals are required before activation. Original business columns/rows, migration
checksums, billing versions and prices are compared inside the disconnected clones.

The previous pre-V340 backend must not be used after this schema upgrade. Compatible
application recovery retains the V346-capable backend and the patched MCP, and restores
the prior web. APPTEST's older MCP is first refreshed using the canonical deployment
wrapper while retaining its existing backend/web and V331 schema; the full application
upgrade then retains that patched MCP for automatic and explicit recovery. Production's
prior MCP already contains the same security fixes.
It can recover a presentation/integration regression; defects shared by that backend
require a forward fix. No application rollback removes migrations, objects or records.

## Verification

- Focused Agenda/Mail/Meetings frontend checks: 131 PASS.
- Complete frontend CI command set: 1,068 PASS, zero failures.
- TypeScript and production frontend build: PASS; existing large-chunk advisory remains.
- Browser Agenda: private/public requests, editor, services/team, client selection,
  conflicts/retries, lifecycle, eight locales and 320px/portrait/landscape/dark: PASS.
- Browser Meetings: create retry/CSRF, four-step planning, retained Back navigation,
  series/flows, day consultation, minutes, lifecycle, agreements, scoped roles and locales: PASS.
- Native room browser: save/reload, cancel navigation with retained draft, conflict recovery,
  read-only access, separate agreement permissions and responsive/dark containment: PASS.
- Rich Mail browser: private signature, automatic insertion, Sales recipient selection,
  formatted shared template insertion, autosaved HTML and mobile review: PASS; no sends.
- Current-source secret scan: 20 byte-unchanged, previously reviewed fixture/identifier/shell
  matches and two generated bundle identifier matches. Changed-commit scan: zero findings.
  This does not resolve the separate historical Stripe finding below.
- APPTEST real-environment preflight: PASS; 3,888 backend tests, zero failures/errors,
  one historical opt-in skip; migration startup through V346, 159 MCP and 16 deployment
  recovery regressions, frontend typecheck/build and Compose/script validation.
- Exact-candidate [GitHub CI](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/39783819894):
  PASS, including all three image builds, container runtime smoke and actual Nginx traffic tests.
- Local activation: PASS; frontend 5175/API 8083, V346 with no pending/failed migrations,
  authenticated Agenda/Meetings/Mail directory reads. Existing records and infrastructure
  are retained; local demo reseeding and outbound email remain disabled during this restart.
- Production real-environment preflight: PASS, with the same 3,888 backend checks,
  one historical skip, zero failures/errors and complete MCP/frontend/deployment checks.
- Immutable backend/web/MCP images and CycloneDX SBOMs: built. Image secret findings: zero.
  Web/MCP HIGH/CRITICAL findings: zero. Backend retains the two known Spring library
  rendering findings; exact-source inspection and the two MVC exposure regressions confirm
  the required XSLT/SSE-fragment features are absent. This is applicability evidence and
  does not claim the libraries are patched; see the primary advisories for
  [CVE-2026-47884](https://spring.io/security/cve-2026-47884/) and
  [CVE-2026-47890](https://spring.io/security/cve-2026-47890/).
- Isolated restored-data rehearsal: PASS for original APPTEST V331 → V346 and production
  V339 → V346, followed by compatible backend recovery. All original business columns/rows,
  historical migration checksums and billing catalogue/subscription versions are unchanged.
  Private application authority is SELECT-only; only Flyway has migration authority there.
- Canonical host-network dry runs for both targets: PASS; neither replaces a running container.
- Additional APPTEST MCP staging/recovery rehearsal: PASS. The patched MCP reached
  readiness with the original V331 backend, the V346 candidate and compatible recovery;
  original data and billing remained unchanged in all three runs. Its canonical staging
  dry run also passed. This keeps the security correction in the retained recovery path.
- All original functional containers, images, environment fingerprints, mounts and restart
  counts match the pre-work inventory. APPTEST/App remain at V331/V339 respectively.
  Public health is HTTP 200 for both. Temporary clone/test containers and extracted object
  copies are removed; verified original backups are retained.

Immutable image IDs:

- Backend: `sha256:5a6d0507ac8f43eb4384bf3571d8aacfdfac5459bcfd582407c85891f6dc6e71`.
- Web: `sha256:b410abf866bb6d63705d1884e7c04fa4808e8b7b83ffa5a00bf2cbdd1f8bbbc1`.
- MCP: `sha256:43710b055a5b78ec24389b809a5c8b0be2fb2d369d08d4be22bfdde01d04d4ab`.

The backend/web prebuilt path uses the previously approved immutable runtime bases,
replacing only the preflight-packaged JAR and compiled static assets. MCP source and lockfile
are byte-identical to the active patched production revision `23d5b954`; the new image adds
its candidate revision label without changing the verified runtime. Image digests, labels,
source equality and SBOMs are retained in the protected manifest.

The bounded host validation uses a 3 GiB no-swap/150% CPU budget and a separate 1 GiB
test database. Existing public App/APPTEST health is observed throughout preparation.
The environment preflight source is `55b2eead`; its only difference from the application
candidate is a corrected frontend test expectation for the new room chapter. Production
sources and dependencies are byte-identical, and the candidate's complete frontend checks
were run independently. Record this equivalence rather than mislabel the earlier Git revision.

The initial integration check caught a missing room learning chapter and its stale expected
tab list; both were corrected before the published candidate. The old meeting browser test
also assumed single-screen creation, a closed parent after editing, the previous agreement
label and an inline day list. Its fixture now uses the production data-router mechanism and
the current four-step/parent-return/day-dialog behavior. The corrected complete browser flow
and separate native room checks pass. No production fix or role expansion was needed for
those stale selectors.

The first restored APPTEST probe checked a nonexistent `/scheduling/configuration`
route. The upgrade, retained-data comparison and private MCP readiness had already passed,
but that incorrect 404 expectation stopped the rehearsal. The operational probe now checks
the actual protected `/scheduling/services` and `/meetings/members` routes; all nine selected
anonymous boundaries return 401 in the current local runtime. The disconnected rehearsal
is repeated from the original verified backup, with the failed log preserved. Functional
APPTEST and production were not changed by this failed probe.

## Remaining release finding

Historical Stripe TEST credential revocation remains HIGH and unresolved. A credential-safe,
read-only provider check at **2026-10-22T13:45:51Z** returned HTTP 200. The key remains active;
no secret, account response or credential value is included in the evidence report.

The [canonical public release gate](../indice-public-release-security-gate.md) requires
current evidence and does not carry prior exceptions into a new release. The
[previous creative-release exception](../decisions/2026-10-20-creative-release-stripe-deferral.md)
expired with that release's observation. No new exception is inferred from the deployment
request. Activation remains pending resolution or a new explicit replacement decision by
the authorized release owner. Source integration, local activation and all technical preparation are complete.
The protected `release-manifest.json` records `PREPARED_BLOCKED_HISTORICAL_TEST_KEY`.
No current release exception or activation authorization file has been created.

Public activation, post-activation invariants and observation: NOT RUN.
Schema rollback: N/A; only forward migrations and application recovery are permitted.
