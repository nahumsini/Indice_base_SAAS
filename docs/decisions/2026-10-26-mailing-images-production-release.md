# Email / Mailing correction: production source boundary

Date: 2026-10-26.

The owner requested deployment of the correction after clarifying that inline
images disappear when opening Mailing messages in Índice's Sent view. The reviewed
application source is `be64336798c7d188960d118cceef14a309883084`, published on
`codex/next-work-20261025` and `main`. Production is the deployment target.

The application commit captures the prepared Email/Mailing correction across 29
paths, including the existing local delivery-readiness and editor work. It fixes
bounded CID image reading, formatted delivery previews and quota-wait presentation.
The owner contracts and bilingual learning catalogue describe the resulting flow.
The existing sending limits, recipient deduplication, explicit confirmation,
tenant/account ownership, sanitization and remote-image blocking remain enforced.

There are no dependency, schema, route or permission changes. Schema stays V365.
App Test, protected configuration, billing references, payroll and existing access
are preserved. Recovery retains the exact previous application images.

New, uncommitted Whatsapping workspace edits appeared after the release source was
captured. They remain in the primary worktree and are outside this immutable
application candidate. They were neither overwritten nor silently added to the
tested release. Documentation-only release records do not change its runtime bytes.

The [release evidence](../validation/2026-10-26-mailing-images-release.md) records
technical readiness and activation status. Earlier closed historical Stripe TEST-key
exceptions are not reused; a new bounded exception is required before activation
while revocation remains unresolved. The investigation and verification do not
authorize campaign resends or real test email.
