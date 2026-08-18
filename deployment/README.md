# Docker Deployment

This repo now ships a dedicated Docker deployment layout under `deployment/`.

## Layout

- `compose/docker-compose.yml`: production-safe base stack
- `compose/docker-compose.dev.yml`: local admin/debug port overrides
- `docker/backend/Dockerfile`: Spring Boot image build
- `docker/web/Dockerfile`: React build plus Nginx runtime
- `docker/web/nginx.conf`: SPA hosting and `/api` reverse proxy
- `docker/minio/init-minio.sh`: bucket bootstrap
- `env/.env.example`: deployment environment template
- `scripts/`: operational wrappers for bring-up, shutdown, logs, and smoke tests

## Services

- `web`: public entrypoint for the React app and `/api` reverse proxy
- `backend`: Spring Boot API
- `mysql`: application database
- `minio`: S3-compatible object storage for attendance media
- `minio-init`: idempotent bootstrap job that creates the bucket

## First Run

1. Copy the environment template:

```bash
cp deployment/env/.env.example deployment/env/.env
```

2. Review these variables before startup:

- `WEB_PUBLIC_URL`
- `MINIO_PUBLIC_ENDPOINT`
- `APP_WEB_ALLOWED_ORIGINS`
- `MINIO_CORS_ALLOWED_ORIGINS`
- `APP_SESSION_COOKIE_SECURE`
- `APP_HR_KIOSK_IDENTIFICATION_TOKEN_SECRET`
- `APP_KIOSK_TOKEN_PROTECTION_SECRET` (obligatoria; distinta de los demás secretos)
- tiempos de sesión de kioskos (`APP_*_KIOSK_*_SECONDS`); la plantilla contiene los valores estándar aprobados
- `MYSQL_*`
- `MINIO_*`

3. Start the stack.

Production-safe base stack:

```bash
./deployment/scripts/up.sh
```

Local stack with extra admin/debug ports:

```bash
./deployment/scripts/up.sh dev
```

## Preflight de despliegue

### Base aislada para las pruebas del backend

El preflight ejecuta las pruebas de integración y nunca debe apuntarlas a la
base funcional ni a producción. Antes de correrlo, prepara una instancia MySQL
8 desechable con la configuración predeterminada de
`src/test/resources/application.properties`:

```bash
docker run --rm -d --name indice-mysql-tests \
  -p 127.0.0.1:3307:3306 \
  -e MYSQL_DATABASE=indice_test_db \
  -e MYSQL_USER=indice_test_user \
  -e MYSQL_PASSWORD=indice_test_pass \
  -e MYSQL_ROOT_PASSWORD=indice_test_root \
  mysql:8.0
```

Si el puerto `3307` ya pertenece a otra instancia local, crea en ella
`indice_test_db` y otorga acceso exclusivo a `indice_test_user`, o configura
`TEST_DATASOURCE_URL`, `TEST_DATASOURCE_USERNAME` y
`TEST_DATASOURCE_PASSWORD` para otra instancia aislada. Las pruebas pueden
crear y modificar datos; nunca uses `indice_db` ni credenciales productivas.
Si levantaste el contenedor desechable del ejemplo, elimínalo al terminar con
`docker stop indice-mysql-tests`.

Antes de publicar, ejecuta la validación completa con el archivo de entorno real:

```bash
./deployment/scripts/preflight.sh
```

El preflight valida la configuración de producción, scripts, Compose, frontend,
backend y la construcción de ambas imágenes Docker. No muestra los valores de
las credenciales. Para comprobar solamente el repositorio con la plantilla:

```bash
./deployment/scripts/preflight.sh --example
```

`--example` permite los valores inseguros documentales de `.env.example`; nunca
debe usarse como autorización para desplegar esos valores en producción.

El preflight sólo aprueba el código y la configuración. No crea
`deployment/env/.env`, no genera secretos productivos y no publica imágenes en
un registry.

Los tiempos estándar enviados al backend son: RH 3 minutos; Expenses 5 minutos
de inactividad y 8 horas de sesión; Caja Chica 15 minutos y 4 horas; Procesos y
Tareas 30 minutos y 8 horas. Para cambiarlos en un ambiente, modifica únicamente
su archivo `deployment/env/.env` y vuelve a crear el contenedor del backend.

El objetivo actual del esquema es **V196**. Antes de una instalación que incluya
las migraciones V134/V135, comprueba que no
existan kioskos nuevos con alcance organizacional incompleto. Las consultas son
de solo lectura y deben devolver `0`:

```sql
SELECT COUNT(*) AS sales_catalogs_without_scope
FROM sales_public_catalogs
WHERE unit_id IS NULL OR business_id IS NULL;

SELECT COUNT(*) AS self_service_kiosks_without_resolvable_scope
FROM pos_self_service_kiosks kiosk
JOIN pos_cash_registers cash_register ON cash_register.id = kiosk.cash_register_id
WHERE COALESCE(kiosk.unit_id, cash_register.unit_id) IS NULL
   OR COALESCE(kiosk.business_id, cash_register.business_id) IS NULL;
```

No inventes un Unit/Business para hacer pasar la migración. Reasigna o elimina
el kiosko incompleto desde el módulo antes del despliegue; V134/V135 se detienen
de forma deliberada si no pueden preservar una frontera de autorización real.

V193 sincroniza el alcance de cada caja usando el almacén como asignación
canónica. Antes de actualizar una base longeva, esta auditoría también debe
devolver `0`; cualquier fila requiere corregir la asignación del almacén desde
Inventarios/Punto de venta:

```sql
SELECT COUNT(*) AS registers_with_unresolved_warehouse_scope
FROM pos_cash_registers cash_register
LEFT JOIN sales_inventory_warehouses warehouse
  ON warehouse.id = cash_register.warehouse_id
 AND warehouse.company_id = cash_register.company_id
WHERE cash_register.deleted_at IS NULL
  AND (
    warehouse.id IS NULL
    OR warehouse.deleted_at IS NOT NULL
    OR warehouse.business_unit_id IS NULL
    OR warehouse.business_unit_id NOT REGEXP '^[0-9]+$'
    OR warehouse.business_id IS NULL
    OR warehouse.business_id NOT REGEXP '^[0-9]+$'
  );
```

### Checklist de liberación

- [ ] `deployment/env/.env` existe únicamente en el host y contiene URLs HTTPS,
      credenciales reales y dos secretos de kiosco distintos de al menos 32 caracteres.
- [ ] La base productiva tiene respaldo verificado y las auditorías de alcance devuelven `0`.
- [ ] `./deployment/scripts/preflight.sh` pasa usando el `.env` real.
- [ ] Las imágenes se etiquetan con un identificador inmutable (commit o versión),
      no solamente con `latest`.
- [ ] El stack inicia correctamente y Flyway reporta el esquema en V196.
- [ ] `./deployment/scripts/smoke-test.sh` pasa por la URL pública.
- [ ] Se valida inicio de sesión, carga de archivos, un flujo POS y un enlace de kiosco.
- [ ] Existe un procedimiento de rollback que conserva la base y los volúmenes.

## Endpoints

Base stack:

- web: `http://localhost:${WEB_HOST_PORT:-8080}`
- MinIO presigned/public path: `${MINIO_PUBLIC_ENDPOINT:-http://localhost:8080/storage}`
- MinIO API: `http://localhost:${MINIO_API_HOST_PORT:-9000}`. The compose service binds this port to `127.0.0.1` so host-network backend/web containers can reach MinIO without exposing the API publicly.

Dev override adds:

- backend direct: `http://localhost:${BACKEND_HOST_PORT:-8082}`
- MySQL direct: `127.0.0.1:${MYSQL_HOST_PORT:-3307}`
- MinIO console: `http://localhost:${MINIO_CONSOLE_HOST_PORT:-9001}`

## Operational Notes

- The frontend is served by Nginx and calls the backend through same-origin `/api` paths.
- Deployment `.env` values for `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, and `SPRING_FLYWAY_ENABLED` are authoritative when present. The compose file only falls back to the internal MySQL service when those values are omitted.
- El preflight acepta credenciales `SPRING_DATASOURCE_*` completas para una base externa; sólo exige `MYSQL_PASSWORD` y `MYSQL_ROOT_PASSWORD` cuando se utiliza el MySQL interno de Compose. Una configuración externa parcial se rechaza.
- APPTEST/app frontends are served from the running web container, not only from the cPanel document root. After every `npm run build`, publish `react/dist` into the container with `deployment/scripts/publish-web-dist.sh` or the equivalent `docker cp "$APP_DIR/react/dist/." indice-erp-web-1:/usr/share/nginx/html/`.
- Nginx also proxies `/storage/` to MinIO so presigned browser uploads can stay on the web origin by default. Host-network deploys use `deployment/docker/web/nginx.host.conf`; compose deploys keep `deployment/docker/web/nginx.conf`.
- The backend uses the internal MinIO endpoint for server-side access and rewrites presigned URLs onto `MINIO_PUBLIC_ENDPOINT`.
- MinIO CORS is configured cluster-wide through `MINIO_API_CORS_ALLOW_ORIGIN`, sourced from `MINIO_CORS_ALLOWED_ORIGINS`.
- Session auth is still servlet-session based, so this deployment should be treated as a single backend replica unless session storage is externalized.
- `minio-init` is safe to rerun; it creates the bucket if missing.
- The MySQL and MinIO data directories are persisted via named Docker volumes.

## Host-Network VPS Deploy

Some VPS/cPanel environments cannot reliably reach Docker bridge published ports from Apache/Nginx on the host. In that case, run the public web container, backend, and MinIO with host networking while still reading the official deployment `.env`:

```bash
APP_DIR=/home/corazon/apptest.indiceapp.com \
DEPLOY_ENV_FILE=/home/corazon/apps/indice-erp-docker/current/deployment/env/.env \
PUBLIC_URL=https://apptest.indiceapp.com \
./deployment/scripts/up-host-network.sh
```

The script preserves the datasource from the `.env`, forces only host-network runtime bindings, keeps MinIO data mounted, prepares `nginx.host.conf`, uses the frontend bundled in `WEB_IMAGE`, and validates local plus public health checks. This prevents a stale host-side `react/dist` from overwriting a freshly built web image.

To intentionally publish a locally built frontend over the image, opt in explicitly with `PUBLISH_LOCAL_FRONTEND_DIST=true` after running `npm run build`. The script fails if that flag is set and `react/dist/index.html` is missing.

## Frontend Container Publish

For APPTEST:

```bash
cd /home/corazon/apptest.indiceapp.com/react
npm ci --no-audit --no-fund
npm run build
cd ..
docker cp "$PWD/react/dist/." indice-erp-web-1:/usr/share/nginx/html/
docker cp "$PWD/deployment/docker/web/nginx.conf" indice-erp-web-1:/etc/nginx/conf.d/default.conf
docker exec indice-erp-web-1 sh -c "nginx -t && nginx -s reload"
curl -s https://apptest.indiceapp.com/ | grep -o "/assets/index-[^\"]*\.js" | head
curl -sI https://apptest.indiceapp.com/storage/minio/health/live
```

The public asset hash must match the asset in `react/dist/index.html`.
If `/etc/nginx/conf.d/default.conf` is bind-mounted and direct `docker cp` cannot overwrite it, `deployment/scripts/publish-web-dist.sh` detects the host-mounted source path, writes there when permitted, and then reloads Nginx.
If a deployment intentionally runs the web container in host-network mode, publish `deployment/docker/web/nginx.host.conf` explicitly with `WEB_NGINX_CONFIG=.../nginx.host.conf`, or let the helper auto-detect a bind-mounted `nginx-host.conf`. If the host backend listens on a non-default port, set `WEB_NGINX_BACKEND_PORT`, for example `WEB_NGINX_BACKEND_PORT=8083`.

Equivalent repo helper:

```bash
PUBLIC_URL=https://apptest.indiceapp.com \
APP_DIR=/home/corazon/apptest.indiceapp.com \
WEB_CONTAINER=indice-erp-web-1 \
./deployment/scripts/publish-web-dist.sh
```

If only React changed, do not rebuild the backend. If Java, DTOs, controllers, repositories, services, `pom.xml`, Flyway migrations, or Dockerfiles changed, perform a backend deploy. Database changes must use a new Flyway migration; never edit an already executed migration.

## Verification

Run the smoke test after startup:

```bash
./deployment/scripts/smoke-test.sh
```

Tail logs:

```bash
./deployment/scripts/logs.sh
./deployment/scripts/logs.sh dev backend
```

Shut the stack down:

```bash
./deployment/scripts/down.sh
./deployment/scripts/down.sh dev
```
