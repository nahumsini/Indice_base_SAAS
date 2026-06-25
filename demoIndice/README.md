# Demo Indice

Separate React/Vite frontend for the Indice demo workspace.

## Current Scope

- Login page with company name/code, email, and password.
- Register page for creating a demo company account.
- Protected Home Panel route.
- Company routing page for production-company handoff.
- Frontend-only auth state for this first pass; no browser token storage.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
```

## Next Backend Step

Connect this shell to the planned NestJS backend with secure HttpOnly cookie sessions, CSRF protection, and a separate demo Postgres database.
