# Platform administration localization — 2026-09-08

Platform administration now uses the system language preference across its navigation, workspaces,
forms, dialogs, operational messages, training content and generated reports. The account-users
dialog follows the same preference as the page instead of always showing Spanish.

## Supported locales and selection

`en-CA`, `en-US`, `es-MX`, `es-CO`, `fr-CA`, `pt-BR`, `ko-CA`, `zh-CA`.
Unsupported values fall back to `en-CA`. English and Spanish regional variants share translated
wording while dates and numbers retain the selected regional format.

The header language selector uses the existing `LanguageContext` and its existing persisted
preference. It does not introduce a second language setting. Dates, amounts, counts, statuses,
accessibility labels, empty states and errors use local translation catalogs.

## Changed areas and owner files

| Area | Main implementation paths under `react/src/app` |
| --- | --- |
| Navigation, page dialogs, catalog workflow messages | `PlatformAdmin/PlatformAdminPage.tsx`, `PlatformAdmin/PlatformAdminLanguageSelect.tsx`, `PlatformAdmin/translations/` |
| Customers, companies, account access, invitations, payment requests | `PlatformAdmin/Customers/`, `PlatformAdmin/CompanyAccount/`, `PlatformAdmin/AccountCreation/`, `PlatformAdmin/QuickTestAccount/`, `PlatformAdmin/ModuleWorkOrders/`, account edit dialogs, `Billing/paymentRequestTranslations.ts` |
| Catalog, module availability, Stripe setup and validation explanations | `PlatformAdmin/Catalog/`, `PlatformAdmin/CatalogWorkspace/`, `PlatformAdmin/BillingWorkspace/`, `PlatformAdmin/flowOptions.ts` |
| Consulting, scheduling, team and coverage | Consulting workspaces and dialogs under `PlatformAdmin/`, `PlatformAdmin/ConsultingTranslations/` |
| Usage, audit and user activity | `PlatformAdmin/OperationsTranslations/` and the related activity/analytics workspaces |
| System tickets and print exports | `SystemTickets/translations/`, `SystemTickets/ticketFormatting.ts`, ticket workspace/detail/print files |
| Internal development and print exports | `InternalDevelopment/translations/` and its workspace, dialogs and print implementation |
| Training lessons, practice, exams and certificates | `Training/`, including its local catalogs and `certificateText.ts` |

Known seeded product and module labels translate for display. Administrator-authored product names,
descriptions, people/company names, notes, evidence and other business content retain their stored
text. Product codes, permission values, request IDs and persisted option values are unchanged.
Existing PDF/DOCX manuals retain their original document content; surrounding resource controls,
lesson text and newly generated certificate captions are localized.

The customer-user status tabs wrap within their container when translated labels are longer.
This is a scoped layout change; the shared modal engine is unchanged.

## Loading overlay follow-up

`components/LocalizedLoadingBarOverlay.tsx` reads the existing language preference and passes
translated titles/descriptions to the existing loading overlay. Its local `loadingTranslations/`
catalog covers 18 loading contexts in all eight locales, with `en-CA` fallback. App navigation,
route fallbacks (including platform administration), and login verification use these messages.
The WorkClimate process loaders now use their existing module translations.

The base loading overlay, animation, visibility conditions, minimum duration and scroll-lock
lifecycle remain unchanged. Four focused tests cover all variants/locales, live language changes,
accessibility, overlapping overlays and scroll restoration. They are included in the admin suite.
Additional caller checks passed: 52 kiosk tests and 34 authentication/processes tests.

## Training API contract

The existing platform-admin and distributor exam start, attempt, answer-save and submit endpoints
accept an optional `locale` query parameter. The authenticated actor still determines access and
attempt ownership. Mutation endpoints retain their existing CSRF checks.

`src/main/java/com/indice/erp/training/TrainingExamLocalization.java` localizes the authorized attempt
view. Five server-only catalogs in `src/main/resources/training/translations/` cover all 175 question
prompts and 525 option labels per locale. Spanish uses the existing bank, and `en-US` uses the
English catalog. The full question bank and internal option identifiers are not shipped in the
frontend or exposed through the resource-download allowlist.

Public shuffled option codes, answers, scores, attempt identity and program progression remain
unchanged. Switching language during an active attempt preserves answers, review position and
expiry. Outdated translation responses are ignored, and saves that finish after a language switch
resolve their question text in the current language. Retained exam error messages follow the
current language too.

Certificate exports use the existing PDF flow. Lines containing Korean or Chinese characters are
rendered through a canvas using the approved system font stack, because jsPDF's built-in Latin
fonts do not contain those glyphs. Latin text remains native PDF text; CJK lines are images.

## Verification

| Check | Result |
| --- | --- |
| `npm run test:platform-admin --prefix react` | 73 existing flow tests plus 40 localization tests passed |
| `npm run test:billing-flow --prefix react` | 27 passed |
| `npm run test:print --prefix react` | 6 passed |
| `npm run test:distributor-portal --prefix react` | 8 passed |
| `npm run typecheck --prefix react` | Passed |
| `npm run build --prefix react` | Passed; existing large-chunk warning remains |
| Focused Maven training suite | 11 passed; backend and test sources compiled |
| Browser fixture with actual account-user components | 24 checks: eight locales at 320, 390 and 1440px; no clipping, browser errors or API requests |
| Actual certificate download flow in browser | Five localized PDF variants generated; French and Chinese full exports and Korean glyph rendering visually inspected |
| `git diff --check` | Passed |

The Maven command was:

```sh
mvn -q -Dtest=TrainingExamQuestionBankTest,TrainingProgramServiceTest,TrainingExamLocalizationTest,PlatformTrainingLocalizationControllerTest test
```

These backend tests use mocks and the server question catalog; they do not connect to a database.
New localization regressions check catalog/placeholder coverage, safe fallback, actual component
output, unchanged business payloads, shuffled exam option identity, CSRF/access enforcement,
language changes during pending requests, export escaping and CJK PDF rendering.

## Delivery status and operational limits

- Implementation and verification are local. No commit, push or production deployment was performed.
- Existing unrelated work in the working tree, including billing changes, was preserved.
- No Stripe operation, real notification, credential change or customer payment was performed.
- Database/Flyway changes for localization: N/A.
- Additional environment variables or provider keys for localization: N/A.
- The browser checks used local fixtures with the actual components and fictitious data. They are
  not evidence of a deployed production session or a live Stripe integration.
- Deploy frontend and backend together for translated exam questions; running backend processes
  must load the new server code and resources. Use `deployment/README.md` for deployment/rollback.
