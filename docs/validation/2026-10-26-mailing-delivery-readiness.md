# Mailing delivery readiness — local correction, 2026-10-26

Status: verified locally; not deployed. No campaign or test email was sent.

The reported review showed a selected sender while both send actions were disabled.
A read-only diagnostic scoped to the authenticated company and owner confirmed an
active, Mailing-enabled account with SMTP status `NOT_TESTED` and no verification
timestamp. The campaign remained a draft with its sender and recipients saved.
No credentials, contact contents or identifying production values are included here.
The verified-SMTP gate is intentional and remains enforced by the backend.

The frontend previously combined missing-account and unverified-account messages,
offered no direct recovery action, and placed required sender/postal details below
an unbounded recipient list. The correction distinguishes these states, uses the
existing permission-gated Email Accounts/campaign return route, and offers persisted
draft recovery when a sender must be selected. Unsaved selection, footer and schedule
changes require the same-frame discard confirmation before leaving.

The shared modal has a compact desktop width, configuration beside recipients, and
configuration first on mobile. The existing table has a bounded scroll viewport,
visible pagination and column-width sizing. The footer explains the current blocker.
Backend APIs, permissions, account verification, exclusion rules, all-page selection,
required sender details, public unsubscribe URL and explicit send confirmation remain
unchanged. Localization covers all six language dictionaries.

Changed files: `Mailing.tsx`, `CampaignDelivery.tsx`, `CampaignDeliveryTable.tsx`,
`deliveryCopy.ts`, delivery browser fixture/regression and the Mailing owner contract.
The follow-up also changes `CampaignEditor.tsx` and the existing Mailing composition
browser regression. Backend, schema and production mutation: N/A.

Verification:

- 58 focused Email/Mailing/Sales regressions pass, with no failures or skips.
- TypeScript validation and production build pass. The existing large-chunk advisory
  remains; no new compilation failure is present.
- Synthetic browser flow passes missing/unverified sender recovery, account-action
  permission gating, discard/keep changes, verification refresh, exact selected
  recipient payload, retries, send-busy protection, unsubscribe refresh, public-URL
  blocking, read-only mode, keyboard, mobile and dark mode.
- Desktop, unverified-account and mobile screenshots were inspected. Required fields
  precede the mobile recipient list; the long desktop table cannot hide them.
- Local frontend at `127.0.0.1:5175/sales/mailing` responds. Real campaign/test delivery
  remains untested by the agent; all browser transports are synthetic.

Preparation used an existing isolated Playwright installation after the repository
had no Playwright package, and updated an ambiguous browser locator for the new
readiness summary. Final test runs pass. No dependency or lockfile change was made.


## Follow-up: SMTP verified but test still rejected

After the user verified SMTP, a second read-only diagnostic scoped to the same
company/account confirmed `VERIFIED`. The named campaign remained a draft with an
empty trimmed subject and a nonempty message. The test service requires both subject
and message before invoking transport (`mailing_content_required`); the frontend
had allowed the test attempt and hidden that code behind a generic settings error.
The screenshot also showed empty contact/postal details, a separate launch blocker.
No production content or settings were changed, and no real email was submitted.

The editor now checks subject/message before content review or save-for-delivery,
focuses the missing input and still saves incomplete drafts normally. Delivery checks
content before test/launch and exposes Edit draft with the existing unsaved-change
guard. Known backend rejection codes are localized; server authority remains intact.

Additional verification:

- Synthetic delivery browser reproduces verified SMTP plus a named campaign with a
  blank/whitespace subject. Neither test nor launch calls occur; filling postal
  details does not bypass the content check. Empty messages also block progression.
- Refresh after completing content enables tests independently of the postal footer;
  campaign launch still requires that footer. Simulated content rejection displays
  the correct explanation and draft recovery; simulated SMTP acceptance remains
  distinct from confirmed inbox delivery.
- Composition browser verifies missing-subject and missing-message focus, preserved
  text, incomplete-draft save/reopen, successful review after correction, templates,
  custom variables, inline images, load retry, mobile and dark mode.
- All 58 focused regressions, TypeScript validation and production build pass. The
  existing build chunk-size advisory remains. Missing-subject screenshot inspected.

Status remains local only, uncommitted and not deployed. No backend or schema change.
