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
make dev
```

`make dev` starts the safe local development stack without resetting the
database. During backend initialization, the application restores and verifies
the isolated local login `demo@example.com` / `demo123` with the same password
encoder used by authentication. Optional demo datasets remain separate:

- local MySQL in `indice-mysql-fresh` on `127.0.0.1:3307`
- MinIO, minio-init, and face-service
- Spring Boot backend on `http://127.0.0.1:8082`
- React/Vite frontend on `http://127.0.0.1:5174`

Useful local commands:

```bash
make infra     # Start MySQL, MinIO, minio-init, and face-service only
make backend   # Run only Spring Boot on http://127.0.0.1:8082
make frontend  # Run only React/Vite on http://127.0.0.1:5174
make restore-local-demo-login # Restore only demo@example.com / demo123
make seed-local-demo # Refresh demo data and restore the local demo password
make up        # Alias for make dev
make db-repair # Repair Flyway metadata without resetting local data
make ps        # Show local infrastructure status
make down      # Stop local infrastructure containers
```

To preserve locally edited demo records for a particular run, use
`LOCAL_DEMO_SEED_ON_DEV=false make dev`.

`make backend` and `make dev` supply development-only kiosk secrets and disable
the legacy kiosk-secret sentinel check for the existing local database. They
also disable Spring Boot DevTools automatic restart so file watchers cannot
accumulate during long development sessions. Production still requires its own
secrets through the deployment environment and keeps kiosk-secret protection
enabled.

## Clean DB Run

Reset the local MySQL database only when you intentionally want a fresh schema:

```bash
cd ~/Documents/Indice/Indice_base_SAAS
make db-reset
make dev
```

`make db-reset` is destructive. It:

- creates `indice-mysql-fresh` on port `3307` if it does not exist
- starts the container if it is stopped
- drops and recreates `indice_db`
- leaves Flyway to rebuild the schema on the next backend startup from the latest baseline migration, currently `B40`

## Backend tests use an isolated database

`src/test/resources/application.properties` deliberately targets `indice_test_db`, never the functional `indice_db`. The default test connection is:

- host/port: `127.0.0.1:3307`;
- database: `indice_test_db`;
- user: `indice_test_user`;
- password: `indice_test_pass`.

Run the suite against a disposable MySQL 8 instance or an equivalently isolated schema. A local example is:

```bash
docker run --rm -d --name indice-mysql-tests \
  -p 127.0.0.1:3307:3306 \
  -e MYSQL_DATABASE=indice_test_db \
  -e MYSQL_USER=indice_test_user \
  -e MYSQL_PASSWORD=indice_test_pass \
  -e MYSQL_ROOT_PASSWORD=indice_test_root \
  mysql:8.0

./mvnw test
docker stop indice-mysql-tests
```

If port `3307` is already occupied, point the test process to another dedicated instance with `TEST_DATASOURCE_URL`, `TEST_DATASOURCE_USERNAME` and `TEST_DATASOURCE_PASSWORD`. Do not set those variables to `indice_db`; Spring integration tests are allowed to write data.

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
- [`AGENTS.md`](AGENTS.md) — repository working rules and authority hierarchy
- [`docs/indice-frontend-operating-system-v2.md`](docs/indice-frontend-operating-system-v2.md)
- [`docs/indice-backend-operating-system-v1.md`](docs/indice-backend-operating-system-v1.md)
- [`docs/indice-public-release-security-gate.md`](docs/indice-public-release-security-gate.md)
- [`deployment/README.md`](deployment/README.md)

The March 30 setup/API guides remain historical integration references under
[`docs/March/30th/`](docs/March/30th/). Verify their route and implementation claims against the
current code before using them.
