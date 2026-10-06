# Preferred currency in the profile menu

## Change

Per the user's request, the global header now exposes preferred currency inside the avatar
menu on desktop and mobile, with a localized label and the active ISO currency code. The
standalone header currency button is removed. The menu closes before the existing blue
**Standard Form Modal** is displayed; that modal is mounted outside the dropdown lifecycle.
Each opening initializes draft values from the current preference.

## Preserved

Preference persistence, exchange-rate sources and refresh, conversion calculations, Save/Cancel
semantics, localized copy, public-demo availability and all other header actions are unchanged.
Backend/schema changes: N/A.

## Files

- `react/src/app/components/Header.tsx`
- `react/src/app/BasicModules/shared/PreferredCurrencyControl.tsx`
- `react/tests/preferred-currency-modal-regression.test.mjs`
- Canonical frontend operating system: Global Preferred Currency section.

## Verification

- Three existing currency regression tests: PASS.
- TypeScript: PASS.
- Production build: PASS; the existing large-chunk warning remains. No verification failures.
- Authenticated Chromium flow on the local preview at 1440px and 390px: PASS.
  Verified avatar entry, current code, dropdown closing while the dialog stays open,
  Cancel preserving the preference, Save updating the displayed code and menu fitting the width.
- Temporary browser verification and screenshots are in ignored `.run/currency-profile-*` files.
- Physical phone/touch-keyboard testing: not performed. Production deployment: N/A.
