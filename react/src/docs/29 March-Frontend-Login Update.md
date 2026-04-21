# 29 March - Frontend Login Update

## Overview

This note explains the current frontend auth flow in `Frontend_Indice`, including:

- route protection
- login flow
- session persistence
- refresh behavior
- logout flow

The frontend does not store login credentials in `localStorage`. Logged-in state comes from the backend PHP session cookie.

## Main Files Involved

- [`main.tsx`](/home/akira/Projects/saas_indice_modules/Frontend_Indice/src/main.tsx)
- [`routes.tsx`](/home/akira/Projects/saas_indice_modules/Frontend_Indice/src/app/routes.tsx)
- [`LoginPage.tsx`](/home/akira/Projects/saas_indice_modules/Frontend_Indice/src/app/Auth/LoginPage.tsx)
- [`auth.ts`](/home/akira/Projects/saas_indice_modules/Frontend_Indice/src/app/api/auth.ts)
- [`apiClient.ts`](/home/akira/Projects/saas_indice_modules/Frontend_Indice/src/app/lib/apiClient.ts)
- [`Header.tsx`](/home/akira/Projects/saas_indice_modules/Frontend_Indice/src/app/components/Header.tsx)
- [`App.tsx`](/home/akira/Projects/saas_indice_modules/Frontend_Indice/src/app/App.tsx)

## Auth Source Of Truth

The source of truth for login state is the backend PHP session.

- The frontend sends requests with `credentials: 'include'`
- The browser includes the PHP session cookie automatically
- Protected access is verified through `/api/auth/me.php`

The frontend does store some UI preferences in `localStorage`, such as:

- selected language
- dark mode
- learning mode
- KPI preferences

It does not store:

- email
- password
- auth token
- login session data as persistent frontend auth state

## Step-By-Step Login Flow

### 1. User Opens The Frontend

The router in [`routes.tsx`](/home/akira/Projects/saas_indice_modules/Frontend_Indice/src/app/routes.tsx) runs a loader before rendering protected routes.

### 2. Frontend Checks Existing Session

The route loader calls:

- `authApi.getSessionOrNull()`

That logic lives in [`auth.ts`](/home/akira/Projects/saas_indice_modules/Frontend_Indice/src/app/api/auth.ts).

It checks the backend session by calling:

- `/api/auth/me.php`

through the shared client in [`apiClient.ts`](/home/akira/Projects/saas_indice_modules/Frontend_Indice/src/app/lib/apiClient.ts).

### 3. If No Session Exists

The user is redirected to:

- `/login`

This happens for:

- `/`
- `/dashboard`
- any protected module route

### 4. Login Page Loads

The login screen is:

- [`LoginPage.tsx`](/home/akira/Projects/saas_indice_modules/Frontend_Indice/src/app/Auth/LoginPage.tsx)

It currently supports:

- shared language selection
- English as default
- email validation
- password show/hide

### 5. User Clicks Sign In

The login page calls:

- `authApi.login({ email, password })`

### 6. Backend Login Sequence

`authApi.login()` performs this sequence:

1. `GET /login.php`
2. extract hidden `csrf` token from the HTML
3. `POST /login.php` with:
   - `email`
   - `password`
   - `csrf`
4. call `/api/auth/me.php` to verify that the session is now valid

### 7. If Login Succeeds

The backend sets the PHP session cookie in the browser.

The frontend then:

- caches the session in memory
- navigates to `/dashboard`

### 8. Dashboard Opens

After successful auth:

- `LoginPage.tsx` navigates to `/dashboard`
- [`routes.tsx`](/home/akira/Projects/saas_indice_modules/Frontend_Indice/src/app/routes.tsx) loads [`App.tsx`](/home/akira/Projects/saas_indice_modules/Frontend_Indice/src/app/App.tsx)
- `App.tsx` renders the dashboard and modules shell

## Refresh Behavior

### Logged-In User

If the browser still has a valid PHP session cookie:

- refreshing keeps the user inside the app
- the route loader checks the session
- the requested protected screen loads normally

### Logged-Out User

If the browser does not have a valid PHP session cookie:

- protected routes redirect to `/login`
- the app does not continue loading protected module content

## Request Optimization

The auth flow was optimized to reduce unnecessary repeated session checks.

### Before Optimization

If a logged-out user refreshed a protected route like `/dashboard`, the app could make:

1. one request to `/api/auth/me.php`
2. redirect to `/login`
3. another request to `/api/auth/me.php`

### Current Behavior

`authApi.getSessionOrNull()` now keeps a small in-memory session cache.

This means:

- refresh on `/login` while logged out: 1 auth check
- refresh on `/dashboard` while logged out: 1 auth check
- refresh on `/` while logged out: 1 auth check
- after successful login, the app avoids an extra immediate auth check when possible
- after logout, the cached session is cleared immediately

## Logout Flow

The logout action is in the profile dropdown inside:

- [`Header.tsx`](/home/akira/Projects/saas_indice_modules/Frontend_Indice/src/app/components/Header.tsx)

### Step-By-Step Logout

1. User opens the profile menu in the top-right header
2. User clicks `Logout`
3. `Header.tsx` calls:
   - `authApi.logout()`
4. `authApi.logout()` calls:
   - `/logout.php`
5. The backend destroys the PHP session
6. The frontend clears the in-memory session cache
7. The frontend redirects the user to:
   - `/login`

### After Logout

If the user tries to open a protected route again:

- the route loader checks `/api/auth/me.php`
- backend returns `401`
- user is redirected back to `/login`

## Current Result

The current frontend auth flow now provides:

- real backend login
- real backend logout
- route-protected module access
- login page as the landing page for logged-out users
- automatic dashboard entry for already-authenticated users
- reduced duplicate auth checks on refresh and redirects

## Summary

Current auth behavior is based on backend session cookies, not frontend-stored credentials.

That means:

- login is secure against the real backend session flow
- logout actually destroys the backend session
- refresh behaves correctly for both logged-in and logged-out users
- the frontend does not persist sensitive credentials in `localStorage`
