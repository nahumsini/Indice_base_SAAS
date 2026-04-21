# Setup Guide

## Requirements

- Java 21
- Docker
- MySQL container `indice-mysql`

## Verify MySQL

```bash
docker ps
docker exec indice-mysql-fresh mysql -u indice_user -pindice_pass -e "SELECT 1" indice_db
```

## Run backend

```bash
cd ~/Desktop/indice_saas_spring
./mvnw spring-boot:run
```

Default URL:

- `http://127.0.0.1:8082`

## Flyway

Flyway now runs automatically on backend startup.

Current transitional behavior for the existing shared `indice_db` schema:

- Spring uses Flyway on startup
- Flyway baselines the existing non-empty schema at version `0`
- Flyway creates `flyway_schema_history`
- no historical DDL is replayed into the legacy schema during this pass

Verify Flyway history:

```bash
docker exec indice-mysql mysql -u indice_user -pindice_pass -D indice_db -e "SELECT installed_rank, version, description, type, script, success FROM flyway_schema_history ORDER BY installed_rank"
```

## Quick checks

Open:

- `http://127.0.0.1:8082/`
- `http://127.0.0.1:8082/api/v1/health`

## Demo credentials

- email: `demo@example.com`
- password: `demo123`

## Frontend

In the React frontend:

```env
VITE_BACKEND_URL=http://127.0.0.1:8082
VITE_API_BASE_URL=
```
