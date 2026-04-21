# Flyway Guide

## Why Flyway Is Enabled Now

The Spring backend now has Flyway enabled so schema ownership can move toward Spring in a controlled way.

The current database is still the existing shared legacy schema in `indice_db`, so this is a transitional setup rather than a clean greenfield migration history.

## Current Strategy

Current Flyway settings:

- enabled: `true`
- locations: `classpath:db/migration`
- baseline on migrate: `true`
- baseline version: `0`
- baseline description: `Legacy shared schema baseline`
- clean disabled: `true`

This means:

1. when Spring starts against a non-empty legacy schema
2. Flyway creates `flyway_schema_history`
3. the existing schema is tagged as baseline version `0`
4. no historical DDL is replayed into the already populated schema

This is the safe adoption step for the current shared database.

## Current Baseline Model

The migration directory now contains:

- `B1__spring_backend_baseline.sql`
- `V2__config_center_company_settings.sql`

This baseline migration:

- creates the current Spring-owned subset of the schema
- seeds the demo company, demo user, module catalog, and the minimal org/HR data needed by the integrated slice
- is intended for fresh empty databases

Existing non-empty legacy databases that were already adopted through `baseline-on-migrate` remain at Flyway version `0`.

Fresh empty databases created from `B1__spring_backend_baseline.sql` start at Flyway version `1`.

`V2__config_center_company_settings.sql` creates the `company_settings` table when it does not already exist.

That lets the Config Center write path use the same storage model on both:

- the shared legacy database
- fresh Flyway-built databases

## How To Run

Start the backend normally:

```bash
cd ~/Desktop/indice_saas_spring
./mvnw spring-boot:run
```

Flyway runs automatically on startup through Spring Boot.

## How To Verify

Check the Flyway history table:

```bash
docker exec indice-mysql mysql -u indice_user -pindice_pass -D indice_db -e "SELECT installed_rank, version, description, type, script, success FROM flyway_schema_history ORDER BY installed_rank"
```

You should see a baseline row after the first Spring startup with Flyway enabled.

Expected current rows in the shared legacy database:

- version: `0` / `Legacy shared schema baseline` / `BASELINE`
- version: `2` / `config center company settings` / `SQL`

Expected current rows in a fresh database created from the committed baseline:

- version: `1` / `spring backend baseline` / `SQL_BASELINE`
- version: `2` / `config center company settings` / `SQL`

## Migration File Conventions

Versioned SQL migrations:

- `V2__add_company_settings.sql`
- `V3_1__backfill_employee_numbers.sql`

Repeatable migrations:

- `R__view_name.sql`

## Working Rules

- Do not edit a versioned migration after it has been applied anywhere.
- Do not edit `B1__spring_backend_baseline.sql` after adoption.
- Do not use Flyway `clean` against the shared legacy database.
- Do not add ad hoc schema changes outside Flyway once a schema change is considered Spring-owned.
- Keep migrations small and explicit.
- Prefer additive changes and backfills over destructive rewrites.

## Versioning Rule After Pass 3

Use `B1__spring_backend_baseline.sql` as the committed cumulative baseline for fresh databases.

The next regular versioned migration should start at:

- `V3__...`

This avoids confusion between:

- the shared legacy database adopted at baseline version `0`
- fresh databases created from the committed baseline at version `1`

## Fresh Database Validation Example

Example local validation flow:

```bash
docker exec indice-mysql mysql -uroot -prootpass -e "DROP DATABASE IF EXISTS indice_db_pass3_fresh; CREATE DATABASE indice_db_pass3_fresh CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; GRANT ALL PRIVILEGES ON indice_db_pass3_fresh.* TO 'indice_user'@'%'; FLUSH PRIVILEGES;"

SPRING_DATASOURCE_URL='jdbc:mysql://127.0.0.1:3306/indice_db_pass3_fresh?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&useUnicode=true&characterEncoding=utf8' \
./mvnw spring-boot:run -Dspring-boot.run.arguments=--server.port=8086
```

Then verify:

- `GET /api/v1/health`
- `POST /api/v1/auth/login`
- `GET /api/v1/modules`
- `GET /api/v1/hr/employees`
