# Modal Engine Inventory and Migration Plan

## Goal

Consolidate presentation into `IndiceModalFrame` plus four classified modes: confirmation, standard form, wizard, and operational workspace. Business state, validation, and API behavior stay module-owned.

## Existing shared foundation

- `IndiceModalFrame`: canonical header, body, footer, overlay, tone, width, and busy behavior.
- `IndiceModalFooter`, `IndiceModalWizardStepper`, `IndiceModalValidation`, and `IndiceModalSummary`: canonical workflow primitives.
- `IndiceConfirmationDialog`: canonical destructive or consequential confirmation.
- `KioskModalFrame`: kiosk specialization over the shared modal foundation.
- `ColumnasConfigModal`: approved system utility for table-column configuration.

## Inventory by module

| Module | Main modal families | Current state | Migration target |
|---|---|---|---|
| Human Resources | employee wizard, attendance, schedules, assets, records, permissions, payroll | mixed frames; Schedule is workspace reference | migrate standard forms and detail dialogs first; retain schedule workspace behavior |
| Sales | sales wizard, quotes, prospects, contacts, products, commissions | `SalesModalFrame` already delegates to shared frame | remove remaining local styling duplication and classify every flow |
| Point of Sale | payments, shifts, returns, cash, purchase orders, customer display | `PosModalFrame` duplicates frame behavior | replace POS frame with shared frame adapter; preserve checkout workspace exceptions |
| Expenses and Payables | expenses, payments, providers, budgets, payment accounts, kiosk access | Finance primitives and local dialogs coexist | migrate finance primitives to shared frame and action toolbar |
| Inventory | stock adjustments, transfers, movements, warehouses, product catalog | local inventory primitives and transaction modals | use standard form for adjustments; workspace for transfer line selection |
| Receivables | credit policy, credit sale, payments, detail, files | `ReceivablesModalFrame` is module-specific | delegate to shared frame and reuse attachment pattern |
| Petty Cash | expenses, statements, fund and reconciliation workspaces, kiosk attachments | mixed detail and workspace modals | preserve workspaces; migrate detail and attachment flows |
| Processes and Tasks | task forms, completion, audit, attachments, reports, project/process forms, kiosks | many dialogs; action language is a useful reference | extract shared `ModalActionToolbar`; classify task forms and confirmations |
| Dashboard and Configuration | users, business structure, access | isolated forms | move to standard form and confirmation patterns |
| Complementary modules | forms, vehicles, work climate, affiliates, minutes, email | inconsistent local dialogs | audit after basic modules and use shared frame only |

## Migration order

### Platform customer service — 2026-09-14

- `CompanyAccountDrawer`: **operational-workspace** using `IndiceModalFrame` and peer navigation.
  One product row owns the module's access actions and read-only grant details. Seat/storage
  capacity lives with Users in platform administration. Commercial previews survive navigation.
- `BenefitAdjustmentModal`: **standard-form** with product or capacity scope, explicit validity,
  quantity units, reason, disabled fields while saving, and one submit action. No dependent stages
  require a wizard. It replaces the parent surface and returns to the same customer section.
- Platform `ConfirmModal` and discard prompts: **confirmation** using
  `IndiceConfirmationDialog`. Withdrawals explain the actual grant type and existing backend
  scope; discard prompts retain the pending input when canceled. No stacked active overlays.
- Shared frame references are the Frontend Operating System's HR Schedule workspace and HR
  Records standard-form density. No new shell, route, modal engine, or backend contract.
- Verification and limitations: `indice-platform-admin-modal-clarity-2026-09-14.md`.

### Expenses additions — 2026-09-10

- `ExpenseFormModal`: **standard-form**. Payment correction is a reasoned inline confirmation
  inside its state-control section, with a shared busy boundary. No nested confirmation modal.
- `ExpenseTablePrintModal`: **operational-workspace**. The work area previews the selected or
  filtered table and supports PDF/download/print, following the quote preview flow. It directly
  uses `IndiceModalFrame` with Finance tone and shared footer/validation primitives.

### Petty Cash fund creation — 2026-09-10

- `CreateFundModal` in `PettyCashFundsWorkspace`: **wizard** for creation, with three dependent
  stages and a conditional Owner stage for external managed funds. Reuses the shared frame,
  stepper, footer, validation and final-review summaries. No nested discard confirmation.
- The existing-fund variant remains **standard-form** with immutable currency/custody after activity
  and an audited, prospective type-change section. A pending type change is shown and cancelled in
  the same modal. Both variants edit managed assets as repeatable
  rows inside the Owner section; creation reviews every row before submission. The existing fund
  API carries an additive `managedAssets` list; Funds remains the accounting owner.
- Fund configuration has no Operation step, permanent source or method checklists. The deposit
  modal chooses one source per entry: created accounts for both fund types, plus Medios externos
  for external funds. Receipt capture records the actual exit and applies accounting fields only
  when the active statement stage is internal.
- Statement closing keeps balance disposal in its existing modal. Returning a positive balance
  reveals a required destination there: an eligible company account for either type, or named
  Medios externos for an external fund.

1. Stabilize the shared engine: add `ModalActionToolbar`, selector rules, unsaved-change guard, and attachment presentation contract.
2. Migrate Point of Sale because it has the largest duplicated frame and most transaction variants.
3. Migrate Expenses, Inventory, and Receivables as a commercial and financial group.
4. Migrate Human Resources standard forms and details; preserve Schedule as the operational-workspace reference.
5. Migrate Processes and Tasks while reusing its established table-action language.
6. Audit complementary modules and remove remaining one-off shells.

## Acceptance criteria for every migrated modal

Scheduling team refinement (2026-10-22): Team/availability is a compact **Operational Workspace**
with search/status filters and a single directory with direct Edit actions. It has no KPI cards or
parallel dossier; height follows content. Add/edit collaborator is
a four-stage **Wizard** (identity, availability, services/exceptions, review), explicitly adopted
by the user as guided setup for this domain. This supersedes its earlier standard-form decision.
Both reuse `IndiceModalFrame`; the wizard reuses the shared stepper, validation, summary and
footer. Current-stage validation gates Continue; Back retains state and only review submits.
Dirty discard replaces the form with **Confirmation** and returns to the same draft/step on
cancel/Escape. No stacked overlay, new shell or backend change. See the Scheduling owner contract
and `validation/2026-10-22-scheduling-staff-modals.md` for scope and verification.

Scheduling services (2026-10-22): Add/edit service is a three-stage **Wizard**, explicitly adopted
by the user: service source (Inventory or direct Agenda creation), booking settings, review.
Charge condition is explicit and independent of origin. Existing Inventory links and independent
records retain compatibility; configured results open the existing configuration through
the same guarded replacement. Empty/search/error states and permission-gated Inventory navigation
belong to the module. The shared frame adds optional validation, disabled progression and guarded
exit composition without changing its default consumers. No new modal engine. The subsequent
approved standalone-service extension adds an owner API field and reservation condition snapshot.
See `validation/2026-10-22-scheduling-service-wizard.md` and
`validation/2026-10-22-scheduling-standalone-services.md`.

Scheduling public agenda (2026-10-22): the user adopts the Public Catalog editor as reference and
replaces the publication workspace form with a three-stage **Wizard**: Content, Design, Review and
publish. Reuse the coral frame/stepper, fixed footer, discard/pending guards and existing page API.
The editor and public route share heading and service-card presentation. Custom colors, content,
desktop/mobile preview and explicit saved links remain module-owned. See
`validation/2026-10-22-scheduling-public-agenda-editor.md`.

Scheduling New request (2026-10-22): the existing four-stage **Wizard** retains selection,
time, contact and review, with the shared compact stepper, summaries, split footer and one-frame
discard. Module-owned state guards pending mutations synchronously, preserves contact/client
drafts on Back, retries slot reads and displays the saved private reference/status. The public
booking route retains its presentation and transport. No new modal engine or backend contract.
See `validation/2026-10-22-scheduling-new-request.md`.

Maintenance pilot (2026-10-09): request/asset/order editing, progress, labor, inventory consumption,
expense linking and configuration are **Standard Forms**. Preventive creation is a three-step
**Wizard** (asset/recurrence, procedure/closure, review). Order, request and asset dossiers are
**Operational Workspaces**. State changes, reversals, restoration, pause/resume and dirty-draft
decisions use **Confirmation** in the same active frame. Native modal/table gray tone is additive;
no separate focus trap, overlay, footer or transaction state engine is introduced. Evidence uses
explicit uploading/error/retry states and authorized downloads; print uses the existing document engine.

Employee multikiosk (2026-10-09): the personal Today/Tools/Messages navigation reuses
`IndiceConfirmationDialog` for unsaved workspace drafts. An open public `KioskModalFrame`
blocks outer navigation; its existing close flow owns the draft decision, so a second
confirmation is never stacked above the active form. In-flight operations also block leaving.
Messaging keeps its owner composer and photo viewer, with the PIN-scoped transport; switching
collaborators clears the personal workspace and drafts. No alternate modal engine is introduced.

Approved coordination completion (2026-10-08): Scheduling `InternalBookingModal` uses the shared
Wizard stepper and a stable native footer with selection/time/contact/review. `ReservationManagement`
rescheduling and `AgreementEditor` edits are Standard Forms. `EventParticipants` and `AgreementDetail`
are Operational Workspaces. Opening a participant or switching to edit/notes replaces the current
frame. Progress notes and closed-minutes addenda are reasoned Standard Forms with optimistic versions.
Shared print and calendar download actions are initiated from authorized details; no nested modal
engine or persistent contact/minutes draft storage is introduced.

- Classified as one of the four approved modal types.
- Uses `IndiceModalFrame` directly or a thin typed adapter with no visual duplication.
- Uses module tone in header and footer, neutral body, canonical close control, and shared footer.
- Uses localized copy and the approved typography weights.
- Uses shared action toolbar for internal record actions.
- Scales selections through search, scope, inactive-record handling, and quick-create return.
- Uses native transaction currency and preloads preferred currency for new monetary entries.
- Handles loading, empty, error, retry, permissions, attachments, and unsaved changes.
- Preserves current route, API, validation, permission, and business behavior.
