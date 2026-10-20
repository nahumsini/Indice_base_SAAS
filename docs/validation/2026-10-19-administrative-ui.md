# Administrative workspaces — UI/UX handoff, 2026-10-19

Scope: Conectar IA, Centro de kioscos, Administrar suscripción, Administración de
plataforma and Centro de capacitación. Incremental refinement of their active
`react/src/app` implementations. Existing local changes were retained.

## Result and navigation

- Administrative identity uses the existing shared header, restrained blue surfaces,
  readable responsive titles, a compact subtitle and reachable return/actions.
- AI sections have their own titles. Connections owns refresh/connect and name/status
  filters. Filtered-empty and no-account states are distinct; the detail does not show
  a connection hidden by the active filters. Revocation retains its confirmation.
- Multi-kiosks places refresh/create in the title bar; clear filters resets search,
  detailed status and quick status together. Quick status clears a conflicting detailed
  selection. Lifecycle failures remain inside the confirmation for retry. Copy failures
  remain inside the QR dialog. No links or sessions are changed by filtering.
- Subscription preserves Plan → People → Payment and adds Invoices/receipts as a direct
  section shortcut. Section navigation scrolls/focuses without replacing the draft.
  Catalog name/selection filters match localized card names and never remove hidden
  selected products, bypass the last-base-product guard or change authoritative prices.
- Platform Customers uses the canonical filter title/reset and permission-dependent
  title actions: at most three direct business actions, with Columns in overflow only
  when there are more than three. The established commercial section order is retained.
- Training has a view-specific blue title, one refresh action, and activity search/status
  within the selected certification stage. Totals, exams and certification still use the
  complete curriculum. Initial loading does not invent zero progress. A failed progress
  save is reconciled and the error remains visible after reloading authoritative data.

## Modal classification and changes

| Modal | Type and reason | Reference / result |
|---|---|---|
| AI revoke connection | Confirmation: one consequential action | Existing `IndiceConfirmationDialog`; cancel, failed retry and retained history verified. |
| Multi-kiosk lifecycle | Confirmation: enable, disable, revoke or rotate | Existing `KioskModalFrame` compact branch; local error, busy guard, named affected record, destructive action styling. Administrative confirmations now size to content on phones. |
| Multi-kiosk options | Standard form: one coherent action choice | Existing kiosk frame; lifecycle choice replaces this modal, without stacking. No business changes. |
| Multi-kiosk share/QR | Standard form: one bounded sharing task | Existing kiosk form width; removed conflicting ad hoc width. Copy failure is local and retryable. |
| Account type | Standard form: one account change plus audit reason | Existing aqua customer frame, standard width, reason guidance, busy fields and guarded submission. |
| Distributor assignment | Standard form: one relationship change plus audit reason | Same customer frame; retains direct/distributor choice and audit reason. |
| Trial extension | Standard form: review existing fixed extension and confirm prerequisite | Same customer frame; original 15-day rule and consultation checkbox retained. Busy guard; responsive account summary. |

References: Frontend Operating System §§12–13, 18, 21–22, administrative/customer
workspace rules and the KioskModalFrame branch. The shared modal engine still owns
focus trapping, Escape, body scroll, footer layout and busy-close protection.
No new modal engine, wizard or fullscreen business form was introduced. The customer
record deliberately retains its approved aqua identity. Public kiosk geometry is unchanged.
Subscription has no new confirmation/payment modal: its existing owner-controlled billing
and Stripe flows remain authoritative. Training exams/certificates were not redesigned.

## Structure, responsibilities and state

All production changes remain within the runtime owner directories:

- `BasicModules/Dashboard/Integrations`: `Integrations.tsx`,
  `components/ManageAiConnections.tsx`, `ConnectionsWorkspace.tsx`, `ConnectionList.tsx`.
  The page owns section identity; the manager owns connection actions; the list/detail
  workspace owns its presentation filters. Existing hooks/APIs still own connection data.
- `KioskCenter`: `MultiKioskCenterPage.tsx`, `MultiKioskLifecycleModals.tsx`.
  The page owns filters, clipboard feedback and lifecycle requests. The modal only presents
  the command, its failure and the existing callbacks.
- `Billing`: `SubscriptionManagementPage.tsx`, `components/BillingHero.tsx`,
  `BillingDecisionGuide.tsx`, `ModuleSelectionPanel.tsx`, `BillingProductCard.tsx`,
  `BillingInvoiceHistory.tsx`. Product-name presentation is shared between card and search;
  financial state remains in `useBillingManagement` and existing payment hooks.
- `PlatformAdmin`: `PlatformAdminPage.tsx`, `AccountTypeEditModal.tsx`,
  `DistributorAssignmentModal.tsx`, `Customers/TrialExtensionModal.tsx`. Existing
  API/persistence handlers retain ownership; forms apply the same eligibility rules to
  submit events as to their buttons.
- `Training/TrainingWorkspace.tsx`: view identity, filtered activities and load feedback.
  Curriculum, progress API, exam policy and certificate ownership are retained.
- Shared: `components/frontend-os/IndiceAdminWorkspaceHeader.tsx`, new
  `adminWorkspaceCopy.ts`, `components/kiosk-engine/KioskModalFrame.tsx` and the billing
  history entry in `components/icons/moduleTabArtwork.ts`.

Connection, kiosk, catalog and training filters use the existing
`useWorkspaceNavigationMemory` engine, scoped by authenticated company/user. Training
also remembers the selected stage. Restored values are checked against current options.
These preferences contain no credentials, account connection objects or financial draft.
No replacement state system was added. Shared copy contains presentation labels for all
8 runtime locales; business meaning stays with each module.

Exportability: the shared header/copy remain presentation-only. Features keep their native
owner components, API shapes and routes. No new export or download format was needed.

## Verification

- 165 focused tests passed: integrations, kiosk visual shell and owner regressions,
  platform administration, training, billing, payment methods and system-tools navigation.
- TypeScript `tsc --noEmit`: passed.
- Vite production build: passed. Existing large-chunk warning remains; no compile error.
- Chrome and WebKit synthetic browser flows: AI navigation, filtered empty/reset,
  revocation cancellation/failure/retry/history; training authorization, view navigation,
  persisted progress, filters, localization and failed-save recovery; kiosks filters,
  conflicting status reset, lifecycle failure/retry and QR; subscription filters and
  history focus without billing writes; platform filter reset and all three simple forms.
- Desktop 1440×1000, mobile 390×844 and simple forms at 320×700; dark-mode screenshots.
  Browser screenshots were inspected for layout, error visibility and reachable actions.
- Local Vite responds at port 5175. Browser fixtures intercept APIs and block non-local
  traffic. No functional/production database, actual account, payment or public kiosk
  session was mutated by verification.

Test support: `react/tests/admin-workspaces-browser.mjs`,
`react/tests/browser/admin-workspaces.{html,tsx}`; existing AI/training browser suites
and system-tools navigation regression were updated for the refined UI and memory.
Artifacts/logs live under `/tmp/indice-admin-*`; validation screenshots are temporary,
not production assets. Canonical frontend guidance was updated in the same change.

## Preserved behavior and limits

Preserved: all business routes and permission gates; tenant/owner enforcement; API DTOs;
connection authentication/revocation semantics; kiosk PIN, tools, public sessions and
lifecycle endpoints; subscription draft, capacity, charges and provider authority;
platform role/distributor/trial policies; curriculum, exams and certificates.

Backend/schema/deployment changes: N/A. Git push/deployment: N/A for this request.
No new financial action or external message was performed. The public kiosk operating
screens and the many specialized platform workspaces retain their existing owner-specific
flows; this pass does not claim a redesign or recertification of every nested workflow.
Remaining known build warning: bundles above the configured 600 kB threshold. This is
separate from the administrative UI changes.
