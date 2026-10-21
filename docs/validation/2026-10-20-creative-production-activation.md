# Production creative workspace release — 2026-10-20

Status: ACTIVATED AND VERIFIED. Five-minute production observation: PASS.

Candidate: `23d5b954a2b9a5d14a74d8c0fc06ac3323f233c5` (creative workspace `6873a611` plus MCP dependency correction).
Recovery backend: `16917ace77c6db301da46a690f5ec2e80cb04df7`.
Target: `https://app.indiceapp.com`; APPTEST is outside this release.

## Scope and retained behavior

Personal idea boards gain drawing, private multimedia, additional shapes and connections,
project organization, outside regions and process steps. Guided learning is updated in both languages.
The sales funnel rejects personal-only extensions. Tenant ownership, authenticated user scope,
CSRF and optimistic concurrency are retained. No schema migration or billing change is included.

The initial full CI passed all backend/type checks and 158 MCP tests, then failed the dependency audit.
SDK 1.31.0 was updated to 1.32.1, with an explicit 20,000-element input bound and a rejection/recovery
regression. The 598-tool catalog and authorization/confirmation protocol are unchanged.

## Evidence completed

- 64 focused frontend regressions; TypeScript and production frontend build passed.
- 70 focused backend checks passed against an isolated test database.
- 3 compatible recovery tests passed; recovery preserves new JSON/media readers while personal
  workspace mutations return 503. Old UI cannot silently overwrite new saved elements.
- 9 focused SDK tests and all 159 MCP regressions passed; the runtime dependency audit reports zero vulnerabilities.
- Production-environment preflight: 3,817 backend tests, zero failures/errors, one existing skip.
  Backend/frontend/deployment trees are identical between the base and final candidate;
  the final MCP source was independently rebuilt/tested/audited, with Git-path evidence retained.
- Native Chrome: create/format/duplicate notes, drawing, named project persistence, process-step
  editing, reload, and read-only project review. Browser console had no errors.
- Browser file upload could not be exercised because the installed extension lacks file URL access;
  backend multipart/media signature/ownership/Range tests passed. No production messages were sent.
- Repository/current-commit secret scan found no new credential; existing source matches reviewed
  as synthetic fixtures/identifiers/shell variables. Historical Stripe TEST key remains unresolved.
- Exact-candidate GitHub CI passed: 3,817 backend tests (one pre-existing V289 upgrade test skipped),
  930 frontend regressions, 159 MCP tests, 16 deployment recovery tests and two actual Nginx traffic checks.
- Four immutable images built with revision labels, digests and CycloneDX SBOMs. Secret findings: zero.
  Web/MCP have zero HIGH/CRITICAL findings; the two retained Spring rendering findings in backend/recovery
  are not applicable to these exact sources (no XSLT or SSE fragments; MVC regression passed).
- Static frontend runtime contains no Node/npm/development dependencies; dev-only audit findings are
  retained with applicability evidence, not represented as patched.
- SQL, objects, protected configuration and integrity checks backed up before activation.
- Candidate and compatible recovery restoration reached health with every original business column/row and billing state unchanged.
- Canonical host-network deployment dry-run and exact runtime/environment/module-access guards passed.
- Main and the task branch contain the exact application candidate. Later commits contain release documentation only.
- 40 inactive unreferenced historical images archived with complete gzip/OCI-tag/digest verification
  before removal; live containers, rollback images, business data and all backups were retained.

## Activation and verification

The owner authorized this exact revision while leaving the historical Stripe TEST-key
revocation pending, under the [bounded release decision](../decisions/2026-10-20-creative-release-stripe-deferral.md).

Activation began at **2026-10-20 23:32:11 EDT** (2026-10-21T03:32:11Z).
Canonical activation and public checks completed at **2026-10-20 23:33:36 EDT**.
Five-minute observation ended at **2026-10-20 23:38:37 EDT**
(2026-10-21T03:38:37.592Z): six successful samples, HTTP 200 for web/API/storage/MCP,
zero service restarts, and no new backend errors.

The SQL/object/configuration backup is `backups/production-20261021T024741Z` in the
protected release directory. Its checksums passed immediately before activation.
Both candidate and recovery had passed isolated restoration before this activation.
[Exact-candidate CI](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/39535620240)
completed successfully. Later documentation does not change the deployed application.

Canonical public smoke checks passed: web/API/storage, CSRF session establishment,
synthetic invalid-login denial, protected payment setup/callback routing, and public
MCP/OAuth metadata. No real payment, message, publication or provider change was
performed by verification. Production HTML matches the exact image; security headers
and anonymous denial on protected routes passed.

Runtime guards confirmed unchanged settings, mounts, provider-secret fingerprints,
V339 migration history, APPTEST containers, all five complementary-module entitlements
and associated roles/tab permissions. The existing 40-company access remains available.
Production billing catalogue and subscription-version snapshots remained identical.

Protected environment: `/root/indice-creative-release-20261020/production.env`.
Exact application source: `/root/indice-creative-release-20261020/source`.
All three application images are tagged `23d5b954a2b9`; MinIO's image is unchanged.

## Recovery and remaining limits

The stopped `-rollback` backend is `indice-erp-backend:16917ace77c6-recovery`,
paired with the previous web/MCP/MinIO. Recovery preserves new saved workspace JSON
and private-media reads, and temporarily rejects personal-workspace mutations with
503 so the old UI cannot overwrite new fields. Other modules retain prior behavior.
The original backend is retained stopped for reference; use the compatible recovery
image for rollback. Database and objects must remain intact.

```sh
CONFIRM_ROLLBACK=true HOST_BACKEND_PORT=8083 HOST_WEB_PORT=8080 \
HOST_MINIO_API_PORT=9000 MCP_ENABLED=true HOST_MCP_PORT=3011 \
ROLLBACK_HEALTH_WAIT_SECONDS=60 \
bash /root/indice-creative-release-20261020/source/deployment/scripts/rollback-host-network.sh
```

No rollback was required. Human production UI acceptance is not implied by HTTP/runtime
checks. The browser upload restriction and unpatched, reviewed dependency findings above
remain explicit limits. Historical Stripe TEST-key revocation remains HIGH and unresolved,
owned by the release owner; this release's acceptance ends with observation. It does not
authorize future releases or claim revocation. No other release gate was waived.

Private evidence: `/root/indice-creative-release-20261020` and local matching release directory.
No private environment, backup contents, credentials, personal records or raw tokens are included here.

## Exact image IDs

- backend: `sha256:d223dbcf237c41a36cabc589457773f18a4ccf6228569949d064d96a00020a17`
- web: `sha256:0deb69da841b541b3cfa3b823e5ea0336e8ef06d876a3f28b5393fbff4c8f77a`
- mcp: `sha256:6bfe0574e81928891b84b4dfd1d6972449b1ab923e9a8448dc7cbf10d58e2eb3`
- recovery: `sha256:3df6a356bb99b099ac71b339dcea4616eb7c599353b3f49513a858836868ed3a`

## Changed files

Release evidence also updates `docs/indice-public-release-security-gate.md`,
`docs/decisions/2026-10-20-creative-release-stripe-deferral.md` and this validation record.
The application delta contains:

- `docs/decisions/2026-10-20-complementary-module-availability.md`
- `docs/indice-backend-operating-system-v1.md`
- `docs/indice-frontend-operating-system-v2.md`
- `docs/indice-mcp-operating-system-v1.md`
- `docs/learning-function-coverage.md`
- `docs/personal-ideas-board-contract-v1.md`
- `docs/validation/2026-10-20-complementary-module-availability.md`
- `integrations/indice-mcp/package-lock.json`
- `integrations/indice-mcp/package.json`
- `integrations/indice-mcp/src/mcpServer.ts`
- `integrations/indice-mcp/src/test/mcpServer.test.ts`
- `react/src/app/BasicModules/Sales/Funneling/BoardBatchControls.tsx`
- `react/src/app/BasicModules/Sales/Funneling/BoardDrawingElement.tsx`
- `react/src/app/BasicModules/Sales/Funneling/BoardElementFields.tsx`
- `react/src/app/BasicModules/Sales/Funneling/BoardInlineText.tsx`
- `react/src/app/BasicModules/Sales/Funneling/BoardPrintButton.tsx`
- `react/src/app/BasicModules/Sales/Funneling/BoardToolEmoji.tsx`
- `react/src/app/BasicModules/Sales/Funneling/IdeasBoard.tsx`
- `react/src/app/BasicModules/Sales/Funneling/IdeasBoardMinimap.tsx`
- `react/src/app/BasicModules/Sales/Funneling/NodeAppearanceControls.tsx`
- `react/src/app/BasicModules/Sales/Funneling/boardBatchCopy.ts`
- `react/src/app/BasicModules/Sales/Funneling/boardBatchModel.ts`
- `react/src/app/BasicModules/Sales/Funneling/boardConnectionCopy.ts`
- `react/src/app/BasicModules/Sales/Funneling/boardCreativeCopy.ts`
- `react/src/app/BasicModules/Sales/Funneling/boardDrawing.ts`
- `react/src/app/BasicModules/Sales/Funneling/boardFileTools.ts`
- `react/src/app/BasicModules/Sales/Funneling/boardGeometry.tsx`
- `react/src/app/BasicModules/Sales/Funneling/boardInteractionCopy.ts`
- `react/src/app/BasicModules/Sales/Funneling/boardMedia.tsx`
- `react/src/app/BasicModules/Sales/Funneling/boardPrintDocument.ts`
- `react/src/app/BasicModules/Sales/Funneling/boardWorkbench.css`
- `react/src/app/BasicModules/Sales/Funneling/boardWorkbenchCopy.ts`
- `react/src/app/BasicModules/Sales/Funneling/ideasBoard.css`
- `react/src/app/BasicModules/Sales/Funneling/ideasBoardLayout.ts`
- `react/src/app/BasicModules/Sales/Funneling/ideasBoardModel.ts`
- `react/src/app/BasicModules/Sales/Funneling/nodeAppearance.css`
- `react/src/app/BasicModules/Sales/Funneling/nodeAppearance.ts`
- `react/src/app/BasicModules/Sales/Funneling/nodeAppearanceCopy.ts`
- `react/src/app/BasicModules/Sales/Funneling/useBoardTitleDock.ts`
- `react/src/app/ComplementaryModules/IdeasBoard/BoardFileControls.tsx`
- `react/src/app/ComplementaryModules/IdeasBoard/IdeaProjects.tsx`
- `react/src/app/ComplementaryModules/IdeasBoard/PersonalIdeasBoard.tsx`
- `react/src/app/ComplementaryModules/IdeasBoard/ProcessStepsFields.tsx`
- `react/src/app/ComplementaryModules/IdeasBoard/SystemBoard.tsx`
- `react/src/app/ComplementaryModules/IdeasBoard/SystemBoardBackdrop.tsx`
- `react/src/app/ComplementaryModules/IdeasBoard/SystemCatalogPicker.tsx`
- `react/src/app/ComplementaryModules/IdeasBoard/SystemElementFields.tsx`
- `react/src/app/ComplementaryModules/IdeasBoard/SystemNodeContent.tsx`
- `react/src/app/ComplementaryModules/IdeasBoard/WorkspaceCanvas.tsx`
- `react/src/app/ComplementaryModules/IdeasBoard/boardFileCopy.ts`
- `react/src/app/ComplementaryModules/IdeasBoard/boardFileModel.ts`
- `react/src/app/ComplementaryModules/IdeasBoard/ideaWorkspace.css`
- `react/src/app/ComplementaryModules/IdeasBoard/ideaWorkspaceApi.ts`
- `react/src/app/ComplementaryModules/IdeasBoard/systemBoardLayout.tsx`
- `react/src/app/ComplementaryModules/IdeasBoard/systemBoardModel.ts`
- `react/src/app/ComplementaryModules/IdeasBoard/systemCatalog.ts`
- `react/src/app/ComplementaryModules/IdeasBoard/systemCatalogCopy.ts`
- `react/src/app/ComplementaryModules/IdeasBoard/systemChannelSymbols.ts`
- `react/src/app/ComplementaryModules/IdeasBoard/systemElementCopy.ts`
- `react/src/app/learningMode/curriculum.ts`
- `react/tests/board-catalogs.test.mjs`
- `react/tests/board-connections.test.mjs`
- `react/tests/board-direct.test.mjs`
- `react/tests/board-drawing-print.test.mjs`
- `react/tests/board-files.test.mjs`
- `react/tests/board-live.test.mjs`
- `react/tests/board-tool-parity.test.mjs`
- `react/tests/board-workbench.test.mjs`
- `react/tests/fixtures/personal-ideas-board.tsx`
- `react/tests/inline-edit-toolbar.test.mjs`
- `react/tests/node-appearance-browser.mjs`
- `react/tests/personal-ideas-board-browser.mjs`
- `react/tests/system-board-browser.mjs`
- `react/tests/system-board-model.test.mjs`
- `src/main/java/com/indice/erp/ideasboard/IdeaWorkspaceContracts.java`
- `src/main/java/com/indice/erp/ideasboard/IdeaWorkspaceService.java`
- `src/main/java/com/indice/erp/ideasboard/PersonalIdeasBoardController.java`
- `src/main/java/com/indice/erp/sales/funneling/IdeasBoardContracts.java`
- `src/main/java/com/indice/erp/sales/funneling/IdeasBoardMediaPolicy.java`
- `src/main/java/com/indice/erp/sales/funneling/IdeasBoardService.java`
- `src/main/resources/ai/learning-catalog-v1.json`
- `src/test/java/com/indice/erp/sales/funneling/BoardCreativeIntegrationTest.java`
- `src/test/java/com/indice/erp/sales/funneling/BoardDrawingIntegrationTest.java`
- `src/test/java/com/indice/erp/sales/funneling/IdeaWorkspaceIntegrationTest.java`
- `src/test/java/com/indice/erp/sales/funneling/PersonalIdeasBoardIntegrationTest.java`
- `src/test/resources/ideasboard/synthetic-h264.mp4`
