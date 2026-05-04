# Home Panel Profile Photo

Date: May 4, 2026

## Summary

Enabled the Home Panel Profile photo workflow and moved avatar storage from a disabled UI placeholder into database-backed, reusable object storage metadata.

Users can now upload a profile photo from the Profile panel. The uploaded file is stored through the existing object storage flow, the profile keeps the object key and content type in `user_profiles`, and backend responses expose a signed `avatar_url` so the same image can be reused across Profile, Header, and Users screens.

## What Changed

- Enabled the Profile photo action in the Home Panel profile form.
- Added client-side validation for supported image types and a 1MB upload limit.
- Added presigned upload support for current-user avatar uploads.
- Saved avatar object metadata on the profile record instead of storing a raw public URL.
- Returned signed avatar URLs when reading the current user or user list.
- Updated the Header to read profile data from Config Center and refresh after profile saves.
- Updated the Users table to display saved user avatars when available.
- Kept normal profile saves from clearing existing avatar data unless a new avatar is explicitly saved.
- Added MinIO documents bucket initialization and CORS setup so browser uploads work against the avatar storage path.
- Used migration `V30__user_profile_avatar_object_keys.sql` to avoid colliding with another branch's `V29` migration.

## Database

Added migration:

- `V30__user_profile_avatar_object_keys.sql`

Updated table:

- `user_profiles`
  - `avatar_object_key`
  - `avatar_content_type`
  - `avatar_updated_at`

The existing `avatar_url` field remains available as a legacy fallback, but newly uploaded avatars are tracked by object key and served through signed URLs.

## Backend

Updated Config Center:

- Added `POST /api/v1/config-center/current-user/avatar/presign-upload`.
- Validates avatar uploads before issuing a presigned URL.
- Stores avatar objects under `config-center/user-profiles/{companyId}/{userId}/avatar/...`.
- Confirms uploaded objects exist before saving profile avatar metadata.
- Deletes the previous avatar object after replacement when possible.
- Returns avatar metadata and signed URLs from current-user and users-list responses.
- Refreshes the session display name after saving the current user profile.

## Frontend

Updated Profile:

- Added local preview support while a new avatar is pending save.
- Uploads selected images with the presigned URL helper.
- Saves returned avatar object metadata with the rest of the profile changes.
- Reverts unsaved avatar previews on discard.

Updated Header:

- Loads profile identity from Config Center.
- Reuses the saved avatar URL.
- Listens for profile-save events so the avatar and display name refresh immediately.

Updated Users:

- Displays user avatar images in the users list when present.
- Falls back to initials when no avatar is available.

## Files Changed Or Involved

- `src/main/resources/db/migration/V30__user_profile_avatar_object_keys.sql`
- `src/main/java/com/indice/erp/configcenter/ConfigCenterApiController.java`
- `src/main/java/com/indice/erp/configcenter/ConfigCenterService.java`
- `react/src/app/api/endpoints.ts`
- `react/src/app/api/configCenter.ts`
- `react/src/app/BasicModules/Dashboard/Profile/Profile.tsx`
- `react/src/app/components/Header.tsx`
- `react/src/app/BasicModules/Dashboard/Users/Users.tsx`
- `deployment/docker/minio/init-minio.sh`
- `src/test/java/com/indice/erp/configcenter/ConfigCenterApiControllerTest.java`
- `src/test/java/com/indice/erp/configcenter/ConfigCenterServiceTest.java`

## Verification

Completed checks:

- `cd react && npm run typecheck`
- `cd react && npm run build`
- `./mvnw test`
- `./mvnw -Dtest=ConfigCenterApiControllerTest test`
- `git diff --check`

Notes:

- The frontend build completed with the existing Vite large chunk warning.
- The full backend test suite passed before the final controller helper cleanup, and the targeted Config Center controller test passed after that cleanup.
