# Sales Mailing and Funneling: primary-workspace production cut

Date: 2026-10-26.

The owner requests publishing all current changes in the primary local checkout,
updating the working branch and `main`, and deploying production. App Test and
separate worktrees are outside this release. Application source is
`2e18cf7523ffecf48193577fd1d1868616b9656b` on `codex/next-work-20261025`.
All 15 initially modified or untracked paths are preserved in the candidate,
including work produced outside this conversation. Later test/documentation
commits do not change the immutable runtime artifact.

Mailing separates writing from choosing a template, preserves draft content when
switching between those choices, and gives image, attachment and template loading
their own busy states. Blank editor clicks no longer activate the image file
picker. Custom template variables can remain in drafts but must be resolved before
review, test delivery or sending; the supported recipient-name token remains for
delivery-time substitution. Image content survives variable resolution and draft
save/reopen. A failed delivery review can be retried.

Funneling updates campaign content cards and navigation to the owning content
workflow while preserving its access guard. The existing draft/review/duplicate
actions and saved format/AI indicators remain. Six locales and the bilingual
learning curriculum cover the resulting behavior. Preparation fixes a stale
Funneling regression expectation for existing CRM-provider navigation and adds the
affected regression cases to CI; it does not change that authorization boundary.

There are no Java application, dependency, API, provider, permission or migration
changes. The backend artifact changes only the generated learning catalogue
resource; image provenance must verify every other archive entry against the
currently deployed backend. Schema stays V365. Recovery retains the exact prior
backend and web containers; no schema repair, reverse migration or recovery-image
rewrite is required. Payroll behavior, approved snapshots, billing, access and
protected runtime settings remain unchanged.

All canonical technical gates remain required: exact-source CI, protected real
environment preflight with an isolated test database, source/image scans, fresh
complete backups and off-host verification, disconnected restoration with candidate
and recovery, real container proxy/OAuth checks, dry run and post-activation
observation. Synthetic browser checks do not send real mail or replace owner
product acceptance. No provider activation, business-data test mutation, employee
payment or live mailing is part of deployment verification.

The prior historical Stripe TEST-key exception is closed. This source decision
does not renew it; activation requires a separately recorded owner decision for
this exact candidate after technical preparation has passed.
