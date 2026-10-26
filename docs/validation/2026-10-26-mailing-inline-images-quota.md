# Mailing inline images and quota waits — 2026-10-26

Status: verified locally; not deployed. No real email was sent and no production
campaign, recipient, account or configuration was changed by this investigation.
This follows the [delivery readiness correction](2026-10-26-mailing-delivery-readiness.md).

## Read-only findings

A production diagnostic scoped to the authenticated company and campaign owner
found one active campaign with 63 recipients: 30 SMTP-accepted and 33 pending. Its
last error was `email_send_rate_limited`, with no failed or uncertain recipients.
The account had reached the existing 30-attempt rolling-hour limit. The existing
worker defers pending delivery for five minutes and retries automatically; the
workspace incorrectly treated this normal wait as requiring attention.

The campaign's saved HTML contained an embedded image. Of the 30 accepted message
records, 27 retained one image and three stored no image. All had server Sent-copy
references. This storage observation alone does not establish which bytes reached
an external recipient. Reading a server copy overwrites the cached body; inspection
found that incoming CID references were stripped without resolving their related
MIME resources. The existing outgoing path already constructs related CID images.
Separately, the delivery-review API omitted HTML and its test/final previews rendered
plain text, necessarily hiding images in those views.

These findings describe the diagnostic snapshot, not a continuing live campaign
status. No raw production messages, addresses, credentials or image bytes are stored
in this report.

### Follow-up: disappearance in Índice Sent

The user clarified that the image is visible when composing the Mailing campaign,
then absent when opening its messages in Índice's Sent view. A read-only IMAP
inspection of two affected Sent copies used the existing authenticated owner's
account, selected the folder read-only and fetched with `BODY.PEEK[]`. It neither
sent messages nor changed flags. Each sample had zero images in the application's
cached body but one HTML CID reference and its matching PNG resource on the server.
The decoded resource matched the saved campaign image byte-for-byte; no MIME parser
defects were found. Only aggregate results were retained, not raw message bodies,
recipient details or credentials.

The image is 84,663 decoded bytes but 115,854 encoded characters on the wire. This
also exposed an overly restrictive encoded-size check in the initial local reader
fix: the 100 KiB image allowance must apply to decoded bytes, not MIME part size.
The existing bounded decoded stream and image validator remain authoritative.
Reopening those server copies after the reader correction retrieves the preserved
image; resending the campaign is not needed to repair this display problem. This
does not constitute verification of an external recipient's inbox.

## Changes and preserved behavior

- Add formatted HTML to the authorized delivery review and use the existing safe
  preview for test and final campaign confirmation.
- Resolve validated, bounded PNG/JPEG CID resources when reading the corresponding
  related MIME body, preserving images on server-copy reopen.
- Distinguish an active quota wait from failures in workspace rows, attention counts
  and filters; explain automatic continuation in the detail view in six locales.

Tenant/account ownership, private/shared attachment boundaries, HTML sanitization,
remote-image blocking, send confirmation, review versions, delivery snapshots,
rate limits, five-minute retries and accepted-recipient deduplication are preserved.
Routes, schema changes and deployment: N/A.

Backend files: `MailContent`, `MailInlineImages`, `SafeMailHtml`,
`MailingDeliveryContracts`, `MailingDeliveryService`, `MailingWorkspaceService` and
their focused regression tests. Frontend files: delivery/workspace API types,
`CampaignDelivery`, `CampaignWorkspaceTable`, delivery copy and the existing delivery,
composition and workspace browser fixtures/regressions. Owner contracts are updated.
Earlier local readiness/editor changes remain intact.

## Verification

- 57 backend tests pass with zero failures/skips: MIME/transport, professional content
  policy, new received-image tests, Mailing persistence, delivery and workspace.
  Tests use only isolated `indice_test_db` and mocked mail transport. Backend
  compilation passes.
- MIME serialization and server-copy read preserve the same embedded image. Tests
  reject duplicate/missing CID, attachment-disposition images, invalid/oversized
  content, SVG and remote images; enforce three-image limits and prevent resource
  leakage across related bodies or messages.
- Integration coverage preserves the image through campaign save, review, test and
  worker payload. Filling the account quota leaves a recipient pending; expiring
  test quota resumes it once and completes the campaign without duplicate sends.
- Workspace coverage excludes a quota-only wait from attention while retaining
  failed/uncertain recipients and unrelated account errors.
- 65 focused frontend regressions pass. TypeScript and production build pass; the
  existing large-chunk advisory remains.
- Three synthetic native-browser flows pass: Mailing composition, delivery and
  workspace. Tests verify image previews, final confirmation, quota explanation,
  selection, readiness recovery, retries, permissions, mobile and dark mode.
  The image confirmation screenshot was inspected. Browser tests use synthetic
  campaigns and intercepted transport; they do not send email.
- An initial browser run exposed a fixture attempting to access localStorage inside
  the sandboxed preview. Restricting that fixture initialization to the top window
  fixed the test; the production sandbox was preserved. Final runs have no failures.
- After the Sent-view clarification, a deterministic synthetic PNG over 80 KiB
  reproduced the encoded-size reader defect: its MIME part exceeds 100 KiB but its
  decoded image remains within the allowed limit. The regression failed before the
  size-check correction and passes afterward. All 24 MIME/transport, received-image
  and professional-content tests pass again, with backend compilation and no skips.
  Frontend code is unchanged by this follow-up; the prior browser/type/build results
  remain applicable.

Remaining limits: external-provider rendering and recipient inbox arrival have not
been verified. SMTP acceptance does not establish recipient delivery. Production
continues running its deployed version until an authorized deployment; these changes
do not repair already-delivered content or resend messages.
