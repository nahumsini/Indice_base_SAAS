# Budget wizard UI verification — 2026-09-10

## Scope and classification

User-approved local UI/UX change. Classification: **Modal Wizard Índice**. The existing dependent
steps remain Cost → Schedule → Final review, using the shared frame, stepper, summary, validation
and footer. No deployment or production mutation is part of this change.

## Presentation changes

- Remove repeated cost headings, duplicate explanations and nested section cards.
- Group amount and currency, retain a visible searchable accounting account, show unit/business
  as a compact disclosure with Change, and make the optional note expandable.
- Expose three mutually exclusive tax choices in this wizard only: none, included and added.
  Reuse the existing tax handlers, profiles and calculations; other modals retain their checkboxes.
- Provide explicit 3/6/12-calendar-month end-date shortcuts starting with the chosen first due
  date. Show the actual dates returned by the existing recurrence generator, including month-end
  and leap-year behavior. Longer schedules can expand to show every generated date.
- Review provider, concept, account, currency, organization, note, tax treatment/amount, period,
  actual dates and total; Edit cost/Edit schedule preserve all captured values.
- Show contextual footer totals and only show Back after the first step. Explain unmet existing
  requirements. Preserve input on failed save; prevent concurrent submissions while saving.
- Existing-line editing displays a single-line amount/date, matching the existing submit handler.

## Behavior preserved

Unchanged draft builders, API shapes, save handlers, tax mathematics, recurrence generator,
preferred-currency initialization, automatic unit/business/account defaults, permission boundaries,
monthly payable generation and payment/overdue behavior. This is not a data migration or a change
to the budget-to-expense contract. Existing unrelated working-tree changes were preserved.

## Files

- `BudgetCreateModal.tsx`: wizard orchestration and presentation state.
- `BudgetWizardCostStep.tsx`: cost fields, optional disclosures and existing selector integration.
- `BudgetWizardSchedule.tsx`: date shortcuts, generated-date preview and final review.
- `BudgetTaxControls.tsx`: opt-in tax-choice presentation.
- Finance translation types plus `es-MX.ts` and `en-CA.ts`: localized labels and guidance.
- `budget-wizard-ui-regression.test.mjs` and `react/package.json`: repeatable focused regression.
- Frontend Operating System: approved budget presentation contract.

## Verification

- `npm run test:budgets`: **19 passed** (including 7 wizard regressions).
- `npm run test:expenses`: **76 passed**, covering consumers of the shared tax component.
- `npm run test:expenses-ui`: **24 passed**.
- `npm run typecheck`: passed.
- `npm run build`: passed; existing bundle-size advisory remains (>600 kB chunks).
- Isolated Playwright/Chrome UI fixture imports the actual components, real draft builders and
  recurrence/tax functions. It uses synthetic references and an intercepted local submit callback;
  it does not create budgets in the functional database. Tested desktop 1440×1050, mobile 390×844,
  mobile dark, Spanish and English, including no-tax capture, included/added transitions,
  account search, unit/business changes, notes, Back/Edit navigation, leap-day dates, failed save
  and identical-data retry. No page errors or horizontal overflow in the completed checks.
- Visual artifacts and harness: `/tmp/indice-budget-wizard-qa/` (temporary, synthetic data only).
- The existing application on `localhost:5174` serves the updated component; its frontend and
  backend on port 8082 remain running. The temporary fixture server is stopped after verification.
- Connected browser discovery returned no browser; isolated Chrome was used for local UI QA.

## Limits

Backend/database tests and deployment checks: N/A for this presentation change. API calls and
real database writes are intentionally absent from the UI fixture; live end-to-end persistence
is not claimed by these checks. No new backend or production guarantee is inferred from a UI build.
