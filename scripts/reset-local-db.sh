#!/usr/bin/env bash

set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME:-indice-mysql-fresh}"
MYSQL_IMAGE="${MYSQL_IMAGE:-mysql:8.0}"
HOST_PORT="${HOST_PORT:-3307}"
DATABASE_NAME="${DATABASE_NAME:-indice_db}"
DATABASE_USER="${DATABASE_USER:-indice_user}"
DATABASE_PASSWORD="${DATABASE_PASSWORD:-indice_pass}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-rootpass}"
MYSQL_CHARSET="${MYSQL_CHARSET:-utf8mb4}"
MYSQL_COLLATION="${MYSQL_COLLATION:-utf8mb4_0900_ai_ci}"

container_exists() {
  docker container inspect "${CONTAINER_NAME}" >/dev/null 2>&1
}

container_running() {
  [[ "$(docker inspect -f '{{.State.Running}}' "${CONTAINER_NAME}" 2>/dev/null || true)" == "true" ]]
}

ensure_container() {
  if ! container_exists; then
    echo "Creating MySQL container ${CONTAINER_NAME} on port ${HOST_PORT}..."
    docker run -d \
      --name "${CONTAINER_NAME}" \
      --restart always \
      -p "${HOST_PORT}:3306" \
      -e MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD}" \
      -e MYSQL_DATABASE="${DATABASE_NAME}" \
      -e MYSQL_USER="${DATABASE_USER}" \
      -e MYSQL_PASSWORD="${DATABASE_PASSWORD}" \
      "${MYSQL_IMAGE}" >/dev/null
    return
  fi

  if ! container_running; then
    echo "Starting MySQL container ${CONTAINER_NAME}..."
    docker start "${CONTAINER_NAME}" >/dev/null
  fi
}

wait_for_mysql() {
  echo "Waiting for MySQL to accept connections..."
  local attempts=0

  until docker exec "${CONTAINER_NAME}" mysqladmin ping -uroot "-p${MYSQL_ROOT_PASSWORD}" --silent >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [[ "${attempts}" -ge 60 ]]; then
      echo "MySQL did not become ready in time." >&2
      exit 1
    fi
    sleep 2
  done
}

reset_database() {
  echo "Recreating database ${DATABASE_NAME}..."
  docker exec -i "${CONTAINER_NAME}" mysql -uroot "-p${MYSQL_ROOT_PASSWORD}" <<SQL
DROP DATABASE IF EXISTS \`${DATABASE_NAME}\`;
CREATE DATABASE \`${DATABASE_NAME}\`
  CHARACTER SET ${MYSQL_CHARSET}
  COLLATE ${MYSQL_COLLATION};
CREATE USER IF NOT EXISTS '${DATABASE_USER}'@'%' IDENTIFIED BY '${DATABASE_PASSWORD}';
ALTER USER '${DATABASE_USER}'@'%' IDENTIFIED BY '${DATABASE_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DATABASE_NAME}\`.* TO '${DATABASE_USER}'@'%';
FLUSH PRIVILEGES;
SQL
}

main() {
  ensure_container
  wait_for_mysql
  reset_database
  echo "Fresh database ready at 127.0.0.1:${HOST_PORT}/${DATABASE_NAME}."
}

main "$@"
