# 5. Frontend architecture (React)

Base: `react/src/app`. The current pattern (Context + `localStorage`, no Redux/Zustand — see
`FavoritesContext`/`LanguageContext`) is sufficient and is reused as-is for the new pieces; no
global state library needs to be adopted for this.

## 5.1 `CurrentCompanyContext` (new)

Follows the same pattern as `react/src/app/shared/context/FavoritesContext.tsx`:

- Populated from the new `GET /api/v1/auth/me` shape (`account`, `companies[]`, see
  [04 §4.2](04-backend-architecture.md#42-switching-the-active-company-without-re-login)).
- Exposes `activeCompanyId`, `companies`, `account`, and `switchCompany(companyId)` which calls
  `POST /api/v1/auth/switch-company` and then **invalidates/refetches** everything that depends on
  the active company (dashboard, modules, favorites, etc. — the same mechanism
  `FavoritesContext` already uses on mount via `useEffect`, but now also triggered on
  company-switch).
- Persists `activeCompanyId` to `localStorage` under a per-user key (e.g.
  `indice.activeCompany.{userId}`) so a page refresh doesn't fall back to the backend default if
  the user had already picked another company — but it's always validated against the real
  `companies` list returned by `/auth/me`, in case the user lost access to that company between
  sessions.
- Mounted in `main.tsx` at the same level as `LanguageProvider`/`FavoritesProvider`.

## 5.2 Company/business switcher (new UI)

A dropdown in the top bar (next to the username), always visible when `companies.length > 1`:

- Lists every company under the active account, with the user's role.
- On selection, calls `switchCompany` and navigates to `/dashboard` (avoids staying on a route for
  a module the newly active company doesn't have enabled).
- Includes a "+ Add another company/business" option that opens the flow to create a company
  within the same account (reuses the existing `BusinessStructure`/`company_business_profiles`
  wizard — only the entry point changes: before, only a user already inside a company could see
  it; now it's also offered from the switcher).

## 5.3 Real module blocking (closing the audit gap)

Today `moduleCatalog.ts` already receives `locked` from the backend, but **it's only used to
paint a visual badge on the Dashboard** — nothing prevents navigating straight to `/inventory`
even if it comes back `locked: true`. With the backend returning a real `locked` (4.3), the
frontend must:

- In the router (`react/src/app/routes.tsx`), the `/:pageId/*` route loader
  (`requireAuthenticatedSession`) must also resolve the entitled module catalog (cached in
  memory/context) and, if `pageId` maps to a `locked` module, redirect to a new
  `ModuleLockedPage` ("This module isn't in your plan" + button to `Plan.tsx`) instead of
  rendering the module.
- The backend still returns `403` on the API if someone forces the route (defense in depth,
  already covered in 4.3) — the frontend just avoids the bad UX of navigating to a screen that
  will fail.

## 5.4 `Plan.tsx` — from mock to real

Today it's static cards with no `apiClient`. Changes:

- `billingApi.getPlans()` → `GET /api/v1/billing/plans`.
- `billingApi.getSubscription()` → `GET /api/v1/billing/subscription` (current plan, seats
  used/included, entitled modules).
- "Choose this plan" / "Change plan" button → `billingApi.createCheckoutSession(planId)` →
  redirects to the `url` returned by the backend for Stripe Checkout.
- Seat-usage indicator (e.g. "8 / 10 users") with a warning state near the limit, reusing data
  from `getSubscription()`.
- Section for available add-on modules (the ones not included in the current tier): a
  checkbox/button that calls `billingApi.addAddon(moduleSlug)` / `removeAddon(moduleSlug)`.

## 5.5 `Billing.tsx` — from mock to real

Today it has payment cards and invoices **hardcoded in the component**, with no call to
`apiClient` at all. Replace with:

- A "Manage payment method and invoices" button → `billingApi.createPortalSession()` → redirects
  to the Stripe Customer Portal. **Rebuilding the card form and invoice list by hand is not
  recommended** — Stripe already solves it completely, with less PCI surface and less code to
  maintain. If a read-only view of the latest invoices inside the dashboard is desired (nicer than
  leaving to Stripe), use the optional `account_invoices` table
  (`GET /api/v1/billing/invoices`) described in [03 §3.3](03-multitenant-data-model.md).
- Remove the hardcoded `initialSavedCards` and `invoiceRows` entirely.

## 5.6 `Users.tsx` — multi-company invitation and seat feedback

- The invitation flow (`configCenterApi.inviteUser`) gains a selector for "which
  companies/businesses in your account to grant this user access to" when the account has more
  than one company — today the flow is 100% single-company.
- If the account is at its seat limit, the "Invite" button is disabled with a message + CTA to
  `Plan.tsx` (uses the same `getSubscription()` data as 5.4, cached in a billing context if
  applicable, to avoid duplicating the call).

## 5.7 `apiClient` — no structural changes

The backend resolves the active company **from the session** (cookie, `credentials: 'include'` is
already forced in `apiClient.ts:53,85`), so there's **no need** to add an `X-Company-Id` header per
request — this avoids the frontend having to remember to send it on every call and avoids drift
between "the company the frontend thinks is active" and "the actual company of the session". The
only company-change point is the explicit `switch-company` endpoint (4.2).

If SSR or server-to-server calls without a session cookie are needed in the future, that would be
the moment to reconsider an explicit header — not necessary for the current scope.

## 5.8 Summary of new/touched files

| File | Type of change |
|---|---|
| `react/src/app/shared/context/CurrentCompanyContext.tsx` | New |
| `react/src/app/components/CompanySwitcher.tsx` (or similar) | New |
| `react/src/app/pages/ModuleLockedPage.tsx` | New |
| `react/src/app/api/billing.ts` | New (mirrors `configCenter.ts`) |
| `react/src/app/api/auth.ts` | `AuthSessionResponse` shape change |
| `react/src/app/routes.tsx` | Loader gains a locked-module check |
| `react/src/app/config/moduleCatalog.ts` | `locked` stops being purely decorative |
| `react/src/app/BasicModules/Dashboard/Plan/Plan.tsx` | Rewritten on real data |
| `react/src/app/BasicModules/Dashboard/Billing/Billing.tsx` | Rewritten, delegates to Stripe Portal |
| `react/src/app/BasicModules/Dashboard/Users/Users.tsx` | Multi-company invitation + seat gating |
| `main.tsx` | Mounts `CurrentCompanyProvider` |
