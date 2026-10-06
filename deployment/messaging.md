# Messaging and customer care operations

Owner: operators with `SYSTEM_TICKETS_MANAGE` or Platform Root.
Contract: [messaging and customer care](../docs/messaging-and-customer-care-contract.md).
This complements [deployment/README.md](README.md); it does not approve a production release.

## Daily work

- Company users open **Messages** in the global header to contact active colleagues, Indice
  support, or their current distributor. Only the requester can read their customer care case.
- Platform Administration > **Customer care** > **Customer conversations** contains support cases.
  **Previous system tickets** preserves the existing distributor reporting workflow.
- Distributor portal > **Customer care** contains portfolio cases. Transferring to Indice shares
  public history and revokes distributor access. Internal distributor notes are not shared.
- Start with **Unassigned**, take or assign each case, and review **Waiting for care**. Public care
  replies move cases to **Waiting for customer**. Customer replies reopen cases. Resolve completed
  cases. Internal notes and Activity preserve operational context and workflow history.
- The 24-hour pending indicator measures elapsed hours, including weekends; it is not a business
  schedule or contractual SLA. Establish staffing and service hours operationally. The interface
  makes no promise of immediate responses.

## Durability and monitoring

MySQL is authoritative. A successful send response means commit. Retrying the same key with unchanged
content returns the saved message. The browser retains text/key after failure while the conversation
remains open; closing it discards an unsent local draft. Incremental polling recovers missed messages.

Notification delivery uses `messaging_notification_outbox`. Configuration:
`app.messaging.notification-delay-ms=10000` and `app.messaging.notification-initial-delay-ms=30000`.
Each pass handles up to 50 eligible rows. Failures back off up to one hour. Tune the interval using
target-environment measurements. A notifier outage does not lose messages or remove operator cases.

Monitor **Pending notifications**, **Waiting over 24 h**, **Unassigned**, and messaging HTTP errors
and latency. Investigate growing backlogs using authorized operational database access:

```sql
SELECT COUNT(*) AS pending, MAX(attempts) AS max_attempts, MIN(available_at) AS oldest_due
FROM messaging_notification_outbox WHERE delivered_at IS NULL;
```

Retry logs contain event ids and exception classes, without message bodies. After repairing the
dependency, retries resume automatically. Do not delete outbox/history/audit records. Route alerts
through the existing infrastructure monitoring configuration before releasing to customers.

## Verification

Use only the isolated database described in [local development](../docs/local-development.md).
Never point `TEST_DATASOURCE_*` at a functional or production database.

```powershell
.\mvnw.cmd '-Dtest=MessagingIntegrationTest,MigrationVersionUniquenessTest,SystemTicketOperationsServiceTest,SubscriptionAccessInterceptorTest,PlatformAdminMfaInterceptorTest' test
npm.cmd run test:messaging --prefix react
npm.cmd run typecheck --prefix react
npm.cmd run build --prefix react
```

Browser regression requires an installed Playwright toolchain; no production dependency was added.
Optionally set `INDICE_PLAYWRIGHT_MODULE` to its `index.mjs` file URL and run:

```powershell
npm.cmd run test:messaging-browser --prefix react
```

The browser fixture uses synthetic responses and blocks requests outside its local origin. Java
tests use real MySQL/transactions for isolation, concurrent sends/assignment, rollback and notifier
recovery. Neither substitutes for a smoke flow through deployed authentication and proxies.

## Deployment and rollback

1. Identify the release artifact and verify a database backup using the main deployment runbook.
2. Apply additive migrations V291 and V292, validate Flyway, application readiness and existing ticket access.
3. Deploy backend/frontend together. Exercise request, response, assignment, transfer, resolution
   and reopening using separate client, distributor and operator accounts.
4. Verify tenant isolation, internal-note privacy, restricted-subscription support and operator MFA.
5. Test disconnection and application restart, reload committed history, and check notification
   processing and operational alerts. Record target-environment evidence and support coverage.

Application rollback preserves V291/V292 tables, messages and stored photographs. Do not reverse it with destructive SQL.
Verify the previous application's Flyway compatibility before reverting; otherwise follow the
documented backup recovery procedure. Existing system tickets keep their original schema and APIs.

Scope: individual text/photo chat, customer care queues, assignments, notes, priorities, transfer,
resolution, audit and notifications in the eight supported locale variants. Kiosk identities,
groups, non-image attachments, external email, typing indicators and presence are outside this release.
Production capacity and authenticated deployment smoke tests require target-environment evidence.

Photo release checks: private document bucket, browser PUT/CORS access, shared storage quota,
immutable saved objects, 60-second download links, sender/participant and internal-note isolation,
failed-upload and lost-acknowledgement retries, five-photo/8-MiB limits, mobile composer and staging
cleanup. Confirm the cleanup scheduler runs and storage errors are monitored. Schema and API tests
alone do not certify storage/proxy configuration in a deployment. Text chat remains available when
photo storage is disabled. The frontend shows a recoverable error and retains the unsent photos.
