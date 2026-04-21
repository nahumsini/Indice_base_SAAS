# Records Implementation

Date: 2026-04-15

This note documents the Records module work completed for Human Resources.

## Scope

- Implemented the Records module end to end.
- Replaced the imported UI-only mock flow with real backend persistence.
- Kept the existing visual style of the Records UI from the imported design.
- Used the shared project feedback components:
  - `LoadingBarOverlay`
  - `SuccessToast`
  - `FailureToast`
- Implemented attachment metadata flow using object storage instead of database file blobs.

## Product Result

The Records module is now a real HR feature for company users with:

- record list
- record details
- create record
- edit record
- soft delete record
- witness support
- attachment upload registration
- activity/audit trail

The frontend is wired to the backend and no longer depends on local mock data.

## Backend Tables Added

Flyway migration:

- `src/main/resources/db/migration/V17__hr_records.sql`

Tables:

- `hr_employee_records`
- `hr_employee_record_witnesses`
- `hr_employee_record_attachments`
- `hr_employee_record_activity`

### `hr_employee_records`

Purpose:

- main record table for an employee history item
- stores employee linkage plus historical snapshot values

Important columns:

- `id`
- `company_id`
- `record_number`
- `employee_id`
- `employee_name_snapshot`
- `employee_position_snapshot`
- `employee_department_snapshot`
- `employee_unit_id_snapshot`
- `employee_unit_name_snapshot`
- `employee_business_id_snapshot`
- `employee_business_name_snapshot`
- `record_type`
- `severity`
- `status`
- `title`
- `description`
- `actions_taken`
- `event_date`
- `reported_by_user_id`
- `reported_by_employee_id`
- `reported_by_name_snapshot`
- `created_by_user_id`
- `updated_by_user_id`
- `created_at`
- `updated_at`
- `deleted_at`

Notes:

- records are company-scoped
- delete is soft delete through `deleted_at`
- `record_number` is generated as `REC-000001`, `REC-000002`, etc.

### `hr_employee_record_witnesses`

Purpose:

- stores witnesses for a record

Important columns:

- `id`
- `company_id`
- `record_id`
- `witness_employee_id`
- `witness_name_snapshot`
- `created_at`

### `hr_employee_record_attachments`

Purpose:

- stores attachment metadata only
- physical files stay in object storage

Important columns:

- `id`
- `company_id`
- `record_id`
- `original_filename`
- `mime_type`
- `size_bytes`
- `object_key`
- `uploaded_by_user_id`
- `created_at`
- `deleted_at`

### `hr_employee_record_activity`

Purpose:

- audit trail for record changes

Important columns:

- `id`
- `company_id`
- `record_id`
- `activity_type`
- `from_status`
- `to_status`
- `note`
- `actor_user_id`
- `actor_name_snapshot`
- `created_at`

## Backend Files Added

- `src/main/java/com/indice/erp/hr/HrRecordApiController.java`
- `src/main/java/com/indice/erp/hr/HrRecordService.java`

## Backend Endpoints Added

Base path:

- `/api/v1/hr/records`

Endpoints:

- `GET /api/v1/hr/records`
- `GET /api/v1/hr/records/{recordId}`
- `POST /api/v1/hr/records`
- `PUT /api/v1/hr/records/{recordId}`
- `DELETE /api/v1/hr/records/{recordId}`
- `POST /api/v1/hr/records/{recordId}/attachments/presign-upload`
- `POST /api/v1/hr/records/{recordId}/attachments`
- `DELETE /api/v1/hr/records/{recordId}/attachments/{attachmentId}`

## Backend Rules Implemented

Record types:

- `incident`
- `warning`
- `recognition`
- `observation`
- `training`

Severity values:

- `low`
- `medium`
- `high`

Status values:

- `pending`
- `reviewed`
- `resolved`

Validation:

- `employee_id` is required
- `record_type` is required
- `title` is required
- `description` is required
- `event_date` is required
- `event_date` cannot be in the future
- `severity` is required for `incident` and `warning`
- `title` max length is enforced
- `description` max length is enforced
- `actions_taken` max length is enforced

Attachments:

- max size: `10 MB`
- allowed content types include:
  - `pdf`
  - `png`
  - `jpg`
  - `jpeg`
  - `doc`
  - `docx`
- attachment metadata is saved only after uploaded object existence is verified

## Frontend Files Updated

- `react/src/app/BasicModules/HumanResources/Records/Records.tsx`
- `react/src/app/BasicModules/HumanResources/Records/components/CreateRecordModal.tsx`
- `react/src/app/BasicModules/HumanResources/Records/components/RecordDetailModal.tsx`
- `react/src/app/BasicModules/HumanResources/Records/components/RecordFilters.tsx`
- `react/src/app/BasicModules/HumanResources/Records/components/RecordsList.tsx`
- `react/src/app/BasicModules/HumanResources/Records/types/records.types.ts`
- `react/src/app/api/endpoints.ts`
- `react/src/app/api/humanResources.ts`

Removed old mock-only files:

- `react/src/app/BasicModules/HumanResources/Records/data/employees.mock.ts`
- `react/src/app/BasicModules/HumanResources/Records/data/records.mock.ts`

## Frontend Behavior Now In Place

- loads real records from the backend
- loads employee options from the HR employee API
- supports local filtering on loaded records
- opens real detail view from backend data
- creates and updates records through the API
- uploads attachments through presigned upload plus attachment registration
- soft deletes records through the API
- uses real generated record numbers in the UI

## UX Pattern Used

Shared components used:

- `LoadingBarOverlay`
- `SuccessToast`
- `FailureToast`

Behavior:

- loading overlay shows while fetching records or saving changes
- success toast shows after create, update, and delete
- failure toast shows for API and validation failures
- no mock-only success state remains in the Records page

## Data Design Notes

The best storage design used here is:

- one main record table
- one witness child table
- one attachment child table
- one audit/activity child table

Why:

- one employee can have many records
- one record can have many witnesses
- one record can have many attachments
- HR history needs an audit trail
- employee snapshots preserve historical truth even if employee data changes later

## Testing Added

Backend tests:

- `src/test/java/com/indice/erp/hr/HrRecordApiControllerTest.java`
- `src/test/java/com/indice/erp/hr/HrRecordServiceTest.java`

Integration coverage:

- `src/test/java/com/indice/erp/hr/HrFirstRunIntegrationTest.java`

Verified with:

```bash
./mvnw -q -Dtest=HrRecordServiceTest,HrRecordApiControllerTest,HrFirstRunIntegrationTest#recordsCrudAndAttachmentUploadFlowWorks test
./node_modules/.bin/tsc --noEmit --pretty false
npm run build
```

## Important Note

The Records module is ready to use.

Attachment uploads require object storage to be enabled in the environment. If MinIO or object storage is disabled, the record feature still works, but attachment upload endpoints return the expected storage-disabled error response.
