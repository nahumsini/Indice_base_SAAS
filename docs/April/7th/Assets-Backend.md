# Assets Backend

Date: 2026-04-07

This note documents the backend work implemented for the Human Resources > Assets module.

## Scope

- Added a production-friendly asset schema using a current-state table plus dedicated history tables.
- Added session-protected REST endpoints for listing, details, create, update, reassign, status change, and history.
- Added audit fields so asset changes can be traced by company and by acting user.
- Added validation and company-level enforcement in the service layer.
- Added targeted controller and service tests for the new module.

## Architecture Recommendation

The backend follows the same style already used in this Spring project:

- thin controller
- `JdbcTemplate` service layer
- Flyway migrations for schema
- session-based company/user enforcement through `SessionAuthService`

This is the best fit for the current codebase because it stays consistent with the existing HR and Config Center modules instead of introducing a separate JPA stack just for Assets.

## Schema

Flyway migration:

- `src/main/resources/db/migration/V11__hr_assets.sql`

Tables:

- `hr_assets`
  - current asset state
  - one row per asset
  - stores company, current assignee, current unit, current status, value, notes, and audit columns
- `hr_asset_assignments`
  - assignment/custody history
  - one row per assignment period
  - stores `started_at`, `ended_at`, responsible employee, unit, and actor users
- `hr_asset_status_history`
  - status transition history
  - stores `from_status`, `to_status`, change reason, notes, actor user, and timestamp

## Why This Schema Is Best

- `hr_assets` keeps list and reporting queries fast.
- Assignment history is separated from status history, which keeps audit trails explicit.
- Status changes like `maintenance` and `inactive` do not need to be inferred from assignment rows.
- `company_id` is present on all tables for tenant-safe filtering and reporting.
- `user_id` tracking is stored in audit columns where change attribution matters.
- The design supports future BI/reporting without flattening or reconstructing history from one overloaded table.

## Supported Asset Fields

- `asset_code`
- `asset_type`
- `name`
- `model`
- `serial_number`
- `responsible_employee_id`
- `unit_id`
- `status`
- `assigned_at`
- `value_amount`
- `notes`

Supported statuses:

- `available`
- `assigned`
- `maintenance`
- `custody`
- `inactive`

## API Endpoints

Base path:

- `/api/v1/hr/assets`

Endpoints:

- `GET /api/v1/hr/assets`
  - supports `search`, `asset_type`, `status`, `unit_id`, `responsible_employee_id`, `page`, `size`
  - returns paginated items plus summary counts
- `GET /api/v1/hr/assets/{assetId}`
  - returns current asset details
- `POST /api/v1/hr/assets`
  - creates a new asset
- `PUT /api/v1/hr/assets/{assetId}`
  - updates metadata fields only
- `POST /api/v1/hr/assets/{assetId}/reassign`
  - changes current responsible employee and assignment/custody record
- `POST /api/v1/hr/assets/{assetId}/status`
  - moves asset into `maintenance`, `custody`, `inactive`, or back to `available`
- `GET /api/v1/hr/assets/{assetId}/history`
  - returns current asset, assignment history, status history, and merged timeline

## Pagination

- Pagination is implemented in the backend, not the frontend.
- List endpoint accepts `page` and `size`.
- SQL uses `LIMIT` and `OFFSET` so the server only returns the requested rows.
- Response includes:
  - `items`
  - `count`
  - `page`
  - `size`
  - `total_count`
  - `total_pages`
  - `summary`

## Validation And Enforcement

- Missing session returns `401 Unauthorized`.
- `company_id` is taken from the authenticated session, not from client payload.
- Acting `user_id` is taken from the authenticated session for audit fields.
- `asset_code`, `asset_type`, and `name` are required on create.
- `asset_code` must be unique per company.
- `serial_number` must be unique per company when provided.
- `value_amount` must be zero or greater.
- `responsible_employee_id` must belong to the same company and be active.
- `unit_id` must belong to the same company and be active.
- `assigned` and `custody` require a responsible employee.
- Non-assigned statuses reject assignment-only fields.
- Metadata update endpoint rejects status/assignment changes so audit history stays correct.

## Indexes And Constraints

- unique `(company_id, asset_code)`
- unique `(company_id, serial_number)`
- indexed `(company_id, status)`
- indexed `(company_id, responsible_employee_id)`
- indexed `(company_id, unit_id)`
- indexed `(company_id, asset_type)`
- indexed `(company_id, updated_at)`
- foreign keys to `companies`, `users`, `hr_employees`, and `units`
- status check constraints on current and history tables
- non-negative value check constraint

## Main Backend Files

- `src/main/java/com/indice/erp/hr/assets/HrAssetApiController.java`
- `src/main/java/com/indice/erp/hr/assets/HrAssetService.java`
- `src/main/resources/db/migration/V11__hr_assets.sql`
- `src/test/java/com/indice/erp/hr/assets/HrAssetApiControllerTest.java`
- `src/test/java/com/indice/erp/hr/assets/HrAssetServiceTest.java`

## Current Backend Result

- Backend design and implementation are in place for Assets.
- Pagination, filtering, audit history, and status/assignment flows are implemented.
- Targeted module tests pass.
- Frontend integration to replace the current mock/local-state Assets data is still pending.
