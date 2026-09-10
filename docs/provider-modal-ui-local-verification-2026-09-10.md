# Provider modal UI verification — 2026-09-10

## Scope

User-approved local UI/UX remaster of `ProviderCreateModal`. Classification: **standard form**.
Uses the existing Indice modal frame with Finance green and Sales coral variants.

## Presentation changes

- Keep provider name, type and status visible. Name-only capture is available with existing defaults.
- Put optional contact, tax details, assignment and owners in collapsible native sections.
- Show captured values in each section summary, including when editing an existing provider.
- Reuse searchable selectors for unit, business, accounting account and responsible users.
- Correct mixed Spanish/English provider labels and localize saving/error feedback.
- Keep Cancel and Save in the stable footer. Explain why an empty form cannot be saved and
  visibly disable Save. Prevent concurrent submissions and retain the draft after save errors.
- Open and focus a collapsed section when native email validation finds an invalid value.

## Behavior preserved

All original provider fields, type/status defaults, name and company trimming, unit/business
filtering, account validity rules, submit payload, callbacks, API routes, permissions and backend
persistence remain unchanged. Collapsing a section never clears its data. No reference is selected
automatically. Existing unrelated working-tree changes are preserved.

## Files

- `react/src/app/BasicModules/Expenses/Providers/components/ProviderCreateModal.tsx`
- Finance translations: `types.ts`, `es-MX.ts`, `en-CA.ts`
- `react/tests/provider-modal-ui-regression.test.mjs` and `react/package.json`
- Frontend Operating System: provider presentation contract; this verification record.

## Validation

- Expenses UI regression: 30 passed, including six provider regressions.
- Expenses flow regression: 76 passed.
- Budget regression: 19 passed.
- TypeScript and production frontend build: passed. The existing large-chunk build advisory remains.
- Isolated Playwright/Chrome fixture imports the real modal and styles with synthetic reference
  catalogs and a local submit callback. Verified name-only creation, unchanged optional values on
  edit, validation inside a closed section, scoped searchable selections, failure/retry, Escape,
  Spanish/English, Finance/Sales, desktop 1440×1050 and mobile 390×844 including dark mode.
- Completed browser checks have no page errors or dialog horizontal overflow. Initial fixture run
  used an incorrect expected error message; aligning the test with the actual localized copy passed.
- UI artifacts and harness: `/tmp/indice-provider-modal-qa/`. The temporary fixture server is stopped
  after verification; frontend `localhost:5174` and backend port 8082 remain available.
- The application frontend serves the revised provider component at the existing local route.

## Limits

Backend/database tests: N/A for this presentation change. The fixture does not create real
providers or test live database persistence. Deployment/migrations: N/A; no production changes.
