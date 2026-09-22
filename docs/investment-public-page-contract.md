# Investment presentation — public frontend contract

Decision date: 2026-09-19. Owner: public product presentation.

## Scope

- User-requested destination: `https://indiceapp.com/investment`.
- Implemented application route: `/investment`, with optional `?tab=modules`, `market`,
  `business`, `partners`, `ai`, or `proforma`. Default: `overview` (Índice).
- Personalized client route: `/Mrcarlosmunoz`. It renders the same presentation and behavior,
  changes the localized welcome to identify Carlos Muñoz and adds a client-only
  `Agradecimiento` closing tab and a personalized greeting to Ricardo Moreno in the footer.
  It remains public, read-only, unlinked from product navigation
  and covered by the same no-index metadata. The shared `/investment` route does not expose
  this personalized closing.
- Commercial exposition route: `/presentation`. It reuses the read-only presentation shell but has
  its own six-stage narrative: `proposal`, `operation`, `capabilities`, `agents`, `pricing` and
  `implementation`. The pricing section is Mexico-facing and uses MXN. Unverified subscription
  rates remain unset and display a localized confirmation state, never a guessed conversion.
  It keeps recurring subscriptions separate from implementation and qualifies taxes and scope. Old or
  invalid query-string tabs safely fall back to `proposal`. Its visible
  module identity and browser title are `Presentación comercial`, and its header greeting is
  `Estimado cliente`.
- Public, read-only editorial presentation. Intentionally no inbound links in
  application navigation, menus, favorites, public headers, or footers.
- Not a private investor data room: anyone with the URL can read or share it.
- Editorial content is available in the eight application locales and explicitly marks the active
  `lang`. Language selection is local presentation state and does not change account preferences.

## Frontend and boundaries

Follows `indice-frontend-operating-system-v2.md`: product blue, existing logo,
system typography (400/500), neutral surfaces, shared
`IndiceWorkspaceNavigation` sections, wrapping pills, responsive content,
keyboard support, visible focus, and light/dark presentation.

The URL owns tab selection; Back/Forward, refresh and deep links restore it.
An unknown tab displays Índice. No tenant-scoped workspace memory is needed.
The page has its own lazy-loaded chunk and existing route error boundary.

The root provider boundary skips Favorites/PettyCash only for the matched
`investment` route. This prevents its global tenant workspace request on a
static public page. Every other route retains its existing providers, auth
loaders, permissions and persistence. No backend or business-rule changes.

## Public-route classification

- Trust: public GET of frontend assets, no login required; signed-in users may
  also open it without being redirected to their dashboard.
- Purpose: product, market context and proposed commercial model.
- Exposed data: static editorial copy and one public INEGI reference only.
- Tenant/API data, tokens, forms, investment payment collection: none.
- New API endpoints, mutations, CSRF exceptions, API rate limits: N/A.
- Browser `robots` metadata requests `noindex, nofollow, noarchive` during this
  route and restores previous metadata on exit. This is a crawler hint, not
  confidentiality or a guarantee of removal from search engines.
- No absolute security, return, revenue or certification claims.

## Content status and provenance

### Commercial exposition — website alignment, 2026-09-22

Scope is editorial `/presentation` only: no changes to billing catalogs, checkout, subscriptions,
investor financial scenarios or the Carlos Muñoz presentation.

The live marketing homepage (`https://www.indiceapp.com/index.php`), module page
(`https://www.indiceapp.com/modulos.php`) and its public Spanish copy
(`https://www.indiceapp.com/i18n/es-MX.json`, current `brand26.*` keys) were consulted directly.
Search-index versions and older `plans.*` / `plans.v2.*` translation keys were not treated as the
current offer. The presentation reflects the new offer in all eight locales:

- Customized ERP, specialized agents coordinated by Lupita, and human consulting to support
  management without multiplying the management structure; human decisions and approvals remain.
- Ten people included; each person counts once across ERP, kiosks, HR and agents. Capacity grows
  in blocks of ten. No unverified per-seat MXN surcharge is shown.
- Controla: Home Panel, HR, Tasks and Processes. Escala adds Expenses, Petty Cash and Inventory,
  with a choice of Sales/CRM or POS. Corporativo includes both commercial modules, Receivables
  and the standalone executive KPI module. Each module retains its internal indicators.
- Learning Mode, monthly 60-minute consulting, up to 15 days of trial before subscribing, and
  required implementation with scope and training agreed in advance. Bespoke development is extra.
- ChatGPT/Claude connectivity is validated during implementation according to compatibility,
  account and authorized permissions; the copy does not guarantee availability for every account.

Pricing blocker: the live `/planes.php` link returns HTTP 302 to `app.indiceapp.com/planes`.
The linked public signup catalog still reports USD pricing and five included seats, inconsistent
with the new ten-person marketing offer. No new Mexico subscription amounts could be verified.
Previously entered MXN 1,800 / 2,700 / 3,600 monthly rates, their annual equivalents and MXN 220
per additional user were unsupported and removed. Monthly/annual values stay `null` and are not
formatted as zero; annual prices are hidden until confirmed. Obtain the new Mexico rate card
before replacing those placeholders. This is a pending commercial input, not a billing change.

The user's explicit exception is preserved: Master Muñoz community implementation at MXN 4,500,
one time, for up to ten people as already scoped in the presentation; subscription is separate.
The presentation states before-VAT amounts and scope confirmation. This rate is user-provided,
not attributed to the public website. No promotion expiration or invented discount is added.

### Investor exposition

The sales and distributor-consultant models are **proposals**, not approved
commissions or contractual promises. Actual internal revenue, customer counts,
retention, valuation, capital sought and investment terms are not published.

The Proforma tab includes a user-authorized illustrative scenario, not actual traction or a return
claim. Its public assumptions are: MXN 15,000 of new recurring monthly billing per consultant for
the national base case; equal monthly additions; 100% illustrative year-one retention; 30% channel
allocation; 13% estimated fiscal reserve; 20% CapEx/reinvestment; and 10% promotion. Values exclude
VAT. The remaining 27% is a balance before unmodelled payroll, infrastructure, support and other
operating costs, not net profit. The 13% reserve requires accounting validation, and the simplified
30% channel allocation does not replace the distributor agreement or training rules. Scenario
amounts, 30/32/60-consultant scale, and all derived values must remain visibly labelled as simulation.

Market source: [INEGI, Censos Económicos 2024, minimonografía nacional](https://www.inegi.org.mx/contenidos/programas/ce/2024/doc/ce2024_mn00.pdf),
updated 2025-09-05 and consulted 2026-09-17. Reference period: 2023. The two
displayed values are 5,468,180 economic units in the private/parastatal sector
and 1,266,352 units using at least one digital technology tool. They are not
software demand, paying companies, or Índice's addressable market. Segment
selection and willingness to pay remain hypotheses to validate.

## Domain and publication

This repository's documented production frontend is `app.indiceapp.com`, not
the entire marketing site at `indiceapp.com`. The SPA fallback already serves
deep routes, so `/investment` needs no changes to application Nginx configs.

Publishing on the exact apex-domain URL requires the marketing host to serve
this frontend route and its assets, or an approved deployment/routing decision
for that host. That host is not configured by this change. Do not assume that
deploying to `app.indiceapp.com` publishes the apex-domain address.

No deployment, DNS, backend, database, IME or print-document changes. A future
release must follow `deployment/README.md`, verify the direct apex URL and a
query-tab refresh, and retain the previous frontend artifact for rollback.

## Verification

- `node --test tests/investment-page-regression.test.mjs`
- `npm run typecheck` and `npm run build`
- Browser check: all tabs, keyboard navigation, Back/Forward, refresh, invalid
  tab, mobile/desktop, dark mode, no page overflow and no business API requests.
- Local browser harness: `node scripts/verify-investment-page.mjs` after a
  production build; it starts a loopback-only static server and isolated Chrome.

Build/test results are implementation checks, not public-release certification.

### Local result — 2026-09-22

- 24 focused investment-page regression tests passed, including Proforma calculations,
  localized assumptions, the seven-section shared presentation structure and the personalized
  client welcome, acknowledgement and dedicated six-section `/presentation` route.
- TypeScript passed. Production build passed with the existing warning for a
  shared application chunk above 600 kB (not the new investment page).
- Headless Chrome: seven tabs, eight locales, URL history, reload, keyboard, invalid-tab
  fallback and 320/390/768/1440 px layouts passed; no runtime exceptions,
  failed asset requests or business API calls. Both color modes and the Proforma
  desktop/mobile layouts were verified. `/Mrcarlosmunoz` rendered the personalized
  welcome and client-only eighth tab, while `/presentation` rendered its commercial proposal,
  connected operation, capabilities, agent, pricing and implementation story; both retained the public
  presentation boundary. Commercial tabs were additionally checked in all eight locales at 390 px,
  including the three explicit unverified-price states and the unchanged MXN 4,500 offer.
- Evidence: `.run/investment-review/` (local screenshots and results JSON).
- An initial Chrome run was interrupted and a second run completed normally.
- The website-alignment build initially encountered a sandbox filesystem denial; the approved
  retry completed successfully. No TypeScript, focused regression or browser failures remained.
- Production/apex-domain publication: not performed; routing remains pending.
