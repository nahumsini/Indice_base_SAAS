# AI connection management — local validation, 2026-09-25

The setup-only interface hid connection management while the backend still enforced five active
connections per user/company. `My connections` is now reachable beside the existing setup and
question tabs. The initial view remains the OAuth setup guide. This interface change is local only.

The restored workspace lists connections and activity through the existing session-authenticated
API. Closing access requires the canonical confirmation dialog, refreshes the server state, and
preserves history. Failed revocation remains visible in the dialog and can be retried. The empty
state returns to the OAuth guide; it does not issue manual tokens. Translations are reused.

Changed implementation: `Integrations.tsx`, new `ManageAiConnections.tsx`, and
`RevokeAiConnectionDialog.tsx`. The frontend operating system and integration regression were
updated for the explicitly requested restoration. A browser fixture and
`npm run test:integrations-browser` provide repeatable interaction coverage.

Validation:

- `npm run test:integrations-ui`: 6 passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; existing large-chunk advisory remains.
- Browser regression: passed with synthetic connections and intercepted API requests. Covers
  guide-only lazy loading, tab navigation, cancellation without mutation, CSRF on DELETE,
  failed revocation/retry, preserved revoked history, refreshed state, load error/retry, Spanish
  layout at 390 px, and empty-state navigation back to the guide. No JavaScript errors.
- Production code deployment, backend/schema/API changes: N/A. Existing unrelated local work
  was preserved. This validation does not certify an actual ChatGPT reconnection.

Browser regression accepts `INDICE_PLAYWRIGHT_MODULE` and `INDICE_CHROME_PATH` to use an installed
Playwright package and Chrome executable. No production data or credentials are used by the fixture.
