# Captured receipt authorization action

The Saldos action predicate excluded `DRAFT` before evaluating the authenticated
administrator permission. As a result, an administrator could not invoke the
existing authorize-without-evidence endpoint from either desktop or mobile, and
the pending receipt continued to block monthly closing.

The component now uses the existing eligible-status rule (`DRAFT`,
`RECEIPT_ATTACHED`, `VALIDATED`), retaining the external-fund terminal-state
exception and the authenticated administrator gate for captured receipts.
The backend retains authority over permissions, fund scope, attachments and cut
status. There are no API, backend, schema, monetary or persistence changes.
An existing captured record is never automatically authorized by this patch.

## Validation

- Added a failing regression against the prior implementation reproducing the
  missing authorization action after the session resolves as administrator.
- Verified desktop and mobile action events, internal and external fund responses,
  pending-to-final status updates, and closing eligibility without an attachment.
- Verified ordinary/missing sessions cannot authorize captured receipts, and a
  failed authorization preserves the receipt, surfaces the error and blocks closing.
- `npm run test:petty-cash-ui`: 24 passing tests.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Component tests use the real event handlers and API adapter with mocked transport;
  they do not authorize customer records or imply an authenticated browser test.

## Scope

Only `PettyCashReconciliationWorkspace.tsx`, its existing regression suite and this
record change. No new UI framework, hook, state system or component is introduced.
The existing role/session lookup, localized labels, layout, errors and confirmation
flow remain in use. Deployment evidence is maintained separately for the exact
artifact under the frontend-only procedure in `deployment/README.md`.
