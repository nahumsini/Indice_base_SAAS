# Platform customer modal clarity — 2026-09-14

## Behavior

The customer workspace presents each product once. Administrative grants and contract records
remain available as read-only details with their dates, reasons, versions and prices. It omits
an empty available-offer block. A product supported by both a subscription and an administrative
grant has separate, explicitly named actions for those two different operations.

Platform Users contains the capacity entry point and seat/storage grants, including quantities.
The product form only offers products without an effective administrative product grant; the
capacity form offers seats and storage, with explicit units. Both forms show the customer, reason,
and a choice between expiration and permanent validity. Fields are disabled during submission.

Withdrawal messages use the selected grant's actual type. Product withdrawal explains the existing
backend behavior: revoke every stored ACTIVE grant for that product, including future-dated
records, while retaining access supplied by a subscription or another package. Seat/storage
withdrawal describes the quantity removed and does not claim to remove modules, users or files.

Pending commercial previews are owned by the workspace and survive section changes. Closing with
a pending review, or closing a changed grant form, uses a discard confirmation. Cancel retains the
work. A successful grant, commercial change or revocation remains successful if its subsequent
refresh fails, with an explicit reload message instead of suggesting a second mutation.

## Classification and references

| Surface | Type | Reason |
|---|---|---|
| CompanyAccountDrawer | Operational Workspace Modal | Compare access, people, billing and history in peer sections |
| BenefitAdjustmentModal | Standard Form Modal | One coherent grant form; no dependent wizard stages |
| Withdrawal/discard prompts | Confirmation Modal | One consequential action with a named consequence and cancel |

Uses `IndiceModalFrame`, `IndiceConfirmationDialog`, `IndiceModalValidation` and
`IndiceWorkspaceNavigation`. References: Frontend Operating System sections 18–24 and its
customer-workspace contract; `modal-engine-inventory-and-migration.md`. No new modal engine or
visual shell. Product prices/versions remain in disclosures to reduce density without losing the
contract reference. Row action controls are at least 44 CSS pixels and wrap at narrow widths.

## Files in this change

- Updated: `CompanyAccountDrawer.tsx`, `BenefitAdjustmentModal.tsx`,
  `CompanyAccount/CompanyModulesTab.tsx`, `CompanyAccount/CompanyAccessTab.tsx`,
  `CompanyAccount/CompanyActivityTab.tsx`, `PlatformAdminPage.tsx`, and
  `Customers/customerAccountTranslations.ts`, all under `react/src/app/PlatformAdmin/`.
- Created: `CompanyAccount/CompanyBenefitDetails.tsx` for read-only grant presentation and
  `CompanyAccount/companyBenefitPresentation.ts` for names, quantities and revocation impact.
- Updated regressions: `react/tests/company-workspace-flow.test.mjs` and
  `react/tests/platform-admin-flow-regression.test.mjs`.
- Documentation: this record, the Frontend Operating System and modal inventory.

## Preserved behavior

Routes, API payloads, backend authorization, company scope, subscription pricing, preview version
checks, delayed commercial changes, audits, and product-wide revocation remain unchanged.
The distributor retains its separate Access section and existing API authority. No functional
customer records were changed for verification. Backend/schema changes: N/A for this task.
Earlier unrelated working-tree changes remain intact.

## Verification

- `npm run test:platform-admin --prefix react`: 93 flow/regression tests and 40 localization tests passed.
- `npm run test:billing-flow --prefix react`: 36 passed.
- `npm run test:distributor-portal --prefix react`: 8 passed.
- Total: 177 passing tests, including 16 customer-workspace interaction tests.
- `npm run typecheck --prefix react`: passed.
- `npm run build --prefix react`: passed; existing warning for bundles above 600 kB remains.
- `git diff --check`: passed.
- Local frontend port 5174 and backend port 8082 remain running. No deployment or schema change.

Browser discovery returned no connected browser; visual desktop/mobile verification could not
be performed. Component interaction tests cover navigation,
duplicate grants, subscription/courtesy coexistence, permissions, scheduled grants, form edits,
busy states, withdrawal descriptions in all supported locales, and successful writes followed by
failed refreshes. This is not a claim of browser end-to-end coverage.
