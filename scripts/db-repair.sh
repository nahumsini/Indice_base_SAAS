#!/usr/bin/env bash

set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME:-indice-mysql-fresh}"
HOST_PORT="${HOST_PORT:-3307}"
DATABASE_NAME="${DATABASE_NAME:-indice_db}"
DATABASE_USER="${DATABASE_USER:-indice_user}"
DATABASE_PASSWORD="${DATABASE_PASSWORD:-indice_pass}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-rootpass}"
FLYWAY_PLUGIN_VERSION="${FLYWAY_PLUGIN_VERSION:-}"
FLYWAY_MIGRATION_LOCATION="${FLYWAY_MIGRATION_LOCATION:-filesystem:src/main/resources/db/migration}"

if [[ -z "${FLYWAY_PLUGIN_VERSION}" ]]; then
  FLYWAY_PLUGIN_VERSION="$(./mvnw -q help:evaluate -Dexpression=flyway.version -DforceStdout)"
fi

flyway_url="jdbc:mysql://127.0.0.1:${HOST_PORT}/${DATABASE_NAME}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&useUnicode=true&characterEncoding=utf8"

mysql_query() {
  docker exec -e MYSQL_PWD="${DATABASE_PASSWORD}" -i "${CONTAINER_NAME}" \
    mysql -u"${DATABASE_USER}" -D "${DATABASE_NAME}" "$@"
}

print_history_summary() {
  echo "Flyway history summary:"
  local has_history
  has_history="$(
    mysql_query -N -B -e \
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'flyway_schema_history';"
  )"
  if [[ "${has_history}" != "1" ]]; then
    echo "flyway_schema_history does not exist yet."
    return
  fi

  mysql_query <<'SQL'
SELECT
  COUNT(*) AS total_rows,
  SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS failed_rows
FROM flyway_schema_history;

SELECT installed_rank, version, description, type, script, success
FROM flyway_schema_history
ORDER BY installed_rank DESC
LIMIT 8;
SQL
}

run_flyway() {
  local goal="$1"
  ./mvnw -q "org.flywaydb:flyway-maven-plugin:${FLYWAY_PLUGIN_VERSION}:${goal}" \
    "-Dflyway.url=${flyway_url}" \
    "-Dflyway.user=${DATABASE_USER}" \
    "-Dflyway.password=${DATABASE_PASSWORD}" \
    "-Dflyway.locations=${FLYWAY_MIGRATION_LOCATION}" \
    -Dflyway.baselineOnMigrate=true \
    -Dflyway.baselineVersion=0 \
    "-Dflyway.baselineDescription=Legacy shared schema baseline" \
    -Dflyway.cleanDisabled=true \
    "-Dflyway.ignoreMigrationPatterns=*:missing"
}

main() {
  CONTAINER_NAME="${CONTAINER_NAME}" \
  HOST_PORT="${HOST_PORT}" \
  DATABASE_NAME="${DATABASE_NAME}" \
  DATABASE_USER="${DATABASE_USER}" \
  DATABASE_PASSWORD="${DATABASE_PASSWORD}" \
  MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD}" \
  ./scripts/ensure-local-mysql.sh

  print_history_summary

  echo "Running Flyway repair against ${DATABASE_NAME} on 127.0.0.1:${HOST_PORT}..."
  run_flyway repair

  echo "Running migration uniqueness check after repair..."
  ./mvnw -q clean -Dtest=MigrationVersionUniquenessTest test

  print_history_summary
  echo "DB repair completed without resetting data."
}

main "$@"
