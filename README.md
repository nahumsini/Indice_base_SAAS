# Indice_base_SAAS

Full-stack Indice SAAS workspace with:

- Spring Boot backend in `src/main/java`
- React frontend in `react/`
- Flyway migrations in `src/main/resources/db/migration/`

## Stack

- Spring Boot 3.5
- Java 21
- Spring Web
- Spring JDBC
- Flyway
- MySQL 8
- session-based authentication

## Run

```bash
cd ~/Documents/Indice/Indice_base_SAAS
./mvnw spring-boot:run
```

Spring Boot DevTools is enabled for local runs. Backend changes restart automatically after the changed Java classes are recompiled by your IDE or by running Maven compile.

Default URL:

- `http://127.0.0.1:8082`

## Clean DB Run

Reset the local MySQL database that this backend uses before starting Spring:

```bash
cd ~/Documents/Indice/Indice_base_SAAS
./scripts/reset-local-db.sh
./mvnw spring-boot:run
```

The reset script:

- creates `indice-mysql-fresh` on port `3307` if it does not exist
- starts the container if it is stopped
- drops and recreates `indice_db`
- leaves Flyway to rebuild the schema on the next backend startup from the latest baseline migration, currently `B40`

## Frontend setup

Point the React frontend to this backend:

```env
VITE_BACKEND_URL=http://127.0.0.1:8082
VITE_API_BASE_URL=
```

## Current API base

All frontend-facing routes are under:

- `/api/v1`

## Implemented route groups

### Auth

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### Health

- `GET /`
- `GET /api/v1/health`

### Dashboard / org shell

- `GET /api/v1/modules`
- `GET /api/v1/org/units`
- `GET /api/v1/org/businesses`

### Config Center

- `GET /api/v1/config-center/current-user`
- `PUT /api/v1/config-center/current-user`
- `GET /api/v1/config-center/users`
- `PUT /api/v1/config-center/users/{id}`
- `POST /api/v1/config-center/users/invite`
- `POST /api/v1/config-center/users/invitations/{id}/resend`
- `GET /api/v1/config-center/company`
- `GET /api/v1/config-center/config`
- `PUT /api/v1/config-center/business-structure`
- `PUT /api/v1/config-center/company`

### Human Resources

- `GET /api/v1/hr/users`
- `POST /api/v1/hr/users`
- `PUT /api/v1/hr/users/{id}`
- `POST /api/v1/hr/users/{id}/terminate`
- `DELETE /api/v1/hr/users/{id}`

## Database

Current database target:

- host: `127.0.0.1`
- port: `3307`
- db: `indice_db`
- user: `indice_user`

This backend currently uses the existing development database directly.

Flyway is now enabled in transitional baseline mode for the existing shared schema:

- first startup against a non-empty legacy schema creates `flyway_schema_history`
- the current schema is tagged at baseline version `0`
- `B40` now covers the current Spring-owned subset of the schema through the HR user rewiring

## Docs

See:

- [`docs/README.md`](docs/README.md)
- [`docs/setup.md`](docs/setup.md)
- [`docs/flyway.md`](docs/flyway.md)
- [`docs/api-guide.md`](docs/api-guide.md)
- [`docs/api-reference.md`](docs/api-reference.md)
- [`docs/frontend-integration.md`](docs/frontend-integration.md)
- [`docs/postman.md`](docs/postman.md)
