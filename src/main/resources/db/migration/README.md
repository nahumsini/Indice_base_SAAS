# Flyway Migrations

This directory is now the Spring-owned migration root.

Current transitional strategy:

- Flyway is enabled on startup.
- The application uses `baseline-on-migrate=true`.
- Existing non-empty copies of `indice_db` will be tagged at baseline version `0`.
- Fresh empty databases can now be built from `B1__spring_backend_baseline.sql`.
- Existing adopted databases with a schema history table will ignore baseline migrations.

Current committed baseline approach:

- `B1__spring_backend_baseline.sql` is the cumulative baseline for the current Spring-owned subset of the schema.
- It is intentionally limited to the tables the Spring backend currently reads or writes.
- It also seeds the demo company, demo user, module catalog, and the small org/HR dataset used by the integrated slice.
- `V2__config_center_company_settings.sql` adds the shared `company_settings` table when it does not already exist.

Migration naming rules for future SQL files:

- `V2__description.sql`
- `V3_1__description.sql`
- `R__description.sql` for repeatable migrations only when genuinely needed

Rules:

- Do not edit an already applied versioned migration.
- Do not make schema changes outside Flyway once a change is Spring-owned.
- Keep MySQL-specific SQL valid for direct execution in MySQL when possible.
- Treat `B1__spring_backend_baseline.sql` as immutable after adoption.
- The next normal versioned migration should start at `V3__...`.
