# Released migration lineage reconciliation

Status: approved integration correction, 2026-10-05. Deployment approval remains conditional on
the release gates. Scope: preserve the actual APPTEST/production history while integrating the
pending administrator changes. No history repair, checksum replacement, database reset or seed.

Read-only inspection confirmed both release databases at V289 with zero failed migrations:

| Version | Released identity | Flyway checksum |
| --- | --- | --- |
| V288 | platform lead diagnosis flow | 1234112480 |
| V289 | platform lead plan interest | 1752329598 |

The integrated development tree reused V288 for opportunity assignment and shifted the lead
files to V289/V290. A fresh-database test did not reveal that upgrade incompatibility.

The canonical source restores the exact released V288/V289 files from `60ac5a458667`.
The duplicate, unreleased V290 lead-plan file is removed. Messaging V291/V292 remain unchanged.
Opportunity assignment moves to the next unused version, V293, with the same assignment/backfill
semantics. No existing release history row or checksum is changed. Version gaps are intentional.

`MigrationVersionUniquenessTest` pins the released lead checksums. Run the explicit upgrade
rehearsal only against a **fresh disposable** `indice_test_db`, before any Spring test populates it:

```bash
./mvnw clean -Dtest=MigrationVersionUniquenessTest,ReleasedSchemaUpgradeIntegrationTest \
  -Dindice.migrations.rehearseUpgrade=true test
```

Supply `TEST_DATASOURCE_URL`, `TEST_DATASOURCE_USERNAME`, and `TEST_DATASOURCE_PASSWORD` from
the isolated test environment. The rehearsal refuses a nonempty database, migrates through the
released V289 lineage, creates synthetic leads/history/opportunity positions, then verifies the
three forward migrations, retained data/history and retry safety. It does not reset any database.

Development databases created with the alternate V288/V289/V290 lineage are not release targets.
Do not run `repair` or change their history to disguise the mismatch. Keep their data intact and
use a separate, clean local/test database for this corrected source; any data transfer requires its
own reviewed procedure.

Before activation: verified backup/restore, target-data preconditions, exact-commit CI, protected
environment preflight, immutable artifacts/scans and target smoke/UAT are required. V293 adds a
non-null flow requirement; the prior backend may validate future migrations but still cannot create
opportunities without a flow. Therefore old-image rollback must be proved behaviorally, or use an
explicitly tested compatible recovery artifact. Never reverse the migration or erase business data.
