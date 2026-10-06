# Compatible application recovery for the integrated V299 release

Status: recovery candidate; do not activate until its tests and restored-data drill pass.
Parent: previously verified administrator/backend `9e346a9bee1071e0745c3f9b454d02dd0cfb38a8`.
Native owner source: merged release `d89c09d39f4567c4c4c4b91e2534d7324a0d094c`.

The old backend cannot be assumed compatible merely because future migrations
validate. V296 requires ignoring superseded purchase lines and preserving draft
revisions; V298 requires original Square/Point provider and refund identities.
Precision, retained files and financially uncertain states must also survive.

This recovery keeps the prior AI adapters/controllers, OAuth consent and
capability catalog unchanged. It carries the merged native domain owners and
their relevant regression coverage, plus byte-identical V294–V299. It does not
publish the extended assistant adapters, file-intake routes or new OAuth scopes.
Use the previous immutable 9e web and MCP with this backend. Do not start the
unmodified old backend against the upgraded schema.

Retain all registered documents, temporary staging, quota reservations, purchase
history, inventory provenance, provider recovery and audit. The extended file
cleaner resumes with the normal compatible release; rollback must never delete
business files to free capacity. No migrations, provider credentials, LIVE/refund
flags, catalog prices or subscriptions are reversed or changed.

Required evidence: published migration checksum/upgrade rehearsal on a fresh
isolated database; full backend and native owner tests; exact-commit CI; executable
image and scan/SBOM; private restored-data startup and retained-row/object checks;
synthetic purchase-revision/financial recovery tests; host wrapper dry-run.
Production remains conditional on successful APPTEST and authenticated owner UAT.
