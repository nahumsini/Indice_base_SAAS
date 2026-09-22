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

The commercial route's visual opening uses the live homepage's navy/blue technology
direction, with an editorial ERP → Lupita → specialties → human decision diagram.
The diagram is explicitly a proposal, not a live connection or evidence of autonomous
multi-agent execution. Its localized availability note qualifies enabled functions.
A direct link opens the agents section. These changes are limited to `/presentation`;
investor routes, tenant data and application permissions remain unchanged.

The connected-operation section uses a navy triangular diagram joining three product
experiences: the kiosk, the Índice workspace and ChatGPT/Claude. Its locally served assets
under `react/public/images/presentation/` reuse the marketing site's sanitized HR kiosk
and task-agenda screenshots, existing provider logos and Índice mark. The workspace image
is an actual task-agenda view, not a live executive dashboard. Screenshots are marked as
demo data in every locale; the diagram preserves the compatibility/account/permission
qualification. It stacks into a connected sequence on mobile, with no external asset
requests or changes to real integrations.

Capabilities, agents and implementation use the same presentation language: a connected
capability orbit, a question → Lupita → specialists → human-decision flow, and a four-stage
implementation path. These are responsive, code-native illustrations that retain localized copy
and the existing scope and permission qualifications. Pricing uses poster-style cards and a
separate illustrated setup area with the promotional and regular amount for every package. A
localized fullscreen control uses the browser Fullscreen API for live exposition and returns
through the same control or the Escape key.

Visual follow-up validation: 24 focused regressions, TypeScript and production build
passed. The isolated Chrome harness passed the proposal-to-agents link, trusted fullscreen
entry and exit, all five local operation images, exact published prices, and the existing locale,
navigation and responsive checks. Desktop and mobile screenshots of the operation, capability,
agent, pricing and implementation visuals were inspected. No runtime exceptions or business API
requests occurred. The existing shared-chunk size warning remains.
These edits are local and have not been deployed.

Scope is editorial `/presentation` only: no changes to billing catalogs, checkout, subscriptions,
investor financial scenarios or the Carlos Muñoz presentation.

The live marketing homepage (`https://www.indiceapp.com/index.php`), module page
(`https://www.indiceapp.com/modulos.php`) and its public Spanish copy
(`https://www.indiceapp.com/i18n/es-MX.json`, current `brand26.*` keys) were consulted directly.
Search-index versions and older `plans.*` / `plans.v2.*` translation keys were not treated as the
current offer. The presentation reflects the new offer in all eight locales:

- Customized ERP, specialized agents coordinated by Lupita, and human consulting to support
  management without multiplying the management structure; human decisions and approvals remain.
- Ten people are included in every package; capacity expands in blocks of ten for MXN 899 monthly.
  Annual billing gives a 20% discount on the subscription and additional blocks.
- Controla: Home Panel, HR, Tasks and Processes. Escala adds Expenses, Petty Cash and Inventory,
  with a choice of Sales/CRM or POS. Corporativo includes both commercial modules, Receivables
  and the standalone executive KPI module. Each module retains its internal indicators.
- Learning Mode, monthly 60-minute consulting, up to 15 days of trial before subscribing, and
  required implementation with scope and training agreed in advance. Bespoke development is extra.
- ChatGPT/Claude connectivity is validated during implementation according to compatibility,
  account and authorized permissions; the copy does not guarantee availability for every account.

Pricing uses the public Mexico rate card `commercial-master-2026-09-21`, supplied through the
marketing site's `content/commercial-offer.json`: Controla MXN 2,999 monthly / MXN 28,790.40
annually, Escala MXN 5,499 / MXN 52,790.40 and Corporativo MXN 9,499 / MXN 91,190.40. Every package
includes ten people. An additional block of ten is MXN 899 monthly or MXN 8,630.40 annually. The
annual figures apply the published 20% discount and all amounts are shown before VAT.

The promotional one-time setup amounts through October 2026 are MXN 4,999 for Controla,
MXN 7,499.50 for Escala and MXN 12,499.50 for Corporativo. Their regular amounts are respectively
MXN 9,999, MXN 14,999 and MXN 24,999. The annual discount does not apply to setup. This public
presentation mirrors the marketing rate card; it does not modify the billing catalog, checkout,
subscriptions or tenant data.

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
  including the MXN 2,999 / 5,499 / 9,499 package rates, annual rates, additional block and the
  three promotional setup amounts.
- Evidence: `.run/investment-review/` (local screenshots and results JSON).
- An initial Chrome run was interrupted and a second run completed normally.
- The website-alignment build initially encountered a sandbox filesystem denial; the approved
  retry completed successfully. No TypeScript, focused regression or browser failures remained.
- Production/apex-domain publication: not performed; routing remains pending.
